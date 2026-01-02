-- Migration: Create MHR (Machine Hour Rate) table
-- Description: Stores machine hour rate calculations for cost analysis

-- Create MHR records table
CREATE TABLE IF NOT EXISTS mhr_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  location VARCHAR(255) NOT NULL,
  commodity_code VARCHAR(255) NOT NULL,
  machine_description VARCHAR(500),
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  machine_name VARCHAR(255) NOT NULL,
  specification VARCHAR(500),

  -- Machine Operating Hours
  shifts_per_day NUMERIC(10, 2) NOT NULL DEFAULT 3.00,
  hours_per_shift NUMERIC(10, 2) NOT NULL DEFAULT 8.00,
  working_days_per_year NUMERIC(10, 2) NOT NULL DEFAULT 260.00,
  planned_maintenance_hours_per_year NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  capacity_utilization_rate NUMERIC(5, 2) NOT NULL DEFAULT 95.00, -- Percentage

  -- Depreciation Cost
  landed_machine_cost NUMERIC(15, 2) NOT NULL,
  accessories_cost_percentage NUMERIC(5, 2) NOT NULL DEFAULT 6.00,
  installation_cost_percentage NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
  payback_period_years NUMERIC(5, 2) NOT NULL DEFAULT 10.00,

  -- Interest on Investment
  interest_rate_percentage NUMERIC(5, 2) NOT NULL DEFAULT 8.00,

  -- Insurance
  insurance_rate_percentage NUMERIC(5, 2) NOT NULL DEFAULT 1.00,

  -- Rent
  machine_footprint_sqm NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  rent_per_sqm_per_month NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

  -- Repairs & Maintenance
  maintenance_cost_percentage NUMERIC(5, 2) NOT NULL DEFAULT 6.00,

  -- Electricity
  power_kwh_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  electricity_cost_per_kwh NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

  -- Admin and Profit
  admin_overhead_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  profit_margin_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,

  -- Calculated Results (stored for reporting)
  total_machine_hour_rate NUMERIC(15, 2),
  total_fixed_cost_per_hour NUMERIC(15, 2),
  total_variable_cost_per_hour NUMERIC(15, 2),
  total_annual_cost NUMERIC(15, 2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT positive_shifts CHECK (shifts_per_day > 0),
  CONSTRAINT positive_hours CHECK (hours_per_shift > 0),
  CONSTRAINT positive_days CHECK (working_days_per_year > 0),
  CONSTRAINT positive_machine_cost CHECK (landed_machine_cost > 0),
  CONSTRAINT valid_utilization_rate CHECK (capacity_utilization_rate > 0 AND capacity_utilization_rate <= 100)
);

-- Create index for faster queries
CREATE INDEX idx_mhr_records_user_id ON mhr_records(user_id);
CREATE INDEX idx_mhr_records_location ON mhr_records(location);
CREATE INDEX idx_mhr_records_commodity_code ON mhr_records(commodity_code);
CREATE INDEX idx_mhr_records_created_at ON mhr_records(created_at DESC);

-- Enable Row Level Security
ALTER TABLE mhr_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own MHR records"
  ON mhr_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own MHR records"
  ON mhr_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MHR records"
  ON mhr_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MHR records"
  ON mhr_records FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mhr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mhr_updated_at
  BEFORE UPDATE ON mhr_records
  FOR EACH ROW
  EXECUTE FUNCTION update_mhr_updated_at();

-- Comments
COMMENT ON TABLE mhr_records IS 'Stores Machine Hour Rate (MHR) calculations for manufacturing cost analysis';
COMMENT ON COLUMN mhr_records.capacity_utilization_rate IS 'Machine capacity utilization rate as percentage (0-100)';
COMMENT ON COLUMN mhr_records.total_machine_hour_rate IS 'Final calculated machine hour rate including all costs, overhead, and profit';
