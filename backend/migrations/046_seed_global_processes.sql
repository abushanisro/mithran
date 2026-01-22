-- ============================================================================
-- Migration: Seed Global Processes (OEM Standard Process Master)
-- Description: Add industry-standard manufacturing processes
--
-- WHY GLOBAL (user_id IS NULL):
-- Processes are reference data shared across all users
-- Like SAP process routing master or Teamcenter process library
-- ============================================================================

-- Insert global processes (if they don't already exist)
INSERT INTO processes (
  process_name,
  process_category,
  description,
  machine_required,
  labor_required,
  user_id  -- NULL = global
)
VALUES
  -- CASTING PROCESSES
  ('Die Casting', 'Casting', 'High-pressure die casting for aluminum and zinc alloys', true, true, NULL),
  ('Investment Casting', 'Casting', 'Precision casting using wax patterns', true, true, NULL),
  ('Sand Casting', 'Casting', 'Traditional sand mold casting for large parts', true, true, NULL),

  -- MACHINING PROCESSES
  ('CNC Milling', 'Machining', '3-axis and 5-axis CNC milling operations', true, true, NULL),
  ('CNC Turning', 'Machining', 'Lathe operations for cylindrical parts', true, true, NULL),
  ('Drilling', 'Machining', 'Hole drilling and tapping operations', true, false, NULL),
  ('Grinding', 'Machining', 'Surface and cylindrical grinding for tight tolerances', true, true, NULL),

  -- FORMING PROCESSES
  ('Sheet Metal Stamping', 'Forming', 'Progressive die stamping for sheet metal parts', true, true, NULL),
  ('Deep Drawing', 'Forming', 'Deep drawing for complex sheet metal shapes', true, true, NULL),
  ('Forging', 'Forming', 'Hot and cold forging operations', true, true, NULL),
  ('Bending', 'Forming', 'Sheet metal bending on press brake', true, false, NULL),

  -- PLASTIC PROCESSES
  ('Injection Molding', 'Plastic', 'Thermoplastic injection molding', true, true, NULL),
  ('Blow Molding', 'Plastic', 'Hollow plastic part manufacturing', true, true, NULL),
  ('Thermoforming', 'Plastic', 'Vacuum forming of thermoplastic sheets', true, false, NULL),

  -- JOINING PROCESSES
  ('MIG Welding', 'Welding', 'Metal inert gas welding', false, true, NULL),
  ('TIG Welding', 'Welding', 'Tungsten inert gas welding for precision', false, true, NULL),
  ('Spot Welding', 'Welding', 'Resistance spot welding for sheet metal', true, true, NULL),

  -- FINISHING PROCESSES
  ('Powder Coating', 'Finishing', 'Electrostatic powder coating application', true, true, NULL),
  ('Anodizing', 'Finishing', 'Electrochemical surface treatment for aluminum', true, true, NULL),
  ('Plating', 'Finishing', 'Metal plating (chrome, nickel, zinc)', true, true, NULL),
  ('Painting', 'Finishing', 'Liquid paint application', false, true, NULL),

  -- ASSEMBLY
  ('Manual Assembly', 'Assembly', 'Hand assembly of components', false, true, NULL),
  ('Automated Assembly', 'Assembly', 'Robotic assembly operations', true, false, NULL)

ON CONFLICT DO NOTHING;  -- Skip if process with same name already exists

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify global processes are inserted:
-- SELECT process_name, process_category, user_id
-- FROM processes
-- WHERE user_id IS NULL
-- ORDER BY process_category, process_name;

-- ============================================================================
-- NOTES
-- ============================================================================
-- These are GLOBAL reference processes (user_id = NULL)
-- Users can still create their own custom processes (user_id = auth.uid())
-- The RLS policy allows access to both global AND user-owned processes
