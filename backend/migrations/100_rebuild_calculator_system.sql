-- ============================================================================
-- CALCULATOR SYSTEM REBUILD - Enterprise Grade Schema
-- ============================================================================
-- Version: 2.0.0
-- Author: Principal Engineer
-- Date: 2026-01-04
-- Description: Complete rebuild of calculator system with proper normalization,
--              atomicity, and RLS

-- ============================================================================
-- STEP 1: DROP OLD TABLES (Clean Slate)
-- ============================================================================

DROP TABLE IF EXISTS calculator_executions CASCADE;
DROP TABLE IF EXISTS calculator_formulas CASCADE;
DROP TABLE IF EXISTS calculator_fields CASCADE;
DROP TABLE IF EXISTS calculators CASCADE;

-- ============================================================================
-- STEP 2: CREATE CALCULATORS TABLE (Parent)
-- ============================================================================

CREATE TABLE calculators (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ownership
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    calc_category VARCHAR(100), -- 'costing', 'material', 'process', 'tooling', 'custom'
    calculator_type VARCHAR(50) NOT NULL DEFAULT 'single', -- 'single', 'multi_step', 'dashboard'

    -- Template System
    is_template BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    template_category VARCHAR(100),

    -- Configuration
    display_config JSONB DEFAULT '{}',

    -- Versioning (for audit/rollback)
    version INTEGER DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_calculator_type CHECK (calculator_type IN ('single', 'multi_step', 'dashboard')),
    CONSTRAINT valid_category CHECK (calc_category IS NULL OR calc_category IN ('costing', 'material', 'process', 'tooling', 'custom'))
);

-- ============================================================================
-- STEP 3: CREATE FIELDS TABLE (Calculator Inputs)
-- ============================================================================

CREATE TABLE calculator_fields (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Key (CASCADE DELETE - when calculator deleted, fields auto-deleted)
    calculator_id UUID NOT NULL REFERENCES calculators(id) ON DELETE CASCADE,

    -- Field Identity
    field_name VARCHAR(255) NOT NULL, -- Technical name (camelCase)
    display_label VARCHAR(255) NOT NULL, -- Human-readable name

    -- Field Type
    field_type VARCHAR(50) NOT NULL, -- 'number', 'text', 'select', 'database_lookup', 'calculated', 'const'

    -- Database Lookup Configuration
    data_source VARCHAR(50), -- 'lhr', 'mhr', 'raw_materials', 'processes', 'manual'
    source_table VARCHAR(255),
    source_field VARCHAR(255),
    lookup_config JSONB DEFAULT '{}', -- { recordId, filters, etc. }

    -- Validation
    default_value TEXT,
    unit VARCHAR(50),
    min_value NUMERIC,
    max_value NUMERIC,
    is_required BOOLEAN DEFAULT FALSE,
    validation_rules JSONB DEFAULT '{}',

    -- UI Configuration
    input_config JSONB DEFAULT '{}', -- { placeholder, helpText, options, etc. }
    display_order INTEGER DEFAULT 0,
    field_group VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_field_name_per_calculator UNIQUE(calculator_id, field_name),
    CONSTRAINT valid_field_type CHECK (field_type IN ('number', 'text', 'select', 'database_lookup', 'calculated', 'multi_select', 'const')),
    CONSTRAINT valid_data_source CHECK (data_source IS NULL OR data_source IN ('lhr', 'mhr', 'raw_materials', 'processes', 'manual'))
);

-- ============================================================================
-- STEP 4: CREATE FORMULAS TABLE (Calculated Fields)
-- ============================================================================

CREATE TABLE calculator_formulas (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Key (CASCADE DELETE)
    calculator_id UUID NOT NULL REFERENCES calculators(id) ON DELETE CASCADE,

    -- Formula Identity
    formula_name VARCHAR(255) NOT NULL, -- Technical name (camelCase)
    display_label VARCHAR(255) NOT NULL, -- Human-readable name
    description TEXT,

    -- Formula Definition
    formula_type VARCHAR(50) DEFAULT 'expression', -- 'expression', 'multi_step', 'conditional'
    formula_expression TEXT NOT NULL, -- Math.js expression: "{field1} * {field2} + 100"
    visual_formula JSONB DEFAULT '{}', -- For visual formula builder

    -- Dependencies (for execution ordering)
    depends_on_fields TEXT[] DEFAULT '{}', -- Array of field_name values
    depends_on_formulas TEXT[] DEFAULT '{}', -- Array of formula_name values

    -- Output Configuration
    output_unit VARCHAR(50),
    decimal_places INTEGER DEFAULT 2,
    display_format VARCHAR(50) DEFAULT 'number', -- 'number', 'currency', 'percentage'

    -- Execution Order (lower = executes first)
    execution_order INTEGER DEFAULT 0,

    -- Display Options
    display_in_results BOOLEAN DEFAULT TRUE,
    is_primary_result BOOLEAN DEFAULT FALSE,
    result_group VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_formula_name_per_calculator UNIQUE(calculator_id, formula_name),
    CONSTRAINT valid_formula_type CHECK (formula_type IN ('expression', 'multi_step', 'conditional')),
    CONSTRAINT valid_display_format CHECK (display_format IN ('number', 'currency', 'percentage'))
);

-- ============================================================================
-- STEP 5: CREATE EXECUTIONS TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE calculator_executions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Keys
    calculator_id UUID NOT NULL REFERENCES calculators(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Execution Data
    execution_name VARCHAR(255),
    description TEXT,
    input_values JSONB NOT NULL, -- { field1: 100, field2: 200 }
    database_references JSONB DEFAULT '{}', -- { field1: { recordId, recordLabel } }
    calculation_results JSONB NOT NULL, -- { formula1: 500, formula2: 1000 }

    -- Metadata
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    calculation_duration_ms INTEGER,
    calculator_version INTEGER, -- Snapshot of calculator version at execution time

    -- Categorization
    tags TEXT[] DEFAULT '{}',
    project_reference VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 6: CREATE INDEXES (Performance)
-- ============================================================================

-- Calculators Indexes
CREATE INDEX idx_calculators_user_id ON calculators(user_id);
CREATE INDEX idx_calculators_type ON calculators(calculator_type);
CREATE INDEX idx_calculators_category ON calculators(calc_category);
CREATE INDEX idx_calculators_template ON calculators(is_template) WHERE is_template = TRUE;
CREATE INDEX idx_calculators_public ON calculators(is_public) WHERE is_public = TRUE;

-- Fields Indexes
CREATE INDEX idx_fields_calculator_id ON calculator_fields(calculator_id);
CREATE INDEX idx_fields_type ON calculator_fields(field_type);
CREATE INDEX idx_fields_order ON calculator_fields(calculator_id, display_order);
CREATE INDEX idx_fields_data_source ON calculator_fields(data_source) WHERE data_source IS NOT NULL;

-- Formulas Indexes
CREATE INDEX idx_formulas_calculator_id ON calculator_formulas(calculator_id);
CREATE INDEX idx_formulas_execution_order ON calculator_formulas(calculator_id, execution_order);
CREATE INDEX idx_formulas_primary_result ON calculator_formulas(calculator_id) WHERE is_primary_result = TRUE;

-- Executions Indexes
CREATE INDEX idx_executions_calculator_id ON calculator_executions(calculator_id);
CREATE INDEX idx_executions_user_id ON calculator_executions(user_id);
CREATE INDEX idx_executions_executed_at ON calculator_executions(executed_at DESC);
CREATE INDEX idx_executions_project ON calculator_executions(project_reference) WHERE project_reference IS NOT NULL;

-- ============================================================================
-- STEP 7: ENABLE RLS (Row Level Security)
-- ============================================================================

ALTER TABLE calculators ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_executions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: CREATE RLS POLICIES
-- ============================================================================

-- Calculators Policies
DROP POLICY IF EXISTS "Users can view their own calculators" ON calculators;
CREATE POLICY "Users can view their own calculators" ON calculators
    FOR SELECT USING (user_id = auth.uid() OR is_public = TRUE);

DROP POLICY IF EXISTS "Users can create their own calculators" ON calculators;
CREATE POLICY "Users can create their own calculators" ON calculators
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own calculators" ON calculators;
CREATE POLICY "Users can update their own calculators" ON calculators
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own calculators" ON calculators;
CREATE POLICY "Users can delete their own calculators" ON calculators
    FOR DELETE USING (user_id = auth.uid());

-- Fields Policies (inherit from parent calculator)
DROP POLICY IF EXISTS "Users can view fields of their calculators" ON calculator_fields;
CREATE POLICY "Users can view fields of their calculators" ON calculator_fields
    FOR SELECT USING (
        calculator_id IN (
            SELECT id FROM calculators WHERE user_id = auth.uid() OR is_public = TRUE
        )
    );

DROP POLICY IF EXISTS "Users can create fields in their calculators" ON calculator_fields;
CREATE POLICY "Users can create fields in their calculators" ON calculator_fields
    FOR INSERT WITH CHECK (
        calculator_id IN (
            SELECT id FROM calculators WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update fields of their calculators" ON calculator_fields;
CREATE POLICY "Users can update fields of their calculators" ON calculator_fields
    FOR UPDATE USING (
        calculator_id IN (
            SELECT id FROM calculators WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete fields of their calculators" ON calculator_fields;
CREATE POLICY "Users can delete fields of their calculators" ON calculator_fields
    FOR DELETE USING (
        calculator_id IN (
            SELECT id FROM calculators WHERE user_id = auth.uid()
        )
    );

-- Formulas Policies (inherit from parent calculator)
DROP POLICY IF EXISTS "Users can view formulas of their calculators" ON calculator_formulas;
CREATE POLICY "Users can view formulas of their calculators" ON calculator_formulas
    FOR SELECT USING (
        calculator_id IN (
            SELECT id FROM calculators WHERE user_id = auth.uid() OR is_public = TRUE
        )
    );

DROP POLICY IF EXISTS "Users can create formulas in their calculators" ON calculator_formulas;
CREATE POLICY "Users can create formulas in their calculators" ON calculator_formulas
    FOR INSERT WITH CHECK (
        calculator_id IN (
            SELECT id FROM calculators WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update formulas of their calculators" ON calculator_formulas;
CREATE POLICY "Users can update formulas of their calculators" ON calculator_formulas
    FOR UPDATE USING (
        calculator_id IN (
            SELECT id FROM calculators WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete formulas of their calculators" ON calculator_formulas;
CREATE POLICY "Users can delete formulas of their calculators" ON calculator_formulas
    FOR DELETE USING (
        calculator_id IN (
            SELECT id FROM calculators WHERE user_id = auth.uid()
        )
    );

-- Executions Policies
DROP POLICY IF EXISTS "Users can view their own executions" ON calculator_executions;
CREATE POLICY "Users can view their own executions" ON calculator_executions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own executions" ON calculator_executions;
CREATE POLICY "Users can create their own executions" ON calculator_executions
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own executions" ON calculator_executions;
CREATE POLICY "Users can update their own executions" ON calculator_executions
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own executions" ON calculator_executions;
CREATE POLICY "Users can delete their own executions" ON calculator_executions
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- STEP 9: CREATE TRIGGERS (Auto-update timestamps)
-- ============================================================================

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Calculators trigger
DROP TRIGGER IF EXISTS update_calculators_updated_at ON calculators;
CREATE TRIGGER update_calculators_updated_at
    BEFORE UPDATE ON calculators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fields trigger
DROP TRIGGER IF EXISTS update_calculator_fields_updated_at ON calculator_fields;
CREATE TRIGGER update_calculator_fields_updated_at
    BEFORE UPDATE ON calculator_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Formulas trigger
DROP TRIGGER IF EXISTS update_calculator_formulas_updated_at ON calculator_formulas;
CREATE TRIGGER update_calculator_formulas_updated_at
    BEFORE UPDATE ON calculator_formulas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Executions trigger
DROP TRIGGER IF EXISTS update_calculator_executions_updated_at ON calculator_executions;
CREATE TRIGGER update_calculator_executions_updated_at
    BEFORE UPDATE ON calculator_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 10: ADD COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE calculators IS 'Parent table for all calculators - owns fields and formulas';
COMMENT ON TABLE calculator_fields IS 'Input fields for calculators (cascade delete with calculator)';
COMMENT ON TABLE calculator_formulas IS 'Calculation formulas (cascade delete with calculator)';
COMMENT ON TABLE calculator_executions IS 'Audit trail of calculator executions';

COMMENT ON COLUMN calculators.version IS 'Version number for optimistic locking and audit trail';
COMMENT ON COLUMN calculator_fields.field_name IS 'Technical name used in formulas (camelCase)';
COMMENT ON COLUMN calculator_fields.display_label IS 'Human-readable label shown in UI';
COMMENT ON COLUMN calculator_formulas.depends_on_fields IS 'Array of field_name values this formula depends on';
COMMENT ON COLUMN calculator_formulas.execution_order IS 'Order of execution (lower = first)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
