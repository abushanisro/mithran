-- Migration: Remove default values from LSR table
-- Description: Remove mock/dummy default data to ensure user-driven inputs only

-- Remove default value from perks_percentage (keep NOT NULL constraint)
ALTER TABLE lsr_records
  ALTER COLUMN perks_percentage DROP DEFAULT;

-- Make location nullable and remove default value (location is optional)
ALTER TABLE lsr_records
  ALTER COLUMN location DROP DEFAULT,
  ALTER COLUMN location DROP NOT NULL;

-- Update table comment to reflect no defaults
COMMENT ON COLUMN lsr_records.perks_percentage IS 'Percentage of perks over base wage (user must provide - no defaults)';
COMMENT ON COLUMN lsr_records.location IS 'Optional location information (e.g., India - Bangalore)';

-- Success message
SELECT '✅ Removed default values - all inputs are now user-driven!' as result;
