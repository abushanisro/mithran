-- ===============================================
-- SUPPLIER NOMINATIONS RPC FUNCTIONS
-- Production-ready stored procedures
-- ===============================================

-- ===============================================
-- NOMINATION MANAGEMENT
-- ===============================================

-- Create new supplier nomination with default criteria
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
    -- Create nomination
    INSERT INTO supplier_nominations (user_id, project_id, name, description)
    VALUES (auth.uid(), p_project_id, p_name, p_description)
    RETURNING id INTO v_nomination_id;
    
    -- Create default evaluation criteria
    INSERT INTO evaluation_criteria (nomination_id, category, name, weight_percentage, display_order) VALUES
    (v_nomination_id, 'cost_analysis', 'Cost Competency', 70.00, 1),
    (v_nomination_id, 'vendor_rating', 'Vendor Rating', 20.00, 2),
    (v_nomination_id, 'technical_capability', 'Technical Capability', 10.00, 3);
    
    -- Return nomination details
    SELECT json_build_object(
        'id', id,
        'name', name,
        'description', description,
        'status', status,
        'created_at', created_at
    ) INTO v_result
    FROM supplier_nominations
    WHERE id = v_nomination_id;
    
    RETURN v_result;
END;
$$;

-- Get nomination with full evaluation details
CREATE OR REPLACE FUNCTION get_nomination_details(p_nomination_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'nomination', nomination_data,
        'criteria', criteria_data,
        'evaluations', evaluation_data
    ) INTO v_result
    FROM (
        -- Nomination data
        SELECT json_build_object(
            'id', sn.id,
            'name', sn.name,
            'description', sn.description,
            'status', sn.status,
            'created_at', sn.created_at,
            'updated_at', sn.updated_at
        ) as nomination_data
        FROM supplier_nominations sn
        WHERE sn.id = p_nomination_id AND sn.user_id = auth.uid()
    ) nom,
    (
        -- Criteria data
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', ec.id,
                'category', ec.category,
                'name', ec.name,
                'weight_percentage', ec.weight_percentage,
                'max_score', ec.max_score,
                'is_mandatory', ec.is_mandatory,
                'display_order', ec.display_order
            ) ORDER BY ec.display_order
        ), '[]'::json) as criteria_data
        FROM evaluation_criteria ec
        WHERE ec.nomination_id = p_nomination_id
    ) crit,
    (
        -- Evaluation data with scores
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', ve.id,
                'vendor_id', ve.vendor_id,
                'overall_score', ve.overall_score,
                'cost_score', ve.cost_score,
                'vendor_rating_score', ve.vendor_rating_score,
                'capability_score', ve.capability_score,
                'technical_score', ve.technical_score,
                'risk_level', ve.risk_level,
                'recommendation', ve.recommendation,
                'final_rank', ve.final_rank,
                'cost_analysis', ve.cost_analysis,
                'rating_engine', ve.rating_engine,
                'technical_assessment', ve.technical_assessment,
                'scores', COALESCE(score_data, '[]'::json)
            ) ORDER BY ve.final_rank NULLS LAST, ve.overall_score DESC
        ), '[]'::json) as evaluation_data
        FROM vendor_evaluations ve
        LEFT JOIN (
            SELECT 
                cs.evaluation_id,
                json_agg(
                    json_build_object(
                        'criterion_id', cs.criterion_id,
                        'score', cs.score,
                        'weighted_score', cs.weighted_score,
                        'evidence_notes', cs.evidence_notes
                    ) ORDER BY ec.display_order
                ) as score_data
            FROM criterion_scores cs
            JOIN evaluation_criteria ec ON ec.id = cs.criterion_id
            GROUP BY cs.evaluation_id
        ) scores ON scores.evaluation_id = ve.id
        WHERE ve.nomination_id = p_nomination_id
    ) eval;
    
    RETURN v_result;
END;
$$;

-- ===============================================
-- VENDOR EVALUATION MANAGEMENT
-- ===============================================

-- Add vendor to nomination
CREATE OR REPLACE FUNCTION add_vendor_to_nomination(
    p_nomination_id UUID,
    p_vendor_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_evaluation_id UUID;
    v_result JSON;
BEGIN
    -- Verify nomination ownership
    IF NOT EXISTS (
        SELECT 1 FROM supplier_nominations 
        WHERE id = p_nomination_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Nomination not found or access denied';
    END IF;
    
    -- Insert vendor evaluation
    INSERT INTO vendor_evaluations (nomination_id, vendor_id)
    VALUES (p_nomination_id, p_vendor_id)
    RETURNING id INTO v_evaluation_id;
    
    -- Create default criterion scores
    INSERT INTO criterion_scores (evaluation_id, criterion_id, score)
    SELECT v_evaluation_id, ec.id, 0
    FROM evaluation_criteria ec
    WHERE ec.nomination_id = p_nomination_id;
    
    -- Return evaluation details
    SELECT json_build_object(
        'id', id,
        'vendor_id', vendor_id,
        'overall_score', overall_score,
        'created_at', created_at
    ) INTO v_result
    FROM vendor_evaluations
    WHERE id = v_evaluation_id;
    
    RETURN v_result;
END;
$$;

-- Update evaluation scores and recalculate
CREATE OR REPLACE FUNCTION update_evaluation_scores(
    p_evaluation_id UUID,
    p_scores JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_score_item JSON;
    v_total_weighted_score DECIMAL(5,2) := 0;
    v_cost_total DECIMAL(5,2) := 0;
    v_vendor_total DECIMAL(5,2) := 0;
    v_capability_total DECIMAL(5,2) := 0;
    v_technical_total DECIMAL(5,2) := 0;
    v_result JSON;
BEGIN
    -- Verify evaluation ownership
    IF NOT EXISTS (
        SELECT 1 FROM vendor_evaluations ve
        JOIN supplier_nominations sn ON sn.id = ve.nomination_id
        WHERE ve.id = p_evaluation_id AND sn.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Evaluation not found or access denied';
    END IF;
    
    -- Update individual criterion scores
    FOR v_score_item IN SELECT json_array_elements(p_scores)
    LOOP
        UPDATE criterion_scores 
        SET 
            score = (v_score_item->>'score')::DECIMAL,
            evidence_notes = v_score_item->>'evidence_notes',
            scored_by = auth.uid(),
            scored_at = NOW()
        WHERE evaluation_id = p_evaluation_id 
        AND criterion_id = (v_score_item->>'criterion_id')::UUID;
    END LOOP;
    
    -- Calculate category totals and overall score
    SELECT 
        COALESCE(SUM(cs.weighted_score), 0),
        COALESCE(SUM(CASE WHEN ec.category = 'cost_analysis' THEN cs.weighted_score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN ec.category = 'vendor_rating' THEN cs.weighted_score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN ec.category = 'technical_capability' THEN cs.weighted_score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN ec.category IN ('quality_systems', 'delivery_performance') THEN cs.weighted_score ELSE 0 END), 0)
    INTO v_total_weighted_score, v_cost_total, v_vendor_total, v_capability_total, v_technical_total
    FROM criterion_scores cs
    JOIN evaluation_criteria ec ON ec.id = cs.criterion_id
    WHERE cs.evaluation_id = p_evaluation_id;
    
    -- Update evaluation summary
    UPDATE vendor_evaluations 
    SET 
        overall_score = v_total_weighted_score,
        cost_score = v_cost_total,
        vendor_rating_score = v_vendor_total,
        capability_score = v_capability_total,
        technical_score = v_technical_total,
        evaluated_by = auth.uid(),
        evaluated_at = NOW()
    WHERE id = p_evaluation_id;
    
    -- Recalculate rankings for this nomination
    PERFORM recalculate_vendor_rankings((
        SELECT nomination_id FROM vendor_evaluations WHERE id = p_evaluation_id
    ));
    
    -- Return updated evaluation
    SELECT json_build_object(
        'id', id,
        'overall_score', overall_score,
        'cost_score', cost_score,
        'vendor_rating_score', vendor_rating_score,
        'capability_score', capability_score,
        'technical_score', technical_score,
        'final_rank', final_rank
    ) INTO v_result
    FROM vendor_evaluations
    WHERE id = p_evaluation_id;
    
    RETURN v_result;
END;
$$;

-- ===============================================
-- COST ENGINE FUNCTIONS
-- ===============================================

-- Update cost analysis data
CREATE OR REPLACE FUNCTION update_cost_analysis(
    p_evaluation_id UUID,
    p_cost_data JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost_score DECIMAL(5,2);
    v_result JSON;
BEGIN
    -- Calculate cost score based on analysis
    v_cost_score := CASE 
        WHEN (p_cost_data->>'cost_per_unit')::DECIMAL > 0 THEN
            LEAST(100, (1000 / (p_cost_data->>'cost_per_unit')::DECIMAL) * 10)
        ELSE 0
    END;
    
    -- Update evaluation with cost data
    UPDATE vendor_evaluations 
    SET 
        cost_analysis = p_cost_data,
        cost_score = v_cost_score
    WHERE id = p_evaluation_id;
    
    SELECT json_build_object(
        'cost_score', cost_score,
        'cost_analysis', cost_analysis
    ) INTO v_result
    FROM vendor_evaluations
    WHERE id = p_evaluation_id;
    
    RETURN v_result;
END;
$$;

-- ===============================================
-- RATING ENGINE FUNCTIONS  
-- ===============================================

-- Update vendor rating analysis
CREATE OR REPLACE FUNCTION update_rating_engine(
    p_evaluation_id UUID,
    p_rating_data JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rating_score DECIMAL(5,2);
    v_risk_level risk_level;
BEGIN
    -- Calculate rating score
    v_rating_score := COALESCE((p_rating_data->>'overall_rating')::DECIMAL, 0);
    
    -- Determine risk level
    v_risk_level := CASE 
        WHEN v_rating_score >= 85 THEN 'low'::risk_level
        WHEN v_rating_score >= 70 THEN 'medium'::risk_level
        WHEN v_rating_score >= 50 THEN 'high'::risk_level
        ELSE 'critical'::risk_level
    END;
    
    -- Update evaluation
    UPDATE vendor_evaluations 
    SET 
        rating_engine = p_rating_data,
        vendor_rating_score = v_rating_score,
        risk_level = v_risk_level
    WHERE id = p_evaluation_id;
    
    RETURN json_build_object(
        'vendor_rating_score', v_rating_score,
        'risk_level', v_risk_level,
        'rating_engine', p_rating_data
    );
END;
$$;

-- ===============================================
-- RANKING SYSTEM
-- ===============================================

-- Recalculate vendor rankings for a nomination
CREATE OR REPLACE FUNCTION recalculate_vendor_rankings(p_nomination_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update rankings based on overall score
    WITH ranked_vendors AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY overall_score DESC, created_at ASC) as new_rank
        FROM vendor_evaluations 
        WHERE nomination_id = p_nomination_id
    )
    UPDATE vendor_evaluations ve
    SET final_rank = rv.new_rank
    FROM ranked_vendors rv
    WHERE ve.id = rv.id;
    
    -- Auto-set recommendations based on rank
    UPDATE vendor_evaluations 
    SET recommendation = CASE 
        WHEN final_rank = 1 AND overall_score >= 70 THEN 'approved'::recommendation_type
        WHEN final_rank <= 3 AND overall_score >= 60 THEN 'conditional'::recommendation_type
        WHEN overall_score < 40 THEN 'rejected'::recommendation_type
        ELSE 'pending'::recommendation_type
    END
    WHERE nomination_id = p_nomination_id;
END;
$$;

-- ===============================================
-- ANALYTICS & REPORTING
-- ===============================================

-- Get nomination analytics
CREATE OR REPLACE FUNCTION get_nomination_analytics(p_nomination_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
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
        ),
        'risk_distribution', json_build_object(
            'low', COUNT(*) FILTER (WHERE risk_level = 'low'),
            'medium', COUNT(*) FILTER (WHERE risk_level = 'medium'),
            'high', COUNT(*) FILTER (WHERE risk_level = 'high'),
            'critical', COUNT(*) FILTER (WHERE risk_level = 'critical')
        )
    ) INTO v_result
    FROM vendor_evaluations
    WHERE nomination_id = p_nomination_id;
    
    RETURN v_result;
END;
$$;