-- Migration: Create LSR (Labour Standard Rate) table
-- Description: Stores labour standard rate database for cost analysis

-- Create LSR records table
CREATE TABLE IF NOT EXISTS lsr_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Labour Information
  labour_code VARCHAR(50) NOT NULL,
  labour_type VARCHAR(100) NOT NULL,
  description TEXT,

  -- Wage Information
  minimum_wage_per_day NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  minimum_wage_per_month NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  dearness_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  perks_percentage NUMERIC(5, 2) NOT NULL DEFAULT 30.00,

  -- Calculated Labour Hour Rate
  lhr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

  -- Additional Information
  reference VARCHAR(255),
  location VARCHAR(255) NOT NULL DEFAULT 'India - Bangalore',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_labour_code_per_user UNIQUE(user_id, labour_code),
  CONSTRAINT positive_wage_day CHECK (minimum_wage_per_day >= 0),
  CONSTRAINT positive_wage_month CHECK (minimum_wage_per_month >= 0),
  CONSTRAINT positive_dearness CHECK (dearness_allowance >= 0),
  CONSTRAINT valid_perks CHECK (perks_percentage >= 0 AND perks_percentage <= 100),
  CONSTRAINT positive_lhr CHECK (lhr >= 0)
);

-- Create indexes for faster queries
CREATE INDEX idx_lsr_records_user_id ON lsr_records(user_id);
CREATE INDEX idx_lsr_records_labour_code ON lsr_records(labour_code);
CREATE INDEX idx_lsr_records_labour_type ON lsr_records(labour_type);
CREATE INDEX idx_lsr_records_location ON lsr_records(location);
CREATE INDEX idx_lsr_records_created_at ON lsr_records(created_at DESC);

-- Enable Row Level Security
ALTER TABLE lsr_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own LSR records"
  ON lsr_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own LSR records"
  ON lsr_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LSR records"
  ON lsr_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LSR records"
  ON lsr_records FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lsr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lsr_updated_at
  BEFORE UPDATE ON lsr_records
  FOR EACH ROW
  EXECUTE FUNCTION update_lsr_updated_at();

-- Comments
COMMENT ON TABLE lsr_records IS 'Stores Labour Standard Rate (LSR) database for manufacturing labour cost analysis';
COMMENT ON COLUMN lsr_records.labour_code IS 'Unique labour code identifier (e.g., UN-L-1, SSK-L-1)';
COMMENT ON COLUMN lsr_records.labour_type IS 'Type of labour: Unskilled, Semi-Skilled, Skilled, Highly Skilled';
COMMENT ON COLUMN lsr_records.lhr IS 'Calculated Labour Hour Rate based on wages, allowances, and perks';
COMMENT ON COLUMN lsr_records.perks_percentage IS 'Percentage of perks over base wage (typically 30%)';
