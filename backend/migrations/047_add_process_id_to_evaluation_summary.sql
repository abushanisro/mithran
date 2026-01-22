-- ============================================================================
-- Migration: Add process_id to supplier_evaluation_summary view
-- Description: Update view to include process_id column
--
-- WHY THIS IS NEEDED:
-- Process context is now required for supplier evaluations (OEM-standard)
-- The view must expose process_id for filtering and display
-- ============================================================================

-- Drop existing view
DROP VIEW IF EXISTS supplier_evaluation_summary;

-- Recreate view with process_id and process details
CREATE OR REPLACE VIEW supplier_evaluation_summary AS
SELECT
  ser.id,
  ser.user_id,
  ser.vendor_id,
  ser.project_id,
  ser.bom_item_id,
  ser.process_id,  -- ADDED: Process context for evaluation
  bi.part_number,
  bi.name as part_name,
  p.process_name,  -- ADDED: Process name for display (avoids N+1 frontend queries)
  p.process_category as process_type,  -- ADDED: Process type for display
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
LEFT JOIN processes p ON p.id = ser.process_id;  -- ADDED: Join process for display data

-- Grant permissions
GRANT SELECT ON supplier_evaluation_summary TO authenticated;

COMMENT ON VIEW supplier_evaluation_summary IS
  'Summary view of supplier evaluations with BOM item details and process context. Includes all technical scores, calculated percentages, and process display names to avoid N+1 frontend queries.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify process_id is now included:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'supplier_evaluation_summary'
-- AND column_name = 'process_id';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP VIEW IF EXISTS supplier_evaluation_summary;
--
-- CREATE OR REPLACE VIEW supplier_evaluation_summary AS
-- SELECT
--   ser.id,
--   ser.user_id,
--   ser.vendor_id,
--   ser.project_id,
--   ser.bom_item_id,
--   bi.part_number,
--   bi.name as part_name,
--   ser.technical_total_score,
--   ser.technical_max_score,
--   ROUND((ser.technical_total_score / NULLIF(ser.technical_max_score, 0)) * 100, 2) as technical_percentage,
--   ser.cost_competitiveness_score,
--   ser.vendor_rating_score,
--   ser.overall_weighted_score,
--   ser.status,
--   ser.recommendation_status,
--   ser.evaluation_round,
--   ser.is_frozen,
--   ser.approved_at,
--   ser.approved_by,
--   ser.created_at,
--   ser.updated_at
-- FROM supplier_evaluation_records ser
-- LEFT JOIN bom_items bi ON bi.id = ser.bom_item_id;
--
-- GRANT SELECT ON supplier_evaluation_summary TO authenticated;
