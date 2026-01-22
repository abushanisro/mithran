-- Migration: Add process information fields to process_cost_records
-- Description: Store process group, route, and operation names for display
-- Author: Manufacturing Cost Engineering Team
-- Version: 1.2.0
-- Date: 2026-01-19

-- Add columns to store process hierarchy information as denormalized data
-- This allows us to display the process information without complex joins

DO $$
BEGIN
    -- Add process_group column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'process_cost_records'
        AND column_name = 'process_group'
    ) THEN
        ALTER TABLE process_cost_records
        ADD COLUMN process_group VARCHAR(255);

        RAISE NOTICE 'Added process_group column';
    END IF;

    -- Add process_route column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'process_cost_records'
        AND column_name = 'process_route'
    ) THEN
        ALTER TABLE process_cost_records
        ADD COLUMN process_route VARCHAR(255);

        RAISE NOTICE 'Added process_route column';
    END IF;

    -- Add operation column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'process_cost_records'
        AND column_name = 'operation'
    ) THEN
        ALTER TABLE process_cost_records
        ADD COLUMN operation VARCHAR(255);

        RAISE NOTICE 'Added operation column';
    END IF;

    -- Add machine_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'process_cost_records'
        AND column_name = 'machine_name'
    ) THEN
        ALTER TABLE process_cost_records
        ADD COLUMN machine_name VARCHAR(255);

        RAISE NOTICE 'Added machine_name column';
    END IF;

    -- Add labor_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'process_cost_records'
        AND column_name = 'labor_type'
    ) THEN
        ALTER TABLE process_cost_records
        ADD COLUMN labor_type VARCHAR(255);

        RAISE NOTICE 'Added labor_type column';
    END IF;

    -- Add mhr_id column if it doesn't exist (to store machine hour record reference)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'process_cost_records'
        AND column_name = 'mhr_id'
    ) THEN
        ALTER TABLE process_cost_records
        ADD COLUMN mhr_id UUID;

        RAISE NOTICE 'Added mhr_id column';
    END IF;

    -- Add lsr_id column if it doesn't exist (to store labour standard record reference)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'process_cost_records'
        AND column_name = 'lsr_id'
    ) THEN
        ALTER TABLE process_cost_records
        ADD COLUMN lsr_id UUID;

        RAISE NOTICE 'Added lsr_id column';
    END IF;

END $$;

-- Create indexes for filtering by process information
CREATE INDEX IF NOT EXISTS idx_process_cost_records_process_group
  ON process_cost_records(process_group);

CREATE INDEX IF NOT EXISTS idx_process_cost_records_process_route
  ON process_cost_records(process_route);

CREATE INDEX IF NOT EXISTS idx_process_cost_records_operation
  ON process_cost_records(operation);

CREATE INDEX IF NOT EXISTS idx_process_cost_records_mhr_id
  ON process_cost_records(mhr_id);

CREATE INDEX IF NOT EXISTS idx_process_cost_records_lsr_id
  ON process_cost_records(lsr_id);

-- Add comments for documentation
COMMENT ON COLUMN process_cost_records.process_group IS 'Process group name (e.g., Assembly, Machining, Sheet Metal)';
COMMENT ON COLUMN process_cost_records.process_route IS 'Process route name within the group';
COMMENT ON COLUMN process_cost_records.operation IS 'Specific operation name';
COMMENT ON COLUMN process_cost_records.machine_name IS 'Name of the machine used (denormalized from MHR)';
COMMENT ON COLUMN process_cost_records.labor_type IS 'Type of labor used (denormalized from LSR)';
COMMENT ON COLUMN process_cost_records.mhr_id IS 'Reference to the machine_hour_records table';
COMMENT ON COLUMN process_cost_records.lsr_id IS 'Reference to the labour_standard_records table';
