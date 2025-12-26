import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsNumber, IsEnum, Min } from 'class-validator';

export enum BOMItemType {
  ASSEMBLY = 'assembly',
  SUB_ASSEMBLY = 'sub_assembly',
  CHILD_PART = 'child_part',
  BOP = 'bop',
}

export class CreateBOMItemDto {
  @ApiProperty({ example: 'bom-uuid' })
  @IsUUID()
  bomId: string;

  @ApiProperty({ example: 'Cylinder Head Assembly' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'CH-2024-001' })
  @IsOptional()
  @IsString()
  partNumber?: string;

  @ApiPropertyOptional({ example: 'Main cylinder head with integrated cooling channels' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: BOMItemType, example: BOMItemType.ASSEMBLY })
  @IsEnum(BOMItemType)
  itemType: BOMItemType;

  @ApiPropertyOptional({ example: 'parent-item-uuid' })
  @IsOptional()
  @IsUUID()
  parentItemId?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(0)
  annualVolume: number;

  @ApiPropertyOptional({ example: 'pcs' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 'Cast Iron' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ example: 'EN-GJL-250' })
  @IsOptional()
  @IsString()
  materialGrade?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: 'file-path-3d.stp' })
  @IsOptional()
  @IsString()
  file3dPath?: string;

  @ApiPropertyOptional({ example: 'file-path-2d.pdf' })
  @IsOptional()
  @IsString()
  file2dPath?: string;
}

export class UpdateBOMItemDto extends PartialType(CreateBOMItemDto) {}

export class QueryBOMItemsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(BOMItemType)
  itemType?: BOMItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
