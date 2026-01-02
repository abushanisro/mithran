-- Verification Script for LSR Table
-- Run this in Supabase SQL Editor to check what exists

-- 1. Check if table exists
SELECT
    'lsr_records table' as item,
    CASE
        WHEN EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = 'lsr_records'
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as status;

-- 2. Check if indexes exist
SELECT
    indexname,
    'EXISTS' as status
FROM pg_indexes
WHERE tablename = 'lsr_records'
ORDER BY indexname;

-- 3. Check if RLS is enabled
SELECT
    'Row Level Security' as item,
    CASE
        WHEN relrowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as status
FROM pg_class
WHERE relname = 'lsr_records';

-- 4. Check policies
SELECT
    policyname,
    cmd,
    'EXISTS' as status
FROM pg_policies
WHERE tablename = 'lsr_records'
ORDER BY policyname;

-- 5. Check triggers
SELECT
    trigger_name,
    event_manipulation,
    'EXISTS' as status
FROM information_schema.triggers
WHERE event_object_table = 'lsr_records'
ORDER BY trigger_name;

-- 6. Count records (should be 0 if new)
SELECT
    'Record count' as item,
    COUNT(*)::text as status
FROM lsr_records;
