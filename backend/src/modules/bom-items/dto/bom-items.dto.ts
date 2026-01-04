import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsNumber, IsEnum, Min, IsIn, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export enum BOMItemType {
  ASSEMBLY = 'assembly',
  SUB_ASSEMBLY = 'sub_assembly',
  CHILD_PART = 'child_part',
}

/**
 * Custom validator to ensure unit_cost is only set when make_buy is 'buy'
 */
function IsUnitCostValidForMakeBuy(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUnitCostValidForMakeBuy',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          // If make_buy is 'make', unit_cost must be 0 or undefined
          if (obj.makeBuy === 'make' && value && value !== 0) {
            return false;
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return 'unit_cost can only be non-zero when make_buy is set to "buy"';
        },
      },
    });
  };
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

  @ApiPropertyOptional({ example: 'make', description: 'Make or buy decision: make (manufacturing) or buy (purchasing)' })
  @IsOptional()
  @IsIn(['make', 'buy'])
  makeBuy?: string;

  @ApiPropertyOptional({ example: 1250.50, description: 'Unit cost in INR for purchased parts (when makeBuy is buy)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @IsUnitCostValidForMakeBuy()
  unitCost?: number;

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

  @ApiPropertyOptional({ example: 'material-uuid', description: 'Link to material from materials database' })
  @IsOptional()
  @IsUUID()
  materialId?: string;
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}
