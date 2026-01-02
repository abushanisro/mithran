-- Migration: Shared Vendor Database RLS Policies
-- Description: Enable collaborative vendor management across all users
-- Business Rule: All authenticated users can view and manage all vendors
-- Author: System
-- Date: 2026-01-01

-- ============================================================================
-- STEP 1: Drop existing restrictive RLS policies
-- ============================================================================

-- Drop any user-scoped policies
DROP POLICY IF EXISTS "Users can view their own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can insert their own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can update their own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can delete their own vendors" ON vendors;

-- ============================================================================
-- STEP 2: Create shared access RLS policies
-- ============================================================================

-- SELECT: All authenticated users can view all vendors
CREATE POLICY "Authenticated users can view all vendors"
ON vendors FOR SELECT
TO authenticated
USING (true);

-- INSERT: All authenticated users can create vendors
CREATE POLICY "Authenticated users can create vendors"
ON vendors FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: All authenticated users can update any vendor
CREATE POLICY "Authenticated users can update all vendors"
ON vendors FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE: All authenticated users can delete any vendor (optional - can be restricted)
CREATE POLICY "Authenticated users can delete all vendors"
ON vendors FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- STEP 3: Apply same policies to related tables for consistency
-- ============================================================================

-- Vendor Contacts
DROP POLICY IF EXISTS "Users can view their vendor contacts" ON vendor_contacts;
DROP POLICY IF EXISTS "Users can insert vendor contacts" ON vendor_contacts;
DROP POLICY IF EXISTS "Users can update vendor contacts" ON vendor_contacts;
DROP POLICY IF EXISTS "Users can delete vendor contacts" ON vendor_contacts;

CREATE POLICY "Authenticated users can view all vendor contacts"
ON vendor_contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage vendor contacts"
ON vendor_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update vendor contacts"
ON vendor_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete vendor contacts"
ON vendor_contacts FOR DELETE TO authenticated USING (true);

-- Vendor Equipment
DROP POLICY IF EXISTS "Users can view their vendor equipment" ON vendor_equipment;
DROP POLICY IF EXISTS "Users can insert vendor equipment" ON vendor_equipment;
DROP POLICY IF EXISTS "Users can update vendor equipment" ON vendor_equipment;
DROP POLICY IF EXISTS "Users can delete vendor equipment" ON vendor_equipment;

CREATE POLICY "Authenticated users can view all vendor equipment"
ON vendor_equipment FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage vendor equipment"
ON vendor_equipment FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update vendor equipment"
ON vendor_equipment FOR UPDATE TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete vendor equipment"
ON vendor_equipment FOR DELETE TO authenticated USING (true);

-- Vendor Services
DROP POLICY IF EXISTS "Users can view their vendor services" ON vendor_services;
DROP POLICY IF EXISTS "Users can insert vendor services" ON vendor_services;
DROP POLICY IF EXISTS "Users can update vendor services" ON vendor_services;
DROP POLICY IF EXISTS "Users can delete vendor services" ON vendor_services;

CREATE POLICY "Authenticated users can view all vendor services"
ON vendor_services FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage vendor services"
ON vendor_services FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update vendor services"
ON vendor_services FOR UPDATE TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete vendor services"
ON vendor_services FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- STEP 4: Ensure RLS is enabled on all tables
-- ============================================================================

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_services ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the migration)
-- ============================================================================

-- Check all policies on vendors table
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'vendors';

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('vendors', 'vendor_contacts', 'vendor_equipment', 'vendor_services');
