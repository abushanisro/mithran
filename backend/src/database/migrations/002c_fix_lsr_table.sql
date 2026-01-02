-- Fix/Complete LSR Table Migration
-- Run this ONLY if the verification shows missing components
-- This script is IDEMPOTENT - safe to run multiple times

-- Drop and recreate indexes (in case they're partial)
DROP INDEX IF EXISTS idx_lsr_records_user_id;
DROP INDEX IF EXISTS idx_lsr_records_labour_code;
DROP INDEX IF EXISTS idx_lsr_records_labour_type;
DROP INDEX IF EXISTS idx_lsr_records_location;
DROP INDEX IF EXISTS idx_lsr_records_created_at;

-- Recreate all indexes
CREATE INDEX idx_lsr_records_user_id ON lsr_records(user_id);
CREATE INDEX idx_lsr_records_labour_code ON lsr_records(labour_code);
CREATE INDEX idx_lsr_records_labour_type ON lsr_records(labour_type);
CREATE INDEX idx_lsr_records_location ON lsr_records(location);
CREATE INDEX idx_lsr_records_created_at ON lsr_records(created_at DESC);

-- Ensure RLS is enabled
ALTER TABLE lsr_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own LSR records" ON lsr_records;
DROP POLICY IF EXISTS "Users can create their own LSR records" ON lsr_records;
DROP POLICY IF EXISTS "Users can update their own LSR records" ON lsr_records;
DROP POLICY IF EXISTS "Users can delete their own LSR records" ON lsr_records;

-- Recreate all policies
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

-- Ensure trigger function exists
CREATE OR REPLACE FUNCTION update_lsr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_lsr_updated_at ON lsr_records;

CREATE TRIGGER trigger_update_lsr_updated_at
  BEFORE UPDATE ON lsr_records
  FOR EACH ROW
  EXECUTE FUNCTION update_lsr_updated_at();

-- Success message
SELECT '✅ LSR table migration completed successfully!' as result;
