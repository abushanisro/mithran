import { IsOptional, IsUUID, IsEnum, IsDateString, IsNumberString, Min, IsInt, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { RatingType } from '../entities/vendor-rating.entity';
import { VendorClassification, RiskLevel, PerformanceTrend } from '../entities/vendor-rating-aggregate.entity';

export class VendorRatingQueryDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;

  @IsOptional()
  @IsEnum(RatingType)
  ratingType?: RatingType;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  minRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  maxRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;
}

export class VendorRatingAggregateQueryDto {
  @IsOptional()
  @IsEnum(VendorClassification)
  classification?: VendorClassification;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsEnum(PerformanceTrend)
  performanceTrend?: PerformanceTrend;

  @IsOptional()
  @IsNumberString()
  minOverallRating?: string;

  @IsOptional()
  @IsNumberString()
  maxOverallRating?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  minTotalRatings?: number;

  @IsOptional()
  @IsString()
  search?: string; // Search by vendor name

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'avgOverallRating';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}