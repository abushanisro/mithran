import { IsString, IsUUID, IsOptional, IsEnum, IsNumber, IsArray, IsBoolean, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NominationType {
  OEM = 'oem',
  MANUFACTURER = 'manufacturer',
  HYBRID = 'hybrid'
}

export enum NominationStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum VendorType {
  OEM = 'oem',
  MANUFACTURER = 'manufacturer',
  HYBRID = 'hybrid'
}

export enum Recommendation {
  APPROVED = 'approved',
  CONDITIONAL = 'conditional',
  REJECTED = 'rejected',
  PENDING = 'pending'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class BomPartDto {
  @ApiProperty()
  @IsUUID()
  bomItemId: string;

  @ApiProperty()
  @IsString()
  bomItemName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  material?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  vendorIds: string[];
}

export class CreateSupplierNominationDto {
  @ApiProperty()
  @IsString()
  nominationName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: NominationType })
  @IsEnum(NominationType)
  nominationType: NominationType;

  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  evaluationGroupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rfqTrackingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vendorIds?: string[];

  @ApiPropertyOptional({ type: [BomPartDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomPartDto)
  bomParts?: BomPartDto[];
}

export class CreateCriteriaDto {
  @ApiProperty()
  @IsString()
  criteriaName: string;

  @ApiProperty()
  @IsString()
  criteriaCategory: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  weightPercentage: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}

export class UpdateVendorEvaluationDto {
  @ApiPropertyOptional({ enum: VendorType })
  @IsOptional()
  @IsEnum(VendorType)
  vendorType?: VendorType;

  @ApiPropertyOptional({ enum: Recommendation })
  @IsOptional()
  @IsEnum(Recommendation)
  recommendation?: Recommendation;

  @ApiPropertyOptional({ enum: RiskLevel })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  riskMitigationPercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minorNcCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  majorNcCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  capabilityPercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  technicalFeasibilityScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evaluationNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technicalDiscussion?: string;
}

export class CreateEvaluationScoreDto {
  @ApiProperty()
  @IsUUID()
  criteriaId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  score: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidenceText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessorNotes?: string;
}

// Response DTOs
export class NominationCriteriaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  criteriaName: string;

  @ApiProperty()
  criteriaCategory: string;

  @ApiProperty()
  weightPercentage: number;

  @ApiProperty()
  maxScore: number;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  isMandatory: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class EvaluationScoreDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  criteriaId: string;

  @ApiProperty()
  score: number;

  @ApiProperty()
  maxPossibleScore: number;

  @ApiProperty()
  weightedScore: number;

  @ApiPropertyOptional()
  evidenceText?: string;

  @ApiPropertyOptional()
  assessorNotes?: string;

  @ApiProperty()
  assessedAt: Date;
}

export class VendorEvaluationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  vendorId: string;

  @ApiProperty({ enum: VendorType })
  vendorType: VendorType;

  @ApiProperty()
  overallScore: number;

  @ApiPropertyOptional()
  overallRank?: number;

  @ApiPropertyOptional({ enum: Recommendation })
  recommendation?: Recommendation;

  @ApiProperty({ enum: RiskLevel })
  riskLevel: RiskLevel;

  @ApiProperty()
  riskMitigationPercentage: number;

  @ApiProperty()
  minorNcCount: number;

  @ApiProperty()
  majorNcCount: number;

  @ApiProperty()
  capabilityPercentage: number;

  @ApiProperty()
  technicalFeasibilityScore: number;

  @ApiPropertyOptional()
  evaluationNotes?: string;

  @ApiPropertyOptional()
  technicalDiscussion?: string;

  @ApiProperty({ type: [EvaluationScoreDto] })
  scores: EvaluationScoreDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SupplierNominationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nominationName: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: NominationType })
  nominationType: NominationType;

  @ApiProperty()
  projectId: string;

  @ApiPropertyOptional()
  evaluationGroupId?: string;

  @ApiPropertyOptional()
  rfqTrackingId?: string;

  @ApiProperty({ enum: NominationStatus })
  status: NominationStatus;

  @ApiProperty({ type: [NominationCriteriaDto] })
  criteria: NominationCriteriaDto[];

  @ApiProperty({ type: [VendorEvaluationDto] })
  vendorEvaluations: VendorEvaluationDto[];

  @ApiPropertyOptional({ type: [BomPartDto] })
  bomParts?: BomPartDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  approvedBy?: string;
}

export class SupplierNominationSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nominationName: string;

  @ApiProperty({ enum: NominationType })
  nominationType: NominationType;

  @ApiProperty({ enum: NominationStatus })
  status: NominationStatus;

  @ApiProperty()
  vendorCount: number;

  @ApiProperty()
  completionPercentage: number;

  @ApiPropertyOptional()
  bomPartsCount?: number;

  @ApiProperty()
  createdAt: Date;
}