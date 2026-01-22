-- ============================================================================
-- Migration: Vendor Process Capabilities
-- Description: Introduces vendor–process capability mapping (industry standard)
--
-- WHY THIS EXISTS:
-- Supplier evaluation MUST be contextual to manufacturing process.
-- Vendors are not evaluated globally — they are evaluated per process.
--
-- Core rule:
--   Evaluation = BOM Item × Vendor × Process
-- NOT:
--   Evaluation = BOM Item × Vendor
--
-- This aligns with OEM industry standards (SAP ME, Siemens Teamcenter, Oracle SCM)
-- ============================================================================

-- ============================================================================
-- 0. SHARED TRIGGER FUNCTION (Idempotent)
-- ============================================================================

-- Define update_updated_at_column if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS
  'Shared trigger function to auto-update updated_at timestamp on row modification';

-- ============================================================================
-- 1. VENDOR PROCESS CAPABILITIES (First-class concept)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_process_capabilities (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,

  -- Capability Metadata
  equipment_available TEXT[], -- List of equipment/machines vendor has for this process
  capacity_per_month NUMERIC(15, 2), -- Production capacity (units/month)
  certifications TEXT[], -- ISO 9001, AS9100, IATF 16949, etc.
  lead_time_days INTEGER, -- Typical lead time for this process

  -- Cost estimates (optional, for quick filtering)
  typical_cost_per_unit NUMERIC(15, 2),
  setup_cost NUMERIC(15, 2),

  -- Notes
  notes TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_vendor_process UNIQUE (vendor_id, process_id),
  CONSTRAINT check_capacity CHECK (capacity_per_month IS NULL OR capacity_per_month > 0),
  CONSTRAINT check_lead_time CHECK (lead_time_days IS NULL OR lead_time_days > 0)
);

COMMENT ON TABLE vendor_process_capabilities IS
  'Vendor-Process capability mapping. Industry standard: vendors are evaluated per process, not globally.';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_process_capabilities_vendor
  ON vendor_process_capabilities(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_process_capabilities_process
  ON vendor_process_capabilities(process_id);
CREATE INDEX IF NOT EXISTS idx_vendor_process_capabilities_active
  ON vendor_process_capabilities(is_active) WHERE is_active = true;

-- ============================================================================
-- RLS (Multi-tenant isolation) - CORRECT POLICIES
-- ============================================================================

ALTER TABLE vendor_process_capabilities ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (USING clause)
CREATE POLICY vpc_select
  ON vendor_process_capabilities
  FOR SELECT
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Policy for INSERT/UPDATE/DELETE (WITH CHECK clause)
CREATE POLICY vpc_modify
  ON vendor_process_capabilities
  FOR INSERT
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY vpc_update
  ON vendor_process_capabilities
  FOR UPDATE
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY vpc_delete
  ON vendor_process_capabilities
  FOR DELETE
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE TRIGGER update_vendor_process_capabilities_updated_at
  BEFORE UPDATE ON vendor_process_capabilities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ADD PROCESS CONTEXT TO EVALUATIONS
-- ============================================================================

-- Add process_id to supplier_evaluation_records
ALTER TABLE supplier_evaluation_records
  ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES processes(id) ON DELETE SET NULL;

COMMENT ON COLUMN supplier_evaluation_records.process_id IS
  'Manufacturing process being evaluated. Evaluation context is: BOM Item × Vendor × Process. NULL allowed for legacy records.';

-- Create index for evaluation by process
CREATE INDEX IF NOT EXISTS idx_supplier_evaluation_records_process
  ON supplier_evaluation_records(process_id);

-- ============================================================================
-- CRITICAL: Update unique constraint to include process
-- ============================================================================

-- Drop the ACTUAL old constraint (from migration 042)
ALTER TABLE supplier_evaluation_records
  DROP CONSTRAINT IF EXISTS unique_vendor_bom_evaluation;

-- Add new constraint: One evaluation per (bom_item, vendor, process, round)
-- NOTE: process_id can be NULL for legacy records, uniqueness still enforced
ALTER TABLE supplier_evaluation_records
  ADD CONSTRAINT unique_evaluation_per_item_vendor_process
    UNIQUE NULLS NOT DISTINCT (bom_item_id, vendor_id, process_id, evaluation_round);

-- ============================================================================
-- 3. HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================================

-- Get vendors capable of a specific process
CREATE OR REPLACE FUNCTION get_vendors_by_process(
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
    v.id,
    v.name,
    v.supplier_code,
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
  'SECURITY DEFINER: Executes with elevated privileges. Ownership validated via vendor.user_id. Returns vendors capable of performing specified process.';

-- Get processes that a vendor can perform
CREATE OR REPLACE FUNCTION get_processes_by_vendor(
  p_vendor_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  process_id UUID,
  process_name VARCHAR,
  process_type VARCHAR,
  lead_time_days INTEGER,
  capacity_per_month NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.process_name,
    p.process_type,
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
  'SECURITY DEFINER: Executes with elevated privileges. Ownership validated via vendor.user_id. Returns processes that vendor can perform.';

-- ============================================================================
-- 4. VALIDATION QUERIES (Optional - for post-migration verification)
-- ============================================================================

-- Verify table exists
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_process_capabilities');

-- Verify indexes
-- SELECT indexname FROM pg_indexes WHERE tablename = 'vendor_process_capabilities';

-- Verify RLS policies
-- SELECT policyname FROM pg_policies WHERE tablename = 'vendor_process_capabilities';

-- Verify functions
-- SELECT proname FROM pg_proc WHERE proname IN ('get_vendors_by_process', 'get_processes_by_vendor');

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

-- DROP FUNCTION IF EXISTS get_processes_by_vendor(UUID, UUID);
-- DROP FUNCTION IF EXISTS get_vendors_by_process(UUID, UUID);
-- ALTER TABLE supplier_evaluation_records DROP CONSTRAINT IF EXISTS unique_evaluation_per_item_vendor_process;
-- ALTER TABLE supplier_evaluation_records DROP COLUMN IF EXISTS process_id;
-- DROP INDEX IF EXISTS idx_vendor_process_capabilities_active;
-- DROP INDEX IF EXISTS idx_vendor_process_capabilities_process;
-- DROP INDEX IF EXISTS idx_vendor_process_capabilities_vendor;
-- DROP TABLE IF EXISTS vendor_process_capabilities CASCADE;
