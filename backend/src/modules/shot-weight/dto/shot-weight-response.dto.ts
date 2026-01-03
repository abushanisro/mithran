import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShotWeightResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'User ID who created the calculation' })
  userId: string;

  @ApiProperty({ description: 'Calculation name' })
  calculationName: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @ApiProperty({ description: 'Material grade' })
  materialGrade: string;

  // Material Properties
  @ApiProperty({ description: 'Material density in kg/m^3' })
  density: number;

  @ApiPropertyOptional({ description: 'Density unit' })
  densityUnit?: string;

  // Part Information
  @ApiProperty({ description: 'Part volume in mm^3' })
  volume: number;

  @ApiPropertyOptional({ description: 'Volume unit' })
  volumeUnit?: string;

  @ApiProperty({ description: 'Part weight in grams' })
  partWeight: number;

  @ApiPropertyOptional({ description: 'Part weight unit' })
  partWeightUnit?: string;

  @ApiPropertyOptional({ description: 'Volume source' })
  volumeSource?: string;

  // Cavity Information
  @ApiProperty({ description: 'Number of cavities' })
  numberOfCavities: number;

  @ApiPropertyOptional({ description: 'Cavity source' })
  cavitySource?: string;

  // Runner Information
  @ApiProperty({ description: 'Runner diameter in mm' })
  runnerDiameter: number;

  @ApiProperty({ description: 'Runner length per part in mm' })
  runnerLengthPerPart: number;

  @ApiProperty({ description: 'Runner projected area per part in mm^2' })
  runnerProjectedAreaPerPart: number;

  @ApiProperty({ description: 'Runner projected volume per part in mm^3' })
  runnerProjectedVolumePerPart: number;

  @ApiProperty({ description: 'Runner weight per part in grams' })
  runnerWeightPerPart: number;

  @ApiPropertyOptional({ description: 'Runner source' })
  runnerSource?: string;

  // Calculated Results
  @ApiProperty({ description: 'Total shot weight in grams' })
  totalShotWeight: number;

  @ApiProperty({ description: 'Total part weight (part weight * cavities)' })
  totalPartWeight: number;

  @ApiProperty({ description: 'Total runner weight (runner weight * cavities)' })
  totalRunnerWeight: number;

  @ApiProperty({ description: 'Runner to part ratio as percentage' })
  runnerToPartRatio: number;

  // Optional: Sprue and Cold Slug
  @ApiPropertyOptional({ description: 'Include sprue' })
  includeSprue?: boolean;

  @ApiPropertyOptional({ description: 'Sprue diameter in mm' })
  sprueDiameter?: number;

  @ApiPropertyOptional({ description: 'Sprue length in mm' })
  sprueLength?: number;

  @ApiPropertyOptional({ description: 'Sprue weight in grams' })
  sprueWeight?: number;

  @ApiPropertyOptional({ description: 'Cold slug weight in grams' })
  coldSlugWeight?: number;

  @ApiPropertyOptional({ description: 'Total shot weight with sprue and cold slug' })
  totalShotWeightWithSprue?: number;

  // Metadata
  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class ShotWeightListResponseDto {
  @ApiProperty({ description: 'List of shot weight calculations', type: [ShotWeightResponseDto] })
  data: ShotWeightResponseDto[];

  @ApiProperty({ description: 'Total number of records' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
