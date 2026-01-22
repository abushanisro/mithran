-- ============================================================================
-- Migration: Add vendor_name to supplier_evaluation_summary view
-- Description: Update view to include vendor_name column to avoid N+1 queries
--
-- WHY THIS IS NEEDED:
-- Frontend expects vendorName in evaluation data but current view only has vendor_id
-- Adding vendor name prevents N+1 query problems and improves performance
-- ============================================================================

-- Drop existing view
DROP VIEW IF EXISTS supplier_evaluation_summary;

-- Recreate view with vendor_name
CREATE OR REPLACE VIEW supplier_evaluation_summary AS
SELECT
  ser.id,
  ser.user_id,
  ser.vendor_id,
  ser.project_id,
  ser.bom_item_id,
  ser.process_id,
  bi.part_number,
  bi.name as part_name,
  v.name as vendor_name,  -- ADDED: Vendor name for display
  p.process_name,
  p.process_category as process_type,
  ser.material_availability_score,
  ser.equipment_capability_score,
  ser.process_feasibility_score,
  ser.quality_certification_score,
  ser.financial_stability_score,
  ser.capacity_score,
  ser.lead_time_score,
  ser.technical_total_score,
  ser.technical_max_score,
  ROUND((ser.technical_total_score / NULLIF(ser.technical_max_score, 0)) * 100, 2) as technical_percentage,
  ser.quoted_cost,
  ser.market_average_cost,
  ser.cost_competitiveness_score,
  ser.vendor_rating_score,
  ser.overall_weighted_score,
  ser.status,
  ser.recommendation_status,
  ser.evaluation_round,
  ser.evaluator_notes,
  ser.is_frozen,
  ser.approved_at,
  ser.approved_by,
  ser.created_at,
  ser.updated_at
FROM supplier_evaluation_records ser
LEFT JOIN bom_items bi ON bi.id = ser.bom_item_id
LEFT JOIN vendors v ON v.id = ser.vendor_id  -- ADDED: Join vendor for display data
LEFT JOIN processes p ON p.id = ser.process_id;

-- Grant permissions
GRANT SELECT ON supplier_evaluation_summary TO authenticated;

COMMENT ON VIEW supplier_evaluation_summary IS
  'Summary view of supplier evaluations with BOM item details, vendor names, and process context. Includes all technical scores, calculated percentages, and display names to avoid N+1 frontend queries.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify vendor_name is now included:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'supplier_evaluation_summary'
-- AND column_name = 'vendor_name';