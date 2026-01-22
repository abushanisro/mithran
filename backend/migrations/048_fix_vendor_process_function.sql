-- ============================================================================
-- Migration: Fix vendor process capability functions
-- Description: Fixes column alias mismatches causing "structure does not match" errors
-- ============================================================================

-- ============================================================================
-- FIX 1: get_vendors_by_process - Add explicit column aliases
-- ============================================================================

DROP FUNCTION IF EXISTS get_vendors_by_process(UUID, UUID);

CREATE FUNCTION get_vendors_by_process(
  p_process_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  vendor_id UUID,
  vendor_name VARCHAR,
  vendor_code VARCHAR,
  equipment_available TEXT[],
  capacity_per_month NUMERIC,
  lead_time_days INTEGER,
  certifications TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id AS vendor_id,
    v.name AS vendor_name,
    v.supplier_code AS vendor_code,
    vpc.equipment_available,
    vpc.capacity_per_month,
    vpc.lead_time_days,
    vpc.certifications
  FROM vendors v
  INNER JOIN vendor_process_capabilities vpc ON v.id = vpc.vendor_id
  WHERE
    vpc.process_id = p_process_id
    AND vpc.is_active = true
    AND v.user_id = p_user_id
  ORDER BY v.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_vendors_by_process IS
  'SECURITY DEFINER: Returns vendors capable of performing specified process.';

-- ============================================================================
-- FIX 2: get_processes_by_vendor - Fix process_type -> process_category
-- ============================================================================

DROP FUNCTION IF EXISTS get_processes_by_vendor(UUID, UUID);

CREATE FUNCTION get_processes_by_vendor(
  p_vendor_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  process_id UUID,
  process_name VARCHAR,
  process_category VARCHAR,
  lead_time_days INTEGER,
  capacity_per_month NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS process_id,
    p.process_name,
    p.process_category,
    vpc.lead_time_days,
    vpc.capacity_per_month
  FROM processes p
  INNER JOIN vendor_process_capabilities vpc ON p.id = vpc.process_id
  WHERE
    vpc.vendor_id = p_vendor_id
    AND vpc.is_active = true
    AND EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.id = p_vendor_id AND v.user_id = p_user_id
    )
  ORDER BY p.process_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_processes_by_vendor IS
  'SECURITY DEFINER: Returns processes that vendor can perform.';
