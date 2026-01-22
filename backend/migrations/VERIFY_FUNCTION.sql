
  -- Fix get_vendors_by_process - Add explicit column aliases
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
  SELECT pg_get_functiondef(oid)
  FROM pg_proc
  WHERE proname = 'get_vendors_by_process';

  This will show us the exact current definition. The issue might be:

  1. Connection pooling - The backend might have old connections cached
  2. Function wasn't fully updated - We need to verify the aliases are there

  If the function still shows the old version without aliases, run this complete fix again:

  -- Force drop and recreate
  DROP FUNCTION IF EXISTS get_vendors_by_process(UUID, UUID);
  DROP FUNCTION IF EXISTS get_vendors_by_process(UUID);
  DROP FUNCTION IF EXISTS public.get_vendors_by_process(UUID, UUID);

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