-- Migration: Create Shot Weight Calculator table
-- Description: Stores shot weight and injection molding calculations

-- Create shot_weight_calculations table
CREATE TABLE IF NOT EXISTS shot_weight_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  calculation_name VARCHAR(255) NOT NULL,
  description TEXT,
  material_grade VARCHAR(255) NOT NULL,

  -- Material Properties
  density NUMERIC(10, 4) NOT NULL, -- Kg/m^3
  density_unit VARCHAR(20) DEFAULT 'kg/m3',

  -- Part Information
  volume NUMERIC(15, 4) NOT NULL, -- mm^3
  volume_unit VARCHAR(20) DEFAULT 'mm3',
  part_weight NUMERIC(15, 4) NOT NULL, -- Grams
  part_weight_unit VARCHAR(20) DEFAULT 'grams',
  volume_source VARCHAR(50), -- 'cad' or 'manual'

  -- Cavity Information
  number_of_cavities INTEGER NOT NULL DEFAULT 1,
  cavity_source VARCHAR(50), -- 'lookup' or 'manual'

  -- Runner Information
  runner_diameter NUMERIC(10, 4) NOT NULL, -- mm
  runner_length_per_part NUMERIC(15, 4) NOT NULL, -- mm
  runner_projected_area_per_part NUMERIC(15, 4), -- mm^2 (calculated)
  runner_projected_volume_per_part NUMERIC(15, 4), -- mm^3 (calculated)
  runner_weight_per_part NUMERIC(15, 4), -- Grams (calculated)
  runner_source VARCHAR(50), -- 'lookup' or 'manual'

  -- Calculated Results
  total_shot_weight NUMERIC(15, 4), -- Grams
  total_part_weight NUMERIC(15, 4), -- Grams (part weight * cavities)
  total_runner_weight NUMERIC(15, 4), -- Grams (runner weight * cavities)
  runner_to_part_ratio NUMERIC(10, 4), -- Percentage

  -- Optional: Sprue and Cold Slug
  include_sprue BOOLEAN DEFAULT false,
  sprue_diameter NUMERIC(10, 4), -- mm
  sprue_length NUMERIC(10, 4), -- mm
  sprue_weight NUMERIC(15, 4), -- Grams

  cold_slug_weight NUMERIC(15, 4), -- Grams

  -- Total with Sprue/Cold Slug
  total_shot_weight_with_sprue NUMERIC(15, 4), -- Grams

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_density CHECK (density > 0),
  CONSTRAINT positive_volume CHECK (volume > 0),
  CONSTRAINT positive_part_weight CHECK (part_weight > 0),
  CONSTRAINT positive_cavities CHECK (number_of_cavities > 0),
  CONSTRAINT positive_runner_diameter CHECK (runner_diameter > 0),
  CONSTRAINT positive_runner_length CHECK (runner_length_per_part > 0)
);

-- Create indexes for faster queries
CREATE INDEX idx_shot_weight_user_id ON shot_weight_calculations(user_id);
CREATE INDEX idx_shot_weight_material_grade ON shot_weight_calculations(material_grade);
CREATE INDEX idx_shot_weight_created_at ON shot_weight_calculations(created_at DESC);
CREATE INDEX idx_shot_weight_calculation_name ON shot_weight_calculations(calculation_name);

-- Enable Row Level Security
ALTER TABLE shot_weight_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own shot weight calculations"
  ON shot_weight_calculations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shot weight calculations"
  ON shot_weight_calculations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shot weight calculations"
  ON shot_weight_calculations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shot weight calculations"
  ON shot_weight_calculations FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shot_weight_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shot_weight_updated_at
  BEFORE UPDATE ON shot_weight_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_shot_weight_updated_at();

-- Comments
COMMENT ON TABLE shot_weight_calculations IS 'Stores shot weight and injection molding calculations for plastic parts';
COMMENT ON COLUMN shot_weight_calculations.density IS 'Material density in kg/m^3';
COMMENT ON COLUMN shot_weight_calculations.volume IS 'Part volume in mm^3';
COMMENT ON COLUMN shot_weight_calculations.part_weight IS 'Individual part weight in grams';
COMMENT ON COLUMN shot_weight_calculations.number_of_cavities IS 'Number of cavities in the mold';
COMMENT ON COLUMN shot_weight_calculations.runner_diameter IS 'Runner diameter in mm';
COMMENT ON COLUMN shot_weight_calculations.runner_length_per_part IS 'Runner length per part in mm';
COMMENT ON COLUMN shot_weight_calculations.total_shot_weight IS 'Total shot weight including all parts and runners in grams';
COMMENT ON COLUMN shot_weight_calculations.runner_to_part_ratio IS 'Ratio of runner weight to part weight as percentage';
