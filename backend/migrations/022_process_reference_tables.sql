-- Migration: Process Reference Tables
-- Description: Creates tables to store process-specific reference data (tables, rows, columns)
-- Author: System
-- Date: 2026-01-04

-- ============================================================================
-- DROP EXISTING TABLES (if any)
-- ============================================================================
DROP TABLE IF EXISTS process_table_rows CASCADE;
DROP TABLE IF EXISTS process_reference_tables CASCADE;

-- ============================================================================
-- CREATE PROCESS_REFERENCE_TABLES TABLE
-- ============================================================================
-- Stores reference tables that belong to each process (e.g., "Cavity Pressure Table", "Material Viscosity Table")
CREATE TABLE process_reference_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL, -- Links to the processes table
  table_name TEXT NOT NULL, -- e.g., "Cavity Pressure Table"
  table_description TEXT, -- Optional description
  column_definitions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of column definitions [{name, type, label}]
  display_order INTEGER DEFAULT 0, -- Order in which to display the table
  is_editable BOOLEAN DEFAULT true, -- Whether users can edit this table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example column_definitions structure:
-- [
--   {"name": "flow_path", "type": "number", "label": "Flow Path Ratio"},
--   {"name": "pressure", "type": "number", "label": "Pressure (Bar)"}
-- ]

-- ============================================================================
-- CREATE PROCESS_TABLE_ROWS TABLE
-- ============================================================================
-- Stores the actual data rows for each reference table
CREATE TABLE process_table_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES process_reference_tables(id) ON DELETE CASCADE,
  row_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores the actual row data as JSON
  row_order INTEGER DEFAULT 0, -- Order of the row in the table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example row_data structure:
-- {"flow_path": 50, "pressure": 100}

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================
CREATE INDEX idx_process_reference_tables_process_id ON process_reference_tables(process_id);
CREATE INDEX idx_process_reference_tables_display_order ON process_reference_tables(display_order);
CREATE INDEX idx_process_table_rows_table_id ON process_table_rows(table_id);
CREATE INDEX idx_process_table_rows_row_order ON process_table_rows(row_order);

-- ============================================================================
-- SEED DATA: Injection Molding Process Reference Tables
-- ============================================================================

-- First, we need to find or create the Injection Molding process
-- Assuming it exists with id from processes table, or we'll create a placeholder

-- Insert Cavity Pressure Table
WITH injection_molding AS (
  SELECT id FROM processes WHERE process_name = 'Injection Molding' LIMIT 1
)
INSERT INTO process_reference_tables (process_id, table_name, table_description, column_definitions, display_order, is_editable)
SELECT
  (SELECT id FROM injection_molding),
  'Cavity Pressure Table',
  'Flow path ratio vs cavity pressure relationship',
  '[
    {"name": "flow_path_ratio", "type": "number", "label": "Flow Path Ratio"},
    {"name": "pressure", "type": "number", "label": "Pressure (Bar)"}
  ]'::jsonb,
  1,
  true
WHERE EXISTS (SELECT 1 FROM injection_molding);

-- Insert Material Viscosity Table
WITH injection_molding AS (
  SELECT id FROM processes WHERE process_name = 'Injection Molding' LIMIT 1
)
INSERT INTO process_reference_tables (process_id, table_name, table_description, column_definitions, display_order, is_editable)
SELECT
  (SELECT id FROM injection_molding),
  'Material Viscosity Table',
  'Material types and their viscosity values',
  '[
    {"name": "material", "type": "text", "label": "Material"},
    {"name": "viscosity", "type": "number", "label": "Viscosity (K₀)"}
  ]'::jsonb,
  2,
  true
WHERE EXISTS (SELECT 1 FROM injection_molding);

-- Insert Machine Specifications Table
WITH injection_molding AS (
  SELECT id FROM processes WHERE process_name = 'Injection Molding' LIMIT 1
)
INSERT INTO process_reference_tables (process_id, table_name, table_description, column_definitions, display_order, is_editable)
SELECT
  (SELECT id FROM injection_molding),
  'Machine Specifications',
  'Injection molding machine parameters',
  '[
    {"name": "tonnage", "type": "text", "label": "Tonnage"},
    {"name": "shot_weight", "type": "number", "label": "Shot Weight (g)"},
    {"name": "cycle_time", "type": "number", "label": "Cycle Time (s)"},
    {"name": "mhr", "type": "number", "label": "MHR (₹/hr)"}
  ]'::jsonb,
  3,
  true
WHERE EXISTS (SELECT 1 FROM injection_molding);

-- Insert Cavities Recommendation Table
WITH injection_molding AS (
  SELECT id FROM processes WHERE process_name = 'Injection Molding' LIMIT 1
)
INSERT INTO process_reference_tables (process_id, table_name, table_description, column_definitions, display_order, is_editable)
SELECT
  (SELECT id FROM injection_molding),
  'Cavities Recommendation',
  'Annual usage vs recommended cavities',
  '[
    {"name": "eau", "type": "text", "label": "EAU (Annual Usage)"},
    {"name": "cavities", "type": "number", "label": "Cavities"}
  ]'::jsonb,
  4,
  true
WHERE EXISTS (SELECT 1 FROM injection_molding);

-- Insert Runner Diameter Selection Table
WITH injection_molding AS (
  SELECT id FROM processes WHERE process_name = 'Injection Molding' LIMIT 1
)
INSERT INTO process_reference_tables (process_id, table_name, table_description, column_definitions, display_order, is_editable)
SELECT
  (SELECT id FROM injection_molding),
  'Runner Diameter Selection',
  'Part weight vs runner diameter relationship',
  '[
    {"name": "part_weight", "type": "text", "label": "Part Weight (grams)"},
    {"name": "runner_diameter", "type": "text", "label": "Runner Diameter (mm)"}
  ]'::jsonb,
  5,
  true
WHERE EXISTS (SELECT 1 FROM injection_molding);

-- ============================================================================
-- SEED DATA: Sample Rows for Reference Tables
-- ============================================================================

-- Cavity Pressure Table Rows
WITH cavity_table AS (
  SELECT id FROM process_reference_tables WHERE table_name = 'Cavity Pressure Table' LIMIT 1
)
INSERT INTO process_table_rows (table_id, row_data, row_order)
SELECT
  (SELECT id FROM cavity_table),
  jsonb_build_object('flow_path_ratio', flow_path, 'pressure', pressure),
  row_number() OVER ()
FROM (VALUES
  (50, 100), (60, 110), (70, 120), (80, 130), (90, 140),
  (100, 150), (110, 160), (120, 170), (130, 180), (140, 190),
  (150, 200), (160, 206), (170, 212), (180, 218), (190, 224),
  (200, 230), (210, 244), (220, 258), (230, 272), (240, 286),
  (250, 300), (260, 350), (270, 400), (280, 405), (290, 410), (300, 420)
) AS data(flow_path, pressure)
WHERE EXISTS (SELECT 1 FROM cavity_table);

-- Material Viscosity Table Rows
WITH viscosity_table AS (
  SELECT id FROM process_reference_tables WHERE table_name = 'Material Viscosity Table' LIMIT 1
)
INSERT INTO process_table_rows (table_id, row_data, row_order)
SELECT
  (SELECT id FROM viscosity_table),
  jsonb_build_object('material', material, 'viscosity', viscosity),
  row_number() OVER ()
FROM (VALUES
  ('GPPS', 1.00), ('TPS', 1.00), ('PE', 1.00), ('HIPS', 1.00), ('PS', 1.00), ('PP', 1.00),
  ('PA', 1.33), ('PETP', 1.33), ('PBT', 1.33),
  ('CAB', 1.40), ('CP', 1.40), ('PEEL', 1.40), ('TPU', 1.40), ('CA', 1.40),
  ('CAP', 1.40), ('EVA', 1.40), ('PUR', 1.40), ('PPVC', 1.40),
  ('ABS', 1.50), ('ASA', 1.50), ('MBS', 1.50), ('PPOM', 1.50), ('POM', 1.50),
  ('SAN', 1.50), ('PPS', 1.50), ('BDS', 1.50),
  ('PC', 1.61), ('PC/PBT', 1.61), ('PMMA', 1.61), ('PC/ABS', 1.61),
  ('PES', 1.80), ('PEI', 1.80), ('UPVC', 1.80), ('PSU', 1.80), ('PEEK', 1.80),
  ('Add Fiber Glass', 1.80), ('Other Engineering Plastic', 1.80)
) AS data(material, viscosity)
WHERE EXISTS (SELECT 1 FROM viscosity_table);

-- Machine Specifications Rows
WITH machine_table AS (
  SELECT id FROM process_reference_tables WHERE table_name = 'Machine Specifications' LIMIT 1
)
INSERT INTO process_table_rows (table_id, row_data, row_order)
SELECT
  (SELECT id FROM machine_table),
  jsonb_build_object('tonnage', tonnage, 'shot_weight', shot_weight, 'cycle_time', cycle_time, 'mhr', mhr),
  row_number() OVER ()
FROM (VALUES
  ('80 Ton', 86, 30, 450),
  ('120 Ton', 130, 35, 520),
  ('180 Ton', 220, 40, 600),
  ('250 Ton', 350, 45, 700)
) AS data(tonnage, shot_weight, cycle_time, mhr)
WHERE EXISTS (SELECT 1 FROM machine_table);

-- Cavities Recommendation Rows
WITH cavities_table AS (
  SELECT id FROM process_reference_tables WHERE table_name = 'Cavities Recommendation' LIMIT 1
)
INSERT INTO process_table_rows (table_id, row_data, row_order)
SELECT
  (SELECT id FROM cavities_table),
  jsonb_build_object('eau', eau, 'cavities', cavities),
  row_number() OVER ()
FROM (VALUES
  ('< 50,000', 1),
  ('50,000 - 2,00,000', 2),
  ('2,00,000 - 6,00,000', 4),
  ('6,00,000 - 30,00,000', 8),
  ('30,00,000 - 1,00,00,000', 16),
  ('> 1,00,00,000', 32)
) AS data(eau, cavities)
WHERE EXISTS (SELECT 1 FROM cavities_table);

-- Runner Diameter Selection Rows
WITH runner_table AS (
  SELECT id FROM process_reference_tables WHERE table_name = 'Runner Diameter Selection' LIMIT 1
)
INSERT INTO process_table_rows (table_id, row_data, row_order)
SELECT
  (SELECT id FROM runner_table),
  jsonb_build_object('part_weight', part_weight, 'runner_diameter', runner_diameter),
  row_number() OVER ()
FROM (VALUES
  ('≤ 20', '3'),
  ('≤ 50', '4'),
  ('≤ 100', '5'),
  ('≤ 250', '6'),
  ('> 250', '7-9')
) AS data(part_weight, runner_diameter)
WHERE EXISTS (SELECT 1 FROM runner_table);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant access to authenticated users
GRANT ALL ON process_reference_tables TO authenticated;
GRANT ALL ON process_table_rows TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE process_reference_tables IS 'Stores reference tables for each manufacturing process';
COMMENT ON TABLE process_table_rows IS 'Stores the actual data rows for process reference tables';
COMMENT ON COLUMN process_reference_tables.column_definitions IS 'JSON array defining table columns: [{name, type, label}]';
COMMENT ON COLUMN process_table_rows.row_data IS 'JSON object containing the actual row data matching column definitions';
