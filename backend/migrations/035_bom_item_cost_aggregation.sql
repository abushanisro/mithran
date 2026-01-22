-- Migration: BOM Item Cost Aggregation System
-- Purpose: Enable real-time cost rollup for assembly, subassembly, and child estimates
-- When BOM is saved, costs automatically aggregate from children to parents

-- Table to store aggregated costs for each BOM item
CREATE TABLE IF NOT EXISTS bom_item_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_item_id UUID NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Cost Components
    raw_material_cost DECIMAL(15, 4) DEFAULT 0,
    process_cost DECIMAL(15, 4) DEFAULT 0,
    direct_children_cost DECIMAL(15, 4) DEFAULT 0, -- Sum of immediate children

    -- Total costs at this level
    own_cost DECIMAL(15, 4) DEFAULT 0, -- Material + Process only
    total_cost DECIMAL(15, 4) DEFAULT 0, -- Own + All Children (recursive)

    -- Cost per unit (considering quantity)
    unit_cost DECIMAL(15, 4) DEFAULT 0,
    extended_cost DECIMAL(15, 4) DEFAULT 0, -- Unit cost × quantity

    -- Business margins (can differ per item)
    sga_percentage DECIMAL(5, 2) DEFAULT 0,
    profit_percentage DECIMAL(5, 2) DEFAULT 0,

    -- Final selling price
    selling_price DECIMAL(15, 4) DEFAULT 0,

    -- Cost breakdown details (JSONB for flexibility)
    cost_breakdown JSONB DEFAULT '{}'::jsonb,

    -- Calculation metadata
    last_calculated_at TIMESTAMP DEFAULT NOW(),
    calculation_version INTEGER DEFAULT 1,
    is_stale BOOLEAN DEFAULT false, -- Flag to track if recalculation needed

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bom_item_costs_bom_item_id ON bom_item_costs(bom_item_id);
CREATE INDEX idx_bom_item_costs_user_id ON bom_item_costs(user_id);
CREATE INDEX idx_bom_item_costs_is_stale ON bom_item_costs(is_stale);
CREATE UNIQUE INDEX idx_bom_item_costs_unique ON bom_item_costs(bom_item_id, user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_bom_item_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_calculated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bom_item_costs_updated_at
    BEFORE UPDATE ON bom_item_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_bom_item_costs_updated_at();

-- Function to mark parent costs as stale when child costs change
CREATE OR REPLACE FUNCTION mark_parent_costs_stale()
RETURNS TRIGGER AS $$
BEGIN
    -- When a BOM item's cost changes, mark all ancestors as stale
    WITH RECURSIVE parent_chain AS (
        -- Base case: immediate parent
        SELECT parent_item_id AS item_id
        FROM bom_items
        WHERE id = NEW.bom_item_id AND parent_item_id IS NOT NULL

        UNION

        -- Recursive case: ancestors
        SELECT bi.parent_item_id
        FROM bom_items bi
        INNER JOIN parent_chain pc ON bi.id = pc.item_id
        WHERE bi.parent_item_id IS NOT NULL
    )
    UPDATE bom_item_costs
    SET is_stale = true,
        updated_at = NOW()
    WHERE bom_item_id IN (SELECT item_id FROM parent_chain)
      AND user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Separate triggers for INSERT and UPDATE since OLD doesn't exist on INSERT
CREATE TRIGGER trigger_mark_parent_costs_stale_insert
    AFTER INSERT ON bom_item_costs
    FOR EACH ROW
    EXECUTE FUNCTION mark_parent_costs_stale();

CREATE TRIGGER trigger_mark_parent_costs_stale_update
    AFTER UPDATE ON bom_item_costs
    FOR EACH ROW
    WHEN (NEW.total_cost IS DISTINCT FROM OLD.total_cost)
    EXECUTE FUNCTION mark_parent_costs_stale();

-- Function to automatically recalculate cost when process costs update
CREATE OR REPLACE FUNCTION sync_process_cost_to_bom_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert the bom_item_cost record
    INSERT INTO bom_item_costs (bom_item_id, user_id, process_cost, own_cost, total_cost, unit_cost)
    VALUES (
        NEW.bom_item_id,
        NEW.user_id,
        COALESCE(NEW.total_cost_per_part, 0),
        COALESCE(NEW.total_cost_per_part, 0),
        COALESCE(NEW.total_cost_per_part, 0),
        COALESCE(NEW.total_cost_per_part, 0)
    )
    ON CONFLICT (bom_item_id, user_id)
    DO UPDATE SET
        process_cost = COALESCE(NEW.total_cost_per_part, 0),
        own_cost = bom_item_costs.raw_material_cost + COALESCE(NEW.total_cost_per_part, 0),
        total_cost = bom_item_costs.raw_material_cost + COALESCE(NEW.total_cost_per_part, 0) + bom_item_costs.direct_children_cost,
        unit_cost = (bom_item_costs.raw_material_cost + COALESCE(NEW.total_cost_per_part, 0) + bom_item_costs.direct_children_cost),
        is_stale = false,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_process_cost
    AFTER INSERT OR UPDATE ON process_cost_records
    FOR EACH ROW
    EXECUTE FUNCTION sync_process_cost_to_bom_item();

-- View for easy querying of cost hierarchy
CREATE OR REPLACE VIEW bom_item_cost_hierarchy AS
WITH RECURSIVE cost_tree AS (
    -- Base case: root items (no parent)
    SELECT
        bi.id,
        bi.bom_id,
        bi.name,
        bi.item_type,
        bi.parent_item_id,
        bi.quantity,
        bic.raw_material_cost,
        bic.process_cost,
        bic.direct_children_cost,
        bic.own_cost,
        bic.total_cost,
        bic.unit_cost,
        bic.selling_price,
        bic.is_stale,
        0 AS depth,
        ARRAY[bi.id] AS path,
        bi.user_id
    FROM bom_items bi
    LEFT JOIN bom_item_costs bic ON bi.id = bic.bom_item_id
    WHERE bi.parent_item_id IS NULL

    UNION ALL

    -- Recursive case: children
    SELECT
        bi.id,
        bi.bom_id,
        bi.name,
        bi.item_type,
        bi.parent_item_id,
        bi.quantity,
        bic.raw_material_cost,
        bic.process_cost,
        bic.direct_children_cost,
        bic.own_cost,
        bic.total_cost,
        bic.unit_cost,
        bic.selling_price,
        bic.is_stale,
        ct.depth + 1,
        ct.path || bi.id,
        bi.user_id
    FROM bom_items bi
    INNER JOIN cost_tree ct ON bi.parent_item_id = ct.id
    LEFT JOIN bom_item_costs bic ON bi.id = bic.bom_item_id
)
SELECT * FROM cost_tree ORDER BY path;

-- Function to calculate total cost for an item including all children
CREATE OR REPLACE FUNCTION calculate_bom_item_total_cost(
    p_bom_item_id UUID,
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_total_cost DECIMAL(15, 4) := 0;
    v_own_cost DECIMAL(15, 4) := 0;
    v_children_cost DECIMAL(15, 4) := 0;
BEGIN
    -- Get own cost (material + process)
    SELECT COALESCE(raw_material_cost, 0) + COALESCE(process_cost, 0)
    INTO v_own_cost
    FROM bom_item_costs
    WHERE bom_item_id = p_bom_item_id AND user_id = p_user_id;

    -- Get children cost (recursive sum)
    WITH RECURSIVE children AS (
        SELECT id, quantity
        FROM bom_items
        WHERE parent_item_id = p_bom_item_id

        UNION ALL

        SELECT bi.id, bi.quantity * c.quantity
        FROM bom_items bi
        INNER JOIN children c ON bi.parent_item_id = c.id
    )
    SELECT COALESCE(SUM(bic.own_cost * c.quantity), 0)
    INTO v_children_cost
    FROM children c
    LEFT JOIN bom_item_costs bic ON c.id = bic.bom_item_id AND bic.user_id = p_user_id;

    v_total_cost := COALESCE(v_own_cost, 0) + COALESCE(v_children_cost, 0);

    RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (Supabase uses authenticated role)
GRANT SELECT, INSERT, UPDATE, DELETE ON bom_item_costs TO authenticated;
GRANT SELECT ON bom_item_cost_hierarchy TO authenticated;

-- Enable Row Level Security
ALTER TABLE bom_item_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own cost records
CREATE POLICY "Users can view own cost records"
    ON bom_item_costs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cost records"
    ON bom_item_costs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cost records"
    ON bom_item_costs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cost records"
    ON bom_item_costs FOR DELETE
    USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE bom_item_costs IS 'Stores aggregated cost calculations for BOM items with real-time rollup';
COMMENT ON COLUMN bom_item_costs.own_cost IS 'Material + Process costs at this level only';
COMMENT ON COLUMN bom_item_costs.total_cost IS 'Own cost + all descendant costs (recursive)';
COMMENT ON COLUMN bom_item_costs.is_stale IS 'Flag indicating cost needs recalculation';
COMMENT ON FUNCTION mark_parent_costs_stale IS 'Automatically marks parent costs as stale when child costs change';
COMMENT ON FUNCTION sync_process_cost_to_bom_item IS 'Automatically syncs process cost records to BOM item costs';
COMMENT ON FUNCTION calculate_bom_item_total_cost IS 'Recursively calculates total cost including all children';
