# BOM Items Testing & Verification Guide

## ✅ What's Been Fixed

1. **API Integration** - Frontend now calls real backend APIs
2. **Data Fetching** - BOM items load from Supabase database
3. **CRUD Operations** - Create, Read, Update, Delete all working
4. **Database Viewer** - New page to view all your data

## 🚀 How to View & Verify Your Data

### **Option 1: Database Viewer Page (Easiest)**

1. Start your app:
```bash
npm run dev
```

2. Navigate to: **http://localhost:3000/database-viewer**

3. You'll see:
   - Summary cards showing count of Projects, BOMs, BOM Items, Vendors
   - Tabs to view actual data from each table
   - Ability to view BOM items by selecting a BOM
   - Refresh button to reload all data

**How to Use**:
- Check the status cards at top - they show how many records you have
- Click through tabs (Projects, BOMs, BOM Items, Vendors)
- In BOMs tab, click "View Items" button to see items for that BOM
- Click "Refresh All" to reload data from database

### **Option 2: Supabase Dashboard**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Table Editor" in left sidebar
4. Select tables to view:
   - `projects` - Your projects
   - `boms` - Your BOMs
   - `bom_items` - **Your BOM items** (this is what you're looking for!)
   - `vendors` - Your vendors

**What to Check**:
- Look for rows in `bom_items` table
- Verify fields: `name`, `part_number`, `material_grade`, `quantity`, `annual_volume`, `item_type`
- Check `bom_id` column links to parent BOM
- Verify `user_id` matches your auth user

### **Option 3: Browser DevTools**

1. Open your app
2. Press F12 to open DevTools
3. Go to "Network" tab
4. Navigate to a BOM detail page
5. Look for API calls:
   - `GET /api/v1/bom-items?bomId=...` - Should return your items
   - `POST /api/v1/bom-items` - When creating item
   - `DELETE /api/v1/bom-items/...` - When deleting item

**What to Check**:
- API calls return 200 status
- Response contains `items` array with your data
- No 401 (unauthorized) or 403 (forbidden) errors

## 🧪 Testing Workflow

### **Step 1: Create Test Data**

1. Create a Project (if you don't have one)
   - Go to Projects page
   - Click "Create Project"
   - Fill in name and details

2. Create a BOM
   - Open your project
   - Go to BOM tab
   - Click "Create BOM"
   - **Important**: When creating BOM, you can add the first item
     - Fill in item details (name, quantity, material, etc.)
     - This tests the combined BOM + Item creation

3. Add More Items
   - In BOM detail page, click "Add Item" button
   - Fill in the form:
     - Name: e.g., "Cylinder Head"
     - Part Number: e.g., "CH-001"
     - Type: Assembly, Sub-Assembly, Child Part, or BOP
     - Quantity: e.g., 1
     - Annual Volume: e.g., 10000
     - Unit: pcs, kg, etc.
     - Material Grade: e.g., "EN-GJL-250"
   - Click "Create Item"

### **Step 2: Verify Data is Stored**

**Method A: Check Database Viewer**
1. Go to `/database-viewer`
2. Look at BOM Items card - should show count > 0
3. Go to BOMs tab → Click "View Items" on your BOM
4. Go to BOM Items tab - should show your items

**Method B: Check Supabase**
1. Open Supabase Dashboard
2. Table Editor → `bom_items`
3. Should see rows with your data

**Method C: Refresh BOM Page**
1. Go to your BOM detail page
2. Items should appear in the table
3. If not, check browser console for errors

### **Step 3: Test CRUD Operations**

**READ (View)**:
- [x] Items appear in table
- [x] Data matches what you entered
- [x] Loading spinner shows while fetching

**CREATE (Add)**:
- [x] Click "Add Item" button
- [x] Fill form and submit
- [x] Success toast appears
- [x] New item appears in table

**UPDATE (Edit)**:
- [x] Click edit icon on an item
- [x] Change some fields
- [x] Save changes
- [x] Item updates in table

**DELETE (Remove)**:
- [x] Click delete icon
- [x] Confirm deletion
- [x] Item disappears from table
- [x] Removed from database

**SORT (Drag & Drop)**:
- [x] Drag item rows to reorder
- [x] Drop in new position
- [x] Order saved to database

## 🔍 Troubleshooting

### **Problem: Items Not Showing**

**Check 1: API Call Success**
```
1. Open DevTools → Network tab
2. Refresh BOM page
3. Look for: GET /api/v1/bom-items?bomId=xxx
4. Check status: Should be 200
5. Check response: Should have "items" array
```

**Check 2: Authentication**
```
1. Make sure you're logged in
2. Check if access token is valid
3. Try logging out and back in
```

**Check 3: RLS Policies**
```
1. Go to Supabase Dashboard
2. Authentication → Policies
3. Check `bom_items` table has SELECT policy
4. Should be: "Users can view their own BOM items"
```

**Check 4: Data Exists**
```
1. Supabase Dashboard → Table Editor → bom_items
2. Verify rows exist
3. Check user_id matches your auth user (go to Authentication → Users)
```

### **Problem: Can't Create Items**

**Check 1: Form Validation**
```
- Name is required
- Quantity must be > 0
- Annual Volume must be > 0
- All required fields filled
```

**Check 2: API Error**
```
1. Open DevTools → Console
2. Try creating item
3. Look for error messages
4. Check Network tab for failed POST request
```

**Check 3: Backend Running**
```bash
# Make sure backend is running
cd backend
npm run start:dev

# Check logs for errors
```

### **Problem: Database Migration Not Run**

If you see errors like "relation 'bom_items' does not exist":

```
1. Go to Supabase Dashboard
2. SQL Editor
3. Run: backend/migrations/003_bom_file_storage.sql
4. This creates the bom_items table
```

## 📊 What Data Gets Stored

When you create a BOM item, this data is saved in `bom_items` table:

```typescript
{
  id: "uuid",                    // Auto-generated
  bom_id: "parent-bom-uuid",    // Links to BOM
  name: "Cylinder Head",        // What you entered
  part_number: "CH-001",        // What you entered
  description: "...",           // What you entered
  item_type: "assembly",        // What you selected
  quantity: 1,                  // What you entered
  annual_volume: 10000,         // What you entered
  unit: "pcs",                  // What you selected
  material_grade: "EN-GJL-250", // What you entered
  sort_order: 0,                // For drag & drop
  user_id: "your-auth-uuid",    // Auto from session
  created_at: "2025-12-26...",  // Auto timestamp
  updated_at: "2025-12-26..."   // Auto timestamp
}
```

## 🎯 Success Criteria

You know everything is working when:

✅ Database Viewer shows count > 0 for BOM Items
✅ Supabase Table Editor shows rows in `bom_items`
✅ BOM detail page shows items in table
✅ Can add new items successfully
✅ Can edit existing items
✅ Can delete items
✅ Can drag & drop to reorder
✅ No errors in browser console
✅ API calls return 200 status

## 🚨 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Loading..." never stops | Check API endpoint, verify backend running |
| Items don't appear | Check RLS policies, verify user_id matches |
| Can't create items | Check required fields, check backend logs |
| "Unauthorized" errors | Re-login, check access token |
| Table doesn't exist | Run migration 003_bom_file_storage.sql |

## 📞 Still Having Issues?

If items still don't show after checking all above:

1. **Check Backend Logs**:
```bash
cd backend
npm run start:dev
# Watch console for errors when creating items
```

2. **Check Frontend Console**:
```
Open DevTools → Console
Look for red error messages
```

3. **Verify Database Connection**:
```
Supabase Dashboard → Settings → API
Check if SUPABASE_URL and SUPABASE_ANON_KEY match your .env
```

4. **Test API Directly**:
```bash
# Get your access token from browser DevTools → Application → Local Storage
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/bom-items?bomId=YOUR_BOM_ID
```

## 🎓 Next Steps

Once BOM items are working:

1. Implement file upload (3D CAD, 2D drawings)
   - See `FILE_STORAGE_IMPLEMENTATION.md`
   - Backend services already created
   - Need to wire up controller endpoints

2. Add BOM costing calculations
   - Link items to materials database
   - Calculate total BOM cost
   - Show cost breakdown

3. Add BOM tree view
   - Show hierarchical structure
   - Support assemblies and sub-assemblies
   - Parent-child relationships

---

**File Upload Enhancement Coming Next**: The file upload UI is already in place (with image previews and collapsible details). We just need to connect it to the backend file storage service to actually save files to Supabase Storage.
