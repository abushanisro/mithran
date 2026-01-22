import { IsUUID, IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BomItemDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  partNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;
}

export class ProcessDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  processGroup: string;

  @ApiProperty()
  @IsIn(['manufacturing', 'service'])
  type: 'manufacturing' | 'service';

  @ApiProperty()
  @IsBoolean()
  isPredefined: boolean;
}

export class CreateSupplierEvaluationGroupDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [BomItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  bomItems: BomItemDto[];

  @ApiProperty({ type: [ProcessDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessDto)
  processes: ProcessDto[];
}

export class UpdateSupplierEvaluationGroupDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(['draft', 'active', 'completed', 'archived'])
  status?: 'draft' | 'active' | 'completed' | 'archived';
}

export class SupplierEvaluationGroupDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [BomItemDto] })
  bomItems: BomItemDto[];

  @ApiProperty({ type: [ProcessDto] })
  processes: ProcessDto[];
}

export class SupplierEvaluationGroupSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  bomItemsCount: number;

  @ApiProperty()
  processesCount: number;
}