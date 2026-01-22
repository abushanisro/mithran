-- ============================================================================
-- Migration: Fix Processes RLS Policy
-- Description: Allow access to both user-owned AND global processes
--
-- WHY THIS IS NEEDED:
-- Processes are reference data (like SAP process master).
-- They should be accessible as:
--   1. User-owned processes (user_id = auth.uid())
--   2. Global processes (user_id IS NULL)
--
-- Current RLS blocks global processes, causing empty dropdowns.
-- ============================================================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can manage their processes" ON processes;

-- Create correct policy for SELECT (read access)
CREATE POLICY "Users can view their own and global processes"
  ON processes
  FOR SELECT
  USING (
    user_id = auth.uid()  -- User-owned processes
    OR user_id IS NULL    -- Global processes
  );

-- Create policy for INSERT (create)
CREATE POLICY "Users can create their own processes"
  ON processes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policy for UPDATE (modify)
CREATE POLICY "Users can update their own processes"
  ON processes
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create policy for DELETE (remove)
CREATE POLICY "Users can delete their own processes"
  ON processes
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- VERIFICATION QUERY (run after migration)
-- ============================================================================

-- This should now return both user-owned AND global processes:
-- SELECT id, process_name, user_id
-- FROM processes
-- WHERE user_id = auth.uid() OR user_id IS NULL
-- LIMIT 10;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP POLICY IF EXISTS "Users can view their own and global processes" ON processes;
-- DROP POLICY IF EXISTS "Users can create their own processes" ON processes;
-- DROP POLICY IF EXISTS "Users can update their own processes" ON processes;
-- DROP POLICY IF EXISTS "Users can delete their own processes" ON processes;
--
-- CREATE POLICY "Users can manage their processes"
--   ON processes
--   FOR ALL
--   USING (auth.uid() = user_id);
