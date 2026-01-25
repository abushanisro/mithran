-- Migration: RFQ Tracking System
-- Created: 2026-01-24
-- Description: Comprehensive RFQ tracking system for production

-- Create RFQ Tracking table
CREATE TABLE IF NOT EXISTS rfq_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID NOT NULL REFERENCES rfq_records(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    rfq_name TEXT NOT NULL,
    rfq_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'responded', 'evaluated', 'completed', 'cancelled')),
    vendor_count INTEGER NOT NULL DEFAULT 0,
    part_count INTEGER NOT NULL DEFAULT 0,
    response_count INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    first_response_at TIMESTAMP WITH TIME ZONE,
    last_response_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RFQ Tracking Vendors junction table
CREATE TABLE IF NOT EXISTS rfq_tracking_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_tracking_id UUID NOT NULL REFERENCES rfq_tracking(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL,
    vendor_name TEXT NOT NULL,
    vendor_email TEXT,
    responded BOOLEAN DEFAULT FALSE,
    response_received_at TIMESTAMP WITH TIME ZONE,
    quote_amount DECIMAL(15,2),
    lead_time_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rfq_tracking_id, vendor_id)
);

-- Create RFQ Tracking Parts junction table
CREATE TABLE IF NOT EXISTS rfq_tracking_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_tracking_id UUID NOT NULL REFERENCES rfq_tracking(id) ON DELETE CASCADE,
    bom_item_id UUID NOT NULL,
    part_number TEXT NOT NULL,
    description TEXT,
    process TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    file_2d_path TEXT,
    file_3d_path TEXT,
    has_2d_file BOOLEAN GENERATED ALWAYS AS (file_2d_path IS NOT NULL) STORED,
    has_3d_file BOOLEAN GENERATED ALWAYS AS (file_3d_path IS NOT NULL) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rfq_tracking_id, bom_item_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rfq_tracking_user_id ON rfq_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_rfq_tracking_project_id ON rfq_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_rfq_tracking_sent_at ON rfq_tracking(sent_at);
CREATE INDEX IF NOT EXISTS idx_rfq_tracking_status ON rfq_tracking(status);
CREATE INDEX IF NOT EXISTS idx_rfq_tracking_vendors_rfq_id ON rfq_tracking_vendors(rfq_tracking_id);
CREATE INDEX IF NOT EXISTS idx_rfq_tracking_parts_rfq_id ON rfq_tracking_parts(rfq_tracking_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_rfq_tracking_updated_at ON rfq_tracking;
DROP TRIGGER IF EXISTS update_rfq_tracking_vendors_updated_at ON rfq_tracking_vendors;

CREATE TRIGGER update_rfq_tracking_updated_at 
    BEFORE UPDATE ON rfq_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfq_tracking_vendors_updated_at 
    BEFORE UPDATE ON rfq_tracking_vendors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE rfq_tracking IS 'Main RFQ tracking table for dashboard analytics and reporting';
COMMENT ON TABLE rfq_tracking_vendors IS 'Vendors associated with each RFQ for response tracking';
COMMENT ON TABLE rfq_tracking_parts IS 'Parts/BOM items included in each RFQ with file attachments';

COMMENT ON COLUMN rfq_tracking.vendor_count IS 'Cached count of vendors for quick dashboard display';
COMMENT ON COLUMN rfq_tracking.part_count IS 'Cached count of parts for quick dashboard display';
COMMENT ON COLUMN rfq_tracking.response_count IS 'Number of vendor responses received';

-- Create view for comprehensive RFQ tracking data
CREATE OR REPLACE VIEW rfq_tracking_summary AS
SELECT 
    rt.id,
    rt.rfq_id,
    rt.user_id,
    rt.project_id,
    rt.rfq_name,
    rt.rfq_number,
    rt.status,
    rt.vendor_count,
    rt.part_count,
    rt.response_count,
    rt.sent_at,
    rt.first_response_at,
    rt.last_response_at,
    rt.completed_at,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'vendor_id', rtv.vendor_id,
                'vendor_name', rtv.vendor_name,
                'vendor_email', rtv.vendor_email,
                'responded', rtv.responded,
                'response_received_at', rtv.response_received_at,
                'quote_amount', rtv.quote_amount,
                'lead_time_days', rtv.lead_time_days
            )
        ) FILTER (WHERE rtv.vendor_id IS NOT NULL),
        '[]'::json
    ) AS vendors,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'bom_item_id', rtp.bom_item_id,
                'part_number', rtp.part_number,
                'description', rtp.description,
                'process', rtp.process,
                'quantity', rtp.quantity,
                'file_2d_path', rtp.file_2d_path,
                'file_3d_path', rtp.file_3d_path,
                'has_2d_file', rtp.has_2d_file,
                'has_3d_file', rtp.has_3d_file
            )
        ) FILTER (WHERE rtp.bom_item_id IS NOT NULL),
        '[]'::json
    ) AS parts
FROM rfq_tracking rt
LEFT JOIN rfq_tracking_vendors rtv ON rt.id = rtv.rfq_tracking_id
LEFT JOIN rfq_tracking_parts rtp ON rt.id = rtp.rfq_tracking_id
GROUP BY rt.id, rt.rfq_id, rt.user_id, rt.project_id, rt.rfq_name, rt.rfq_number, 
         rt.status, rt.vendor_count, rt.part_count, rt.response_count, 
         rt.sent_at, rt.first_response_at, rt.last_response_at, rt.completed_at;

-- Enable Row Level Security
ALTER TABLE rfq_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_tracking_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_tracking_parts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own RFQ tracking" ON rfq_tracking;
DROP POLICY IF EXISTS "Users can insert their own RFQ tracking" ON rfq_tracking;
DROP POLICY IF EXISTS "Users can update their own RFQ tracking" ON rfq_tracking;
DROP POLICY IF EXISTS "Users can view RFQ tracking vendors for their RFQs" ON rfq_tracking_vendors;
DROP POLICY IF EXISTS "Users can insert RFQ tracking vendors for their RFQs" ON rfq_tracking_vendors;
DROP POLICY IF EXISTS "Users can update RFQ tracking vendors for their RFQs" ON rfq_tracking_vendors;
DROP POLICY IF EXISTS "Users can view RFQ tracking parts for their RFQs" ON rfq_tracking_parts;
DROP POLICY IF EXISTS "Users can insert RFQ tracking parts for their RFQs" ON rfq_tracking_parts;

-- RLS Policies for rfq_tracking
CREATE POLICY "Users can view their own RFQ tracking"
    ON rfq_tracking FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own RFQ tracking"
    ON rfq_tracking FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own RFQ tracking"
    ON rfq_tracking FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policies for rfq_tracking_vendors
CREATE POLICY "Users can view RFQ tracking vendors for their RFQs"
    ON rfq_tracking_vendors FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM rfq_tracking rt 
        WHERE rt.id = rfq_tracking_vendors.rfq_tracking_id 
        AND rt.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert RFQ tracking vendors for their RFQs"
    ON rfq_tracking_vendors FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM rfq_tracking rt 
        WHERE rt.id = rfq_tracking_vendors.rfq_tracking_id 
        AND rt.user_id = auth.uid()
    ));

CREATE POLICY "Users can update RFQ tracking vendors for their RFQs"
    ON rfq_tracking_vendors FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM rfq_tracking rt 
        WHERE rt.id = rfq_tracking_vendors.rfq_tracking_id 
        AND rt.user_id = auth.uid()
    ));

-- RLS Policies for rfq_tracking_parts
CREATE POLICY "Users can view RFQ tracking parts for their RFQs"
    ON rfq_tracking_parts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM rfq_tracking rt 
        WHERE rt.id = rfq_tracking_parts.rfq_tracking_id 
        AND rt.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert RFQ tracking parts for their RFQs"
    ON rfq_tracking_parts FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM rfq_tracking rt 
        WHERE rt.id = rfq_tracking_parts.rfq_tracking_id 
        AND rt.user_id = auth.uid()
    ));

GRANT SELECT, INSERT, UPDATE ON rfq_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rfq_tracking_vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rfq_tracking_parts TO authenticated;
GRANT SELECT ON rfq_tracking_summary TO authenticated;