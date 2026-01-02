# Quick Start: Execute Migration in 5 Minutes ⚡

## Prerequisites Checklist
- [ ] Supabase dashboard access
- [ ] Backend deployment access
- [ ] Frontend deployment access

## Step-by-Step Execution

### 1️⃣ Apply Database Migration (2 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy and paste from: `backend/src/database/migrations/001_shared_vendor_rls_policies.sql`
4. Click **▶ Run**
5. Wait for success message

**Verify:**
```sql
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'vendors';
-- Should return: 4
```

### 2️⃣ Deploy Code (1 minute)

**Backend:**
```bash
cd backend
npm run build
# Restart your backend service
```

**Frontend:**
```bash
npm run build
# Restart your frontend service
```

### 3️⃣ Test Cross-User Visibility (2 minutes)

**Test 1: Upload CSV**
- Open app in **Chrome** (User A logged in)
- Navigate to **Vendors** → **Import CSV**
- Upload `backend/data/vendor-db.csv`
- Expected: "Successfully imported vendors: 198 created"

**Test 2: Verify Shared Access**
- Open app in **Firefox/Incognito** (User B logged in)
- Navigate to **Vendors**
- Expected: See all 198 vendors from User A

**Test 3: Re-upload Same CSV**
- Same browser, re-upload CSV
- Expected: "No changes made: 198 skipped"

## ✅ Success Criteria

All checkboxes should be ✅:

- [ ] Backend builds successfully
- [ ] Frontend builds successfully
- [ ] User A can upload CSV without errors
- [ ] User B sees vendors created by User A
- [ ] Re-uploading same CSV skips duplicates
- [ ] No errors in browser console
- [ ] No errors in backend logs

## 🚨 Rollback (If Needed)

If tests fail, rollback immediately:

```sql
-- Run in Supabase SQL Editor
DROP POLICY IF EXISTS "Authenticated users can view all vendors" ON vendors;
DROP POLICY IF EXISTS "Authenticated users can create vendors" ON vendors;
DROP POLICY IF EXISTS "Authenticated users can update all vendors" ON vendors;
DROP POLICY IF EXISTS "Authenticated users can delete all vendors" ON vendors;

CREATE POLICY "Users can view their own vendors"
ON vendors FOR SELECT TO authenticated
USING (auth.uid() = user_id);
```

Then redeploy previous version of code.

## 📞 Support

Issues? Check:
1. Supabase logs for RLS errors
2. Browser console for API errors
3. Backend logs for CSV import errors

## Summary

**Total Time:** 5 minutes
**Downtime:** 0 minutes
**Risk:** Low (easy rollback available)
**Impact:** High (enables full collaboration)

---

**Ready?** Start with Step 1 ☝️
