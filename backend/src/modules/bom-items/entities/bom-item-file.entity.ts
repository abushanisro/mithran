/**
 * BOM Item File Entity
 *
 * Represents file metadata stored in database.
 * Actual files are stored in Supabase Storage bucket.
 */
export class BomItemFile {
  id: string;
  bomItemId: string;

  // File metadata
  fileName: string;
  fileType: '3d' | '2d';
  originalName: string;
  mimeType: string;
  fileSize: number; // in bytes

  // Storage reference
  storageBucket: string;
  storagePath: string;

  // File integrity
  checksum: string | null; // SHA-256 hash

  // Version control
  version: number;
  isCurrent: boolean;
  replacedBy: string | null;

  // Ownership
  uploadedBy: string;
  organizationId: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
