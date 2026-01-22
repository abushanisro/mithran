-- ============================================================================
-- Migration: Procured Parts Cost Records
-- Purpose: Store procured/purchased parts costs per BOM item
-- Author: Principal Engineering Team
-- Date: 2026-01-16
-- Version: 1.0.0
-- ============================================================================

-- Drop table if exists (for clean reinstall)
DROP TABLE IF EXISTS procured_parts_cost_records CASCADE;

-- Create procured_parts_cost_records table
CREATE TABLE procured_parts_cost_records (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_item_id UUID NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Part identification
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    supplier_name VARCHAR(255),
    supplier_id UUID,

    -- Cost parameters
    unit_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,

    -- Quality adjustments
    scrap_percentage DECIMAL(5, 2) DEFAULT 0,
    defect_rate_percentage DECIMAL(5, 2) DEFAULT 0,

    -- Additional costs
    overhead_percentage DECIMAL(5, 2) DEFAULT 0,
    freight_cost DECIMAL(15, 4) DEFAULT 0,
    duty_cost DECIMAL(15, 4) DEFAULT 0,

    -- Calculated costs
    base_cost DECIMAL(15, 4) NOT NULL DEFAULT 0, -- unit_cost * quantity
    scrap_adjustment DECIMAL(15, 4) DEFAULT 0,
    defect_adjustment DECIMAL(15, 4) DEFAULT 0,
    overhead_cost DECIMAL(15, 4) DEFAULT 0,
    total_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,

    -- Procurement details
    moq DECIMAL(15, 4), -- Minimum Order Quantity
    lead_time_days INTEGER,
    currency VARCHAR(10) DEFAULT 'INR',

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
    CONSTRAINT positive_total_cost CHECK (total_cost >= 0),
    CONSTRAINT valid_scrap CHECK (scrap_percentage >= 0 AND scrap_percentage <= 100),
    CONSTRAINT valid_defect CHECK (defect_rate_percentage >= 0 AND defect_rate_percentage <= 100),
    CONSTRAINT valid_overhead CHECK (overhead_percentage >= 0 AND overhead_percentage <= 1000)
);

-- Indexes for performance
CREATE INDEX idx_procured_parts_cost_bom_item ON procured_parts_cost_records(bom_item_id);
CREATE INDEX idx_procured_parts_cost_user ON procured_parts_cost_records(user_id);
CREATE INDEX idx_procured_parts_cost_supplier ON procured_parts_cost_records(supplier_name);
CREATE INDEX idx_procured_parts_cost_active ON procured_parts_cost_records(is_active) WHERE is_active = true;
CREATE INDEX idx_procured_parts_cost_created ON procured_parts_cost_records(created_at DESC);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_procured_parts_cost_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_procured_parts_cost_timestamp
    BEFORE UPDATE ON procured_parts_cost_records
    FOR EACH ROW
    EXECUTE FUNCTION update_procured_parts_cost_timestamp();

-- Auto-calculate costs trigger
CREATE OR REPLACE FUNCTION calculate_procured_parts_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Base cost
    NEW.base_cost = NEW.unit_cost * NEW.quantity;

    -- Scrap adjustment
    NEW.scrap_adjustment = NEW.base_cost * (NEW.scrap_percentage / 100);

    -- Defect adjustment
    NEW.defect_adjustment = NEW.base_cost * (NEW.defect_rate_percentage / 100);

    -- Overhead cost
    NEW.overhead_cost = NEW.base_cost * (NEW.overhead_percentage / 100);

    -- Total cost
    NEW.total_cost = NEW.base_cost
                   + NEW.scrap_adjustment
                   + NEW.defect_adjustment
                   + NEW.overhead_cost
                   + COALESCE(NEW.freight_cost, 0)
                   + COALESCE(NEW.duty_cost, 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_procured_parts_calculate_total
    BEFORE INSERT OR UPDATE ON procured_parts_cost_records
    FOR EACH ROW
    EXECUTE FUNCTION calculate_procured_parts_total();

-- Enable Row Level Security (RLS)
ALTER TABLE procured_parts_cost_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own procured parts costs"
    ON procured_parts_cost_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own procured parts costs"
    ON procured_parts_cost_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own procured parts costs"
    ON procured_parts_cost_records FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own procured parts costs"
    ON procured_parts_cost_records FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON procured_parts_cost_records TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE procured_parts_cost_records IS 'Stores procured/purchased parts cost records per BOM item';
COMMENT ON COLUMN procured_parts_cost_records.base_cost IS 'unit_cost * quantity';
COMMENT ON COLUMN procured_parts_cost_records.total_cost IS 'base + scrap + defect + overhead + freight + duty';
COMMENT ON COLUMN procured_parts_cost_records.moq IS 'Minimum Order Quantity from supplier';
