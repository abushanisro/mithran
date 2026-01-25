-- Migration: Add email field to vendors table
-- Created: 2024-01-24
-- Description: Add company email field to vendors table for RFQ system

-- Check if company_email column already exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'company_email'
    ) THEN
        -- Add company_email column if it doesn't exist
        ALTER TABLE vendors ADD COLUMN company_email TEXT;
        
        -- Add index for email queries
        CREATE INDEX IF NOT EXISTS idx_vendors_company_email ON vendors(company_email);
        
        -- Add comment
        COMMENT ON COLUMN vendors.company_email IS 'Primary company email address for RFQ and communication';
        
        -- Log the addition
        RAISE NOTICE 'Added company_email column to vendors table';
    ELSE
        RAISE NOTICE 'company_email column already exists in vendors table';
    END IF;
END $$;

-- Update RLS policies to include email field (if needed)
-- No changes needed as existing policies already cover all columns

-- Add validation constraint for email format (optional but recommended)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'vendors_email_format_check'
    ) THEN
        ALTER TABLE vendors 
        ADD CONSTRAINT vendors_email_format_check 
        CHECK (company_email IS NULL OR company_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
        
        RAISE NOTICE 'Added email format validation constraint';
    ELSE
        RAISE NOTICE 'Email format validation constraint already exists';
    END IF;
END $$;