-- =====================================================
-- RFQ (REQUEST FOR QUOTATION) SYSTEM
-- =====================================================
-- Purpose: Track RFQ distribution and responses
-- Domain: Separate from evaluation (feeds evaluation, not owned by it)
--
-- Design Notes:
-- - UUID arrays acceptable for now (P1: normalize to junction tables)
-- - Supports SSG (Supplier Share Group) workflow
-- - Links to evaluation but remains independent
-- =====================================================

-- =====================================================
-- 1. RFQ RECORDS
-- Tracks RFQ sent to suppliers for specific parts
-- =====================================================
CREATE TABLE IF NOT EXISTS rfq_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership (TRANSITIONAL - P1: Add organization_id)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID,

  -- RFQ Identification
  rfq_name VARCHAR(255) NOT NULL,
  rfq_number VARCHAR(100) UNIQUE NOT NULL,

  -- Scope (P1: Normalize to rfq_items and rfq_vendors tables)
  bom_item_ids UUID[] NOT NULL,
  vendor_ids UUID[] NOT NULL,

  -- RFQ Details
  quote_deadline DATE,
  selection_type VARCHAR(50) CHECK (selection_type IN ('single', 'multiple', 'competitive')),
  buyer_name VARCHAR(255),
  email_body TEXT,
  email_subject VARCHAR(500),

  -- Status Tracking
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'responses_received', 'evaluated', 'closed')) NOT NULL,
  sent_at TIMESTAMP,
  closed_at TIMESTAMP,

  -- Audit Trail
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE rfq_records IS 'RFQ distribution tracking. P1: Normalize arrays to junction tables for scalability.';
COMMENT ON COLUMN rfq_records.bom_item_ids IS 'Array of BOM items included in RFQ. P1: Move to rfq_items table.';
COMMENT ON COLUMN rfq_records.vendor_ids IS 'Array of vendors receiving RFQ. P1: Move to rfq_vendors table.';

-- Indexes
CREATE INDEX idx_rfq_user ON rfq_records(user_id);
CREATE INDEX idx_rfq_project ON rfq_records(project_id);
CREATE INDEX idx_rfq_status ON rfq_records(status);
CREATE INDEX idx_rfq_number ON rfq_records(rfq_number);
CREATE INDEX idx_rfq_sent_at ON rfq_records(sent_at DESC);

-- GIN indexes for array searches
CREATE INDEX idx_rfq_bom_items ON rfq_records USING GIN (bom_item_ids);
CREATE INDEX idx_rfq_vendors ON rfq_records USING GIN (vendor_ids);

-- Row Level Security
ALTER TABLE rfq_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own RFQ records"
  ON rfq_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own RFQ records"
  ON rfq_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RFQ records"
  ON rfq_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own RFQ records"
  ON rfq_records FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 2. RFQ RESPONSES (Optional - for quote tracking)
-- Tracks vendor responses to RFQs
-- =====================================================
CREATE TABLE IF NOT EXISTS rfq_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_records(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL,
  bom_item_id UUID REFERENCES bom_items(id),

  -- Response Details
  quoted_price DECIMAL(15,2),
  quoted_lead_time_days INTEGER,
  moq DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'USD',
  payment_terms VARCHAR(255),
  validity_date DATE,

  -- Attachments
  quote_document_url TEXT,
  technical_document_url TEXT,

  -- Response Metadata
  response_status VARCHAR(50) DEFAULT 'pending' CHECK (response_status IN ('pending', 'received', 'accepted', 'rejected')),
  received_at TIMESTAMP,
  notes TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_rfq_vendor_item UNIQUE (rfq_id, vendor_id, bom_item_id)
);

COMMENT ON TABLE rfq_responses IS 'Vendor responses to RFQs. Links to evaluation for cost competitiveness scoring.';

-- Indexes
CREATE INDEX idx_rfq_response_rfq ON rfq_responses(rfq_id);
CREATE INDEX idx_rfq_response_vendor ON rfq_responses(vendor_id);
CREATE INDEX idx_rfq_response_bom_item ON rfq_responses(bom_item_id);
CREATE INDEX idx_rfq_response_status ON rfq_responses(response_status);

-- Row Level Security
ALTER TABLE rfq_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses to own RFQs"
  ON rfq_responses FOR SELECT
  USING (
    rfq_id IN (
      SELECT id FROM rfq_records WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage responses to own RFQs"
  ON rfq_responses FOR ALL
  USING (
    rfq_id IN (
      SELECT id FROM rfq_records WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    rfq_id IN (
      SELECT id FROM rfq_records WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Send RFQ (marks as sent and timestamps)
CREATE OR REPLACE FUNCTION send_rfq(
  p_rfq_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Validate ownership
  IF NOT EXISTS (
    SELECT 1 FROM rfq_records
    WHERE id = p_rfq_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'RFQ not found or unauthorized';
  END IF;

  -- Validate status
  IF EXISTS (
    SELECT 1 FROM rfq_records
    WHERE id = p_rfq_id AND status != 'draft'
  ) THEN
    RAISE EXCEPTION 'RFQ already sent';
  END IF;

  -- Mark as sent
  UPDATE rfq_records
  SET
    status = 'sent',
    sent_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_rfq_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_rfq IS 'Marks RFQ as sent. Should be called after email distribution.';

-- Close RFQ
CREATE OR REPLACE FUNCTION close_rfq(
  p_rfq_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Validate ownership
  IF NOT EXISTS (
    SELECT 1 FROM rfq_records
    WHERE id = p_rfq_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'RFQ not found or unauthorized';
  END IF;

  -- Mark as closed
  UPDATE rfq_records
  SET
    status = 'closed',
    closed_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_rfq_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_rfq_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rfq_records_timestamp
  BEFORE UPDATE ON rfq_records
  FOR EACH ROW
  EXECUTE FUNCTION update_rfq_timestamp();

CREATE TRIGGER update_rfq_responses_timestamp
  BEFORE UPDATE ON rfq_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_rfq_timestamp();

-- =====================================================
-- 4. VIEWS FOR QUERYING
-- =====================================================

-- RFQ summary with response counts
CREATE OR REPLACE VIEW rfq_summary AS
SELECT
  r.id,
  r.user_id,
  r.project_id,
  r.rfq_name,
  r.rfq_number,
  r.status,
  r.quote_deadline,
  r.selection_type,
  CARDINALITY(r.bom_item_ids) as item_count,
  CARDINALITY(r.vendor_ids) as vendor_count,
  COUNT(DISTINCT resp.vendor_id) as response_count,
  r.sent_at,
  r.closed_at,
  r.created_at
FROM rfq_records r
LEFT JOIN rfq_responses resp ON resp.rfq_id = r.id AND resp.response_status = 'received'
GROUP BY r.id;

GRANT SELECT ON rfq_summary TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Contract: RFQ is separate bounded context
--
-- Integration Points:
--   - RFQ responses → Evaluation (cost_competitiveness_score)
--   - Vendors referenced by vendor_id
--   - BOM items referenced by bom_item_id
--
-- P1 (Future):
--   - Normalize arrays to rfq_items and rfq_vendors tables
--   - Add organization_id
--   - Add email delivery tracking
--   - Add response deadline notifications
-- =====================================================
