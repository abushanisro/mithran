-- ============================================================================
-- Migration: Supplier Evaluation Groups
-- Description: Create supplier evaluation groups to store BOM + Process selections
-- ============================================================================

-- ============================================================================
-- 1. SUPPLIER EVALUATION GROUPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_evaluation_groups (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  notes TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE supplier_evaluation_groups IS
  'Supplier evaluation groups containing BOM items and processes for vendor selection';

-- ============================================================================
-- 2. SUPPLIER EVALUATION GROUP BOM ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_evaluation_group_bom_items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_group_id UUID NOT NULL REFERENCES supplier_evaluation_groups(id) ON DELETE CASCADE,
  bom_item_id UUID NOT NULL,
  
  -- BOM Item Details (denormalized for faster queries)
  bom_item_name VARCHAR(255) NOT NULL,
  part_number VARCHAR(100),
  material VARCHAR(255),
  quantity NUMERIC(15,4) DEFAULT 1,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_group_bom_item UNIQUE (evaluation_group_id, bom_item_id)
);

COMMENT ON TABLE supplier_evaluation_group_bom_items IS
  'BOM items included in a supplier evaluation group';

-- ============================================================================
-- 3. SUPPLIER EVALUATION GROUP PROCESSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_evaluation_group_processes (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_group_id UUID NOT NULL REFERENCES supplier_evaluation_groups(id) ON DELETE CASCADE,
  process_id VARCHAR(255) NOT NULL, -- Can be UUID for real processes or predefined-{id} for services
  
  -- Process Details (denormalized for faster queries)
  process_name VARCHAR(255) NOT NULL,
  process_group VARCHAR(255),
  process_type VARCHAR(50) DEFAULT 'manufacturing' CHECK (process_type IN ('manufacturing', 'service')),
  is_predefined BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_group_process UNIQUE (evaluation_group_id, process_id)
);

COMMENT ON TABLE supplier_evaluation_group_processes IS
  'Processes included in a supplier evaluation group';

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Supplier evaluation groups indexes
CREATE INDEX IF NOT EXISTS idx_supplier_evaluation_groups_user_project 
  ON supplier_evaluation_groups(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluation_groups_status 
  ON supplier_evaluation_groups(status) WHERE status = 'active';

-- BOM items indexes
CREATE INDEX IF NOT EXISTS idx_evaluation_group_bom_items_group 
  ON supplier_evaluation_group_bom_items(evaluation_group_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_group_bom_items_bom_item 
  ON supplier_evaluation_group_bom_items(bom_item_id);

-- Processes indexes
CREATE INDEX IF NOT EXISTS idx_evaluation_group_processes_group 
  ON supplier_evaluation_group_processes(evaluation_group_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_group_processes_process 
  ON supplier_evaluation_group_processes(process_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE supplier_evaluation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_evaluation_group_bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_evaluation_group_processes ENABLE ROW LEVEL SECURITY;

-- Policies for supplier_evaluation_groups
CREATE POLICY seg_select
  ON supplier_evaluation_groups
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY seg_insert
  ON supplier_evaluation_groups
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY seg_update
  ON supplier_evaluation_groups
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY seg_delete
  ON supplier_evaluation_groups
  FOR DELETE
  USING (user_id = auth.uid());

-- Policies for supplier_evaluation_group_bom_items
CREATE POLICY segbi_select
  ON supplier_evaluation_group_bom_items
  FOR SELECT
  USING (
    evaluation_group_id IN (
      SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
    )
  );

CREATE POLICY segbi_insert
  ON supplier_evaluation_group_bom_items
  FOR INSERT
  WITH CHECK (
    evaluation_group_id IN (
      SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
    )
  );

CREATE POLICY segbi_update
  ON supplier_evaluation_group_bom_items
  FOR UPDATE
  USING (
    evaluation_group_id IN (
      SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    evaluation_group_id IN (
      SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
    )
  );

CREATE POLICY segbi_delete
  ON supplier_evaluation_group_bom_items
  FOR DELETE
  USING (
    evaluation_group_id IN (
      SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
    )
  );

-- Policies for supplier_evaluation_group_processes
CREATE POLICY segp_select
  ON supplier_evaluation_group_processes
  FOR SELECT
  USING (
    evaluation_group_id IN (
      SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
    )
  );

CREATE POLICY segp_insert
  ON supplier_evaluation_group_processes
  FOR INSERT
  WITH CHECK (
    evaluation_group_id IN (
      SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
    )
  );

CREATE POLICY segp_update
  ON supplier_evaluation_group_processes
  FOR UPDATE
  USING (
    evaluation_group_id IN (
      SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    evaluation_group_id IN (
      SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
    )
  );

CREATE POLICY segp_delete
  ON supplier_evaluation_group_processes
  FOR DELETE
  USING (
    evaluation_group_id IN (
      SELECT id FROM supplier_evaluation_groups WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. TRIGGERS FOR AUTO-UPDATE
-- ============================================================================

CREATE TRIGGER update_supplier_evaluation_groups_updated_at
  BEFORE UPDATE ON supplier_evaluation_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get evaluation group with all related data
CREATE OR REPLACE FUNCTION get_supplier_evaluation_group(
  p_group_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  name VARCHAR,
  description TEXT,
  notes TEXT,
  status VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  bom_items JSONB,
  processes JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    seg.id,
    seg.project_id,
    seg.name,
    seg.description,
    seg.notes,
    seg.status,
    seg.created_at,
    seg.updated_at,
    -- Aggregate BOM items as JSONB
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', segbi.bom_item_id,
          'name', segbi.bom_item_name,
          'partNumber', segbi.part_number,
          'material', segbi.material,
          'quantity', segbi.quantity
        )
      ) FILTER (WHERE segbi.id IS NOT NULL),
      '[]'::jsonb
    ) as bom_items,
    -- Aggregate processes as JSONB
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', segp.process_id,
          'name', segp.process_name,
          'processGroup', segp.process_group,
          'type', segp.process_type,
          'isPredefined', segp.is_predefined
        )
      ) FILTER (WHERE segp.id IS NOT NULL),
      '[]'::jsonb
    ) as processes
  FROM supplier_evaluation_groups seg
  LEFT JOIN supplier_evaluation_group_bom_items segbi ON seg.id = segbi.evaluation_group_id
  LEFT JOIN supplier_evaluation_group_processes segp ON seg.id = segp.evaluation_group_id
  WHERE 
    seg.id = p_group_id 
    AND seg.user_id = p_user_id
  GROUP BY seg.id, seg.project_id, seg.name, seg.description, seg.notes, seg.status, seg.created_at, seg.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_supplier_evaluation_group IS
  'SECURITY DEFINER: Get supplier evaluation group with all BOM items and processes';

-- Function to get evaluation groups by project
CREATE OR REPLACE FUNCTION get_supplier_evaluation_groups_by_project(
  p_project_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  name VARCHAR,
  description TEXT,
  notes TEXT,
  status VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  bom_items_count BIGINT,
  processes_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    seg.id,
    seg.project_id,
    seg.name,
    seg.description,
    seg.notes,
    seg.status,
    seg.created_at,
    seg.updated_at,
    COUNT(DISTINCT segbi.id) as bom_items_count,
    COUNT(DISTINCT segp.id) as processes_count
  FROM supplier_evaluation_groups seg
  LEFT JOIN supplier_evaluation_group_bom_items segbi ON seg.id = segbi.evaluation_group_id
  LEFT JOIN supplier_evaluation_group_processes segp ON seg.id = segp.evaluation_group_id
  WHERE 
    seg.project_id = p_project_id 
    AND seg.user_id = p_user_id
  GROUP BY seg.id, seg.project_id, seg.name, seg.description, seg.notes, seg.status, seg.created_at, seg.updated_at
  ORDER BY seg.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_supplier_evaluation_groups_by_project IS
  'SECURITY DEFINER: Get all supplier evaluation groups for a project with counts';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

-- DROP FUNCTION IF EXISTS get_supplier_evaluation_groups_by_project(UUID, UUID);
-- DROP FUNCTION IF EXISTS get_supplier_evaluation_group(UUID, UUID);
-- DROP TABLE IF EXISTS supplier_evaluation_group_processes CASCADE;
-- DROP TABLE IF EXISTS supplier_evaluation_group_bom_items CASCADE;
-- DROP TABLE IF EXISTS supplier_evaluation_groups CASCADE;