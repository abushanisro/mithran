# Production-Ready File Storage Implementation Guide

## Industry Standards & Best Practices

### **Core Principle: Separation of Concerns**

```
┌────────────────────────────────────────────────────────────┐
│ NEVER STORE FILES IN DATABASE                              │
│ ✓ Database: Metadata only (path, size, type, checksum)    │
│ ✓ Object Storage: Actual file binaries (S3, Supabase)     │
│ ✗ Database BLOBs: Causes bloat, poor performance, $$$$    │
└────────────────────────────────────────────────────────────┘
```

## Architecture Overview

### **1. Storage Layer (Supabase Storage)**
- Private bucket: `bom-files`
- Max file size: 100MB
- File path structure: `{userId}/{projectId}/bom-items/{bomItemId}/{fileType}/{timestamp}_{filename}`
- Access control: RLS policies + signed URLs

### **2. Metadata Layer (PostgreSQL)**
- Table: `bom_item_files`
- Stores: File metadata, ownership, versioning, integrity hashes
- RLS policies enforce user-level access control

### **3. Application Layer (NestJS)**
- `FileStorageService`: Handles Supabase Storage operations
- `BomItemFileService`: Manages database metadata
- Validation: File type, size, extension checking
- Security: Server-side validation, checksum verification

## Setup Instructions

### **Step 1: Run Database Migration**

```bash
# In Supabase SQL Editor, run:
backend/migrations/003_bom_file_storage.sql
```

This creates:
- Updated `bom_items` table (matches frontend schema)
- `bom_item_files` table (metadata storage)
- RLS policies for access control
- Indexes for performance

### **Step 2: Create Supabase Storage Bucket**

1. Go to Supabase Dashboard → Storage
2. Create new bucket:
   - Name: `bom-files`
   - Public: **NO** (private bucket)
   - File size limit: 100MB
   - Allowed MIME types:
     ```
     3D Files: application/step, application/sla, model/stl, application/octet-stream
     2D Files: application/pdf, image/png, image/jpeg, image/jpg
     ```

3. Set up Storage RLS policies (in Supabase SQL Editor):

```sql
-- INSERT policy
CREATE POLICY "Authenticated users can upload BOM files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'bom-files' AND
    auth.role() = 'authenticated'
);

-- SELECT policy
CREATE POLICY "Users can view their own BOM files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'bom-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE policy
CREATE POLICY "Users can delete their own BOM files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'bom-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
```

### **Step 3: Environment Configuration**

Ensure `.env` has:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

### **Step 4: Install Dependencies**

```bash
cd backend
npm install @supabase/supabase-js
npm install multer @types/multer
```

### **Step 5: Update BOM Items Module**

Add file storage services to the module:

```typescript
// backend/src/modules/bom-items/bom-items.module.ts
import { FileStorageService } from './services/file-storage.service';
import { BomItemFileService } from './services/bom-item-file.service';

@Module({
  providers: [
    BomItemsService,
    FileStorageService,
    BomItemFileService,
  ],
  exports: [
    BomItemsService,
    FileStorageService,
    BomItemFileService,
  ],
})
export class BomItemsModule {}
```

## API Endpoints (To Implement)

### **Upload Files with BOM Item Creation**

```typescript
POST /api/v1/bom-items
Content-Type: multipart/form-data

Body:
  bomId: uuid
  name: string
  partNumber: string (optional)
  description: string (optional)
  itemType: assembly | sub_assembly | child_part | bop
  quantity: number
  annualVolume: number
  unit: string
  materialGrade: string (optional)
  file3d: File (optional)
  file2d: File (optional)
```

### **Get BOM Item with Files**

```typescript
GET /api/v1/bom-items/:id

Response:
{
  id: uuid,
  name: string,
  ...
  files: [
    {
      id: uuid,
      fileType: "3d",
      fileName: "cylinder_head.step",
      fileSize: 1234567,
      signedUrl: "https://...", // Expires in 1 hour
      createdAt: timestamp
    },
    {
      id: uuid,
      fileType: "2d",
      fileName: "drawing.pdf",
      fileSize: 234567,
      signedUrl: "https://...",
      createdAt: timestamp
    }
  ]
}
```

### **Download File**

```typescript
GET /api/v1/bom-items/:id/files/:fileId/download

Response: Redirects to signed URL (302)
```

### **Delete File**

```typescript
DELETE /api/v1/bom-items/:id/files/:fileId
```

## Security Considerations

### **1. Defense in Depth**
- ✓ Client-side validation (file type, size)
- ✓ Server-side validation (MIME type, extension, size)
- ✓ Checksum verification (SHA-256)
- ✓ RLS policies (database + storage)
- ✓ Signed URLs (time-limited access)

### **2. File Validation**
```typescript
// Validate file type by BOTH extension AND MIME type
// Never trust client-provided MIME type alone

ALLOWED_3D:
  Extensions: .stp, .step, .stl, .obj, .iges, .igs
  MIME: application/step, application/sla, model/stl

ALLOWED_2D:
  Extensions: .pdf, .dwg, .dxf, .png, .jpg, .jpeg
  MIME: application/pdf, image/png, image/jpeg
```

### **3. Access Control**
- Row Level Security (RLS) on `bom_items` and `bom_item_files`
- Storage bucket RLS policies
- Signed URLs expire after 1 hour (configurable)
- Users can only access their own files

### **4. File Integrity**
- SHA-256 checksum calculated on upload
- Stored in database for verification
- Can be used to detect corruption or tampering

## Production Recommendations

### **1. Malware Scanning**
For production, integrate virus scanning:
- Use AWS Lambda + ClamAV
- Scan files before allowing download
- Quarantine suspicious files
- Example: https://github.com/upsidetravel/bucket-antivirus-function

### **2. CDN Integration**
For frequently accessed files:
- Use Cloudflare/CloudFront CDN
- Cache signed URLs
- Reduce egress costs
- Improve global performance

### **3. Cost Optimization**
```
Storage Costs (Supabase):
- Storage: $0.021/GB/month
- Egress: $0.09/GB (first 50GB free)

Recommendations:
- Delete old file versions periodically
- Compress files before upload (CAD tools)
- Use appropriate quality for 2D drawings
- Monitor storage usage per project
```

### **4. Monitoring & Alerts**
- Track file upload failures
- Monitor storage bucket size
- Alert on suspicious file patterns
- Log all file access (audit trail)

### **5. Backup Strategy**
- Supabase Storage is backed up automatically
- Database includes file metadata in regular backups
- For critical files, consider cross-region replication

## File Versioning

The system supports file versioning:

```
When user uploads new file:
1. Mark existing file as is_current = false
2. Insert new file with is_current = true
3. Increment version number
4. Link old version to new version (replaced_by)

Benefits:
- Audit trail
- Rollback capability
- Change history
- Compliance requirements
```

To retrieve old versions:
```typescript
GET /api/v1/bom-items/:id/files/history
```

## File Path Structure

```
Supabase Storage Path:
{userId}/{projectId}/bom-items/{bomItemId}/{fileType}/{timestamp}_{filename}

Example:
a1b2c3d4-e5f6-7890-abcd-ef1234567890/
  p1a2b3c4-d5e6-7890-abcd-ef0987654321/
    bom-items/
      b9i8t7e6-m5i4-3210-dcba-fe6789012345/
        3d/
          1735123456789_cylinder_head.step
          1735234567890_cylinder_head_v2.step
        2d/
          1735123456789_drawing_sheet1.pdf
          1735123456789_assembly_view.png

Benefits:
- User isolation (RLS enforcement)
- Easy cleanup (delete project → cascade delete files)
- Clear organization
- Supports multiple files per type
- Version tracking via timestamp
```

## Comparison: Industry Approaches

### **Approach 1: Database BLOB Storage ❌**
```
Pros: Simple implementation
Cons:
  - 33% overhead (base64 encoding)
  - Database bloat
  - Slow queries
  - Expensive storage
  - Poor scalability
  - Difficult backups

Verdict: NEVER use for production
```

### **Approach 2: Object Storage (S3/Supabase) ✅**
```
Pros:
  - Scalable
  - Cost-effective
  - Fast delivery
  - CDN integration
  - Industry standard

Cons:
  - Slightly more complex
  - Need signed URLs

Verdict: RECOMMENDED (what we implemented)
```

### **Approach 3: Hybrid (Thumbnails in DB + Full Files in Storage) ⚠️**
```
Pros:
  - Fast thumbnail display
  - Full quality on demand

Cons:
  - Complexity
  - Cache invalidation
  - Still some DB bloat

Verdict: Overkill for most use cases
```

## Implementation Checklist

- [ ] Run migration `003_bom_file_storage.sql`
- [ ] Create `bom-files` bucket in Supabase
- [ ] Set up Storage RLS policies
- [ ] Add environment variables
- [ ] Install dependencies (@supabase/supabase-js, multer)
- [ ] Update BOM Items module with services
- [ ] Implement controller endpoints
- [ ] Add file upload to frontend forms
- [ ] Test file upload flow
- [ ] Test file download with signed URLs
- [ ] Test RLS policies (user isolation)
- [ ] Test file versioning
- [ ] Add error handling and logging
- [ ] Set up monitoring/alerts
- [ ] Document API endpoints
- [ ] Add malware scanning (production)

## Next Steps

1. **Implement Controller Endpoints**
   - Update `bom-items.controller.ts`
   - Add `@UseInterceptors(FileFieldsInterceptor)`
   - Handle file uploads in create/update methods

2. **Update Frontend**
   - Send files via FormData
   - Display file previews from signed URLs
   - Show upload progress
   - Handle errors

3. **Testing**
   - Unit tests for services
   - Integration tests for file upload
   - E2E tests for complete flow
   - Security tests (RLS, access control)

4. **Production Hardening**
   - Add rate limiting
   - Implement malware scanning
   - Set up monitoring
   - Configure CDN
   - Optimize costs

## Support & References

- Supabase Storage Docs: https://supabase.com/docs/guides/storage
- NestJS File Upload: https://docs.nestjs.com/techniques/file-upload
- Multer Documentation: https://github.com/expressjs/multer
- Security Best Practices: OWASP File Upload Cheat Sheet
