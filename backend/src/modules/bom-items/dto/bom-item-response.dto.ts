import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BOMItemType } from './bom-items.dto';

/**
 * BOM Item Response DTO
 * Defines the API contract for BOM Item responses
 */
export class BOMItemResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  bomId: string;

  @ApiProperty({ example: 'Cylinder Head Assembly' })
  name: string;

  @ApiPropertyOptional({ example: 'CH-2024-001' })
  partNumber?: string;

  @ApiPropertyOptional({ example: 'Main cylinder head with integrated cooling channels' })
  description?: string;

  @ApiProperty({ enum: BOMItemType, example: BOMItemType.ASSEMBLY })
  itemType: BOMItemType;

  @ApiPropertyOptional({ example: 'uuid' })
  parentItemId?: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 10000 })
  annualVolume: number;

  @ApiPropertyOptional({ example: 'pcs' })
  unit?: string;

  @ApiPropertyOptional({ example: 'Cast Iron' })
  material?: string;

  @ApiPropertyOptional({ example: 'EN-GJL-250' })
  materialGrade?: string;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiPropertyOptional({ example: 'file-path-3d.stp' })
  file3dPath?: string;

  @ApiPropertyOptional({ example: 'file-path-2d.pdf' })
  file2dPath?: string;

  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-01-20T14:45:00Z' })
  updatedAt: string;

  /**
   * Transform database row to DTO
   * Validates all required fields exist
   */
  static fromDatabase(row: any): BOMItemResponseDto {
    if (!row.id || !row.bom_id || !row.name || !row.item_type || row.quantity === undefined || row.annual_volume === undefined) {
      throw new Error('Invalid BOM item data from database: missing required fields');
    }

    const dto = new BOMItemResponseDto();
    dto.id = row.id;
    dto.bomId = row.bom_id;
    dto.name = row.name;
    dto.partNumber = row.part_number || undefined;
    dto.description = row.description || undefined;
    dto.itemType = row.item_type;
    dto.parentItemId = row.parent_item_id || undefined;
    dto.quantity = Number(row.quantity);
    dto.annualVolume = Number(row.annual_volume);
    dto.unit = row.unit || undefined;
    dto.material = row.material || undefined;
    dto.materialGrade = row.material_grade || undefined;
    dto.sortOrder = row.sort_order !== undefined ? Number(row.sort_order) : 0;
    dto.file3dPath = row.file_3d_path || undefined;
    dto.file2dPath = row.file_2d_path || undefined;
    dto.createdAt = row.created_at;
    dto.updatedAt = row.updated_at;

    return dto;
  }
}

export class BOMItemListResponseDto {
  @ApiProperty({ type: [BOMItemResponseDto] })
  items: BOMItemResponseDto[];
}
