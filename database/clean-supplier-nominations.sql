-- ===============================================
-- CLEAN SUPPLIER NOMINATIONS SYSTEM
-- Handles existing objects safely
-- ===============================================

-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS trigger_update_nomination_bom_parts_updated_at ON supplier_nomination_bom_parts;
DROP TRIGGER IF EXISTS update_nominations_updated_at ON supplier_nominations;
DROP TRIGGER IF EXISTS update_evaluations_updated_at ON vendor_evaluations;
DROP TRIGGER IF EXISTS calculate_criterion_weighted_score ON criterion_scores;

DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS calculate_weighted_score() CASCADE;
DROP FUNCTION IF EXISTS create_supplier_nomination(UUID, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_nomination_details(UUID) CASCADE;
DROP FUNCTION IF EXISTS add_vendor_to_nomination(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_evaluation_scores(UUID, JSON) CASCADE;
DROP FUNCTION IF EXISTS update_cost_analysis(UUID, JSON) CASCADE;
DROP FUNCTION IF EXISTS update_rating_engine(UUID, JSON) CASCADE;
DROP FUNCTION IF EXISTS recalculate_vendor_rankings(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_nomination_analytics(UUID) CASCADE;

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS criterion_scores CASCADE;
DROP TABLE IF EXISTS vendor_evaluations CASCADE;
DROP TABLE IF EXISTS evaluation_criteria CASCADE;
DROP TABLE IF EXISTS supplier_nominations CASCADE;

-- Drop types
DROP TYPE IF EXISTS nomination_status CASCADE;
DROP TYPE IF EXISTS evaluation_category CASCADE;
DROP TYPE IF EXISTS risk_level CASCADE;
DROP TYPE IF EXISTS recommendation_type CASCADE;

-- ===============================================
-- RECREATE CLEAN SYSTEM
-- ===============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create types
CREATE TYPE nomination_status AS ENUM ('draft', 'active', 'evaluation', 'completed', 'archived');
CREATE TYPE evaluation_category AS ENUM ('cost_analysis', 'vendor_rating', 'technical_capability', 'quality_systems', 'delivery_performance');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE recommendation_type AS ENUM ('approved', 'conditional', 'rejected', 'pending');

-- Create tables
CREATE TABLE supplier_nominations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status nomination_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT nomination_name_project_unique UNIQUE(project_id, name)
);

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

CREATE TABLE vendor_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomination_id UUID NOT NULL REFERENCES supplier_nominations(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL,
    overall_score DECIMAL(5,2) DEFAULT 0,
    cost_score DECIMAL(5,2) DEFAULT 0,
    vendor_rating_score DECIMAL(5,2) DEFAULT 0,
    capability_score DECIMAL(5,2) DEFAULT 0,
    technical_score DECIMAL(5,2) DEFAULT 0,
    risk_level risk_level DEFAULT 'medium',
    risk_mitigation_notes TEXT,
    recommendation recommendation_type DEFAULT 'pending',
    final_rank INTEGER,
    cost_analysis JSONB DEFAULT '{}',
    rating_engine JSONB DEFAULT '{}',
    technical_assessment JSONB DEFAULT '{}',
    evaluated_by UUID REFERENCES auth.users(id),
    evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_vendor_nomination UNIQUE(nomination_id, vendor_id)
);

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

-- Create indexes
CREATE INDEX idx_nominations_user_project ON supplier_nominations(user_id, project_id);
CREATE INDEX idx_nominations_status ON supplier_nominations(status);
CREATE INDEX idx_evaluations_nomination ON vendor_evaluations(nomination_id);
CREATE INDEX idx_evaluations_vendor ON vendor_evaluations(vendor_id);
CREATE INDEX idx_evaluations_rank ON vendor_evaluations(nomination_id, final_rank);
CREATE INDEX idx_criteria_nomination ON evaluation_criteria(nomination_id, display_order);
CREATE INDEX idx_scores_evaluation ON criterion_scores(evaluation_id);

-- Enable RLS
ALTER TABLE supplier_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE criterion_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own nominations" ON supplier_nominations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage criteria for their nominations" ON evaluation_criteria FOR ALL USING (
    EXISTS (SELECT 1 FROM supplier_nominations WHERE id = nomination_id AND user_id = auth.uid())
);

CREATE POLICY "Users can manage evaluations for their nominations" ON vendor_evaluations FOR ALL USING (
    EXISTS (SELECT 1 FROM supplier_nominations WHERE id = nomination_id AND user_id = auth.uid())
);

CREATE POLICY "Users can manage scores for their evaluations" ON criterion_scores FOR ALL USING (
    EXISTS (
        SELECT 1 FROM vendor_evaluations ve
        JOIN supplier_nominations sn ON sn.id = ve.nomination_id
        WHERE ve.id = evaluation_id AND sn.user_id = auth.uid()
    )
);

-- ===============================================
-- FUNCTIONS
-- ===============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Weighted score calculation
CREATE OR REPLACE FUNCTION calculate_weighted_score()
RETURNS TRIGGER AS $$
DECLARE
    criterion_weight DECIMAL(5,2);
BEGIN
    SELECT weight_percentage INTO criterion_weight
    FROM evaluation_criteria 
    WHERE id = NEW.criterion_id;
    
    NEW.weighted_score = (NEW.score * COALESCE(criterion_weight, 0)) / 100;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create nomination
CREATE OR REPLACE FUNCTION create_supplier_nomination(
    p_project_id UUID,
    p_name VARCHAR(255),
    p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_nomination_id UUID;
    v_result JSON;
BEGIN
    INSERT INTO supplier_nominations (user_id, project_id, name, description)
    VALUES (auth.uid(), p_project_id, p_name, p_description)
    RETURNING id INTO v_nomination_id;
    
    -- Create default criteria
    INSERT INTO evaluation_criteria (nomination_id, category, name, weight_percentage, display_order) VALUES
    (v_nomination_id, 'cost_analysis', 'Cost Competency', 70.00, 1),
    (v_nomination_id, 'vendor_rating', 'Vendor Rating', 20.00, 2),
    (v_nomination_id, 'technical_capability', 'Technical Capability', 10.00, 3);
    
    SELECT json_build_object(
        'id', id, 'name', name, 'description', description, 'status', status, 'created_at', created_at
    ) INTO v_result FROM supplier_nominations WHERE id = v_nomination_id;
    
    RETURN v_result;
END;
$$;

-- Get nomination details
CREATE OR REPLACE FUNCTION get_nomination_details(p_nomination_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'nomination', (SELECT json_build_object(
                'id', id, 'name', name, 'description', description, 'status', status,
                'created_at', created_at, 'updated_at', updated_at
            ) FROM supplier_nominations WHERE id = p_nomination_id AND user_id = auth.uid()),
            
            'criteria', (SELECT COALESCE(json_agg(
                json_build_object(
                    'id', id, 'category', category, 'name', name, 'weight_percentage', weight_percentage,
                    'max_score', max_score, 'is_mandatory', is_mandatory, 'display_order', display_order
                ) ORDER BY display_order
            ), '[]'::json) FROM evaluation_criteria WHERE nomination_id = p_nomination_id),
            
            'evaluations', (SELECT COALESCE(json_agg(
                json_build_object(
                    'id', ve.id, 'vendor_id', ve.vendor_id, 'overall_score', ve.overall_score,
                    'cost_score', ve.cost_score, 'vendor_rating_score', ve.vendor_rating_score,
                    'capability_score', ve.capability_score, 'technical_score', ve.technical_score,
                    'risk_level', ve.risk_level, 'recommendation', ve.recommendation,
                    'final_rank', ve.final_rank, 'cost_analysis', ve.cost_analysis,
                    'rating_engine', ve.rating_engine, 'technical_assessment', ve.technical_assessment,
                    'scores', COALESCE((SELECT json_agg(json_build_object(
                        'criterion_id', cs.criterion_id, 'score', cs.score,
                        'weighted_score', cs.weighted_score, 'evidence_notes', cs.evidence_notes
                    )) FROM criterion_scores cs WHERE cs.evaluation_id = ve.id), '[]'::json)
                ) ORDER BY ve.final_rank NULLS LAST, ve.overall_score DESC
            ), '[]'::json) FROM vendor_evaluations ve WHERE ve.nomination_id = p_nomination_id)
        )
    );
END;
$$;

-- Add vendor
CREATE OR REPLACE FUNCTION add_vendor_to_nomination(p_nomination_id UUID, p_vendor_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_evaluation_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM supplier_nominations WHERE id = p_nomination_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    INSERT INTO vendor_evaluations (nomination_id, vendor_id)
    VALUES (p_nomination_id, p_vendor_id)
    RETURNING id INTO v_evaluation_id;
    
    INSERT INTO criterion_scores (evaluation_id, criterion_id, score)
    SELECT v_evaluation_id, id, 0
    FROM evaluation_criteria WHERE nomination_id = p_nomination_id;
    
    RETURN json_build_object('id', v_evaluation_id, 'vendor_id', p_vendor_id);
END;
$$;

-- Update scores
CREATE OR REPLACE FUNCTION update_evaluation_scores(p_evaluation_id UUID, p_scores JSON)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_score_item JSON;
    v_total_weighted DECIMAL(5,2) := 0;
    v_cost_total DECIMAL(5,2) := 0;
    v_vendor_total DECIMAL(5,2) := 0;
    v_capability_total DECIMAL(5,2) := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM vendor_evaluations ve
        JOIN supplier_nominations sn ON sn.id = ve.nomination_id
        WHERE ve.id = p_evaluation_id AND sn.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    FOR v_score_item IN SELECT json_array_elements(p_scores) LOOP
        UPDATE criterion_scores SET 
            score = (v_score_item->>'score')::DECIMAL,
            evidence_notes = v_score_item->>'evidence_notes',
            scored_by = auth.uid(),
            scored_at = NOW()
        WHERE evaluation_id = p_evaluation_id AND criterion_id = (v_score_item->>'criterion_id')::UUID;
    END LOOP;
    
    SELECT 
        COALESCE(SUM(cs.weighted_score), 0),
        COALESCE(SUM(CASE WHEN ec.category = 'cost_analysis' THEN cs.weighted_score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN ec.category = 'vendor_rating' THEN cs.weighted_score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN ec.category = 'technical_capability' THEN cs.weighted_score ELSE 0 END), 0)
    INTO v_total_weighted, v_cost_total, v_vendor_total, v_capability_total
    FROM criterion_scores cs
    JOIN evaluation_criteria ec ON ec.id = cs.criterion_id
    WHERE cs.evaluation_id = p_evaluation_id;
    
    UPDATE vendor_evaluations SET 
        overall_score = v_total_weighted,
        cost_score = v_cost_total,
        vendor_rating_score = v_vendor_total,
        capability_score = v_capability_total,
        evaluated_by = auth.uid(),
        evaluated_at = NOW()
    WHERE id = p_evaluation_id;
    
    RETURN json_build_object('overall_score', v_total_weighted, 'updated', true);
END;
$$;

-- Update cost analysis
CREATE OR REPLACE FUNCTION update_cost_analysis(p_evaluation_id UUID, p_cost_data JSON)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost_score DECIMAL(5,2);
BEGIN
    v_cost_score := CASE 
        WHEN (p_cost_data->>'cost_per_unit')::DECIMAL > 0 THEN
            LEAST(100, (1000 / (p_cost_data->>'cost_per_unit')::DECIMAL) * 10)
        ELSE 0 
    END;
    
    UPDATE vendor_evaluations SET 
        cost_analysis = p_cost_data,
        cost_score = v_cost_score
    WHERE id = p_evaluation_id;
    
    RETURN json_build_object('cost_score', v_cost_score, 'cost_analysis', p_cost_data);
END;
$$;

-- Update rating engine
CREATE OR REPLACE FUNCTION update_rating_engine(p_evaluation_id UUID, p_rating_data JSON)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rating_score DECIMAL(5,2);
    v_risk_level risk_level;
BEGIN
    v_rating_score := COALESCE((p_rating_data->>'overall_rating')::DECIMAL, 0);
    
    v_risk_level := CASE 
        WHEN v_rating_score >= 85 THEN 'low'::risk_level
        WHEN v_rating_score >= 70 THEN 'medium'::risk_level
        WHEN v_rating_score >= 50 THEN 'high'::risk_level
        ELSE 'critical'::risk_level
    END;
    
    UPDATE vendor_evaluations SET 
        rating_engine = p_rating_data,
        vendor_rating_score = v_rating_score,
        risk_level = v_risk_level
    WHERE id = p_evaluation_id;
    
    RETURN json_build_object('vendor_rating_score', v_rating_score, 'risk_level', v_risk_level);
END;
$$;

-- Get analytics
CREATE OR REPLACE FUNCTION get_nomination_analytics(p_nomination_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'total_vendors', COUNT(*),
            'avg_overall_score', ROUND(AVG(overall_score), 2),
            'avg_cost_score', ROUND(AVG(cost_score), 2),
            'avg_vendor_rating', ROUND(AVG(vendor_rating_score), 2),
            'avg_capability_score', ROUND(AVG(capability_score), 2),
            'recommendations', json_build_object(
                'approved', COUNT(*) FILTER (WHERE recommendation = 'approved'),
                'conditional', COUNT(*) FILTER (WHERE recommendation = 'conditional'),
                'rejected', COUNT(*) FILTER (WHERE recommendation = 'rejected'),
                'pending', COUNT(*) FILTER (WHERE recommendation = 'pending')
            )
        )
        FROM vendor_evaluations
        WHERE nomination_id = p_nomination_id
    );
END;
$$;

-- Create triggers
CREATE TRIGGER update_nominations_updated_at
    BEFORE UPDATE ON supplier_nominations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_evaluations_updated_at
    BEFORE UPDATE ON vendor_evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER calculate_criterion_weighted_score
    BEFORE INSERT OR UPDATE ON criterion_scores
    FOR EACH ROW EXECUTE FUNCTION calculate_weighted_score();

-- ===============================================
-- SUCCESS MESSAGE
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE 'Supplier Nominations System installed successfully!';
    RAISE NOTICE 'Tables created: supplier_nominations, evaluation_criteria, vendor_evaluations, criterion_scores';
    RAISE NOTICE 'Functions created: create_supplier_nomination, get_nomination_details, add_vendor_to_nomination, update_evaluation_scores, update_cost_analysis, update_rating_engine, get_nomination_analytics';
    RAISE NOTICE 'Ready to use with your frontend application.';
END $$;