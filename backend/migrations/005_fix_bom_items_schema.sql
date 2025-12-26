-- ============================================================================
-- Migration: Fix BOM Items Schema
-- Description: Replace old bom_items table with correct manufacturing schema
-- ============================================================================

-- Drop old table and recreate with correct schema
DROP TABLE IF EXISTS bom_items CASCADE;

-- Create bom_items table with manufacturing-focused schema
CREATE TABLE bom_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id UUID NOT NULL REFERENCES boms(id) ON DELETE CASCADE,

    -- Item details
    name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    description TEXT,

    -- Item classification
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('assembly', 'sub_assembly', 'child_part', 'bop')),

    -- Material information
    material VARCHAR(100),
    material_grade VARCHAR(100),

    -- Quantity and volume
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    annual_volume INTEGER NOT NULL DEFAULT 1000,
    unit VARCHAR(50) NOT NULL DEFAULT 'pcs' CHECK (unit IN ('pcs', 'kg', 'lbs', 'm', 'ft', 'liters')),

    -- Hierarchy support (self-referencing for tree structure)
    parent_item_id UUID REFERENCES bom_items(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,

    -- File storage paths
    file_3d_path TEXT,
    file_2d_path TEXT,

    -- Metadata
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bom_items_bom_id ON bom_items(bom_id);
CREATE INDEX idx_bom_items_parent_item_id ON bom_items(parent_item_id) WHERE parent_item_id IS NOT NULL;
CREATE INDEX idx_bom_items_item_type ON bom_items(item_type);
CREATE INDEX idx_bom_items_user_id ON bom_items(user_id);
CREATE INDEX idx_bom_items_sort_order ON bom_items(bom_id, sort_order);

-- Trigger for updated_at
CREATE TRIGGER update_bom_items_updated_at BEFORE UPDATE ON bom_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE bom_items IS 'Manufacturing BOM items with hierarchy and file storage support';
COMMENT ON COLUMN bom_items.item_type IS 'Type: assembly, sub_assembly, child_part, or bop';
COMMENT ON COLUMN bom_items.parent_item_id IS 'Parent item for hierarchical BOM structure';
COMMENT ON COLUMN bom_items.annual_volume IS 'Expected annual production volume';
COMMENT ON COLUMN bom_items.file_3d_path IS 'Storage path for 3D CAD file';
COMMENT ON COLUMN bom_items.file_2d_path IS 'Storage path for 2D drawing file';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on bom_items table
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view BOM items for their own BOMs
CREATE POLICY "Users can view bom_items for their boms"
    ON bom_items FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM boms
      WHERE boms.id = bom_items.bom_id
      AND boms.user_id = auth.uid()
    ));

-- Policy: Users can insert BOM items into their own BOMs
CREATE POLICY "Users can insert bom_items for their boms"
    ON bom_items FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM boms
      WHERE boms.id = bom_items.bom_id
      AND boms.user_id = auth.uid()
    ));

-- Policy: Users can update BOM items in their own BOMs
CREATE POLICY "Users can update bom_items for their boms"
    ON bom_items FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM boms
      WHERE boms.id = bom_items.bom_id
      AND boms.user_id = auth.uid()
    ));

-- Policy: Users can delete BOM items from their own BOMs
CREATE POLICY "Users can delete bom_items for their boms"
    ON bom_items FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM boms
      WHERE boms.id = bom_items.bom_id
      AND boms.user_id = auth.uid()
    ));
