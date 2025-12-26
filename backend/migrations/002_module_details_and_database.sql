-- Module Details and Database Section Migration
-- This migration adds module details structure inside projects and database management tables

-- ============================================================================
-- MODULE DETAILS TABLE (Inside Projects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    module_type VARCHAR(100) NOT NULL CHECK (module_type IN (
        'bom_creation_2d',
        'bom_creation_3d',
        'process_plan_dfm',
        'should_costing',
        'supplier_evaluation',
        'supplier_nomination',
        'production_planning',
        'delivery'
    )),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold')),
    data JSONB DEFAULT '{}',
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, module_type)
);

CREATE INDEX IF NOT EXISTS idx_project_modules_project_id ON project_modules(project_id);
CREATE INDEX IF NOT EXISTS idx_project_modules_module_type ON project_modules(module_type);
CREATE INDEX IF NOT EXISTS idx_project_modules_status ON project_modules(status);

-- ============================================================================
-- SUPPLIER EVALUATION DETAILS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_module_id UUID NOT NULL REFERENCES project_modules(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    evaluation_type VARCHAR(50) NOT NULL CHECK (evaluation_type IN ('shortlist', 'rfq_sent', 'audit')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    score DECIMAL(5, 2),
    notes TEXT,
    evaluated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_module_id ON supplier_evaluations(project_module_id);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_supplier_id ON supplier_evaluations(supplier_id);

-- ============================================================================
-- SUPPLIER NOMINATION DETAILS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_nominations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_module_id UUID NOT NULL REFERENCES project_modules(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    nomination_type VARCHAR(50) NOT NULL CHECK (nomination_type IN ('negotiation', 'analysis')),
    quoted_price DECIMAL(15, 2),
    negotiated_price DECIMAL(15, 2),
    savings DECIMAL(15, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_nominations_module_id ON supplier_nominations(project_module_id);
CREATE INDEX IF NOT EXISTS idx_supplier_nominations_supplier_id ON supplier_nominations(supplier_id);

-- ============================================================================
-- PRODUCTION PLANNING DETAILS
-- ============================================================================
CREATE TABLE IF NOT EXISTS production_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_module_id UUID NOT NULL REFERENCES project_modules(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('isir_fia_sample', 'ppap_lot', 'batch_lot')),
    quantity INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_plans_module_id ON production_plans(project_module_id);
CREATE INDEX IF NOT EXISTS idx_production_plans_plan_type ON production_plans(plan_type);

-- ============================================================================
-- DELIVERY DETAILS
-- ============================================================================
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_module_id UUID NOT NULL REFERENCES project_modules(id) ON DELETE CASCADE,
    delivery_type VARCHAR(50) NOT NULL CHECK (delivery_type IN ('packing', 'logistics')),
    tracking_number VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_module_id ON deliveries(project_module_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_type ON deliveries(delivery_type);

-- ============================================================================
-- DATABASE SECTION - MHR (Machine Hour Rate) & LHR (Labor Hour Rate)
-- ============================================================================
CREATE TABLE IF NOT EXISTS machine_hour_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_name VARCHAR(255) NOT NULL,
    machine_type VARCHAR(100) NOT NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    setup_cost DECIMAL(10, 2),
    maintenance_cost_per_hour DECIMAL(10, 2),
    depreciation_per_hour DECIMAL(10, 2),
    power_consumption_kw DECIMAL(8, 2),
    power_cost_per_kwh DECIMAL(6, 2),
    efficiency_percentage DECIMAL(5, 2) DEFAULT 100.00,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mhr_user_id ON machine_hour_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_mhr_vendor_id ON machine_hour_rates(vendor_id);
CREATE INDEX IF NOT EXISTS idx_mhr_machine_type ON machine_hour_rates(machine_type);

CREATE TABLE IF NOT EXISTS labor_hour_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    labor_category VARCHAR(100) NOT NULL,
    skill_level VARCHAR(50) NOT NULL CHECK (skill_level IN ('entry', 'intermediate', 'expert', 'master')),
    hourly_rate DECIMAL(10, 2) NOT NULL,
    benefits_cost_per_hour DECIMAL(10, 2),
    overhead_percentage DECIMAL(5, 2),
    region VARCHAR(100),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lhr_user_id ON labor_hour_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_lhr_labor_category ON labor_hour_rates(labor_category);
CREATE INDEX IF NOT EXISTS idx_lhr_skill_level ON labor_hour_rates(skill_level);

-- ============================================================================
-- DATABASE SECTION - PROCESS DATABASE
-- ============================================================================
CREATE TABLE IF NOT EXISTS processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_name VARCHAR(255) NOT NULL,
    process_category VARCHAR(100) NOT NULL,
    description TEXT,
    standard_time_minutes DECIMAL(10, 2),
    machine_required BOOLEAN DEFAULT false,
    machine_type VARCHAR(100),
    labor_required BOOLEAN DEFAULT true,
    skill_level_required VARCHAR(50),
    setup_time_minutes DECIMAL(10, 2),
    cycle_time_minutes DECIMAL(10, 2),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processes_user_id ON processes(user_id);
CREATE INDEX IF NOT EXISTS idx_processes_category ON processes(process_category);
CREATE INDEX IF NOT EXISTS idx_processes_machine_type ON processes(machine_type);

-- ============================================================================
-- DATABASE SECTION - CALCULATORS
-- ============================================================================
CREATE TABLE IF NOT EXISTS calculators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calculator_name VARCHAR(255) NOT NULL,
    calculator_type VARCHAR(100) NOT NULL CHECK (calculator_type IN (
        'material_cost',
        'machining_cost',
        'tooling_cost',
        'overhead_cost',
        'total_cost',
        'custom'
    )),
    formula TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    description TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calculators_user_id ON calculators(user_id);
CREATE INDEX IF NOT EXISTS idx_calculators_type ON calculators(calculator_type);

-- ============================================================================
-- ENHANCED VENDOR DATABASE (Add machine details to vendors)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    machine_name VARCHAR(255) NOT NULL,
    machine_type VARCHAR(100) NOT NULL,
    machine_hour_rate_id UUID REFERENCES machine_hour_rates(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    year_manufactured INTEGER,
    condition VARCHAR(50),
    specifications JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_machines_vendor_id ON vendor_machines(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_machines_machine_type ON vendor_machines(machine_type);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_project_modules_updated_at BEFORE UPDATE ON project_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_evaluations_updated_at BEFORE UPDATE ON supplier_evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_nominations_updated_at BEFORE UPDATE ON supplier_nominations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_plans_updated_at BEFORE UPDATE ON production_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machine_hour_rates_updated_at BEFORE UPDATE ON machine_hour_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labor_hour_rates_updated_at BEFORE UPDATE ON labor_hour_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON processes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calculators_updated_at BEFORE UPDATE ON calculators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_machines_updated_at BEFORE UPDATE ON vendor_machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE project_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_hour_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_hour_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculators ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_machines ENABLE ROW LEVEL SECURITY;

-- Project Modules policies (inherit from parent project)
CREATE POLICY "Users can view project_modules for their projects"
    ON project_modules FOR SELECT
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_modules.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can insert project_modules for their projects"
    ON project_modules FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_modules.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can update project_modules for their projects"
    ON project_modules FOR UPDATE
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_modules.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can delete project_modules for their projects"
    ON project_modules FOR DELETE
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_modules.project_id AND projects.user_id = auth.uid()));

-- Similar policies for related tables
CREATE POLICY "Users can view supplier_evaluations for their project modules"
    ON supplier_evaluations FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM project_modules pm
        JOIN projects p ON p.id = pm.project_id
        WHERE pm.id = supplier_evaluations.project_module_id AND p.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert supplier_evaluations for their project modules"
    ON supplier_evaluations FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM project_modules pm
        JOIN projects p ON p.id = pm.project_id
        WHERE pm.id = supplier_evaluations.project_module_id AND p.user_id = auth.uid()
    ));

CREATE POLICY "Users can update supplier_evaluations for their project modules"
    ON supplier_evaluations FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM project_modules pm
        JOIN projects p ON p.id = pm.project_id
        WHERE pm.id = supplier_evaluations.project_module_id AND p.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete supplier_evaluations for their project modules"
    ON supplier_evaluations FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM project_modules pm
        JOIN projects p ON p.id = pm.project_id
        WHERE pm.id = supplier_evaluations.project_module_id AND p.user_id = auth.uid()
    ));

-- Repeat for other module detail tables
CREATE POLICY "Users can manage supplier_nominations" ON supplier_nominations FOR ALL
    USING (EXISTS (
        SELECT 1 FROM project_modules pm
        JOIN projects p ON p.id = pm.project_id
        WHERE pm.id = supplier_nominations.project_module_id AND p.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage production_plans" ON production_plans FOR ALL
    USING (EXISTS (
        SELECT 1 FROM project_modules pm
        JOIN projects p ON p.id = pm.project_id
        WHERE pm.id = production_plans.project_module_id AND p.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage deliveries" ON deliveries FOR ALL
    USING (EXISTS (
        SELECT 1 FROM project_modules pm
        JOIN projects p ON p.id = pm.project_id
        WHERE pm.id = deliveries.project_module_id AND p.user_id = auth.uid()
    ));

-- Database section policies (user-owned)
CREATE POLICY "Users can manage their machine_hour_rates" ON machine_hour_rates FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their labor_hour_rates" ON labor_hour_rates FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their processes" ON processes FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their calculators" ON calculators FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage vendor_machines for their vendors" ON vendor_machines FOR ALL
    USING (EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_machines.vendor_id AND vendors.user_id = auth.uid()));
