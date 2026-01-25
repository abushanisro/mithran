-- Migration: Add missing DELETE RLS policies for RFQ tracking system
-- Issue: DELETE operations were failing due to missing RLS policies
-- This caused deleted records to reappear after page refresh

-- RLS DELETE Policy for rfq_tracking
CREATE POLICY "Users can delete their own RFQ tracking"
    ON rfq_tracking FOR DELETE
    USING (user_id = auth.uid());

-- RLS DELETE Policy for rfq_tracking_vendors
CREATE POLICY "Users can delete RFQ tracking vendors for their RFQs"
    ON rfq_tracking_vendors FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM rfq_tracking rt 
        WHERE rt.id = rfq_tracking_vendors.rfq_tracking_id 
        AND rt.user_id = auth.uid()
    ));

-- RLS DELETE Policy for rfq_tracking_parts
CREATE POLICY "Users can delete RFQ tracking parts for their RFQs"
    ON rfq_tracking_parts FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM rfq_tracking rt 
        WHERE rt.id = rfq_tracking_parts.rfq_tracking_id 
        AND rt.user_id = auth.uid()
    ));

-- Add database function to verify delete operation success
CREATE OR REPLACE FUNCTION verify_rfq_tracking_deleted(tracking_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM rfq_tracking 
        WHERE id = tracking_id
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_rfq_tracking_deleted(uuid) TO authenticated;