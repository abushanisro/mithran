-- =====================================================
-- Dynamic Calculator System - Database Schema
-- =====================================================
-- This migration creates the complete schema for a flexible calculator system
-- that allows users to create custom calculators with database-connected fields
-- and formulas that reference data from LHR, MHR, Raw Materials, and Processes.
--
-- Tables created:
-- 1. calculators - Calculator definitions
-- 2. calculator_fields - Input fields with database connections
-- 3. calculator_formulas - Formula definitions
-- 4. calculator_executions - Saved calculation results
-- 5. calculator_functions - System-wide function library
-- =====================================================

-- =====================================================
-- DROP EXISTING TABLES (Clean slate for development)
-- =====================================================
-- Note: In production, you would use ALTER TABLE instead of DROP/CREATE
DROP TABLE IF EXISTS calculator_executions CASCADE;
DROP TABLE IF EXISTS calculator_formulas CASCADE;
DROP TABLE IF EXISTS calculator_fields CASCADE;
DROP TABLE IF EXISTS calculators CASCADE;
DROP TABLE IF EXISTS calculator_functions CASCADE;

-- =====================================================
-- 1. CALCULATORS TABLE
-- =====================================================
-- Stores calculator template/definition
CREATE TABLE calculators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  calc_category VARCHAR(100), -- e.g., 'costing', 'material', 'process', 'custom'

  -- Configuration
  calculator_type VARCHAR(50) NOT NULL DEFAULT 'single', -- 'single', 'multi_step', 'dashboard'
  is_template BOOLEAN DEFAULT false, -- Pre-built templates vs user-created
  is_public BOOLEAN DEFAULT false, -- Shareable with other users
  template_category VARCHAR(100), -- For pre-built templates: 'manufacturing', 'tooling', etc.

  -- Display Configuration
  display_config JSONB DEFAULT '{}'::jsonb, -- Layout, styling, grouping settings

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_calculator_type CHECK (calculator_type IN ('single', 'multi_step', 'dashboard')),
  CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calculators_user_id ON calculators(user_id);
CREATE INDEX IF NOT EXISTS idx_calculators_calc_category ON calculators(calc_category);
CREATE INDEX IF NOT EXISTS idx_calculators_is_template ON calculators(is_template);
CREATE INDEX IF NOT EXISTS idx_calculators_is_public ON calculators(is_public);
CREATE INDEX IF NOT EXISTS idx_calculators_created_at ON calculators(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calculators_template_category ON calculators(template_category) WHERE is_template = true;

-- RLS Policies
ALTER TABLE calculators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own calculators and public templates" ON calculators;
CREATE POLICY "Users can view their own calculators and public templates"
  ON calculators FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Users can create their own calculators" ON calculators;
CREATE POLICY "Users can create their own calculators"
  ON calculators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own calculators" ON calculators;
CREATE POLICY "Users can update their own calculators"
  ON calculators FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own calculators" ON calculators;
CREATE POLICY "Users can delete their own calculators"
  ON calculators FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_calculators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_calculators_updated_at ON calculators;
CREATE TRIGGER trigger_update_calculators_updated_at
  BEFORE UPDATE ON calculators
  FOR EACH ROW
  EXECUTE FUNCTION update_calculators_updated_at();

COMMENT ON TABLE calculators IS 'Calculator template definitions with basic information and configuration';


-- =====================================================
-- 2. CALCULATOR_FIELDS TABLE
-- =====================================================
-- Defines input fields for calculators with database connections
CREATE TABLE calculator_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_id UUID NOT NULL REFERENCES calculators(id) ON DELETE CASCADE,

  -- Field Definition
  field_name VARCHAR(255) NOT NULL, -- Internal reference name (e.g., 'density', 'lhr_rate')
  display_label VARCHAR(255) NOT NULL, -- User-facing label
  field_type VARCHAR(50) NOT NULL, -- 'number', 'text', 'select', 'database_lookup', 'calculated'

  -- Database Connection (for database_lookup type)
  data_source VARCHAR(100), -- 'lhr', 'mhr', 'raw_materials', 'processes', 'manual'
  source_table VARCHAR(100), -- Database table name
  source_field VARCHAR(100), -- Field to extract from database
  lookup_config JSONB DEFAULT '{}'::jsonb, -- Configuration for database lookups

  -- Field Configuration
  default_value TEXT,
  unit VARCHAR(50), -- e.g., 'mm', 'kg', 'hours', 'INR'
  min_value NUMERIC,
  max_value NUMERIC,
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB DEFAULT '{}'::jsonb, -- Additional validation rules

  -- UI Configuration
  input_config JSONB DEFAULT '{}'::jsonb, -- Placeholder, help text, step values, etc.
  display_order INTEGER NOT NULL DEFAULT 0,
  field_group VARCHAR(100), -- For grouping fields in UI

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_field_type CHECK (
    field_type IN ('number', 'text', 'select', 'database_lookup', 'calculated', 'multi_select')
  ),
  CONSTRAINT valid_data_source CHECK (
    data_source IS NULL OR
    data_source IN ('lhr', 'mhr', 'raw_materials', 'processes', 'manual')
  ),
  CONSTRAINT unique_field_name_per_calculator UNIQUE (calculator_id, field_name),
  CONSTRAINT display_label_not_empty CHECK (LENGTH(TRIM(display_label)) > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calculator_fields_calculator_id ON calculator_fields(calculator_id);
CREATE INDEX IF NOT EXISTS idx_calculator_fields_field_type ON calculator_fields(field_type);
CREATE INDEX IF NOT EXISTS idx_calculator_fields_display_order ON calculator_fields(calculator_id, display_order);
CREATE INDEX IF NOT EXISTS idx_calculator_fields_data_source ON calculator_fields(data_source) WHERE data_source IS NOT NULL;

-- RLS Policies (inherit from parent calculator)
ALTER TABLE calculator_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view fields of their calculators or public calculators" ON calculator_fields;
CREATE POLICY "Users can view fields of their calculators or public calculators"
  ON calculator_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calculators
      WHERE calculators.id = calculator_fields.calculator_id
      AND (calculators.user_id = auth.uid() OR calculators.is_public = true)
    )
  );

DROP POLICY IF EXISTS "Users can manage fields of their own calculators" ON calculator_fields;
CREATE POLICY "Users can manage fields of their own calculators"
  ON calculator_fields FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calculators
      WHERE calculators.id = calculator_fields.calculator_id
      AND calculators.user_id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_calculator_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_calculator_fields_updated_at ON calculator_fields;
CREATE TRIGGER trigger_update_calculator_fields_updated_at
  BEFORE UPDATE ON calculator_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_calculator_fields_updated_at();

COMMENT ON TABLE calculator_fields IS 'Input fields for calculators with support for database connections';


-- =====================================================
-- 3. CALCULATOR_FORMULAS TABLE
-- =====================================================
-- Stores formula definitions with support for both visual and text-based formulas
CREATE TABLE calculator_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_id UUID NOT NULL REFERENCES calculators(id) ON DELETE CASCADE,

  -- Formula Definition
  formula_name VARCHAR(255) NOT NULL, -- Internal reference (e.g., 'total_cost', 'shot_weight')
  display_label VARCHAR(255) NOT NULL, -- User-facing label
  description TEXT,

  -- Formula Expression
  formula_type VARCHAR(50) NOT NULL DEFAULT 'expression', -- 'expression', 'multi_step', 'conditional'
  formula_expression TEXT NOT NULL, -- Text-based formula (e.g., "=SUM(field1, field2) * 1.2")
  visual_formula JSONB DEFAULT '{}'::jsonb, -- Visual formula representation (AST)

  -- Dependencies
  depends_on_fields TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of field_names this formula depends on
  depends_on_formulas TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of formula_names (for multi-step calculations)

  -- Output Configuration
  output_unit VARCHAR(50),
  decimal_places INTEGER DEFAULT 2,
  display_format VARCHAR(50) DEFAULT 'number', -- 'number', 'currency', 'percentage'

  -- Execution Order (for multi-step calculations)
  execution_order INTEGER NOT NULL DEFAULT 0,

  -- Display Configuration
  display_in_results BOOLEAN DEFAULT true,
  is_primary_result BOOLEAN DEFAULT false, -- Highlight as main result
  result_group VARCHAR(100), -- For grouping results in UI

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_formula_type CHECK (
    formula_type IN ('expression', 'multi_step', 'conditional')
  ),
  CONSTRAINT valid_display_format CHECK (
    display_format IN ('number', 'currency', 'percentage')
  ),
  CONSTRAINT unique_formula_name_per_calculator UNIQUE (calculator_id, formula_name),
  CONSTRAINT display_label_not_empty CHECK (LENGTH(TRIM(display_label)) > 0),
  CONSTRAINT formula_expression_not_empty CHECK (LENGTH(TRIM(formula_expression)) > 0),
  CONSTRAINT decimal_places_valid CHECK (decimal_places >= 0 AND decimal_places <= 10)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calculator_formulas_calculator_id ON calculator_formulas(calculator_id);
CREATE INDEX IF NOT EXISTS idx_calculator_formulas_execution_order ON calculator_formulas(calculator_id, execution_order);
CREATE INDEX IF NOT EXISTS idx_calculator_formulas_primary_result ON calculator_formulas(calculator_id, is_primary_result) WHERE is_primary_result = true;

-- RLS Policies (inherit from parent calculator)
ALTER TABLE calculator_formulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view formulas of their calculators or public calculators" ON calculator_formulas;
CREATE POLICY "Users can view formulas of their calculators or public calculators"
  ON calculator_formulas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calculators
      WHERE calculators.id = calculator_formulas.calculator_id
      AND (calculators.user_id = auth.uid() OR calculators.is_public = true)
    )
  );

DROP POLICY IF EXISTS "Users can manage formulas of their own calculators" ON calculator_formulas;
CREATE POLICY "Users can manage formulas of their own calculators"
  ON calculator_formulas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calculators
      WHERE calculators.id = calculator_formulas.calculator_id
      AND calculators.user_id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_calculator_formulas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_calculator_formulas_updated_at ON calculator_formulas;
CREATE TRIGGER trigger_update_calculator_formulas_updated_at
  BEFORE UPDATE ON calculator_formulas
  FOR EACH ROW
  EXECUTE FUNCTION update_calculator_formulas_updated_at();

COMMENT ON TABLE calculator_formulas IS 'Formula definitions for calculators with text and visual representations';


-- =====================================================
-- 4. CALCULATOR_EXECUTIONS TABLE
-- =====================================================
-- Stores saved calculation results/executions
CREATE TABLE calculator_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_id UUID NOT NULL REFERENCES calculators(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Execution Information
  execution_name VARCHAR(255), -- User-provided name for this calculation
  description TEXT,

  -- Input Values
  input_values JSONB NOT NULL DEFAULT '{}'::jsonb, -- Field values provided by user

  -- Database References
  database_references JSONB DEFAULT '{}'::jsonb, -- Track which database records were used

  -- Calculated Results
  calculation_results JSONB NOT NULL DEFAULT '{}'::jsonb, -- All formula results

  -- Metadata
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_duration_ms INTEGER, -- Track performance
  calculator_version INTEGER DEFAULT 1, -- Version tracking for calculator changes

  -- Tags & Organization
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- User-defined tags
  project_reference VARCHAR(255), -- Optional project association

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calculator_executions_calculator_id ON calculator_executions(calculator_id);
CREATE INDEX IF NOT EXISTS idx_calculator_executions_user_id ON calculator_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_calculator_executions_executed_at ON calculator_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_calculator_executions_tags ON calculator_executions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_calculator_executions_project ON calculator_executions(project_reference) WHERE project_reference IS NOT NULL;

-- Full-text search on execution names and descriptions
CREATE INDEX IF NOT EXISTS idx_calculator_executions_search ON calculator_executions
  USING gin(to_tsvector('english',
    COALESCE(execution_name, '') || ' ' || COALESCE(description, '')
  ));

-- RLS Policies
ALTER TABLE calculator_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own executions" ON calculator_executions;
CREATE POLICY "Users can view their own executions"
  ON calculator_executions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own executions" ON calculator_executions;
CREATE POLICY "Users can create their own executions"
  ON calculator_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own executions" ON calculator_executions;
CREATE POLICY "Users can update their own executions"
  ON calculator_executions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own executions" ON calculator_executions;
CREATE POLICY "Users can delete their own executions"
  ON calculator_executions FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_calculator_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_calculator_executions_updated_at ON calculator_executions;
CREATE TRIGGER trigger_update_calculator_executions_updated_at
  BEFORE UPDATE ON calculator_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_calculator_executions_updated_at();

COMMENT ON TABLE calculator_executions IS 'Saved calculation results with input values and database references';


-- =====================================================
-- 5. CALCULATOR_FUNCTIONS TABLE
-- =====================================================
-- System-wide function library for formulas
CREATE TABLE calculator_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Function Definition
  function_name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'SUM', 'AVG', 'IF', 'ROUND'
  func_category VARCHAR(50) NOT NULL, -- 'math', 'statistical', 'logical', 'text', 'lookup'
  description TEXT NOT NULL,
  syntax_example VARCHAR(255), -- e.g., "SUM(value1, value2, ...)"

  -- Implementation
  implementation_type VARCHAR(50) NOT NULL DEFAULT 'builtin', -- 'builtin', 'custom'
  function_code TEXT, -- For custom functions (JavaScript)

  -- Function Signature
  min_args INTEGER NOT NULL DEFAULT 1,
  max_args INTEGER, -- NULL means unlimited
  arg_types TEXT[] DEFAULT ARRAY['number']::TEXT[], -- Expected argument types
  return_type VARCHAR(50) DEFAULT 'number', -- 'number', 'text', 'boolean'

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_implementation_type CHECK (
    implementation_type IN ('builtin', 'custom')
  ),
  CONSTRAINT valid_func_category CHECK (
    func_category IN ('math', 'statistical', 'logical', 'text', 'lookup', 'date', 'conversion')
  ),
  CONSTRAINT valid_return_type CHECK (
    return_type IN ('number', 'text', 'boolean')
  ),
  CONSTRAINT function_name_uppercase CHECK (function_name = UPPER(function_name)),
  CONSTRAINT min_args_valid CHECK (min_args >= 0)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_calculator_functions_func_category ON calculator_functions(func_category);
CREATE INDEX IF NOT EXISTS idx_calculator_functions_active ON calculator_functions(is_active) WHERE is_active = true;

-- Make this table readable by all authenticated users
ALTER TABLE calculator_functions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active functions" ON calculator_functions;
CREATE POLICY "Everyone can view active functions"
  ON calculator_functions FOR SELECT
  TO authenticated
  USING (is_active = true);

COMMENT ON TABLE calculator_functions IS 'System-wide function library for calculator formulas';


-- =====================================================
-- SEED DATA: CALCULATOR_FUNCTIONS
-- =====================================================
-- Pre-populate with built-in mathematical and statistical functions

INSERT INTO calculator_functions (function_name, func_category, description, syntax_example, min_args, max_args, return_type) VALUES
  -- Mathematical Functions
  ('SUM', 'math', 'Sum of all arguments', 'SUM(a, b, c)', 1, NULL, 'number'),
  ('MULTIPLY', 'math', 'Multiply all arguments', 'MULTIPLY(a, b, c)', 2, NULL, 'number'),
  ('DIVIDE', 'math', 'Divide first argument by second', 'DIVIDE(a, b)', 2, 2, 'number'),
  ('POWER', 'math', 'Raise first argument to power of second', 'POWER(base, exponent)', 2, 2, 'number'),
  ('SQRT', 'math', 'Square root', 'SQRT(value)', 1, 1, 'number'),
  ('ABS', 'math', 'Absolute value', 'ABS(value)', 1, 1, 'number'),
  ('ROUND', 'math', 'Round to decimal places', 'ROUND(value, decimals)', 1, 2, 'number'),
  ('CEILING', 'math', 'Round up to nearest integer', 'CEILING(value)', 1, 1, 'number'),
  ('FLOOR', 'math', 'Round down to nearest integer', 'FLOOR(value)', 1, 1, 'number'),
  ('PI', 'math', 'Pi constant (3.14159...)', 'PI()', 0, 0, 'number'),

  -- Statistical Functions
  ('AVG', 'statistical', 'Average of all arguments', 'AVG(a, b, c)', 1, NULL, 'number'),
  ('MIN', 'statistical', 'Minimum value', 'MIN(a, b, c)', 1, NULL, 'number'),
  ('MAX', 'statistical', 'Maximum value', 'MAX(a, b, c)', 1, NULL, 'number'),
  ('COUNT', 'statistical', 'Count of arguments', 'COUNT(a, b, c)', 0, NULL, 'number'),
  ('MEDIAN', 'statistical', 'Median value', 'MEDIAN(a, b, c)', 1, NULL, 'number'),

  -- Logical Functions (for future conditional logic)
  ('IF', 'logical', 'Conditional expression', 'IF(condition, value_if_true, value_if_false)', 3, 3, 'number'),

  -- Conversion Functions
  ('PERCENTAGE', 'conversion', 'Calculate percentage (value/total * 100)', 'PERCENTAGE(value, total)', 2, 2, 'number')
ON CONFLICT (function_name) DO NOTHING;


-- =====================================================
-- FINAL CHECKS AND DOCUMENTATION
-- =====================================================

-- Verify all tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('calculators', 'calculator_fields', 'calculator_formulas', 'calculator_executions', 'calculator_functions');

  IF table_count = 5 THEN
    RAISE NOTICE 'SUCCESS: All 5 calculator tables created successfully';
  ELSE
    RAISE WARNING 'WARNING: Expected 5 tables, found %', table_count;
  END IF;
END $$;

-- Display function count
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count FROM calculator_functions;
  RAISE NOTICE 'Seeded % built-in functions', function_count;
END $$;
