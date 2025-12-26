-- ============================================================================
-- Migration: Add Cost Analysis Function
-- Description: Optimized single-query cost analysis for projects
-- Fixes: N+1 query problem in getCostAnalysis
-- ============================================================================

-- Function to calculate project cost analysis in a single query
-- Returns aggregated data for total BOMs and estimated cost
CREATE OR REPLACE FUNCTION get_project_cost_analysis(project_id_input UUID)
RETURNS TABLE (
  total_boms BIGINT,
  total_items BIGINT,
  estimated_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT b.id)::BIGINT as total_boms,
    COUNT(bi.id)::BIGINT as total_items,
    -- NOTE: Current schema doesn't link bom_items to materials for costing
    -- This returns 0 until material costing is implemented
    -- When implemented, replace with: SUM(bi.quantity * m.unit_cost)
    0::NUMERIC as estimated_cost
  FROM boms b
  LEFT JOIN bom_items bi ON bi.bom_id = b.id
  WHERE b.project_id = project_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_project_cost_analysis(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_project_cost_analysis IS
  'Calculates project cost analysis in single query. Returns total BOMs, items, and estimated cost.';

-- ============================================================================
-- Function: Atomic Sort Order Update
-- Description: Updates BOM item sort orders atomically within a transaction
-- Prevents race conditions and ensures data consistency
-- ============================================================================

CREATE OR REPLACE FUNCTION update_bom_items_sort_order(
  item_updates JSONB,
  expected_bom_id UUID
)
RETURNS void AS $$
DECLARE
  item JSONB;
  item_id UUID;
  item_bom_id UUID;
BEGIN
  -- Verify all items belong to the same BOM before making any changes
  FOR item IN SELECT * FROM jsonb_array_elements(item_updates)
  LOOP
    item_id := (item->>'id')::UUID;

    -- Get the BOM ID for this item
    SELECT bom_id INTO item_bom_id
    FROM bom_items
    WHERE id = item_id;

    -- Check if item exists
    IF item_bom_id IS NULL THEN
      RAISE EXCEPTION 'BOM item % does not exist', item_id;
    END IF;

    -- Check if item belongs to expected BOM
    IF item_bom_id != expected_bom_id THEN
      RAISE EXCEPTION 'BOM item % does not belong to BOM %', item_id, expected_bom_id;
    END IF;
  END LOOP;

  -- All validations passed - perform atomic batch update
  FOR item IN SELECT * FROM jsonb_array_elements(item_updates)
  LOOP
    UPDATE bom_items
    SET sort_order = (item->>'sortOrder')::INTEGER,
        updated_at = NOW()
    WHERE id = (item->>'id')::UUID;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_bom_items_sort_order(JSONB, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_bom_items_sort_order IS
  'Atomically updates sort order for multiple BOM items. Validates all items belong to same BOM before updating.';
