-- ============================================================================
-- Migration 054: Supplier Evaluation Enhancements
-- Description: Add vendor groups, RFQ status tracking, and evaluation workflow
-- Author: System
-- Date: 2026-01-22
-- Version: 1.0.0
-- Dependencies: 053_supplier_evaluation_groups.sql
-- ============================================================================

-- Safety checks
DO $$
BEGIN
    -- Check if required tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_evaluation_groups') THEN
        RAISE EXCEPTION 'Required table supplier_evaluation_groups does not exist. Run migration 053 first.';
    END IF;
    
    -- Log migration start
    RAISE NOTICE 'Starting Migration 054: Supplier Evaluation Enhancements';
END $$;

-- ============================================================================
-- 1. ADD VENDOR GROUPS TO EVALUATION GROUPS
-- ============================================================================

-- Add vendor group tracking columns to supplier_evaluation_groups
ALTER TABLE supplier_evaluation_groups 
ADD COLUMN IF NOT EXISTS vendor_selection_status VARCHAR(50) DEFAULT 'pending' 
    CHECK (vendor_selection_status IN ('pending', 'in_progress', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS rfq_status VARCHAR(50) DEFAULT 'not_started' 
    CHECK (rfq_status IN ('not_started', 'draft', 'sent', 'responses_received', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS rfq_sent_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS rfq_deadline TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS selected_vendors_count INTEGER DEFAULT 0 CHECK (selected_vendors_count >= 0),
ADD COLUMN IF NOT EXISTS total_vendors_invited INTEGER DEFAULT 0 CHECK (total_vendors_invited >= 0),
ADD COLUMN IF NOT EXISTS evaluation_deadline TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS evaluation_type VARCHAR(50) DEFAULT 'standard' 
    CHECK (evaluation_type IN ('standard', 'expedited', 'strategic', 'spot_buy'));

-- Add comments for new columns
COMMENT ON COLUMN supplier_evaluation_groups.vendor_selection_status IS 'Status of vendor selection process';
COMMENT ON COLUMN supplier_evaluation_groups.rfq_status IS 'Status of RFQ (Request for Quote) process';
COMMENT ON COLUMN supplier_evaluation_groups.rfq_sent_at IS 'Timestamp when RFQ was sent to vendors';
COMMENT ON COLUMN supplier_evaluation_groups.rfq_deadline IS 'Deadline for vendor responses';
COMMENT ON COLUMN supplier_evaluation_groups.selected_vendors_count IS 'Number of vendors selected for this evaluation';
COMMENT ON COLUMN supplier_evaluation_groups.total_vendors_invited IS 'Total number of vendors invited to participate';
COMMENT ON COLUMN supplier_evaluation_groups.evaluation_deadline IS 'Overall evaluation completion deadline';
COMMENT ON COLUMN supplier_evaluation_groups.priority IS 'Priority level of the evaluation';
COMMENT ON COLUMN supplier_evaluation_groups.evaluation_type IS 'Type of evaluation process';

-- ============================================================================
-- 2. VENDOR SELECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_evaluation_vendor_selections (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_group_id UUID NOT NULL REFERENCES supplier_evaluation_groups(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL,
    
    -- Selection details
    selection_status VARCHAR(50) DEFAULT 'selected' 
        CHECK (selection_status IN ('selected', 'invited', 'declined', 'excluded', 'backup')),
    selection_reason TEXT,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_received_at TIMESTAMP NULL,
    
    -- Vendor details (denormalized for performance)
    vendor_name VARCHAR(255) NOT NULL,
    vendor_email VARCHAR(255),
    vendor_phone VARCHAR(50),
    vendor_contact_person VARCHAR(255),
    
    -- RFQ specific data
    rfq_sent BOOLEAN DEFAULT FALSE,
    rfq_opened BOOLEAN DEFAULT FALSE,
    rfq_response_status VARCHAR(50) DEFAULT 'pending' 
        CHECK (rfq_response_status IN ('pending', 'partial', 'complete', 'declined', 'expired')),
    
    -- Scoring and evaluation
    technical_score DECIMAL(5,2) CHECK (technical_score >= 0 AND technical_score <= 100),
    commercial_score DECIMAL(5,2) CHECK (commercial_score >= 0 AND commercial_score <= 100),
    delivery_score DECIMAL(5,2) CHECK (delivery_score >= 0 AND delivery_score <= 100),
    quality_score DECIMAL(5,2) CHECK (quality_score >= 0 AND quality_score <= 100),
    overall_score DECIMAL(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
    
    -- Final decision
    final_status VARCHAR(50) DEFAULT 'pending' 
        CHECK (final_status IN ('pending', 'shortlisted', 'selected', 'rejected', 'backup')),
    rejection_reason TEXT,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_evaluation_vendor UNIQUE (evaluation_group_id, vendor_id)
);

COMMENT ON TABLE supplier_evaluation_vendor_selections IS 
    'Vendors selected/invited for supplier evaluation groups with scoring and status tracking';

-- ============================================================================
-- 3. RFQ RESPONSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_evaluation_rfq_responses (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_group_id UUID NOT NULL REFERENCES supplier_evaluation_groups(id) ON DELETE CASCADE,
    vendor_selection_id UUID NOT NULL REFERENCES supplier_evaluation_vendor_selections(id) ON DELETE CASCADE,
    
    -- Response metadata
    response_status VARCHAR(50) DEFAULT 'draft' 
        CHECK (response_status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
    submitted_at TIMESTAMP NULL,
    reviewed_at TIMESTAMP NULL,
    reviewed_by UUID REFERENCES auth.users(id),
    
    -- Commercial terms
    currency VARCHAR(3) DEFAULT 'INR',
    total_quoted_value DECIMAL(15,2) CHECK (total_quoted_value >= 0),
    payment_terms TEXT,
    delivery_lead_time INTEGER, -- in days
    validity_period INTEGER DEFAULT 30, -- in days
    
    -- Terms and conditions
    warranty_period INTEGER, -- in months
    quality_certifications TEXT[],
    compliance_standards TEXT[],
    special_terms TEXT,
    
    -- Attachments and documents
    quote_document_url TEXT,
    technical_spec_url TEXT,
    compliance_cert_url TEXT,
    additional_docs JSONB DEFAULT '[]'::jsonb,
    
    -- Internal evaluation
    internal_notes TEXT,
    risk_assessment TEXT,
    recommendation VARCHAR(50) CHECK (recommendation IN ('recommend', 'conditional', 'not_recommend')),
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_vendor_response UNIQUE (evaluation_group_id, vendor_selection_id)
);

COMMENT ON TABLE supplier_evaluation_rfq_responses IS 
    'RFQ responses from vendors with commercial and technical details';

-- ============================================================================
-- 4. RFQ LINE ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_evaluation_rfq_line_items (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_response_id UUID NOT NULL REFERENCES supplier_evaluation_rfq_responses(id) ON DELETE CASCADE,
    bom_item_id UUID NOT NULL,
    
    -- Item details (denormalized)
    item_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    quantity_requested DECIMAL(15,4) NOT NULL CHECK (quantity_requested > 0),
    
    -- Vendor quote for this item
    unit_price DECIMAL(12,4) CHECK (unit_price >= 0),
    total_price DECIMAL(15,2) CHECK (total_price >= 0),
    lead_time_days INTEGER CHECK (lead_time_days >= 0),
    minimum_order_qty DECIMAL(15,4) CHECK (minimum_order_qty >= 0),
    
    -- Item-specific terms
    tooling_cost DECIMAL(12,2) DEFAULT 0 CHECK (tooling_cost >= 0),
    setup_cost DECIMAL(12,2) DEFAULT 0 CHECK (setup_cost >= 0),
    item_notes TEXT,
    
    -- Status
    item_status VARCHAR(50) DEFAULT 'quoted' 
        CHECK (item_status IN ('quoted', 'no_quote', 'excluded', 'alternative_offered')),
    alternative_suggestion TEXT,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_response_bom_item UNIQUE (rfq_response_id, bom_item_id)
);

COMMENT ON TABLE supplier_evaluation_rfq_line_items IS 
    'Line-item level quotes from vendors for each BOM item';

-- ============================================================================
-- 5. EVALUATION TIMELINE/ACTIVITY LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_evaluation_activities (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_group_id UUID NOT NULL REFERENCES supplier_evaluation_groups(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'created', 'vendors_selected', 'rfq_sent', 'rfq_response_received', 
        'evaluation_completed', 'vendor_shortlisted', 'vendor_selected', 
        'vendor_rejected', 'deadline_extended', 'cancelled', 'notes_updated'
    )),
    activity_description TEXT NOT NULL,
    
    -- Related entities
    vendor_id UUID NULL,
    user_id UUID REFERENCES auth.users(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE supplier_evaluation_activities IS 
    'Activity timeline and audit log for supplier evaluation processes';

-- ============================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Vendor selections indexes
CREATE INDEX IF NOT EXISTS idx_vendor_selections_evaluation_group 
    ON supplier_evaluation_vendor_selections(evaluation_group_id);
CREATE INDEX IF NOT EXISTS idx_vendor_selections_vendor 
    ON supplier_evaluation_vendor_selections(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_selections_status 
    ON supplier_evaluation_vendor_selections(selection_status, final_status);
CREATE INDEX IF NOT EXISTS idx_vendor_selections_rfq_status 
    ON supplier_evaluation_vendor_selections(rfq_response_status);

-- RFQ responses indexes
CREATE INDEX IF NOT EXISTS idx_rfq_responses_evaluation_group 
    ON supplier_evaluation_rfq_responses(evaluation_group_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_vendor_selection 
    ON supplier_evaluation_rfq_responses(vendor_selection_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_status 
    ON supplier_evaluation_rfq_responses(response_status);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_submitted 
    ON supplier_evaluation_rfq_responses(submitted_at) WHERE submitted_at IS NOT NULL;

-- Line items indexes
CREATE INDEX IF NOT EXISTS idx_rfq_line_items_response 
    ON supplier_evaluation_rfq_line_items(rfq_response_id);
CREATE INDEX IF NOT EXISTS idx_rfq_line_items_bom_item 
    ON supplier_evaluation_rfq_line_items(bom_item_id);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_evaluation_activities_group 
    ON supplier_evaluation_activities(evaluation_group_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_activities_type 
    ON supplier_evaluation_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_evaluation_activities_created 
    ON supplier_evaluation_activities(created_at DESC);

-- Enhanced evaluation groups indexes
CREATE INDEX IF NOT EXISTS idx_evaluation_groups_vendor_status 
    ON supplier_evaluation_groups(vendor_selection_status);
CREATE INDEX IF NOT EXISTS idx_evaluation_groups_rfq_status 
    ON supplier_evaluation_groups(rfq_status);
CREATE INDEX IF NOT EXISTS idx_evaluation_groups_priority 
    ON supplier_evaluation_groups(priority);
CREATE INDEX IF NOT EXISTS idx_evaluation_groups_deadlines 
    ON supplier_evaluation_groups(evaluation_deadline) WHERE evaluation_deadline IS NOT NULL;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE supplier_evaluation_vendor_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_evaluation_rfq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_evaluation_rfq_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_evaluation_activities ENABLE ROW LEVEL SECURITY;

-- Vendor selections policies
CREATE POLICY sevs_select ON supplier_evaluation_vendor_selections
    FOR SELECT USING (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY sevs_insert ON supplier_evaluation_vendor_selections
    FOR INSERT WITH CHECK (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY sevs_update ON supplier_evaluation_vendor_selections
    FOR UPDATE USING (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    ) WITH CHECK (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY sevs_delete ON supplier_evaluation_vendor_selections
    FOR DELETE USING (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    );

-- RFQ responses policies
CREATE POLICY serr_select ON supplier_evaluation_rfq_responses
    FOR SELECT USING (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY serr_insert ON supplier_evaluation_rfq_responses
    FOR INSERT WITH CHECK (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY serr_update ON supplier_evaluation_rfq_responses
    FOR UPDATE USING (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    ) WITH CHECK (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY serr_delete ON supplier_evaluation_rfq_responses
    FOR DELETE USING (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    );

-- Line items policies
CREATE POLICY serli_select ON supplier_evaluation_rfq_line_items
    FOR SELECT USING (
        rfq_response_id IN (
            SELECT id FROM supplier_evaluation_rfq_responses 
            WHERE evaluation_group_id IN (
                SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY serli_insert ON supplier_evaluation_rfq_line_items
    FOR INSERT WITH CHECK (
        rfq_response_id IN (
            SELECT id FROM supplier_evaluation_rfq_responses 
            WHERE evaluation_group_id IN (
                SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY serli_update ON supplier_evaluation_rfq_line_items
    FOR UPDATE USING (
        rfq_response_id IN (
            SELECT id FROM supplier_evaluation_rfq_responses 
            WHERE evaluation_group_id IN (
                SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
            )
        )
    ) WITH CHECK (
        rfq_response_id IN (
            SELECT id FROM supplier_evaluation_rfq_responses 
            WHERE evaluation_group_id IN (
                SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY serli_delete ON supplier_evaluation_rfq_line_items
    FOR DELETE USING (
        rfq_response_id IN (
            SELECT id FROM supplier_evaluation_rfq_responses 
            WHERE evaluation_group_id IN (
                SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
            )
        )
    );

-- Activities policies
CREATE POLICY sea_select ON supplier_evaluation_activities
    FOR SELECT USING (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY sea_insert ON supplier_evaluation_activities
    FOR INSERT WITH CHECK (
        evaluation_group_id IN (
            SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- 8. TRIGGERS FOR AUTOMATION
-- ============================================================================

-- Update timestamps
CREATE TRIGGER update_vendor_selections_updated_at
    BEFORE UPDATE ON supplier_evaluation_vendor_selections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfq_responses_updated_at
    BEFORE UPDATE ON supplier_evaluation_rfq_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfq_line_items_updated_at
    BEFORE UPDATE ON supplier_evaluation_rfq_line_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update vendor counts
CREATE OR REPLACE FUNCTION update_evaluation_vendor_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update selected and total vendor counts
    UPDATE supplier_evaluation_groups 
    SET 
        selected_vendors_count = (
            SELECT COUNT(*) 
            FROM supplier_evaluation_vendor_selections 
            WHERE evaluation_group_id = COALESCE(NEW.evaluation_group_id, OLD.evaluation_group_id)
            AND selection_status IN ('selected', 'invited')
        ),
        total_vendors_invited = (
            SELECT COUNT(*) 
            FROM supplier_evaluation_vendor_selections 
            WHERE evaluation_group_id = COALESCE(NEW.evaluation_group_id, OLD.evaluation_group_id)
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.evaluation_group_id, OLD.evaluation_group_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_evaluation_vendor_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON supplier_evaluation_vendor_selections
    FOR EACH ROW EXECUTE FUNCTION update_evaluation_vendor_counts();

-- Auto-log activities
CREATE OR REPLACE FUNCTION log_evaluation_activity()
RETURNS TRIGGER AS $$
DECLARE
    activity_desc TEXT;
    activity_type_val VARCHAR(50);
BEGIN
    -- Determine activity type and description based on the change
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'supplier_evaluation_vendor_selections' THEN
            activity_type_val := 'vendors_selected';
            activity_desc := format('Vendor %s added to evaluation', NEW.vendor_name);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'supplier_evaluation_groups' THEN
            IF OLD.rfq_status != NEW.rfq_status THEN
                activity_type_val := 'rfq_sent';
                activity_desc := format('RFQ status changed from %s to %s', OLD.rfq_status, NEW.rfq_status);
            END IF;
        ELSIF TG_TABLE_NAME = 'supplier_evaluation_rfq_responses' THEN
            IF OLD.response_status != NEW.response_status AND NEW.response_status = 'submitted' THEN
                activity_type_val := 'rfq_response_received';
                activity_desc := 'RFQ response received from vendor';
            END IF;
        END IF;
    END IF;
    
    -- Insert activity log if we have a valid activity
    IF activity_type_val IS NOT NULL THEN
        INSERT INTO supplier_evaluation_activities (
            evaluation_group_id, 
            activity_type, 
            activity_description,
            vendor_id,
            user_id
        ) VALUES (
            CASE 
                WHEN TG_TABLE_NAME = 'supplier_evaluation_groups' THEN NEW.id
                WHEN TG_TABLE_NAME = 'supplier_evaluation_vendor_selections' THEN NEW.evaluation_group_id
                WHEN TG_TABLE_NAME = 'supplier_evaluation_rfq_responses' THEN NEW.evaluation_group_id
                ELSE NULL
            END,
            activity_type_val,
            activity_desc,
            CASE 
                WHEN TG_TABLE_NAME = 'supplier_evaluation_vendor_selections' THEN NEW.vendor_id
                WHEN TG_TABLE_NAME = 'supplier_evaluation_rfq_responses' THEN 
                    (SELECT vendor_id FROM supplier_evaluation_vendor_selections WHERE id = NEW.vendor_selection_id)
                ELSE NULL
            END,
            auth.uid()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply activity logging triggers
CREATE TRIGGER log_evaluation_group_activity
    AFTER UPDATE ON supplier_evaluation_groups
    FOR EACH ROW EXECUTE FUNCTION log_evaluation_activity();

CREATE TRIGGER log_vendor_selection_activity
    AFTER INSERT OR UPDATE ON supplier_evaluation_vendor_selections
    FOR EACH ROW EXECUTE FUNCTION log_evaluation_activity();

CREATE TRIGGER log_rfq_response_activity
    AFTER UPDATE ON supplier_evaluation_rfq_responses
    FOR EACH ROW EXECUTE FUNCTION log_evaluation_activity();

-- ============================================================================
-- 9. ENHANCED HELPER FUNCTIONS
-- ============================================================================

-- Enhanced function to get evaluation group with vendor information
CREATE OR REPLACE FUNCTION get_supplier_evaluation_group_detailed(
    p_group_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    name VARCHAR,
    description TEXT,
    notes TEXT,
    status VARCHAR,
    vendor_selection_status VARCHAR,
    rfq_status VARCHAR,
    rfq_sent_at TIMESTAMP,
    rfq_deadline TIMESTAMP,
    selected_vendors_count INTEGER,
    total_vendors_invited INTEGER,
    evaluation_deadline TIMESTAMP,
    priority VARCHAR,
    evaluation_type VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    bom_items JSONB,
    processes JSONB,
    vendors JSONB,
    activities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        seg.id,
        seg.project_id,
        seg.name,
        seg.description,
        seg.notes,
        seg.status,
        seg.vendor_selection_status,
        seg.rfq_status,
        seg.rfq_sent_at,
        seg.rfq_deadline,
        seg.selected_vendors_count,
        seg.total_vendors_invited,
        seg.evaluation_deadline,
        seg.priority,
        seg.evaluation_type,
        seg.created_at,
        seg.updated_at,
        -- BOM items
        COALESCE(
            jsonb_agg(
                DISTINCT jsonb_build_object(
                    'id', segbi.bom_item_id,
                    'name', segbi.bom_item_name,
                    'partNumber', segbi.part_number,
                    'material', segbi.material,
                    'quantity', segbi.quantity
                )
            ) FILTER (WHERE segbi.id IS NOT NULL),
            '[]'::jsonb
        ) as bom_items,
        -- Processes
        COALESCE(
            jsonb_agg(
                DISTINCT jsonb_build_object(
                    'id', segp.process_id,
                    'name', segp.process_name,
                    'processGroup', segp.process_group,
                    'type', segp.process_type,
                    'isPredefined', segp.is_predefined
                )
            ) FILTER (WHERE segp.id IS NOT NULL),
            '[]'::jsonb
        ) as processes,
        -- Vendors
        COALESCE(
            jsonb_agg(
                DISTINCT jsonb_build_object(
                    'id', sevs.id,
                    'vendorId', sevs.vendor_id,
                    'vendorName', sevs.vendor_name,
                    'selectionStatus', sevs.selection_status,
                    'rfqResponseStatus', sevs.rfq_response_status,
                    'overallScore', sevs.overall_score,
                    'finalStatus', sevs.final_status,
                    'invitedAt', sevs.invited_at,
                    'responseReceivedAt', sevs.response_received_at
                )
            ) FILTER (WHERE sevs.id IS NOT NULL),
            '[]'::jsonb
        ) as vendors,
        -- Recent activities
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', sea.id,
                        'activityType', sea.activity_type,
                        'description', sea.activity_description,
                        'createdAt', sea.created_at
                    ) ORDER BY sea.created_at DESC
                )
                FROM supplier_evaluation_activities sea
                WHERE sea.evaluation_group_id = seg.id
                LIMIT 10
            ),
            '[]'::jsonb
        ) as activities
    FROM supplier_evaluation_groups seg
    LEFT JOIN supplier_evaluation_group_bom_items segbi ON seg.id = segbi.evaluation_group_id
    LEFT JOIN supplier_evaluation_group_processes segp ON seg.id = segp.evaluation_group_id
    LEFT JOIN supplier_evaluation_vendor_selections sevs ON seg.id = sevs.evaluation_group_id
    WHERE 
        seg.id = p_group_id 
        AND seg.user_id = p_user_id
    GROUP BY seg.id, seg.project_id, seg.name, seg.description, seg.notes, seg.status, 
             seg.vendor_selection_status, seg.rfq_status, seg.rfq_sent_at, seg.rfq_deadline,
             seg.selected_vendors_count, seg.total_vendors_invited, seg.evaluation_deadline,
             seg.priority, seg.evaluation_type, seg.created_at, seg.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_supplier_evaluation_group_detailed IS
    'SECURITY DEFINER: Get detailed supplier evaluation group with vendors and activities';

-- Function to get evaluation dashboard metrics
CREATE OR REPLACE FUNCTION get_supplier_evaluation_metrics(
    p_project_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    total_evaluations BIGINT,
    active_evaluations BIGINT,
    pending_rfqs BIGINT,
    completed_evaluations BIGINT,
    total_vendors_engaged BIGINT,
    avg_response_time_days NUMERIC,
    total_quoted_value NUMERIC,
    evaluations_by_status JSONB,
    recent_activities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(seg.id) as total_evaluations,
        COUNT(seg.id) FILTER (WHERE seg.status = 'active') as active_evaluations,
        COUNT(seg.id) FILTER (WHERE seg.rfq_status IN ('sent', 'responses_received')) as pending_rfqs,
        COUNT(seg.id) FILTER (WHERE seg.status = 'completed') as completed_evaluations,
        COALESCE(SUM(seg.total_vendors_invited), 0) as total_vendors_engaged,
        AVG(
            EXTRACT(DAYS FROM (sevs.response_received_at - sevs.invited_at))
        ) FILTER (WHERE sevs.response_received_at IS NOT NULL) as avg_response_time_days,
        COALESCE(SUM(serr.total_quoted_value), 0) as total_quoted_value,
        jsonb_build_object(
            'draft', COUNT(seg.id) FILTER (WHERE seg.status = 'draft'),
            'active', COUNT(seg.id) FILTER (WHERE seg.status = 'active'),
            'completed', COUNT(seg.id) FILTER (WHERE seg.status = 'completed'),
            'archived', COUNT(seg.id) FILTER (WHERE seg.status = 'archived')
        ) as evaluations_by_status,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', sea.id,
                        'evaluationName', seg_act.name,
                        'activityType', sea.activity_type,
                        'description', sea.activity_description,
                        'createdAt', sea.created_at
                    ) ORDER BY sea.created_at DESC
                )
                FROM supplier_evaluation_activities sea
                JOIN supplier_evaluation_groups seg_act ON sea.evaluation_group_id = seg_act.id
                WHERE seg_act.project_id = p_project_id 
                AND seg_act.user_id = p_user_id
                LIMIT 20
            ),
            '[]'::jsonb
        ) as recent_activities
    FROM supplier_evaluation_groups seg
    LEFT JOIN supplier_evaluation_vendor_selections sevs ON seg.id = sevs.evaluation_group_id
    LEFT JOIN supplier_evaluation_rfq_responses serr ON seg.id = serr.evaluation_group_id
    WHERE seg.project_id = p_project_id AND seg.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_supplier_evaluation_metrics IS
    'SECURITY DEFINER: Get comprehensive metrics for supplier evaluation dashboard';

-- ============================================================================
-- 10. DATA VALIDATION AND CONSTRAINTS
-- ============================================================================

-- Add constraint to ensure RFQ deadline is after creation
ALTER TABLE supplier_evaluation_groups 
ADD CONSTRAINT check_rfq_deadline_after_creation 
CHECK (rfq_deadline IS NULL OR rfq_deadline > created_at);

-- Add constraint to ensure evaluation deadline is reasonable
ALTER TABLE supplier_evaluation_groups 
ADD CONSTRAINT check_evaluation_deadline_reasonable 
CHECK (evaluation_deadline IS NULL OR evaluation_deadline > created_at);

-- Add constraint to ensure scores are valid
ALTER TABLE supplier_evaluation_vendor_selections
ADD CONSTRAINT check_scores_valid 
CHECK (
    (technical_score IS NULL OR (technical_score >= 0 AND technical_score <= 100)) AND
    (commercial_score IS NULL OR (commercial_score >= 0 AND commercial_score <= 100)) AND
    (delivery_score IS NULL OR (delivery_score >= 0 AND delivery_score <= 100)) AND
    (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)) AND
    (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100))
);

-- ============================================================================
-- 11. SAMPLE DATA FOR TESTING (OPTIONAL - REMOVE IN PRODUCTION)
-- ============================================================================

-- Uncomment below for development/testing environments only
/*
INSERT INTO supplier_evaluation_activities (evaluation_group_id, activity_type, activity_description, user_id)
SELECT 
    id, 
    'created', 
    'Evaluation group created',
    user_id
FROM supplier_evaluation_groups 
WHERE NOT EXISTS (
    SELECT 1 FROM supplier_evaluation_activities 
    WHERE evaluation_group_id = supplier_evaluation_groups.id 
    AND activity_type = 'created'
);
*/

-- ============================================================================
-- 12. MIGRATION COMPLETION
-- ============================================================================

DO $$
BEGIN
    -- Log successful completion
    RAISE NOTICE 'Migration 054 completed successfully';
    RAISE NOTICE 'Added: vendor groups, RFQ tracking, scoring system, activity logs';
    RAISE NOTICE 'Tables created: supplier_evaluation_vendor_selections, supplier_evaluation_rfq_responses, supplier_evaluation_rfq_line_items, supplier_evaluation_activities';
    RAISE NOTICE 'Enhanced: supplier_evaluation_groups with vendor and RFQ status tracking';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (For Emergency Use Only)
-- ============================================================================

/*
-- DANGER: This will remove all data! Use only in development!
-- Run these commands in reverse order if rollback is needed:

DROP TRIGGER IF EXISTS log_rfq_response_activity ON supplier_evaluation_rfq_responses;
DROP TRIGGER IF EXISTS log_vendor_selection_activity ON supplier_evaluation_vendor_selections;
DROP TRIGGER IF EXISTS log_evaluation_group_activity ON supplier_evaluation_groups;
DROP TRIGGER IF EXISTS update_evaluation_vendor_counts_trigger ON supplier_evaluation_vendor_selections;
DROP TRIGGER IF EXISTS update_rfq_line_items_updated_at ON supplier_evaluation_rfq_line_items;
DROP TRIGGER IF EXISTS update_rfq_responses_updated_at ON supplier_evaluation_rfq_responses;
DROP TRIGGER IF EXISTS update_vendor_selections_updated_at ON supplier_evaluation_vendor_selections;

DROP FUNCTION IF EXISTS get_supplier_evaluation_metrics(UUID, UUID);
DROP FUNCTION IF EXISTS get_supplier_evaluation_group_detailed(UUID, UUID);
DROP FUNCTION IF EXISTS log_evaluation_activity();
DROP FUNCTION IF EXISTS update_evaluation_vendor_counts();

DROP TABLE IF EXISTS supplier_evaluation_activities CASCADE;
DROP TABLE IF EXISTS supplier_evaluation_rfq_line_items CASCADE;
DROP TABLE IF EXISTS supplier_evaluation_rfq_responses CASCADE;
DROP TABLE IF EXISTS supplier_evaluation_vendor_selections CASCADE;

-- Remove added columns (be very careful with this!)
ALTER TABLE supplier_evaluation_groups 
DROP COLUMN IF EXISTS evaluation_type,
DROP COLUMN IF EXISTS priority,
DROP COLUMN IF EXISTS evaluation_deadline,
DROP COLUMN IF EXISTS total_vendors_invited,
DROP COLUMN IF EXISTS selected_vendors_count,
DROP COLUMN IF EXISTS rfq_deadline,
DROP COLUMN IF EXISTS rfq_sent_at,
DROP COLUMN IF EXISTS rfq_status,
DROP COLUMN IF EXISTS vendor_selection_status;
*/