-- ============================================================================
-- Migration: Packaging & Logistics Cost Records
-- Purpose: Store packaging and logistics costs per BOM item
-- Author: Principal Engineering Team
-- Date: 2026-01-16
-- Version: 1.0.0
-- ============================================================================

-- Drop table if exists (for clean reinstall)
DROP TABLE IF EXISTS packaging_logistics_cost_records CASCADE;

-- Create packaging_logistics_cost_records table
CREATE TABLE packaging_logistics_cost_records (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_item_id UUID NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Cost identification
    cost_name VARCHAR(255) NOT NULL,
    logistics_type VARCHAR(100) NOT NULL, -- 'packaging', 'inbound', 'outbound', 'storage'
    mode_of_transport VARCHAR(100), -- 'road', 'rail', 'air', 'sea', null for packaging

    -- Calculator reference (optional)
    calculator_id UUID,
    calculator_name VARCHAR(255),

    -- Cost parameters
    cost_basis VARCHAR(50) NOT NULL, -- 'per_unit', 'per_batch', 'per_kg', 'per_km'
    parameters JSONB DEFAULT '{}'::jsonb, -- Flexible parameters storage

    -- Cost calculations
    unit_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    total_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,

    -- Cost breakdown (for transparency)
    cost_breakdown JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT positive_unit_cost CHECK (unit_cost >= 0),
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_total_cost CHECK (total_cost >= 0)
);

-- Indexes for performance
CREATE INDEX idx_packaging_logistics_cost_bom_item ON packaging_logistics_cost_records(bom_item_id);
CREATE INDEX idx_packaging_logistics_cost_user ON packaging_logistics_cost_records(user_id);
CREATE INDEX idx_packaging_logistics_cost_type ON packaging_logistics_cost_records(logistics_type);
CREATE INDEX idx_packaging_logistics_cost_active ON packaging_logistics_cost_records(is_active) WHERE is_active = true;
CREATE INDEX idx_packaging_logistics_cost_created ON packaging_logistics_cost_records(created_at DESC);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_packaging_logistics_cost_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_packaging_logistics_cost_timestamp
    BEFORE UPDATE ON packaging_logistics_cost_records
    FOR EACH ROW
    EXECUTE FUNCTION update_packaging_logistics_cost_timestamp();

-- Auto-calculate total_cost trigger
CREATE OR REPLACE FUNCTION calculate_packaging_logistics_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_cost = NEW.unit_cost * NEW.quantity;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_packaging_logistics_calculate_total
    BEFORE INSERT OR UPDATE ON packaging_logistics_cost_records
    FOR EACH ROW
    EXECUTE FUNCTION calculate_packaging_logistics_total();

-- Enable Row Level Security (RLS)
ALTER TABLE packaging_logistics_cost_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own packaging/logistics costs"
    ON packaging_logistics_cost_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own packaging/logistics costs"
    ON packaging_logistics_cost_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packaging/logistics costs"
    ON packaging_logistics_cost_records FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own packaging/logistics costs"
    ON packaging_logistics_cost_records FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON packaging_logistics_cost_records TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE packaging_logistics_cost_records IS 'Stores packaging and logistics cost records per BOM item';
COMMENT ON COLUMN packaging_logistics_cost_records.logistics_type IS 'Type: packaging, inbound, outbound, storage';
COMMENT ON COLUMN packaging_logistics_cost_records.cost_basis IS 'Cost basis: per_unit, per_batch, per_kg, per_km';
COMMENT ON COLUMN packaging_logistics_cost_records.parameters IS 'Flexible JSONB storage for calculator parameters';
COMMENT ON COLUMN packaging_logistics_cost_records.cost_breakdown IS 'Detailed cost breakdown for transparency';
