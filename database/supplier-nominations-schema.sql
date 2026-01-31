-- ===============================================
-- SUPPLIER NOMINATIONS DATABASE SCHEMA
-- Production-ready B2B Enterprise SaaS
-- ===============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- ENUMS
-- ===============================================

-- Nomination status lifecycle
CREATE TYPE nomination_status AS ENUM (
    'draft',
    'active',
    'evaluation',
    'completed',
    'archived'
);

-- Evaluation categories
CREATE TYPE evaluation_category AS ENUM (
    'cost_analysis',
    'vendor_rating', 
    'technical_capability',
    'quality_systems',
    'delivery_performance'
);

-- Vendor risk levels
CREATE TYPE risk_level AS ENUM (
    'low',
    'medium', 
    'high',
    'critical'
);

-- Final recommendation
CREATE TYPE recommendation_type AS ENUM (
    'approved',
    'conditional',
    'rejected',
    'pending'
);

-- ===============================================
-- CORE TABLES
-- ===============================================

-- Supplier nomination master table
CREATE TABLE supplier_nominations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status nomination_status DEFAULT 'draft',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT nomination_name_project_unique UNIQUE(project_id, name)
);

-- Evaluation criteria template
CREATE TABLE evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomination_id UUID NOT NULL REFERENCES supplier_nominations(id) ON DELETE CASCADE,
    category evaluation_category NOT NULL,
    name VARCHAR(255) NOT NULL,
    weight_percentage DECIMAL(5,2) NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
    max_score INTEGER DEFAULT 100 CHECK (max_score > 0),
    is_mandatory BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor evaluations
CREATE TABLE vendor_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomination_id UUID NOT NULL REFERENCES supplier_nominations(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL,
    
    -- Core metrics
    overall_score DECIMAL(5,2) DEFAULT 0,
    cost_score DECIMAL(5,2) DEFAULT 0,
    vendor_rating_score DECIMAL(5,2) DEFAULT 0,
    capability_score DECIMAL(5,2) DEFAULT 0,
    technical_score DECIMAL(5,2) DEFAULT 0,
    
    -- Risk assessment
    risk_level risk_level DEFAULT 'medium',
    risk_mitigation_notes TEXT,
    
    -- Recommendation
    recommendation recommendation_type DEFAULT 'pending',
    final_rank INTEGER,
    
    -- Detailed analysis
    cost_analysis JSONB DEFAULT '{}',
    rating_engine JSONB DEFAULT '{}',
    technical_assessment JSONB DEFAULT '{}',
    
    -- Audit fields
    evaluated_by UUID REFERENCES auth.users(id),
    evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_vendor_nomination UNIQUE(nomination_id, vendor_id)
);

-- Detailed criterion scores
CREATE TABLE criterion_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID NOT NULL REFERENCES vendor_evaluations(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES evaluation_criteria(id) ON DELETE CASCADE,
    
    score DECIMAL(5,2) NOT NULL DEFAULT 0,
    weighted_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    evidence_notes TEXT,
    
    scored_by UUID REFERENCES auth.users(id),
    scored_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_evaluation_criterion UNIQUE(evaluation_id, criterion_id)
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

CREATE INDEX idx_nominations_user_project ON supplier_nominations(user_id, project_id);
CREATE INDEX idx_nominations_status ON supplier_nominations(status);
CREATE INDEX idx_evaluations_nomination ON vendor_evaluations(nomination_id);
CREATE INDEX idx_evaluations_vendor ON vendor_evaluations(vendor_id);
CREATE INDEX idx_evaluations_rank ON vendor_evaluations(nomination_id, final_rank);
CREATE INDEX idx_criteria_nomination ON evaluation_criteria(nomination_id, display_order);
CREATE INDEX idx_scores_evaluation ON criterion_scores(evaluation_id);

-- ===============================================
-- RLS POLICIES
-- ===============================================

-- Enable RLS
ALTER TABLE supplier_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE criterion_scores ENABLE ROW LEVEL SECURITY;

-- Policies for supplier_nominations
CREATE POLICY "Users can view own nominations" ON supplier_nominations 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create nominations" ON supplier_nominations 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nominations" ON supplier_nominations 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nominations" ON supplier_nominations 
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for evaluation_criteria
CREATE POLICY "Users can view criteria for their nominations" ON evaluation_criteria 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM supplier_nominations 
            WHERE id = nomination_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage criteria for their nominations" ON evaluation_criteria 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM supplier_nominations 
            WHERE id = nomination_id AND user_id = auth.uid()
        )
    );

-- Policies for vendor_evaluations
CREATE POLICY "Users can view evaluations for their nominations" ON vendor_evaluations 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM supplier_nominations 
            WHERE id = nomination_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage evaluations for their nominations" ON vendor_evaluations 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM supplier_nominations 
            WHERE id = nomination_id AND user_id = auth.uid()
        )
    );

-- Policies for criterion_scores
CREATE POLICY "Users can view scores for their evaluations" ON criterion_scores 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vendor_evaluations ve
            JOIN supplier_nominations sn ON sn.id = ve.nomination_id
            WHERE ve.id = evaluation_id AND sn.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage scores for their evaluations" ON criterion_scores 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM vendor_evaluations ve
            JOIN supplier_nominations sn ON sn.id = ve.nomination_id
            WHERE ve.id = evaluation_id AND sn.user_id = auth.uid()
        )
    );

-- ===============================================
-- TRIGGERS
-- ===============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nominations_updated_at
    BEFORE UPDATE ON supplier_nominations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_evaluations_updated_at
    BEFORE UPDATE ON vendor_evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate weighted scores
CREATE OR REPLACE FUNCTION calculate_weighted_score()
RETURNS TRIGGER AS $$
DECLARE
    criterion_weight DECIMAL(5,2);
BEGIN
    -- Get the weight percentage for this criterion
    SELECT weight_percentage INTO criterion_weight
    FROM evaluation_criteria 
    WHERE id = NEW.criterion_id;
    
    -- Calculate weighted score
    NEW.weighted_score = (NEW.score * criterion_weight) / 100;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_criterion_weighted_score
    BEFORE INSERT OR UPDATE ON criterion_scores
    FOR EACH ROW EXECUTE FUNCTION calculate_weighted_score();