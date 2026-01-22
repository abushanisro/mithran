,.,# Database Persistence Implementation Guide

## Problem
Currently, all cost sections (Raw Materials, Process Costs, Packaging & Logistics, Procured Parts) use local React state only. Data disappears when you:
- Refresh the page
- Switch to another BOM
- Navigate away

## Solution
Implement database persistence by:
1. Pass `bomItemId` and `bomId` as props to each section
2. Create/use API hooks for CRUD operations
3. Save data automatically to database
4. Load data from database on mount

---

## Implementation Pattern (Apply to ALL Sections)

### Step 1: Update Section Props

**Before:**
```typescript
export function RawMaterialsSection() {
  // No props!
}
```

**After:**
```typescript
interface RawMaterialsSectionProps {
  bomItemId: string;
  bomId: string;
}

export function RawMaterialsSection({ bomItemId, bomId }: RawMaterialsSectionProps) {
  // Has bomItemId and bomId!
}
```

### Step 2: Use API Hooks Instead of Local State

**Before:**
```typescript
const [materials, setMaterials] = useState<RawMaterial[]>([]);

const handleDialogSubmit = (data: any) => {
  // Just updates local state
  setMaterials([...materials, materialData]);
};
```

**After:**
```typescript
// Fetch from database
const { data: materialsData } = useRawMaterialCosts({ bomItemId });
const materials = materialsData?.items || [];

// Mutations for database
const createMaterial = useCreateRawMaterialCost();
const updateMaterial = useUpdateRawMaterialCost();
const deleteMaterial = useDeleteRawMaterialCost();

const handleDialogSubmit = async (data: any) => {
  // Save to database
  await createMaterial.mutateAsync({
    bomItemId,
    ...data
  });

  // Auto-recalculate costs
  await triggerRecalculation();
};
```

### Step 3: Pass Props from Parent Page

In `page.tsx`:
```typescript
<RawMaterialsSection
  bomItemId={selectedItem.id}
  bomId={selectedBomId}
/>
```

---

## Backend Requirements

Each cost section needs these API endpoints:

### Raw Material Costs
- `GET /raw-material-costs?bomItemId={id}` - Fetch all for a BOM item
- `POST /raw-material-costs` - Create new
- `PUT /raw-material-costs/:id` - Update
- `DELETE /raw-material-costs/:id` - Delete

### Process Costs (Already exists!)
- `GET /process-costs?bomItemId={id}`
- `POST /process-costs`
- `PUT /process-costs/:id`
- `DELETE /process-costs/:id`

### Packaging & Logistics
- `GET /packaging-logistics-costs?bomItemId={id}`
- `POST /packaging-logistics-costs`
- `PUT /packaging-logistics-costs/:id`
- `DELETE /packaging-logistics-costs/:id`

### Procured Parts
- `GET /procured-parts-costs?bomItemId={id}`
- `POST /procured-parts-costs`
- `PUT /procured-parts-costs/:id`
- `DELETE /procured-parts-costs/:id`

---

## Database Tables

Already exist:
- ✅ `raw_material_cost_records`
- ✅ `process_cost_records`
- ✅ `child_part_cost_records`

Need to create:
- ❌ `packaging_logistics_cost_records`
- ❌ `procured_parts_cost_records`

---

## Next Steps

1. **Immediate:** Expose backend endpoints (controllers)
2. **Create:** Frontend API hooks
3. **Update:** All 4 section components
4. **Test:** Add → Refresh → Data persists!
