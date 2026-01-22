-- ============================================================================
-- Migration: Add Missing Cost Sync Triggers
-- Purpose: Sync raw material, packaging, and procured costs to bom_item_costs
-- Author: Principal Engineering Team
-- Date: 2026-01-19
-- Version: 1.0.0
-- ============================================================================

-- Problem: Only process_cost_records had a sync trigger. Raw material,
-- packaging/logistics, and procured parts costs were not being aggregated
-- into bom_item_costs table, causing frontend to show ₹0.00.

-- ============================================================================
-- 1. RAW MATERIAL COST SYNC
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_raw_material_cost_to_bom_item()
RETURNS TRIGGER AS $$
DECLARE
    v_aggregated_cost DECIMAL(15, 4);
BEGIN
    -- Aggregate all active raw material costs for this bom_item
    SELECT COALESCE(SUM(total_cost), 0)
    INTO v_aggregated_cost
    FROM raw_material_cost_records
    WHERE bom_item_id = NEW.bom_item_id
      AND user_id = NEW.user_id
      AND is_active = true;

    -- Update or insert the bom_item_cost record
    INSERT INTO bom_item_costs (
        bom_item_id,
        user_id,
        raw_material_cost,
        own_cost,
        total_cost,
        unit_cost
    )
    VALUES (
        NEW.bom_item_id,
        NEW.user_id,
        v_aggregated_cost,
        v_aggregated_cost,
        v_aggregated_cost,
        v_aggregated_cost
    )
    ON CONFLICT (bom_item_id, user_id)
    DO UPDATE SET
        raw_material_cost = v_aggregated_cost,
        own_cost = (
            v_aggregated_cost +
            bom_item_costs.process_cost +
            bom_item_costs.packaging_logistics_cost +
            bom_item_costs.procured_parts_cost
        ),
        total_cost = (
            v_aggregated_cost +
            bom_item_costs.process_cost +
            bom_item_costs.packaging_logistics_cost +
            bom_item_costs.procured_parts_cost +
            bom_item_costs.direct_children_cost
        ),
        unit_cost = (
            v_aggregated_cost +
            bom_item_costs.process_cost +
            bom_item_costs.packaging_logistics_cost +
            bom_item_costs.procured_parts_cost +
            bom_item_costs.direct_children_cost
        ),
        is_stale = false,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_raw_material_cost ON raw_material_cost_records;

-- Create trigger
CREATE TRIGGER trigger_sync_raw_material_cost
    AFTER INSERT OR UPDATE ON raw_material_cost_records
    FOR EACH ROW
    EXECUTE FUNCTION sync_raw_material_cost_to_bom_item();

-- ============================================================================
-- 2. PACKAGING/LOGISTICS COST SYNC
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_packaging_logistics_cost_to_bom_item()
RETURNS TRIGGER AS $$
DECLARE
    v_aggregated_cost DECIMAL(15, 4);
BEGIN
    -- Aggregate all active packaging/logistics costs for this bom_item
    SELECT COALESCE(SUM(total_cost), 0)
    INTO v_aggregated_cost
    FROM packaging_logistics_cost_records
    WHERE bom_item_id = NEW.bom_item_id
      AND user_id = NEW.user_id
      AND is_active = true;

    -- Update or insert the bom_item_cost record
    INSERT INTO bom_item_costs (
        bom_item_id,
        user_id,
        packaging_logistics_cost,
        own_cost,
        total_cost,
        unit_cost
    )
    VALUES (
        NEW.bom_item_id,
        NEW.user_id,
        v_aggregated_cost,
        v_aggregated_cost,
        v_aggregated_cost,
        v_aggregated_cost
    )
    ON CONFLICT (bom_item_id, user_id)
    DO UPDATE SET
        packaging_logistics_cost = v_aggregated_cost,
        own_cost = (
            bom_item_costs.raw_material_cost +
            bom_item_costs.process_cost +
            v_aggregated_cost +
            bom_item_costs.procured_parts_cost
        ),
        total_cost = (
            bom_item_costs.raw_material_cost +
            bom_item_costs.process_cost +
            v_aggregated_cost +
            bom_item_costs.procured_parts_cost +
            bom_item_costs.direct_children_cost
        ),
        unit_cost = (
            bom_item_costs.raw_material_cost +
            bom_item_costs.process_cost +
            v_aggregated_cost +
            bom_item_costs.procured_parts_cost +
            bom_item_costs.direct_children_cost
        ),
        is_stale = false,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_packaging_logistics_cost ON packaging_logistics_cost_records;

-- Create trigger
CREATE TRIGGER trigger_sync_packaging_logistics_cost
    AFTER INSERT OR UPDATE ON packaging_logistics_cost_records
    FOR EACH ROW
    EXECUTE FUNCTION sync_packaging_logistics_cost_to_bom_item();

-- ============================================================================
-- 3. PROCURED PARTS COST SYNC
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_procured_parts_cost_to_bom_item()
RETURNS TRIGGER AS $$
DECLARE
    v_aggregated_cost DECIMAL(15, 4);
BEGIN
    -- Aggregate all active procured parts costs for this bom_item
    SELECT COALESCE(SUM(total_cost), 0)
    INTO v_aggregated_cost
    FROM procured_parts_cost_records
    WHERE bom_item_id = NEW.bom_item_id
      AND user_id = NEW.user_id
      AND is_active = true;

    -- Update or insert the bom_item_cost record
    INSERT INTO bom_item_costs (
        bom_item_id,
        user_id,
        procured_parts_cost,
        own_cost,
        total_cost,
        unit_cost
    )
    VALUES (
        NEW.bom_item_id,
        NEW.user_id,
        v_aggregated_cost,
        v_aggregated_cost,
        v_aggregated_cost,
        v_aggregated_cost
    )
    ON CONFLICT (bom_item_id, user_id)
    DO UPDATE SET
        procured_parts_cost = v_aggregated_cost,
        own_cost = (
            bom_item_costs.raw_material_cost +
            bom_item_costs.process_cost +
            bom_item_costs.packaging_logistics_cost +
            v_aggregated_cost
        ),
        total_cost = (
            bom_item_costs.raw_material_cost +
            bom_item_costs.process_cost +
            bom_item_costs.packaging_logistics_cost +
            v_aggregated_cost +
            bom_item_costs.direct_children_cost
        ),
        unit_cost = (
            bom_item_costs.raw_material_cost +
            bom_item_costs.process_cost +
            bom_item_costs.packaging_logistics_cost +
            v_aggregated_cost +
            bom_item_costs.direct_children_cost
        ),
        is_stale = false,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_procured_parts_cost ON procured_parts_cost_records;

-- Create trigger
CREATE TRIGGER trigger_sync_procured_parts_cost
    AFTER INSERT OR UPDATE ON procured_parts_cost_records
    FOR EACH ROW
    EXECUTE FUNCTION sync_procured_parts_cost_to_bom_item();

-- ============================================================================
-- 4. BACKFILL EXISTING DATA
-- ============================================================================

-- Backfill raw material costs for existing records
INSERT INTO bom_item_costs (bom_item_id, user_id, raw_material_cost, own_cost, total_cost, unit_cost)
SELECT
    bom_item_id,
    user_id,
    SUM(total_cost) as raw_material_cost,
    SUM(total_cost) as own_cost,
    SUM(total_cost) as total_cost,
    SUM(total_cost) as unit_cost
FROM raw_material_cost_records
WHERE is_active = true
GROUP BY bom_item_id, user_id
ON CONFLICT (bom_item_id, user_id)
DO UPDATE SET
    raw_material_cost = EXCLUDED.raw_material_cost,
    own_cost = EXCLUDED.raw_material_cost + bom_item_costs.process_cost + bom_item_costs.packaging_logistics_cost + bom_item_costs.procured_parts_cost,
    total_cost = EXCLUDED.raw_material_cost + bom_item_costs.process_cost + bom_item_costs.packaging_logistics_cost + bom_item_costs.procured_parts_cost + bom_item_costs.direct_children_cost,
    unit_cost = EXCLUDED.raw_material_cost + bom_item_costs.process_cost + bom_item_costs.packaging_logistics_cost + bom_item_costs.procured_parts_cost + bom_item_costs.direct_children_cost,
    updated_at = NOW();

-- Backfill packaging/logistics costs for existing records
INSERT INTO bom_item_costs (bom_item_id, user_id, packaging_logistics_cost, own_cost, total_cost, unit_cost)
SELECT
    bom_item_id,
    user_id,
    SUM(total_cost) as packaging_logistics_cost,
    SUM(total_cost) as own_cost,
    SUM(total_cost) as total_cost,
    SUM(total_cost) as unit_cost
FROM packaging_logistics_cost_records
WHERE is_active = true
GROUP BY bom_item_id, user_id
ON CONFLICT (bom_item_id, user_id)
DO UPDATE SET
    packaging_logistics_cost = EXCLUDED.packaging_logistics_cost,
    own_cost = bom_item_costs.raw_material_cost + bom_item_costs.process_cost + EXCLUDED.packaging_logistics_cost + bom_item_costs.procured_parts_cost,
    total_cost = bom_item_costs.raw_material_cost + bom_item_costs.process_cost + EXCLUDED.packaging_logistics_cost + bom_item_costs.procured_parts_cost + bom_item_costs.direct_children_cost,
    unit_cost = bom_item_costs.raw_material_cost + bom_item_costs.process_cost + EXCLUDED.packaging_logistics_cost + bom_item_costs.procured_parts_cost + bom_item_costs.direct_children_cost,
    updated_at = NOW();

-- Backfill procured parts costs for existing records
INSERT INTO bom_item_costs (bom_item_id, user_id, procured_parts_cost, own_cost, total_cost, unit_cost)
SELECT
    bom_item_id,
    user_id,
    SUM(total_cost) as procured_parts_cost,
    SUM(total_cost) as own_cost,
    SUM(total_cost) as total_cost,
    SUM(total_cost) as unit_cost
FROM procured_parts_cost_records
WHERE is_active = true
GROUP BY bom_item_id, user_id
ON CONFLICT (bom_item_id, user_id)
DO UPDATE SET
    procured_parts_cost = EXCLUDED.procured_parts_cost,
    own_cost = bom_item_costs.raw_material_cost + bom_item_costs.process_cost + bom_item_costs.packaging_logistics_cost + EXCLUDED.procured_parts_cost,
    total_cost = bom_item_costs.raw_material_cost + bom_item_costs.process_cost + bom_item_costs.packaging_logistics_cost + EXCLUDED.procured_parts_cost + bom_item_costs.direct_children_cost,
    unit_cost = bom_item_costs.raw_material_cost + bom_item_costs.process_cost + bom_item_costs.packaging_logistics_cost + EXCLUDED.procured_parts_cost + bom_item_costs.direct_children_cost,
    updated_at = NOW();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION sync_raw_material_cost_to_bom_item IS 'Automatically syncs raw material cost records to bom_item_costs aggregation table';
COMMENT ON FUNCTION sync_packaging_logistics_cost_to_bom_item IS 'Automatically syncs packaging/logistics cost records to bom_item_costs aggregation table';
COMMENT ON FUNCTION sync_procured_parts_cost_to_bom_item IS 'Automatically syncs procured parts cost records to bom_item_costs aggregation table';

-- ============================================================================
-- Migration completed successfully
-- All cost types now automatically sync to bom_item_costs table
-- Existing data has been backfilled
-- ============================================================================
