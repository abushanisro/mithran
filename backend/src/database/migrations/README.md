# Database Migrations Guide

## Quick Setup - Run LSR Migration

### Step 1: Access Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your EMITHRAN project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Run LSR Migration

Copy and paste the entire contents of `002_create_lsr_table.sql` into the SQL Editor and click **"Run"**.

**Expected Output:**
```
Success. No rows returned
```

This creates:
- ✅ `lsr_records` table with proper schema
- ✅ Row Level Security (RLS) policies
- ✅ Database indexes for performance
- ✅ Auto-update timestamp trigger
- ✅ Data validation constraints

### Step 3: Verify Table Creation

Run this query to verify:

```sql
SELECT
  tablename,
  schemaname,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'lsr_records';
```

**Expected Output:**
```
tablename    | schemaname | tableowner
-------------|------------|------------
lsr_records  | public     | postgres
```

### Step 4: Verify RLS Policies

```sql
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'lsr_records';
```

**Expected Output:** Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

## Migration Files

| File | Description | Status |
|------|-------------|---------|
| `001_shared_vendor_rls_policies.sql` | Vendor sharing policies | ✅ Run |
| `002_create_lsr_table.sql` | **LSR table and policies** | ⚠️ **Run this now** |
| `003_create_mhr_table.sql` | MHR table and policies | ✅ Run |

---

## Troubleshooting

### Error: "relation already exists"

**Cause:** Table was already created.

**Solution:** The migration is idempotent (uses `IF NOT EXISTS`). This is safe to ignore, or you can verify the table exists with the query above.

### Error: "permission denied"

**Cause:** You're using the wrong Supabase key or not authenticated.

**Solution:**
1. Ensure you're running this in the **Supabase SQL Editor** (not via backend)
2. Use the SQL Editor's built-in authentication
3. Do NOT run this via the Supabase client SDK with anon key

### Error: "syntax error near..."

**Cause:** SQL was not copied completely.

**Solution:** Copy the **entire** file contents, including all comments and blank lines.

---

## Next Steps

After running the migration:

1. **Restart your backend** (if running):
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Test the API** - Navigate to LSR page in your app

3. **Verify endpoints** work:
   - GET `/api/v1/lsr` - Should return empty array `[]`
   - POST `/api/v1/lsr` - Should allow creating records

---

## Architecture Overview

### Row Level Security (RLS)

All LSR records are protected by RLS policies:

```sql
-- Users can ONLY see their own records
USING (auth.uid() = user_id)

-- Users can ONLY modify their own records
WITH CHECK (auth.uid() = user_id)
```

### Database Constraints

- **Unique Labour Codes**: One user cannot have duplicate codes
- **Positive Values**: All monetary fields must be >= 0
- **Valid Perks**: Percentage must be between 0-100
- **Auto Timestamps**: `created_at` and `updated_at` managed automatically

### Indexes for Performance

- `user_id` - Fast user data queries
- `labour_code` - Fast code lookups
- `labour_type` - Filter by skill type
- `location` - Geographic filtering
- `created_at` - Chronological sorting

---

## Manual Migration (Alternative Method)

If you prefer to use a migration runner:

```bash
# Install PostgreSQL client tools
npm install -g postgres-migrations

# Run migration
DATABASE_URL="postgresql://postgres:[password]@db.xxxxx.supabase.co:6543/postgres" \
  postgres-migrations migrate \
  --directory ./backend/src/database/migrations
```

⚠️ **Not recommended** - Use Supabase SQL Editor instead for better error handling.

---

## Support

For issues:
1. Check the migration file syntax
2. Verify Supabase project is active
3. Review backend logs: `npm run start:dev`
4. Check Supabase Dashboard > Logs for errors
