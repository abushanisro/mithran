import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { BomItemFile } from '../entities/bom-item-file.entity';
import { FileStorageService } from './file-storage.service';

// File upload type definition
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Production-Grade BOM Item File Metadata Service
 *
 * Responsibilities:
 * - Store file metadata in database
 * - Track file versions
 * - Link files to BOM items
 * - Generate signed URLs for file access
 */
@Injectable()
export class BomItemFileService {
  constructor(
    private fileStorageService: FileStorageService,
    private supabase: SupabaseClient,
  ) {}

  /**
   * Upload and register a file for a BOM item
   */
  async uploadFile(
    file: UploadedFile,
    fileType: '3d' | '2d',
    bomItemId: string,
    userId: string,
    projectId: string,
    organizationId: string | null,
  ): Promise<BomItemFile> {
    // Upload file to storage
    const uploadResult = await this.fileStorageService.uploadFile(
      file,
      fileType,
      userId,
      projectId,
      bomItemId,
    );

    // Get current version number for this file type
    const { data: existingFiles } = await this.supabase
      .from('bom_item_files')
      .select('version')
      .eq('bom_item_id', bomItemId)
      .eq('file_type', fileType)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingFiles && existingFiles.length > 0
      ? existingFiles[0].version + 1
      : 1;

    // Mark existing files as not current (versioning)
    await this.supabase
      .from('bom_item_files')
      .update({ is_current: false })
      .eq('bom_item_id', bomItemId)
      .eq('file_type', fileType)
      .eq('is_current', true);

    // Insert file metadata into database
    const { data, error } = await this.supabase
      .from('bom_item_files')
      .insert({
        bom_item_id: bomItemId,
        file_name: uploadResult.fileName,
        file_type: fileType,
        original_name: file.originalname,
        mime_type: uploadResult.mimeType,
        file_size: uploadResult.fileSize,
        storage_bucket: 'bom-files',
        storage_path: uploadResult.storagePath,
        checksum: uploadResult.checksum,
        version: nextVersion,
        is_current: true,
        uploaded_by: userId,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (error) {
      // Cleanup: Delete uploaded file if database insert fails
      await this.fileStorageService.deleteFile(uploadResult.storagePath);
      throw new Error(`Failed to save file metadata: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * Get current files for a BOM item
   */
  async getCurrentFiles(bomItemId: string): Promise<BomItemFile[]> {
    const { data, error } = await this.supabase
      .from('bom_item_files')
      .select('*')
      .eq('bom_item_id', bomItemId)
      .eq('is_current', true)
      .order('file_type', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch files: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * Get file with signed URL for download
   */
  async getFileWithSignedUrl(
    fileId: string,
    expiresIn: number = 3600,
  ): Promise<BomItemFile & { signedUrl: string }> {
    const { data, error } = await this.supabase
      .from('bom_item_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`File not found`);
    }

    const file = this.mapToEntity(data);
    const signedUrl = await this.fileStorageService.getSignedUrl(
      file.storagePath,
      expiresIn,
    );

    return {
      ...file,
      signedUrl,
    };
  }

  /**
   * Delete a file (both metadata and storage)
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    // Get file metadata
    const { data, error: fetchError } = await this.supabase
      .from('bom_item_files')
      .select('*')
      .eq('id', fileId)
      .eq('uploaded_by', userId) // Ensure user owns the file
      .single();

    if (fetchError || !data) {
      throw new NotFoundException(`File not found or access denied`);
    }

    // Delete from storage
    await this.fileStorageService.deleteFile(data.storage_path);

    // Delete metadata from database
    const { error: deleteError } = await this.supabase
      .from('bom_item_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      throw new Error(`Failed to delete file metadata: ${deleteError.message}`);
    }
  }

  /**
   * Delete all files for a BOM item
   */
  async deleteAllFilesForItem(bomItemId: string): Promise<void> {
    const files = await this.getCurrentFiles(bomItemId);

    for (const file of files) {
      await this.fileStorageService.deleteFile(file.storagePath);
    }

    await this.supabase
      .from('bom_item_files')
      .delete()
      .eq('bom_item_id', bomItemId);
  }

  /**
   * Map database row to entity
   */
  private mapToEntity(data: any): BomItemFile {
    return {
      id: data.id,
      bomItemId: data.bom_item_id,
      fileName: data.file_name,
      fileType: data.file_type,
      originalName: data.original_name,
      mimeType: data.mime_type,
      fileSize: data.file_size,
      storageBucket: data.storage_bucket,
      storagePath: data.storage_path,
      checksum: data.checksum,
      version: data.version,
      isCurrent: data.is_current,
      replacedBy: data.replaced_by,
      uploadedBy: data.uploaded_by,
      organizationId: data.organization_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
