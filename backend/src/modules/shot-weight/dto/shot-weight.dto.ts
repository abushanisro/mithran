import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateShotWeightDto {
  @ApiProperty({ description: 'Calculation name for reference' })
  @IsString()
  @IsNotEmpty()
  calculationName: string;

  @ApiPropertyOptional({ description: 'Description of the calculation' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Material grade (e.g., ABS, PP, PC)' })
  @IsString()
  @IsNotEmpty()
  materialGrade: string;

  // Material Properties
  @ApiProperty({ description: 'Material density in kg/m^3', example: 1040 })
  @IsNumber()
  @Min(0)
  density: number;

  @ApiPropertyOptional({ description: 'Density unit', default: 'kg/m3' })
  @IsString()
  @IsOptional()
  densityUnit?: string;

  // Part Information
  @ApiProperty({ description: 'Part volume in mm^3', example: 95000 })
  @IsNumber()
  @Min(0)
  volume: number;

  @ApiPropertyOptional({ description: 'Volume unit', default: 'mm3' })
  @IsString()
  @IsOptional()
  volumeUnit?: string;

  @ApiProperty({ description: 'Part weight in grams', example: 98.8 })
  @IsNumber()
  @Min(0)
  partWeight: number;

  @ApiPropertyOptional({ description: 'Part weight unit', default: 'grams' })
  @IsString()
  @IsOptional()
  partWeightUnit?: string;

  @ApiPropertyOptional({ description: 'Volume source: cad or manual', example: 'cad' })
  @IsString()
  @IsOptional()
  @IsIn(['cad', 'manual'])
  volumeSource?: string;

  // Cavity Information
  @ApiProperty({ description: 'Number of cavities in the mold', default: 1 })
  @IsNumber()
  @Min(1)
  numberOfCavities: number;

  @ApiPropertyOptional({ description: 'Cavity source: lookup or manual', example: 'manual' })
  @IsString()
  @IsOptional()
  @IsIn(['lookup', 'manual'])
  cavitySource?: string;

  // Runner Information
  @ApiProperty({ description: 'Runner diameter in mm', example: 7 })
  @IsNumber()
  @Min(0)
  runnerDiameter: number;

  @ApiProperty({ description: 'Runner length per part in mm', example: 125 })
  @IsNumber()
  @Min(0)
  runnerLengthPerPart: number;

  @ApiPropertyOptional({ description: 'Runner source: lookup or manual', example: 'manual' })
  @IsString()
  @IsOptional()
  @IsIn(['lookup', 'manual'])
  runnerSource?: string;

  // Optional: Sprue and Cold Slug
  @ApiPropertyOptional({ description: 'Include sprue in calculation', default: false })
  @IsBoolean()
  @IsOptional()
  includeSprue?: boolean;

  @ApiPropertyOptional({ description: 'Sprue diameter in mm' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  sprueDiameter?: number;

  @ApiPropertyOptional({ description: 'Sprue length in mm' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  sprueLength?: number;

  @ApiPropertyOptional({ description: 'Cold slug weight in grams' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  coldSlugWeight?: number;
}

export class UpdateShotWeightDto extends PartialType(CreateShotWeightDto) {}

export class QueryShotWeightDto {
  @ApiPropertyOptional({ description: 'Search term for calculation name or material grade' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by material grade' })
  @IsString()
  @IsOptional()
  materialGrade?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'created_at' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order: asc or desc', default: 'desc' })
  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string;
}
