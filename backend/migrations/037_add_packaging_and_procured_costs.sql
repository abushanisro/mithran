-- Migration: Add Packaging/Logistics and Procured Parts Costs
-- Purpose: Extend cost model to include all cost components
-- Date: 2026-01-15

-- Step 1: Drop the view first (it depends on the table structure)
DROP VIEW IF EXISTS bom_item_cost_hierarchy;

-- Step 2: Add new cost columns to bom_item_costs table
ALTER TABLE bom_item_costs
ADD COLUMN IF NOT EXISTS packaging_logistics_cost DECIMAL(15, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS procured_parts_cost DECIMAL(15, 4) DEFAULT 0;

-- Step 3: Add comments to new columns
COMMENT ON COLUMN bom_item_costs.packaging_logistics_cost IS 'Packaging and logistics costs for this item';
COMMENT ON COLUMN bom_item_costs.procured_parts_cost IS 'Cost of procured/purchased parts (buy items)';

-- Step 4: Update existing trigger function to include new cost types
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
        own_cost = (
            bom_item_costs.raw_material_cost +
            COALESCE(NEW.total_cost_per_part, 0) +
            bom_item_costs.packaging_logistics_cost +
            bom_item_costs.procured_parts_cost
        ),
        total_cost = (
            bom_item_costs.raw_material_cost +
            COALESCE(NEW.total_cost_per_part, 0) +
            bom_item_costs.packaging_logistics_cost +
            bom_item_costs.procured_parts_cost +
            bom_item_costs.direct_children_cost
        ),
        unit_cost = (
            bom_item_costs.raw_material_cost +
            COALESCE(NEW.total_cost_per_part, 0) +
            bom_item_costs.packaging_logistics_cost +
            bom_item_costs.procured_parts_cost +
            bom_item_costs.direct_children_cost
        ),
        is_stale = false,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update the calculate function to include new cost types
CREATE OR REPLACE FUNCTION calculate_bom_item_total_cost(
    p_bom_item_id UUID,
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_total_cost DECIMAL(15, 4) := 0;
    v_own_cost DECIMAL(15, 4) := 0;
    v_children_cost DECIMAL(15, 4) := 0;
BEGIN
    -- Get own cost (material + process + packaging + procured)
    SELECT COALESCE(raw_material_cost, 0) +
           COALESCE(process_cost, 0) +
           COALESCE(packaging_logistics_cost, 0) +
           COALESCE(procured_parts_cost, 0)
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

-- Step 6: Recreate the cost hierarchy view to include new columns
CREATE VIEW bom_item_cost_hierarchy AS
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
        bic.packaging_logistics_cost,
        bic.procured_parts_cost,
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
        bic.packaging_logistics_cost,
        bic.procured_parts_cost,
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

-- Migration completed successfully
-- The bom_item_costs table now includes:
-- - packaging_logistics_cost: For packaging and logistics expenses
-- - procured_parts_cost: For purchased/buy parts
-- - Updated own_cost formula: raw_material + process + packaging_logistics + procured_parts
-- - View recreated with new columns
-- - Functions updated to calculate comprehensive costs
