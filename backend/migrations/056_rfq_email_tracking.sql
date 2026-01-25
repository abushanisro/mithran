-- Migration: Add RFQ email tracking table
-- Created: 2024-01-24
-- Description: Track email sending status for RFQ campaigns

-- Create RFQ email logs table for tracking email delivery
CREATE TABLE IF NOT EXISTS rfq_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID REFERENCES rfq_records(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    email TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'bounced', 'opened', 'clicked')),
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rfq_email_logs_rfq_id ON rfq_email_logs(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_email_logs_vendor_id ON rfq_email_logs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_rfq_email_logs_status ON rfq_email_logs(status);
CREATE INDEX IF NOT EXISTS idx_rfq_email_logs_sent_at ON rfq_email_logs(sent_at);

-- Add RLS policies for security
ALTER TABLE rfq_email_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see email logs for their own RFQs
CREATE POLICY "Users can view own RFQ email logs" ON rfq_email_logs
    FOR SELECT USING (
        rfq_id IN (
            SELECT id FROM rfq_records WHERE user_id = auth.uid()
        )
    );

-- Policy: System can insert email logs
CREATE POLICY "System can insert email logs" ON rfq_email_logs
    FOR INSERT WITH CHECK (true);

-- Policy: System can update email logs (for tracking opens/clicks)
CREATE POLICY "System can update email logs" ON rfq_email_logs
    FOR UPDATE USING (true);

-- Add helpful views
CREATE OR REPLACE VIEW rfq_email_stats AS
SELECT 
    r.id as rfq_id,
    r.rfq_number,
    r.rfq_name,
    COUNT(rel.id) as emails_sent,
    COUNT(CASE WHEN rel.status = 'sent' THEN 1 END) as emails_delivered,
    COUNT(CASE WHEN rel.status = 'failed' THEN 1 END) as emails_failed,
    COUNT(CASE WHEN rel.opened_at IS NOT NULL THEN 1 END) as emails_opened,
    COUNT(CASE WHEN rel.clicked_at IS NOT NULL THEN 1 END) as emails_clicked,
    ROUND(
        COUNT(CASE WHEN rel.opened_at IS NOT NULL THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(CASE WHEN rel.status = 'sent' THEN 1 END), 0) * 100, 2
    ) as open_rate_percent,
    MAX(rel.sent_at) as last_email_sent
FROM rfq_records r
LEFT JOIN rfq_email_logs rel ON r.id = rel.rfq_id
GROUP BY r.id, r.rfq_number, r.rfq_name;

-- Comment the table
COMMENT ON TABLE rfq_email_logs IS 'Tracks email delivery status and engagement for RFQ campaigns';
COMMENT ON COLUMN rfq_email_logs.status IS 'Email delivery status: sent, failed, bounced, opened, clicked';
COMMENT ON COLUMN rfq_email_logs.error_message IS 'Error details if email failed to send';
COMMENT ON COLUMN rfq_email_logs.opened_at IS 'Timestamp when vendor opened the email';
COMMENT ON COLUMN rfq_email_logs.clicked_at IS 'Timestamp when vendor clicked a link in the email';