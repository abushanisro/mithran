-- Migration: Add BOM parts support to supplier nominations
-- Date: 2026-01-31
-- Description: Creates table to store BOM parts associated with supplier nominations

-- Create table for BOM parts in supplier nominations
CREATE TABLE IF NOT EXISTS supplier_nomination_bom_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomination_evaluation_id UUID NOT NULL REFERENCES supplier_nomination_evaluations(id) ON DELETE CASCADE,
    bom_item_id UUID NOT NULL,
    bom_item_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    material VARCHAR(255),
    quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_nomination_bom_part UNIQUE(nomination_evaluation_id, bom_item_id)
);

-- Create table for vendor assignments to BOM parts in nominations
CREATE TABLE IF NOT EXISTS supplier_nomination_bom_part_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomination_bom_part_id UUID NOT NULL REFERENCES supplier_nomination_bom_parts(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_nomination_bom_part_vendor UNIQUE(nomination_bom_part_id, vendor_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_nomination_bom_parts_nomination_id ON supplier_nomination_bom_parts(nomination_evaluation_id);
CREATE INDEX IF NOT EXISTS idx_nomination_bom_parts_bom_item_id ON supplier_nomination_bom_parts(bom_item_id);
CREATE INDEX IF NOT EXISTS idx_nomination_bom_part_vendors_part_id ON supplier_nomination_bom_part_vendors(nomination_bom_part_id);
CREATE INDEX IF NOT EXISTS idx_nomination_bom_part_vendors_vendor_id ON supplier_nomination_bom_part_vendors(vendor_id);

-- Add trigger to update updated_at on supplier_nomination_bom_parts
CREATE OR REPLACE FUNCTION update_nomination_bom_parts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nomination_bom_parts_updated_at
    BEFORE UPDATE ON supplier_nomination_bom_parts
    FOR EACH ROW
    EXECUTE FUNCTION update_nomination_bom_parts_updated_at();

-- Enable Row Level Security
ALTER TABLE supplier_nomination_bom_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_nomination_bom_part_vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplier_nomination_bom_parts
CREATE POLICY "Users can view their own nomination BOM parts" ON supplier_nomination_bom_parts
    FOR SELECT USING (
        nomination_evaluation_id IN (
            SELECT id FROM supplier_nomination_evaluations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own nomination BOM parts" ON supplier_nomination_bom_parts
    FOR INSERT WITH CHECK (
        nomination_evaluation_id IN (
            SELECT id FROM supplier_nomination_evaluations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own nomination BOM parts" ON supplier_nomination_bom_parts
    FOR UPDATE USING (
        nomination_evaluation_id IN (
            SELECT id FROM supplier_nomination_evaluations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own nomination BOM parts" ON supplier_nomination_bom_parts
    FOR DELETE USING (
        nomination_evaluation_id IN (
            SELECT id FROM supplier_nomination_evaluations WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for supplier_nomination_bom_part_vendors
CREATE POLICY "Users can view their own nomination BOM part vendors" ON supplier_nomination_bom_part_vendors
    FOR SELECT USING (
        nomination_bom_part_id IN (
            SELECT bp.id FROM supplier_nomination_bom_parts bp
            JOIN supplier_nomination_evaluations sne ON bp.nomination_evaluation_id = sne.id
            WHERE sne.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own nomination BOM part vendors" ON supplier_nomination_bom_part_vendors
    FOR INSERT WITH CHECK (
        nomination_bom_part_id IN (
            SELECT bp.id FROM supplier_nomination_bom_parts bp
            JOIN supplier_nomination_evaluations sne ON bp.nomination_evaluation_id = sne.id
            WHERE sne.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own nomination BOM part vendors" ON supplier_nomination_bom_part_vendors
    FOR UPDATE USING (
        nomination_bom_part_id IN (
            SELECT bp.id FROM supplier_nomination_bom_parts bp
            JOIN supplier_nomination_evaluations sne ON bp.nomination_evaluation_id = sne.id
            WHERE sne.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own nomination BOM part vendors" ON supplier_nomination_bom_part_vendors
    FOR DELETE USING (
        nomination_bom_part_id IN (
            SELECT bp.id FROM supplier_nomination_bom_parts bp
            JOIN supplier_nomination_evaluations sne ON bp.nomination_evaluation_id = sne.id
            WHERE sne.user_id = auth.uid()
        )
    );

-- Comments for documentation
COMMENT ON TABLE supplier_nomination_bom_parts IS 'BOM parts associated with supplier nominations';
COMMENT ON TABLE supplier_nomination_bom_part_vendors IS 'Vendor assignments for specific BOM parts in nominations';
COMMENT ON COLUMN supplier_nomination_bom_parts.nomination_evaluation_id IS 'Reference to the supplier nomination evaluation';
COMMENT ON COLUMN supplier_nomination_bom_parts.bom_item_id IS 'Reference to the BOM item (not enforced FK for flexibility)';
COMMENT ON COLUMN supplier_nomination_bom_parts.bom_item_name IS 'Denormalized BOM item name for performance';
COMMENT ON COLUMN supplier_nomination_bom_parts.part_number IS 'Denormalized part number for performance';
COMMENT ON COLUMN supplier_nomination_bom_parts.material IS 'Denormalized material for performance';
COMMENT ON COLUMN supplier_nomination_bom_parts.quantity IS 'Quantity of the BOM part';
COMMENT ON COLUMN supplier_nomination_bom_part_vendors.vendor_id IS 'Reference to the vendor (not enforced FK for flexibility)';