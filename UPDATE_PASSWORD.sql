-- ============================================================================
-- UPDATE PASSWORD FOR emuski@EMITHRAN.com
-- ============================================================================
-- Run this in: https://iuvtsvjpmovfymvnmqys.supabase.co/project/iuvtsvjpmovfymvnmqys/sql
--
-- This will update the password to: AdminEMITHRAN67
-- ============================================================================

-- Update the user's password
-- Note: Supabase will automatically hash this password
UPDATE auth.users
SET
  encrypted_password = crypt('AdminEMITHRAN67', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'emuski@EMITHRAN.com';

-- Verify the user exists
SELECT
  id,
  email,
  created_at,
  updated_at,
  email_confirmed_at,
  CASE
    WHEN encrypted_password IS NOT NULL THEN 'Password set '
    ELSE 'No password'
  END as password_status
FROM auth.users
WHERE email = 'emuski@EMITHRAN.com';

-- ============================================================================
-- DONE! Password updated to: AdminEMITHRAN67
-- ============================================================================
--
-- You can now login with:
-- Email: emuski@EMITHRAN.com
-- Password: AdminEMITHRAN67
-- ============================================================================
