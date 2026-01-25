-- Vendor Rating System Migration
-- Industry best practices for vendor evaluation and rating management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- VENDOR RATINGS TABLE
-- =====================================================
CREATE TABLE vendor_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL,
    project_id UUID,
    user_email VARCHAR(255) NOT NULL, -- Use email instead of user_id since we have authorized_users
    
    -- Rating Categories (Industry Standard)
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    cost_rating INTEGER CHECK (cost_rating >= 1 AND cost_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    
    -- Overall Rating (Auto-calculated)
    overall_rating DECIMAL(3,2) GENERATED ALWAYS AS (
        (COALESCE(quality_rating, 0) + 
         COALESCE(delivery_rating, 0) + 
         COALESCE(cost_rating, 0) + 
         COALESCE(service_rating, 0) + 
         COALESCE(communication_rating, 0)) / 
        NULLIF((CASE WHEN quality_rating IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN delivery_rating IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN cost_rating IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN service_rating IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN communication_rating IS NOT NULL THEN 1 ELSE 0 END), 0)
    ) STORED,
    
    -- Additional Evaluation Fields
    comments TEXT,
    would_recommend BOOLEAN DEFAULT NULL,
    contract_value DECIMAL(15,2),
    delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Rating Context
    rating_type VARCHAR(50) DEFAULT 'project_completion' CHECK (
        rating_type IN ('project_completion', 'ongoing_relationship', 'rfq_response', 'sample_evaluation')
    ),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (user_email) REFERENCES authorized_users(email) ON DELETE CASCADE
);

-- =====================================================
-- VENDOR RATING AGGREGATES (Materialized View)
-- =====================================================
CREATE MATERIALIZED VIEW vendor_rating_aggregates AS
WITH rating_stats AS (
    SELECT 
        vendor_id,
        COUNT(*) as total_ratings,
        ROUND(AVG(overall_rating), 2) as avg_overall_rating,
        ROUND(AVG(quality_rating), 2) as avg_quality_rating,
        ROUND(AVG(delivery_rating), 2) as avg_delivery_rating,
        ROUND(AVG(cost_rating), 2) as avg_cost_rating,
        ROUND(AVG(service_rating), 2) as avg_service_rating,
        ROUND(AVG(communication_rating), 2) as avg_communication_rating,
        
        -- Rating Distribution
        COUNT(CASE WHEN overall_rating >= 4.5 THEN 1 END) as excellent_ratings,
        COUNT(CASE WHEN overall_rating >= 3.5 AND overall_rating < 4.5 THEN 1 END) as good_ratings,
        COUNT(CASE WHEN overall_rating >= 2.5 AND overall_rating < 3.5 THEN 1 END) as average_ratings,
        COUNT(CASE WHEN overall_rating < 2.5 THEN 1 END) as poor_ratings,
        
        -- Recommendation Rate
        ROUND(
            (COUNT(CASE WHEN would_recommend = true THEN 1 END) * 100.0 / 
             NULLIF(COUNT(CASE WHEN would_recommend IS NOT NULL THEN 1 END), 0)), 1
        ) as recommendation_rate,
        
        -- Recent Performance (Last 6 months)
        ROUND(
            AVG(CASE 
                WHEN created_at >= CURRENT_DATE - INTERVAL '6 months' 
                THEN overall_rating 
                END), 2
        ) as recent_avg_rating,
        
        -- Performance Trend
        CASE 
            WHEN COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '6 months' THEN 1 END) >= 3 THEN
                CASE 
                    WHEN AVG(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '3 months' THEN overall_rating END) > 
                         AVG(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '6 months' AND 
                                       created_at < CURRENT_DATE - INTERVAL '3 months' THEN overall_rating END)
                    THEN 'improving'
                    WHEN AVG(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '3 months' THEN overall_rating END) < 
                         AVG(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '6 months' AND 
                                       created_at < CURRENT_DATE - INTERVAL '3 months' THEN overall_rating END)
                    THEN 'declining'
                    ELSE 'stable'
                END
            ELSE 'insufficient_data'
        END as performance_trend,
        
        MAX(created_at) as last_rated_at
        
    FROM vendor_ratings 
    WHERE overall_rating IS NOT NULL
    GROUP BY vendor_id
)
SELECT 
    v.id as vendor_id,
    v.name as vendor_name,
    v.supplier_code,
    v.city,
    v.state,
    v.country,
    
    -- Rating Statistics
    COALESCE(rs.total_ratings, 0) as total_ratings,
    rs.avg_overall_rating,
    rs.avg_quality_rating,
    rs.avg_delivery_rating,
    rs.avg_cost_rating,
    rs.avg_service_rating,
    rs.avg_communication_rating,
    
    -- Rating Distribution
    COALESCE(rs.excellent_ratings, 0) as excellent_ratings,
    COALESCE(rs.good_ratings, 0) as good_ratings,
    COALESCE(rs.average_ratings, 0) as average_ratings,
    COALESCE(rs.poor_ratings, 0) as poor_ratings,
    
    -- Performance Metrics
    rs.recommendation_rate,
    rs.recent_avg_rating,
    rs.performance_trend,
    rs.last_rated_at,
    
    -- Vendor Classification
    CASE 
        WHEN rs.avg_overall_rating >= 4.5 AND rs.total_ratings >= 5 THEN 'preferred'
        WHEN rs.avg_overall_rating >= 4.0 AND rs.total_ratings >= 3 THEN 'approved'
        WHEN rs.avg_overall_rating >= 3.0 THEN 'conditional'
        WHEN rs.avg_overall_rating < 3.0 THEN 'restricted'
        ELSE 'unrated'
    END as vendor_classification,
    
    -- Risk Assessment
    CASE 
        WHEN rs.performance_trend = 'declining' AND rs.recent_avg_rating < 3.5 THEN 'high'
        WHEN rs.performance_trend = 'declining' OR rs.recent_avg_rating < 3.0 THEN 'medium'
        WHEN rs.avg_overall_rating >= 4.0 THEN 'low'
        ELSE 'medium'
    END as risk_level
    
FROM vendors v
LEFT JOIN rating_stats rs ON v.id = rs.vendor_id
WHERE v.status = 'active';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_vendor_ratings_vendor_id ON vendor_ratings(vendor_id);
CREATE INDEX idx_vendor_ratings_project_id ON vendor_ratings(project_id);
CREATE INDEX idx_vendor_ratings_user_email ON vendor_ratings(user_email);
CREATE INDEX idx_vendor_ratings_overall_rating ON vendor_ratings(overall_rating);
CREATE INDEX idx_vendor_ratings_created_at ON vendor_ratings(created_at);
CREATE INDEX idx_vendor_ratings_rating_type ON vendor_ratings(rating_type);

-- Composite indexes for common queries
CREATE INDEX idx_vendor_ratings_vendor_project ON vendor_ratings(vendor_id, project_id);
CREATE INDEX idx_vendor_ratings_vendor_date ON vendor_ratings(vendor_id, created_at);

-- =====================================================
-- REFRESH FUNCTION FOR MATERIALIZED VIEW
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_vendor_rating_aggregates()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW vendor_rating_aggregates;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER TO AUTO-UPDATE AGGREGATES
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_refresh_vendor_ratings()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh materialized view when ratings are modified
    PERFORM refresh_vendor_rating_aggregates();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendor_ratings_refresh_trigger
    AFTER INSERT OR UPDATE OR DELETE ON vendor_ratings
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_vendor_ratings();

-- =====================================================
-- RATING VALIDATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION validate_vendor_rating(
    p_vendor_id UUID,
    p_user_email VARCHAR(255),
    p_project_id UUID DEFAULT NULL,
    p_rating_type VARCHAR(50) DEFAULT 'project_completion'
)
RETURNS BOOLEAN AS $$
DECLARE
    existing_rating_count INTEGER;
BEGIN
    -- Check if user has already rated this vendor for this project/context
    SELECT COUNT(*)
    INTO existing_rating_count
    FROM vendor_ratings
    WHERE vendor_id = p_vendor_id
      AND user_email = p_user_email
      AND (p_project_id IS NULL OR project_id = p_project_id)
      AND rating_type = p_rating_type
      AND created_at > CURRENT_DATE - INTERVAL '30 days'; -- Allow re-rating after 30 days
    
    RETURN existing_rating_count = 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================
-- This would normally be populated by real user ratings
/*
INSERT INTO vendor_ratings (
    vendor_id, user_id, project_id, quality_rating, delivery_rating, 
    cost_rating, service_rating, communication_rating, 
    comments, would_recommend, rating_type
) VALUES
    (
        (SELECT id FROM vendors LIMIT 1),
        (SELECT id FROM users LIMIT 1),
        (SELECT id FROM projects LIMIT 1),
        4, 5, 3, 4, 4,
        'Good quality parts, timely delivery, competitive pricing.',
        true,
        'project_completion'
    );
*/

-- =====================================================
-- PERMISSIONS
-- =====================================================
-- Grant appropriate permissions to application roles
-- GRANT SELECT, INSERT, UPDATE ON vendor_ratings TO app_user;
-- GRANT SELECT ON vendor_rating_aggregates TO app_user;
-- GRANT EXECUTE ON FUNCTION validate_vendor_rating TO app_user;

COMMENT ON TABLE vendor_ratings IS 'Comprehensive vendor rating system following industry best practices for supplier evaluation';
COMMENT ON MATERIALIZED VIEW vendor_rating_aggregates IS 'Pre-calculated vendor rating statistics for performance optimization';