-- mithran Platform - Initial Database Schema
-- This migration creates all tables required for the manufacturing One-Stop Solution
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'on_hold', 'cancelled')),
    quoted_cost DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id) WHERE organization_id IS NOT NULL;

-- ============================================================================
-- VENDORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_organization_id ON vendors(organization_id) WHERE organization_id IS NOT NULL;

-- ============================================================================
-- MATERIALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('raw', 'component', 'assembly')),
    unit VARCHAR(50) NOT NULL CHECK (unit IN ('kg', 'meter', 'piece', 'liter')),
    unit_cost DECIMAL(10, 2),
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    sku VARCHAR(100),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_vendor_id ON materials(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_organization_id ON materials(organization_id) WHERE organization_id IS NOT NULL;

-- ============================================================================
-- BOMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS boms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_boms_user_id ON boms(user_id);
CREATE INDEX IF NOT EXISTS idx_boms_project_id ON boms(project_id);
CREATE INDEX IF NOT EXISTS idx_boms_organization_id ON boms(organization_id) WHERE organization_id IS NOT NULL;

-- ============================================================================
-- BOM_ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bom_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id UUID NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON bom_items(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_material_id ON bom_items(material_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boms_updated_at BEFORE UPDATE ON boms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bom_items_updated_at BEFORE UPDATE ON bom_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- Vendors policies
CREATE POLICY "Users can view their own vendors"
    ON vendors FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vendors"
    ON vendors FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendors"
    ON vendors FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vendors"
    ON vendors FOR DELETE
    USING (auth.uid() = user_id);

-- Materials policies
CREATE POLICY "Users can view their own materials"
    ON materials FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own materials"
    ON materials FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own materials"
    ON materials FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own materials"
    ON materials FOR DELETE
    USING (auth.uid() = user_id);

-- BOMs policies
CREATE POLICY "Users can view their own boms"
    ON boms FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own boms"
    ON boms FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boms"
    ON boms FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boms"
    ON boms FOR DELETE
    USING (auth.uid() = user_id);

-- BOM Items policies (inherit from parent BOM)
CREATE POLICY "Users can view bom_items for their boms"
    ON bom_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM boms WHERE boms.id = bom_items.bom_id AND boms.user_id = auth.uid()));

CREATE POLICY "Users can insert bom_items for their boms"
    ON bom_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM boms WHERE boms.id = bom_items.bom_id AND boms.user_id = auth.uid()));

CREATE POLICY "Users can update bom_items for their boms"
    ON bom_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM boms WHERE boms.id = bom_items.bom_id AND boms.user_id = auth.uid()));

CREATE POLICY "Users can delete bom_items for their boms"
    ON bom_items FOR DELETE
    USING (EXISTS (SELECT 1 FROM boms WHERE boms.id = bom_items.bom_id AND boms.user_id = auth.uid()));
