-- ===============================================
-- CALCULATION FUNCTIONS 
-- Match frontend logic exactly for database storage
-- ===============================================

-- Calculate cost score based on criteria scores
CREATE OR REPLACE FUNCTION get_cost_score(p_vendor_evaluation_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cost_score DECIMAL(5,2) := 0;
    v_count INTEGER := 0;
BEGIN
    -- Get cost-related criteria scores
    SELECT 
        COALESCE(AVG((ves.score / ves.max_possible_score) * 100), 0),
        COUNT(*)
    INTO v_cost_score, v_count
    FROM vendor_evaluation_scores ves
    JOIN nomination_evaluation_criteria nec ON nec.id = ves.criteria_id
    WHERE ves.vendor_nomination_evaluation_id = p_vendor_evaluation_id
    AND (LOWER(nec.criteria_name) LIKE '%cost%' 
         OR LOWER(nec.criteria_name) LIKE '%price%' 
         OR LOWER(nec.criteria_name) LIKE '%budget%'
         OR nec.criteria_category = 'cost_analysis');
    
    -- Fallback to capability_percentage if no cost criteria found
    IF v_count = 0 THEN
        SELECT COALESCE(capability_percentage, 0) 
        INTO v_cost_score
        FROM vendor_nomination_evaluations 
        WHERE id = p_vendor_evaluation_id;
    END IF;
    
    RETURN v_cost_score;
END;
$$;

-- Calculate vendor rating score
CREATE OR REPLACE FUNCTION get_vendor_rating_score(p_vendor_evaluation_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_vendor_score DECIMAL(5,2) := 0;
    v_count INTEGER := 0;
BEGIN
    -- Get vendor/quality-related criteria scores
    SELECT 
        COALESCE(AVG((ves.score / ves.max_possible_score) * 100), 0),
        COUNT(*)
    INTO v_vendor_score, v_count
    FROM vendor_evaluation_scores ves
    JOIN nomination_evaluation_criteria nec ON nec.id = ves.criteria_id
    WHERE ves.vendor_nomination_evaluation_id = p_vendor_evaluation_id
    AND (LOWER(nec.criteria_name) LIKE '%vendor%' 
         OR LOWER(nec.criteria_name) LIKE '%quality%'
         OR LOWER(nec.criteria_name) LIKE '%rating%'
         OR nec.criteria_category = 'vendor_rating');
    
    -- Fallback to risk_mitigation_percentage if no vendor criteria found
    IF v_count = 0 THEN
        SELECT COALESCE(risk_mitigation_percentage, 0) 
        INTO v_vendor_score
        FROM vendor_nomination_evaluations 
        WHERE id = p_vendor_evaluation_id;
    END IF;
    
    RETURN v_vendor_score;
END;
$$;

-- Calculate capability score
CREATE OR REPLACE FUNCTION get_capability_score(p_vendor_evaluation_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_capability_score DECIMAL(5,2) := 0;
    v_count INTEGER := 0;
BEGIN
    -- Get capability/technical-related criteria scores
    SELECT 
        COALESCE(AVG((ves.score / ves.max_possible_score) * 100), 0),
        COUNT(*)
    INTO v_capability_score, v_count
    FROM vendor_evaluation_scores ves
    JOIN nomination_evaluation_criteria nec ON nec.id = ves.criteria_id
    WHERE ves.vendor_nomination_evaluation_id = p_vendor_evaluation_id
    AND (LOWER(nec.criteria_name) LIKE '%capability%' 
         OR LOWER(nec.criteria_name) LIKE '%technical%'
         OR LOWER(nec.criteria_name) LIKE '%feasibility%'
         OR LOWER(nec.criteria_name) LIKE '%manufacturing%'
         OR nec.criteria_category = 'technical_capability');
    
    -- Fallback to technical_feasibility_score if no capability criteria found
    IF v_count = 0 THEN
        SELECT COALESCE(technical_feasibility_score, 0) 
        INTO v_capability_score
        FROM vendor_nomination_evaluations 
        WHERE id = p_vendor_evaluation_id;
    END IF;
    
    RETURN v_capability_score;
END;
$$;

-- Calculate overall score with weights (matching frontend logic)
CREATE OR REPLACE FUNCTION calculate_overall_score_with_weights(
    p_vendor_evaluation_id UUID,
    p_cost_weight DECIMAL(5,2) DEFAULT 70.00,
    p_vendor_weight DECIMAL(5,2) DEFAULT 20.00,
    p_capability_weight DECIMAL(5,2) DEFAULT 10.00
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cost_score DECIMAL(5,2);
    v_vendor_score DECIMAL(5,2);
    v_capability_score DECIMAL(5,2);
    v_overall_score DECIMAL(5,2);
BEGIN
    -- Get individual scores
    v_cost_score := get_cost_score(p_vendor_evaluation_id);
    v_vendor_score := get_vendor_rating_score(p_vendor_evaluation_id);
    v_capability_score := get_capability_score(p_vendor_evaluation_id);
    
    -- Calculate weighted overall score
    v_overall_score := (
        (v_cost_score * p_cost_weight / 100) + 
        (v_vendor_score * p_vendor_weight / 100) + 
        (v_capability_score * p_capability_weight / 100)
    );
    
    RETURN v_overall_score;
END;
$$;