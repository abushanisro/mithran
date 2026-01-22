-- Migration: Child Part Cost Records System
-- Purpose: Complete cost tracking for child parts (purchased and manufactured)
-- Follows same architecture as process_cost_records for consistency

-- ================================================
-- Child Part Cost Records Table
-- ================================================
CREATE TABLE IF NOT EXISTS child_part_cost_records (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Keys
    bom_item_id UUID NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID, -- Optional reference to suppliers table (if exists)

    -- Part Identification
    part_number VARCHAR(100),
    part_name VARCHAR(255),
    description TEXT,

    -- Make/Buy Decision
    make_buy VARCHAR(10) NOT NULL CHECK (make_buy IN ('make', 'buy')),

    -- Currency
    currency VARCHAR(3) DEFAULT 'INR',

    -- Input Parameters for Purchased Parts (make_buy = 'buy')
    unit_cost DECIMAL(15, 4) DEFAULT 0,
    freight_percentage DECIMAL(5, 2) DEFAULT 0,
    duty_percentage DECIMAL(5, 2) DEFAULT 0,
    overhead_percentage DECIMAL(5, 2) DEFAULT 0,

    -- Input Parameters for Manufactured Parts (make_buy = 'make')
    raw_material_cost_input DECIMAL(15, 4) DEFAULT 0,
    process_cost_input DECIMAL(15, 4) DEFAULT 0,

    -- Quality Parameters (both make and buy)
    scrap_percentage DECIMAL(5, 2) DEFAULT 0,
    defect_rate_percentage DECIMAL(5, 2) DEFAULT 0,

    -- Quantity Parameters
    quantity DECIMAL(12, 4) DEFAULT 1,
    moq INTEGER DEFAULT 1,
    lead_time_days INTEGER DEFAULT 0,

    -- Calculated Cost Components
    base_cost DECIMAL(15, 4) DEFAULT 0, -- Unit cost (buy) or raw+process (make)
    freight_cost DECIMAL(15, 4) DEFAULT 0,
    duty_cost DECIMAL(15, 4) DEFAULT 0,
    overhead_cost DECIMAL(15, 4) DEFAULT 0,
    cost_before_quality DECIMAL(15, 4) DEFAULT 0,

    -- Quality Adjustments
    scrap_adjustment DECIMAL(15, 4) DEFAULT 0,
    defect_adjustment DECIMAL(15, 4) DEFAULT 0,
    quality_factor DECIMAL(10, 6) DEFAULT 1,

    -- Final Costs
    total_cost_per_part DECIMAL(15, 4) DEFAULT 0, -- Final cost per part
    extended_cost DECIMAL(15, 4) DEFAULT 0, -- Total cost × quantity
    moq_extended_cost DECIMAL(15, 4) DEFAULT 0, -- Cost if ordering MOQ

    -- Supplier Information
    supplier_name VARCHAR(255),
    supplier_location VARCHAR(255),

    -- Complete Calculation Breakdown (JSONB for flexibility)
    calculation_breakdown JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- Indexes for Performance
-- ================================================
CREATE INDEX idx_child_part_cost_records_bom_item_id ON child_part_cost_records(bom_item_id);
CREATE INDEX idx_child_part_cost_records_user_id ON child_part_cost_records(user_id);
CREATE INDEX idx_child_part_cost_records_make_buy ON child_part_cost_records(make_buy);
CREATE INDEX idx_child_part_cost_records_is_active ON child_part_cost_records(is_active);
CREATE INDEX idx_child_part_cost_records_supplier_id ON child_part_cost_records(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_child_part_cost_records_part_number ON child_part_cost_records(part_number) WHERE part_number IS NOT NULL;

-- Unique constraint: one cost record per BOM item
CREATE UNIQUE INDEX idx_child_part_cost_unique ON child_part_cost_records(bom_item_id, user_id);

-- ================================================
-- Triggers for Auto-Update Timestamps
-- ================================================
CREATE OR REPLACE FUNCTION update_child_part_cost_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_child_part_cost_records_updated_at
    BEFORE UPDATE ON child_part_cost_records
    FOR EACH ROW
    EXECUTE FUNCTION update_child_part_cost_records_updated_at();

-- ================================================
-- Trigger to Sync Child Part Costs to BOM Item Costs
-- ================================================
-- When a child part cost is created or updated, automatically update the bom_item_costs table
CREATE OR REPLACE FUNCTION sync_child_part_cost_to_bom_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert the bom_item_cost record
    INSERT INTO bom_item_costs (
        bom_item_id,
        user_id,
        raw_material_cost,
        own_cost,
        total_cost,
        unit_cost,
        is_stale,
        last_calculated_at
    )
    VALUES (
        NEW.bom_item_id,
        NEW.user_id,
        COALESCE(NEW.total_cost_per_part, 0),
        COALESCE(NEW.total_cost_per_part, 0),
        COALESCE(NEW.total_cost_per_part, 0),
        COALESCE(NEW.total_cost_per_part, 0),
        false,
        NOW()
    )
    ON CONFLICT (bom_item_id, user_id)
    DO UPDATE SET
        raw_material_cost = COALESCE(NEW.total_cost_per_part, 0),
        own_cost = bom_item_costs.process_cost + COALESCE(NEW.total_cost_per_part, 0),
        total_cost = bom_item_costs.process_cost + COALESCE(NEW.total_cost_per_part, 0) + bom_item_costs.direct_children_cost,
        unit_cost = bom_item_costs.process_cost + COALESCE(NEW.total_cost_per_part, 0) + bom_item_costs.direct_children_cost,
        is_stale = false,
        last_calculated_at = NOW(),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_child_part_cost_to_bom_item
    AFTER INSERT OR UPDATE ON child_part_cost_records
    FOR EACH ROW
    EXECUTE FUNCTION sync_child_part_cost_to_bom_item();

-- ================================================
-- Row Level Security (RLS)
-- ================================================
ALTER TABLE child_part_cost_records ENABLE ROW LEVEL SECURITY;

-- Users can only see their own cost records
CREATE POLICY "Users can view own child part cost records"
    ON child_part_cost_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own child part cost records"
    ON child_part_cost_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own child part cost records"
    ON child_part_cost_records FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own child part cost records"
    ON child_part_cost_records FOR DELETE
    USING (auth.uid() = user_id);

-- ================================================
-- Grant Permissions
-- ================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON child_part_cost_records TO authenticated;

-- ================================================
-- Views for Easy Querying
-- ================================================

-- View: Child Part Cost Summary
CREATE OR REPLACE VIEW child_part_cost_summary AS
SELECT
    cpc.id,
    cpc.bom_item_id,
    cpc.user_id,
    cpc.part_number,
    cpc.part_name,
    cpc.make_buy,
    cpc.currency,
    cpc.total_cost_per_part,
    cpc.extended_cost,
    cpc.quantity,
    cpc.moq,
    cpc.lead_time_days,
    cpc.supplier_name,
    cpc.supplier_location,
    cpc.is_active,
    bi.name AS bom_item_name,
    bi.item_type AS bom_item_type,
    bi.bom_id,
    cpc.created_at,
    cpc.updated_at
FROM child_part_cost_records cpc
LEFT JOIN bom_items bi ON cpc.bom_item_id = bi.id
ORDER BY cpc.created_at DESC;

-- View: Purchased Parts Only
CREATE OR REPLACE VIEW purchased_parts_costs AS
SELECT
    cpc.*,
    bi.name AS bom_item_name,
    bi.bom_id
FROM child_part_cost_records cpc
LEFT JOIN bom_items bi ON cpc.bom_item_id = bi.id
WHERE cpc.make_buy = 'buy'
ORDER BY cpc.total_cost_per_part DESC;

-- View: Manufactured Parts Only
CREATE OR REPLACE VIEW manufactured_parts_costs AS
SELECT
    cpc.*,
    bi.name AS bom_item_name,
    bi.bom_id
FROM child_part_cost_records cpc
LEFT JOIN bom_items bi ON cpc.bom_item_id = bi.id
WHERE cpc.make_buy = 'make'
ORDER BY cpc.total_cost_per_part DESC;

-- Grant permissions on views
GRANT SELECT ON child_part_cost_summary TO authenticated;
GRANT SELECT ON purchased_parts_costs TO authenticated;
GRANT SELECT ON manufactured_parts_costs TO authenticated;

-- ================================================
-- Helper Functions
-- ================================================

-- Function to get total cost for a BOM (sum of all child part costs)
CREATE OR REPLACE FUNCTION get_bom_child_parts_total_cost(
    p_bom_id UUID,
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_total_cost DECIMAL(15, 4) := 0;
BEGIN
    SELECT COALESCE(SUM(cpc.extended_cost), 0)
    INTO v_total_cost
    FROM child_part_cost_records cpc
    INNER JOIN bom_items bi ON cpc.bom_item_id = bi.id
    WHERE bi.bom_id = p_bom_id
      AND cpc.user_id = p_user_id
      AND cpc.is_active = true;

    RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to get purchased parts cost summary for a BOM
CREATE OR REPLACE FUNCTION get_bom_purchased_parts_summary(
    p_bom_id UUID,
    p_user_id UUID
) RETURNS TABLE (
    part_count BIGINT,
    total_cost DECIMAL(15, 4),
    avg_cost_per_part DECIMAL(15, 4),
    total_freight_cost DECIMAL(15, 4),
    total_duty_cost DECIMAL(15, 4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS part_count,
        COALESCE(SUM(cpc.extended_cost), 0) AS total_cost,
        COALESCE(AVG(cpc.total_cost_per_part), 0) AS avg_cost_per_part,
        COALESCE(SUM(cpc.freight_cost * cpc.quantity), 0) AS total_freight_cost,
        COALESCE(SUM(cpc.duty_cost * cpc.quantity), 0) AS total_duty_cost
    FROM child_part_cost_records cpc
    INNER JOIN bom_items bi ON cpc.bom_item_id = bi.id
    WHERE bi.bom_id = p_bom_id
      AND cpc.user_id = p_user_id
      AND cpc.make_buy = 'buy'
      AND cpc.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get manufactured parts cost summary for a BOM
CREATE OR REPLACE FUNCTION get_bom_manufactured_parts_summary(
    p_bom_id UUID,
    p_user_id UUID
) RETURNS TABLE (
    part_count BIGINT,
    total_cost DECIMAL(15, 4),
    total_raw_material_cost DECIMAL(15, 4),
    total_process_cost DECIMAL(15, 4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS part_count,
        COALESCE(SUM(cpc.extended_cost), 0) AS total_cost,
        COALESCE(SUM(cpc.raw_material_cost_input * cpc.quantity), 0) AS total_raw_material_cost,
        COALESCE(SUM(cpc.process_cost_input * cpc.quantity), 0) AS total_process_cost
    FROM child_part_cost_records cpc
    INNER JOIN bom_items bi ON cpc.bom_item_id = bi.id
    WHERE bi.bom_id = p_bom_id
      AND cpc.user_id = p_user_id
      AND cpc.make_buy = 'make'
      AND cpc.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Comments for Documentation
-- ================================================
COMMENT ON TABLE child_part_cost_records IS 'Stores complete cost calculations for child parts (purchased and manufactured)';
COMMENT ON COLUMN child_part_cost_records.make_buy IS 'Make (manufactured in-house) or Buy (purchased from supplier)';
COMMENT ON COLUMN child_part_cost_records.base_cost IS 'Unit cost for purchased parts OR raw material + process cost for manufactured parts';
COMMENT ON COLUMN child_part_cost_records.freight_cost IS 'Calculated freight cost (only for purchased parts)';
COMMENT ON COLUMN child_part_cost_records.duty_cost IS 'Calculated import duty cost (only for purchased parts)';
COMMENT ON COLUMN child_part_cost_records.overhead_cost IS 'Calculated overhead allocation (only for purchased parts)';
COMMENT ON COLUMN child_part_cost_records.quality_factor IS 'Combined adjustment factor for scrap and defect rates';
COMMENT ON COLUMN child_part_cost_records.total_cost_per_part IS 'Final cost per part after all adjustments';
COMMENT ON COLUMN child_part_cost_records.extended_cost IS 'Total cost × quantity (cost for all parts in assembly)';
COMMENT ON COLUMN child_part_cost_records.calculation_breakdown IS 'Complete calculation breakdown with all intermediate values';

COMMENT ON FUNCTION sync_child_part_cost_to_bom_item IS 'Automatically syncs child part costs to bom_item_costs table for cost aggregation';
COMMENT ON FUNCTION get_bom_child_parts_total_cost IS 'Calculate total cost of all child parts for a BOM';
COMMENT ON FUNCTION get_bom_purchased_parts_summary IS 'Get summary statistics for purchased parts in a BOM';
COMMENT ON FUNCTION get_bom_manufactured_parts_summary IS 'Get summary statistics for manufactured parts in a BOM';
