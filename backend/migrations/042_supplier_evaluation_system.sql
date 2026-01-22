-- =====================================================
-- SUPPLIER EVALUATION SYSTEM (Contextual)
-- =====================================================
-- Purpose: Track vendor evaluation scores in context of BOM items
-- Domain: This is CONTEXTUAL evaluation (part-specific)
-- Future: P1 will add supplier-level evaluation master
--
-- Design Principles:
-- - Immutable snapshots with cryptographic integrity
-- - Nomination MUST reference snapshot_id (never live data)
-- - Freeze-on-approval semantics
-- - Distributed-database ready (no cross-table triggers)
-- =====================================================

-- =====================================================
-- 1. SUPPLIER CONTEXTUAL EVALUATION
-- Evaluation of supplier capability for specific part/project
-- =====================================================
CREATE TABLE IF NOT EXISTS supplier_evaluation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership (TRANSITIONAL - P1: Add organization_id + created_by)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Evaluation Context
  vendor_id UUID NOT NULL,
  project_id UUID,
  bom_item_id UUID REFERENCES bom_items(id) ON DELETE CASCADE,

  -- Technical Evaluation Criteria (0-100 scale per criterion)
  material_availability_score DECIMAL(5,2) DEFAULT 0 CHECK (material_availability_score >= 0 AND material_availability_score <= 100),
  equipment_capability_score DECIMAL(5,2) DEFAULT 0 CHECK (equipment_capability_score >= 0 AND equipment_capability_score <= 100),
  process_feasibility_score DECIMAL(5,2) DEFAULT 0 CHECK (process_feasibility_score >= 0 AND process_feasibility_score <= 100),
  quality_certification_score DECIMAL(5,2) DEFAULT 0 CHECK (quality_certification_score >= 0 AND quality_certification_score <= 100),
  financial_stability_score DECIMAL(5,2) DEFAULT 0 CHECK (financial_stability_score >= 0 AND financial_stability_score <= 100),
  capacity_score DECIMAL(5,2) DEFAULT 0 CHECK (capacity_score >= 0 AND capacity_score <= 100),
  lead_time_score DECIMAL(5,2) DEFAULT 0 CHECK (lead_time_score >= 0 AND lead_time_score <= 100),

  -- Calculated technical total (service-layer computes percentage)
  technical_total_score DECIMAL(7,2) GENERATED ALWAYS AS (
    material_availability_score + equipment_capability_score + process_feasibility_score +
    quality_certification_score + financial_stability_score + capacity_score + lead_time_score
  ) STORED,
  technical_max_score DECIMAL(7,2) DEFAULT 700,

  -- Cost competitiveness (from procured_parts_cost_records or process_cost_records)
  quoted_cost DECIMAL(15,2),
  market_average_cost DECIMAL(15,2),
  cost_competitiveness_score DECIMAL(5,2),

  -- Vendor rating (from vendor master data quality metrics)
  vendor_rating_score DECIMAL(5,2),

  -- Overall weighted score (computed by service layer, not trigger)
  overall_weighted_score DECIMAL(5,2),

  -- Evaluation metadata
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'approved', 'archived')) NOT NULL,
  evaluation_round INTEGER DEFAULT 1 NOT NULL,
  evaluator_notes TEXT,
  recommendation_status VARCHAR(50) CHECK (recommendation_status IN ('recommended', 'conditional', 'not_recommended', 'pending')),

  -- Immutability enforcement (freeze on approval)
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),
  is_frozen BOOLEAN DEFAULT false,

  -- Audit trail
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Uniqueness constraint (P1: Consider allowing parallel evaluation by different roles)
  CONSTRAINT unique_vendor_bom_evaluation UNIQUE (vendor_id, bom_item_id, evaluation_round, user_id)
);

COMMENT ON TABLE supplier_evaluation_records IS 'Contextual supplier evaluation for specific parts. P1: Add supplier-level evaluation master.';
COMMENT ON COLUMN supplier_evaluation_records.user_id IS 'TRANSITIONAL: P1 will add organization_id + created_by for multi-user collaboration';
COMMENT ON COLUMN supplier_evaluation_records.is_frozen IS 'When true, record is immutable and snapshot created. Nomination references snapshot only.';

-- Indexes for performance
CREATE INDEX idx_supplier_eval_vendor ON supplier_evaluation_records(vendor_id);
CREATE INDEX idx_supplier_eval_bom_item ON supplier_evaluation_records(bom_item_id);
CREATE INDEX idx_supplier_eval_project ON supplier_evaluation_records(project_id);
CREATE INDEX idx_supplier_eval_user ON supplier_evaluation_records(user_id);
CREATE INDEX idx_supplier_eval_status ON supplier_evaluation_records(status);
CREATE INDEX idx_supplier_eval_frozen ON supplier_evaluation_records(is_frozen) WHERE is_frozen = true;

-- Row Level Security
ALTER TABLE supplier_evaluation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evaluation records"
  ON supplier_evaluation_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own evaluation records"
  ON supplier_evaluation_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own unfrozen evaluation records"
  ON supplier_evaluation_records FOR UPDATE
  USING (auth.uid() = user_id AND is_frozen = false)
  WITH CHECK (auth.uid() = user_id AND is_frozen = false);

CREATE POLICY "Users can delete own unfrozen evaluation records"
  ON supplier_evaluation_records FOR DELETE
  USING (auth.uid() = user_id AND is_frozen = false);

-- =====================================================
-- 2. EVALUATION SNAPSHOTS (IMMUTABLE AUDIT TRAIL)
-- =====================================================
-- Critical: Nomination MUST reference snapshot_id, never live evaluation
-- Provides cryptographic integrity for procurement audit compliance
-- =====================================================
CREATE TABLE IF NOT EXISTS supplier_evaluation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES supplier_evaluation_records(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,

  -- Immutable snapshot of evaluation state
  snapshot_payload JSONB NOT NULL,

  -- Cryptographic integrity (SHA-256 hash of payload)
  -- Proves snapshot has not been tampered with
  snapshot_hash TEXT NOT NULL,

  -- Metadata
  snapshot_reason VARCHAR(100) CHECK (snapshot_reason IN ('auto_save', 'status_change', 'approval', 'manual')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_evaluation_version UNIQUE (evaluation_id, version)
);

COMMENT ON TABLE supplier_evaluation_snapshots IS 'Immutable snapshots with cryptographic integrity. Nomination references snapshot_id.';
COMMENT ON COLUMN supplier_evaluation_snapshots.snapshot_hash IS 'SHA-256 hash for integrity verification. Prevents tampering accusations in audits.';

-- Indexes
CREATE INDEX idx_eval_snapshot_evaluation ON supplier_evaluation_snapshots(evaluation_id);
CREATE INDEX idx_eval_snapshot_created ON supplier_evaluation_snapshots(created_at DESC);
CREATE INDEX idx_eval_snapshot_reason ON supplier_evaluation_snapshots(snapshot_reason);
CREATE INDEX idx_eval_snapshot_hash ON supplier_evaluation_snapshots(snapshot_hash);

-- Row Level Security
ALTER TABLE supplier_evaluation_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view snapshots of own evaluations"
  ON supplier_evaluation_snapshots FOR SELECT
  USING (
    evaluation_id IN (
      SELECT id FROM supplier_evaluation_records WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create snapshots of own evaluations"
  ON supplier_evaluation_snapshots FOR INSERT
  WITH CHECK (
    evaluation_id IN (
      SELECT id FROM supplier_evaluation_records WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

-- =====================================================
-- 3. EVALUATION CRITERIA WEIGHTS
-- Customizable weights for weighted score calculation
-- =====================================================
CREATE TABLE IF NOT EXISTS evaluation_criteria_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID,

  -- Criteria weights (must sum to 100)
  cost_competency_weight DECIMAL(5,2) DEFAULT 30.00 CHECK (cost_competency_weight >= 0 AND cost_competency_weight <= 100),
  vendor_rating_weight DECIMAL(5,2) DEFAULT 30.00 CHECK (vendor_rating_weight >= 0 AND vendor_rating_weight <= 100),
  technical_capability_weight DECIMAL(5,2) DEFAULT 40.00 CHECK (technical_capability_weight >= 0 AND technical_capability_weight <= 100),

  -- Validation: weights must sum to exactly 100
  CONSTRAINT weights_sum_100 CHECK (
    cost_competency_weight + vendor_rating_weight + technical_capability_weight = 100.00
  ),

  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_user_project_weights UNIQUE (user_id, project_id)
);

COMMENT ON TABLE evaluation_criteria_weights IS 'Customizable scoring weights per user/project. Defaults to 30/30/40 split.';

-- Indexes
CREATE INDEX idx_eval_weights_user ON evaluation_criteria_weights(user_id);
CREATE INDEX idx_eval_weights_project ON evaluation_criteria_weights(project_id);

-- Row Level Security
ALTER TABLE evaluation_criteria_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own criteria weights"
  ON evaluation_criteria_weights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own criteria weights"
  ON evaluation_criteria_weights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Freeze evaluation and create final snapshot
-- Called when evaluation is approved and ready for nomination
CREATE OR REPLACE FUNCTION freeze_evaluation(
  p_evaluation_id UUID,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_next_version INTEGER;
  v_evaluation JSONB;
  v_hash TEXT;
BEGIN
  -- Prevent double-freeze
  IF EXISTS (
    SELECT 1 FROM supplier_evaluation_records
    WHERE id = p_evaluation_id AND is_frozen = true
  ) THEN
    RAISE EXCEPTION 'Evaluation already frozen';
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_next_version
  FROM supplier_evaluation_snapshots
  WHERE evaluation_id = p_evaluation_id;

  -- Capture current evaluation state
  SELECT to_jsonb(ser)
  INTO v_evaluation
  FROM supplier_evaluation_records ser
  WHERE id = p_evaluation_id;

  -- Calculate SHA-256 hash for integrity
  v_hash := encode(digest(v_evaluation::text, 'sha256'), 'hex');

  -- Create immutable snapshot
  INSERT INTO supplier_evaluation_snapshots (
    evaluation_id,
    version,
    snapshot_payload,
    snapshot_hash,
    snapshot_reason,
    created_by
  ) VALUES (
    p_evaluation_id,
    v_next_version,
    v_evaluation,
    v_hash,
    'approval',
    p_user_id
  ) RETURNING id INTO v_snapshot_id;

  -- Freeze evaluation (makes it read-only)
  UPDATE supplier_evaluation_records
  SET
    is_frozen = true,
    status = 'approved',
    approved_at = CURRENT_TIMESTAMP,
    approved_by = p_user_id,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_evaluation_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION freeze_evaluation IS 'Freezes evaluation and creates final snapshot. Returns snapshot_id for nomination reference.';

-- Create auto-save snapshot (for draft recovery)
CREATE OR REPLACE FUNCTION create_evaluation_snapshot(
  p_evaluation_id UUID,
  p_user_id UUID,
  p_reason VARCHAR(100) DEFAULT 'auto_save'
) RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_next_version INTEGER;
  v_evaluation JSONB;
  v_hash TEXT;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_next_version
  FROM supplier_evaluation_snapshots
  WHERE evaluation_id = p_evaluation_id;

  -- Capture current evaluation state
  SELECT to_jsonb(ser)
  INTO v_evaluation
  FROM supplier_evaluation_records ser
  WHERE id = p_evaluation_id;

  -- Calculate SHA-256 hash
  v_hash := encode(digest(v_evaluation::text, 'sha256'), 'hex');

  -- Create snapshot
  INSERT INTO supplier_evaluation_snapshots (
    evaluation_id,
    version,
    snapshot_payload,
    snapshot_hash,
    snapshot_reason,
    created_by
  ) VALUES (
    p_evaluation_id,
    v_next_version,
    v_evaluation,
    v_hash,
    p_reason,
    p_user_id
  ) RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify snapshot integrity (detects tampering)
CREATE OR REPLACE FUNCTION verify_snapshot_integrity(
  p_snapshot_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_stored_hash TEXT;
  v_computed_hash TEXT;
  v_payload JSONB;
BEGIN
  -- Get snapshot data
  SELECT snapshot_payload, snapshot_hash
  INTO v_payload, v_stored_hash
  FROM supplier_evaluation_snapshots
  WHERE id = p_snapshot_id;

  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'Snapshot not found';
  END IF;

  -- Recompute hash
  v_computed_hash := encode(digest(v_payload::text, 'sha256'), 'hex');

  -- Compare hashes
  RETURN v_stored_hash = v_computed_hash;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_snapshot_integrity IS 'Verifies snapshot has not been tampered with. Returns true if hash matches.';

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_supplier_evaluation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_evaluation_timestamp
  BEFORE UPDATE ON supplier_evaluation_records
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_evaluation_timestamp();

-- =====================================================
-- 5. VIEWS FOR QUERYING
-- =====================================================

-- Summary view with calculated percentages
CREATE OR REPLACE VIEW supplier_evaluation_summary AS
SELECT
  ser.id,
  ser.user_id,
  ser.vendor_id,
  ser.project_id,
  ser.bom_item_id,
  bi.part_number,
  bi.name as part_name,
  ser.technical_total_score,
  ser.technical_max_score,
  ROUND((ser.technical_total_score / NULLIF(ser.technical_max_score, 0)) * 100, 2) as technical_percentage,
  ser.cost_competitiveness_score,
  ser.vendor_rating_score,
  ser.overall_weighted_score,
  ser.status,
  ser.recommendation_status,
  ser.evaluation_round,
  ser.is_frozen,
  ser.approved_at,
  ser.approved_by,
  ser.created_at,
  ser.updated_at
FROM supplier_evaluation_records ser
LEFT JOIN bom_items bi ON bi.id = ser.bom_item_id;

GRANT SELECT ON supplier_evaluation_summary TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Contract: This schema is now frozen and versioned
--
-- P0 (Implemented):
--   ✓ Contextual evaluation with freeze semantics
--   ✓ Immutable snapshots with SHA-256 integrity
--   ✓ Nomination-ready (references snapshot_id)
--   ✓ Distributed-database safe
--
-- P1 (Next iteration):
--   - Add organization_id + created_by
--   - Add supplier-level evaluation master
--   - Add nomination table (references snapshot_id)
--   - Support parallel evaluation by role
--
-- P2 (Future):
--   - Event sourcing table
--   - ML scoring hooks
--   - Analytics views
-- =====================================================
