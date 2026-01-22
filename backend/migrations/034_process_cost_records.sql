-- Migration: Update process_cost_records table
-- Description: Remove description field, add machine_value field, change default currency to INR
-- Author: Manufacturing Cost Engineering Team
-- Version: 1.1.0
-- Date: 2026-01-19

-- First, check if table exists and alter it
DO $$
BEGIN
    -- Add machine_value column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'process_cost_records'
        AND column_name = 'machine_value'
    ) THEN
        ALTER TABLE process_cost_records
        ADD COLUMN machine_value NUMERIC(15,4) DEFAULT 0 CHECK (machine_value >= 0);

        RAISE NOTICE 'Added machine_value column';
    END IF;

    -- Add labor_rate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'process_cost_records'
        AND column_name = 'labor_rate'
    ) THEN
        ALTER TABLE process_cost_records
        ADD COLUMN labor_rate NUMERIC(12,6) DEFAULT 0 CHECK (labor_rate >= 0);

        RAISE NOTICE 'Added labor_rate column';
    END IF;

    -- Drop description column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'process_cost_records'
        AND column_name = 'description'
    ) THEN
        -- Drop the GIN index on description first if it exists
        DROP INDEX IF EXISTS idx_process_cost_records_description;

        -- Then drop the column
        ALTER TABLE process_cost_records
        DROP COLUMN description;

        RAISE NOTICE 'Dropped description column';
    END IF;

    -- Update currency default to INR
    ALTER TABLE process_cost_records
    ALTER COLUMN currency SET DEFAULT 'INR';

    RAISE NOTICE 'Updated currency default to INR';

END $$;

-- Create process_cost_records table if it doesn't exist (for fresh installations)
CREATE TABLE IF NOT EXISTS process_cost_records (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Operation Information
  op_nbr INTEGER DEFAULT 0,

  -- Facility Information (for reference/filtering)
  facility_category_id TEXT,
  facility_type_id TEXT,
  supplier_id TEXT,
  supplier_location_id TEXT,
  facility_id TEXT,
  facility_rate_id TEXT,

  -- Facility Rates (Input Parameters)
  direct_rate NUMERIC(12,6) NOT NULL CHECK (direct_rate >= 0),
  indirect_rate NUMERIC(12,6) DEFAULT 0 CHECK (indirect_rate >= 0),
  fringe_rate NUMERIC(12,6) DEFAULT 0 CHECK (fringe_rate >= 0),
  machine_rate NUMERIC(12,6) DEFAULT 0 CHECK (machine_rate >= 0),
  machine_value NUMERIC(15,4) DEFAULT 0 CHECK (machine_value >= 0),
  labor_rate NUMERIC(12,6) DEFAULT 0 CHECK (labor_rate >= 0),
  currency VARCHAR(10) DEFAULT 'INR',

  -- Shift Pattern
  shift_pattern_id TEXT,
  shift_pattern_hours_per_day NUMERIC(5,2),

  -- Setup Parameters
  setup_manning NUMERIC(8,2) NOT NULL CHECK (setup_manning >= 0),
  setup_time NUMERIC(10,2) NOT NULL CHECK (setup_time >= 0),

  -- Production Parameters
  batch_size NUMERIC(12,2) NOT NULL CHECK (batch_size >= 1),
  heads NUMERIC(8,2) NOT NULL CHECK (heads >= 0),
  cycle_time NUMERIC(12,2) NOT NULL CHECK (cycle_time >= 1),
  parts_per_cycle NUMERIC(10,2) NOT NULL CHECK (parts_per_cycle >= 1),

  -- Quality Parameters
  scrap NUMERIC(5,2) NOT NULL CHECK (scrap >= 0 AND scrap < 100),

  -- Calculated Results (Stored for quick retrieval)
  total_cost_per_part NUMERIC(12,6),
  setup_cost_per_part NUMERIC(12,6),
  total_cycle_cost_per_part NUMERIC(12,6),
  total_cost_before_scrap NUMERIC(12,6),
  scrap_adjustment NUMERIC(12,6),
  total_batch_cost NUMERIC(14,6),

  -- Full calculation breakdown (JSONB for detailed breakdown)
  calculation_breakdown JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Links to other entities
  process_id UUID REFERENCES processes(id) ON DELETE SET NULL,
  process_route_id UUID REFERENCES process_routes(id) ON DELETE SET NULL,
  bom_item_id UUID REFERENCES bom_items(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_process_cost_records_user_id
  ON process_cost_records(user_id);

CREATE INDEX IF NOT EXISTS idx_process_cost_records_process_id
  ON process_cost_records(process_id);

CREATE INDEX IF NOT EXISTS idx_process_cost_records_process_route_id
  ON process_cost_records(process_route_id);

CREATE INDEX IF NOT EXISTS idx_process_cost_records_bom_item_id
  ON process_cost_records(bom_item_id);

CREATE INDEX IF NOT EXISTS idx_process_cost_records_facility_id
  ON process_cost_records(facility_id);

CREATE INDEX IF NOT EXISTS idx_process_cost_records_facility_rate_id
  ON process_cost_records(facility_rate_id);

CREATE INDEX IF NOT EXISTS idx_process_cost_records_is_active
  ON process_cost_records(is_active);

CREATE INDEX IF NOT EXISTS idx_process_cost_records_created_at
  ON process_cost_records(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_process_cost_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_process_cost_records_updated_at ON process_cost_records;

CREATE TRIGGER trigger_process_cost_records_updated_at
  BEFORE UPDATE ON process_cost_records
  FOR EACH ROW
  EXECUTE FUNCTION update_process_cost_records_updated_at();

-- Row Level Security (RLS)
ALTER TABLE process_cost_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own process cost records" ON process_cost_records;
DROP POLICY IF EXISTS "Users can insert own process cost records" ON process_cost_records;
DROP POLICY IF EXISTS "Users can update own process cost records" ON process_cost_records;
DROP POLICY IF EXISTS "Users can delete own process cost records" ON process_cost_records;

-- Policy: Users can view their own process cost records
CREATE POLICY "Users can view own process cost records"
  ON process_cost_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own process cost records
CREATE POLICY "Users can insert own process cost records"
  ON process_cost_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own process cost records
CREATE POLICY "Users can update own process cost records"
  ON process_cost_records
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own process cost records
CREATE POLICY "Users can delete own process cost records"
  ON process_cost_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE process_cost_records IS 'Manufacturing process cost calculations with setup, cycle, and scrap costs';
COMMENT ON COLUMN process_cost_records.op_nbr IS 'Operation number in the process sequence';
COMMENT ON COLUMN process_cost_records.direct_rate IS 'Direct labor rate (currency/hour)';
COMMENT ON COLUMN process_cost_records.indirect_rate IS 'Indirect cost rate (currency/hour)';
COMMENT ON COLUMN process_cost_records.fringe_rate IS 'Fringe benefits rate (currency/hour)';
COMMENT ON COLUMN process_cost_records.machine_rate IS 'Machine/equipment rate (currency/hour)';
COMMENT ON COLUMN process_cost_records.machine_value IS 'Machine/equipment value (currency)';
COMMENT ON COLUMN process_cost_records.labor_rate IS 'Labor hourly rate (currency/hour)';
COMMENT ON COLUMN process_cost_records.setup_manning IS 'Number of workers during setup';
COMMENT ON COLUMN process_cost_records.setup_time IS 'Setup time in minutes';
COMMENT ON COLUMN process_cost_records.batch_size IS 'Number of parts in batch';
COMMENT ON COLUMN process_cost_records.heads IS 'Number of operators/stations during production';
COMMENT ON COLUMN process_cost_records.cycle_time IS 'Cycle time in seconds';
COMMENT ON COLUMN process_cost_records.parts_per_cycle IS 'Parts produced per cycle';
COMMENT ON COLUMN process_cost_records.scrap IS 'Scrap percentage (0-99.99)';
COMMENT ON COLUMN process_cost_records.total_cost_per_part IS 'Final cost per part including scrap adjustment';
COMMENT ON COLUMN process_cost_records.calculation_breakdown IS 'Complete calculation breakdown in JSON format';
