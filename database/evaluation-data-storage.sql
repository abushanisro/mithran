-- ===============================================
-- EVALUATION DATA STORAGE FUNCTIONS
-- Store Overview, Cost Analysis, Rating Engine, Capability, Technical
-- ===============================================

-- Store comprehensive evaluation data
CREATE OR REPLACE FUNCTION store_evaluation_data(
    p_vendor_evaluation_id UUID,
    p_overview_data JSONB DEFAULT '{}',
    p_cost_analysis JSONB DEFAULT '{}',
    p_rating_engine JSONB DEFAULT '{}',
    p_capability_data JSONB DEFAULT '{}',
    p_technical_data JSONB DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost_score DECIMAL(5,2) := 0;
    v_vendor_rating DECIMAL(5,2) := 0;
    v_capability_score DECIMAL(5,2) := 0;
    v_technical_score DECIMAL(5,2) := 0;
    v_overall_score DECIMAL(5,2) := 0;
    v_risk_level risk_level := 'medium';
    v_recommendation recommendation := 'pending';
    v_result JSON;
BEGIN
    -- Extract scores from the data
    v_cost_score := COALESCE((p_cost_analysis->>'cost_score')::DECIMAL, (p_cost_analysis->>'cost_competitiveness')::DECIMAL, 0);
    v_vendor_rating := COALESCE((p_rating_engine->>'overall_rating')::DECIMAL, (p_rating_engine->>'vendor_score')::DECIMAL, 0);
    v_capability_score := COALESCE((p_capability_data->>'capability_score')::DECIMAL, (p_capability_data->>'overall_capability')::DECIMAL, 0);
    v_technical_score := COALESCE((p_technical_data->>'technical_score')::DECIMAL, (p_technical_data->>'feasibility_score')::DECIMAL, 0);
    
    -- Calculate overall score with 70/20/10 weighting
    v_overall_score := (v_cost_score * 0.70) + (v_vendor_rating * 0.20) + (v_capability_score * 0.10);
    
    -- Determine risk level based on vendor rating
    v_risk_level := CASE 
        WHEN v_vendor_rating >= 85 THEN 'low'::risk_level
        WHEN v_vendor_rating >= 70 THEN 'medium'::risk_level
        WHEN v_vendor_rating >= 50 THEN 'high'::risk_level
        ELSE 'critical'::risk_level
    END;
    
    -- Determine recommendation based on overall score
    v_recommendation := CASE 
        WHEN v_overall_score >= 80 THEN 'approved'::recommendation
        WHEN v_overall_score >= 60 THEN 'conditional'::recommendation
        WHEN v_overall_score >= 40 THEN 'pending'::recommendation
        ELSE 'rejected'::recommendation
    END;
    
    -- Update vendor evaluation with all data
    UPDATE vendor_nomination_evaluations SET
        overall_score = v_overall_score,
        risk_level = v_risk_level,
        recommendation = v_recommendation,
        capability_percentage = v_cost_score,
        risk_mitigation_percentage = v_vendor_rating,
        technical_feasibility_score = v_capability_score,
        evaluation_notes = COALESCE(p_overview_data->>'notes', evaluation_notes),
        technical_discussion = COALESCE(p_technical_data->>'discussion', technical_discussion),
        updated_at = NOW()
    WHERE id = p_vendor_evaluation_id;
    
    -- Store detailed data in JSONB fields
    UPDATE vendor_nomination_evaluations SET
        cost_analysis = COALESCE(p_cost_analysis, '{}'),
        rating_engine = COALESCE(p_rating_engine, '{}'),
        technical_assessment = COALESCE(p_technical_data, '{}')
    WHERE id = p_vendor_evaluation_id;
    
    -- Recalculate rankings
    PERFORM recalculate_vendor_rankings((
        SELECT nomination_evaluation_id 
        FROM vendor_nomination_evaluations 
        WHERE id = p_vendor_evaluation_id
    ));
    
    -- Return updated evaluation data
    SELECT json_build_object(
        'id', id,
        'overall_score', overall_score,
        'cost_score', capability_percentage,
        'vendor_rating_score', risk_mitigation_percentage,
        'capability_score', technical_feasibility_score,
        'technical_score', technical_feasibility_score,
        'risk_level', risk_level,
        'recommendation', recommendation,
        'final_rank', overall_rank,
        'overview', json_build_object(
            'notes', evaluation_notes,
            'overall_score', overall_score,
            'rank', overall_rank,
            'recommendation', recommendation
        ),
        'cost_analysis', cost_analysis,
        'rating_engine', rating_engine,
        'capability', json_build_object(
            'score', technical_feasibility_score,
            'details', technical_assessment
        ),
        'technical', technical_assessment
    ) INTO v_result
    FROM vendor_nomination_evaluations
    WHERE id = p_vendor_evaluation_id;
    
    RETURN v_result;
END;
$$;

-- Get complete evaluation data
CREATE OR REPLACE FUNCTION get_evaluation_data(p_vendor_evaluation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'id', ve.id,
        'vendor_id', ve.vendor_id,
        'overall_score', ve.overall_score,
        'final_rank', ve.overall_rank,
        'overview', json_build_object(
            'overall_score', ve.overall_score,
            'rank', ve.overall_rank,
            'recommendation', ve.recommendation,
            'risk_level', ve.risk_level,
            'evaluation_notes', ve.evaluation_notes,
            'last_updated', ve.updated_at
        ),
        'cost_analysis', json_build_object(
            'score', ve.capability_percentage,
            'weight_percentage', 70,
            'details', ve.cost_analysis,
            'cost_per_unit', ve.cost_analysis->>'cost_per_unit',
            'total_cost', ve.cost_analysis->>'total_cost',
            'cost_competitiveness', ve.cost_analysis->>'cost_competitiveness'
        ),
        'rating_engine', json_build_object(
            'score', ve.risk_mitigation_percentage,
            'weight_percentage', 20,
            'details', ve.rating_engine,
            'overall_rating', ve.rating_engine->>'overall_rating',
            'quality_rating', ve.rating_engine->>'quality_rating',
            'delivery_rating', ve.rating_engine->>'delivery_rating',
            'risk_level', ve.risk_level,
            'minor_nc_count', ve.minor_nc_count,
            'major_nc_count', ve.major_nc_count
        ),
        'capability', json_build_object(
            'score', ve.technical_feasibility_score,
            'weight_percentage', 10,
            'details', ve.technical_assessment,
            'manufacturing_capability', ve.technical_assessment->>'manufacturing_capability',
            'process_maturity', ve.technical_assessment->>'process_maturity',
            'equipment_quality', ve.technical_assessment->>'equipment_quality'
        ),
        'technical', json_build_object(
            'score', ve.technical_feasibility_score,
            'discussion', ve.technical_discussion,
            'details', ve.technical_assessment,
            'feasibility_score', ve.technical_assessment->>'feasibility_score',
            'innovation_capacity', ve.technical_assessment->>'innovation_capacity',
            'technical_capabilities', ve.technical_assessment->>'capabilities'
        ),
        'criteria_scores', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'criterion_id', cs.criteria_id,
                    'criterion_name', nec.criteria_name,
                    'category', nec.criteria_category,
                    'score', cs.score,
                    'max_score', cs.max_possible_score,
                    'weighted_score', cs.weighted_score,
                    'weight_percentage', nec.weight_percentage,
                    'evidence_notes', cs.evidence_text
                ) ORDER BY nec.display_order
            )
            FROM vendor_evaluation_scores cs
            JOIN nomination_evaluation_criteria nec ON nec.id = cs.criteria_id
            WHERE cs.vendor_nomination_evaluation_id = ve.id
        ), '[]'::json)
    ) INTO v_result
    FROM vendor_nomination_evaluations ve
    WHERE ve.id = p_vendor_evaluation_id;
    
    RETURN v_result;
END;
$$;

-- Update specific evaluation section
CREATE OR REPLACE FUNCTION update_evaluation_section(
    p_vendor_evaluation_id UUID,
    p_section VARCHAR(50),
    p_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    CASE p_section
        WHEN 'overview' THEN
            UPDATE vendor_nomination_evaluations SET
                evaluation_notes = p_data->>'notes',
                updated_at = NOW()
            WHERE id = p_vendor_evaluation_id;
            
        WHEN 'cost_analysis' THEN
            UPDATE vendor_nomination_evaluations SET
                cost_analysis = p_data,
                capability_percentage = COALESCE((p_data->>'cost_score')::DECIMAL, capability_percentage),
                updated_at = NOW()
            WHERE id = p_vendor_evaluation_id;
            
        WHEN 'rating_engine' THEN
            UPDATE vendor_nomination_evaluations SET
                rating_engine = p_data,
                risk_mitigation_percentage = COALESCE((p_data->>'overall_rating')::DECIMAL, risk_mitigation_percentage),
                risk_level = CASE 
                    WHEN (p_data->>'overall_rating')::DECIMAL >= 85 THEN 'low'::risk_level
                    WHEN (p_data->>'overall_rating')::DECIMAL >= 70 THEN 'medium'::risk_level
                    WHEN (p_data->>'overall_rating')::DECIMAL >= 50 THEN 'high'::risk_level
                    ELSE 'critical'::risk_level
                END,
                minor_nc_count = COALESCE((p_data->>'minor_nc_count')::INTEGER, minor_nc_count),
                major_nc_count = COALESCE((p_data->>'major_nc_count')::INTEGER, major_nc_count),
                updated_at = NOW()
            WHERE id = p_vendor_evaluation_id;
            
        WHEN 'capability' THEN
            UPDATE vendor_nomination_evaluations SET
                technical_assessment = json_build_object(
                    'capability_score', p_data->>'score',
                    'manufacturing_capability', p_data->>'manufacturing_capability',
                    'process_maturity', p_data->>'process_maturity',
                    'equipment_quality', p_data->>'equipment_quality'
                ),
                technical_feasibility_score = COALESCE((p_data->>'score')::DECIMAL, technical_feasibility_score),
                updated_at = NOW()
            WHERE id = p_vendor_evaluation_id;
            
        WHEN 'technical' THEN
            UPDATE vendor_nomination_evaluations SET
                technical_discussion = p_data->>'discussion',
                technical_assessment = technical_assessment || p_data,
                technical_feasibility_score = COALESCE((p_data->>'technical_score')::DECIMAL, technical_feasibility_score),
                updated_at = NOW()
            WHERE id = p_vendor_evaluation_id;
    END CASE;
    
    -- Recalculate overall score
    PERFORM store_evaluation_data(
        p_vendor_evaluation_id,
        '{}',
        COALESCE((SELECT cost_analysis FROM vendor_nomination_evaluations WHERE id = p_vendor_evaluation_id), '{}'),
        COALESCE((SELECT rating_engine FROM vendor_nomination_evaluations WHERE id = p_vendor_evaluation_id), '{}'),
        '{}',
        COALESCE((SELECT technical_assessment FROM vendor_nomination_evaluations WHERE id = p_vendor_evaluation_id), '{}')
    );
    
    -- Return updated section data
    v_result := get_evaluation_data(p_vendor_evaluation_id);
    RETURN v_result;
END;
$$;