import { IsUUID, IsOptional, IsInt, Min, Max, IsString, IsBoolean, IsEnum, IsDateString, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';
import { RatingType } from '../entities/vendor-rating.entity';

export class CreateVendorRatingDto {
  @IsUUID()
  vendorId: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsString()
  userEmail: string;

  // Rating Categories (1-5 scale)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  qualityRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  deliveryRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  costRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  serviceRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  communicationRating?: number;

  // Additional evaluation fields
  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  wouldRecommend?: boolean;

  @IsOptional()
  @IsNumberString()
  contractValue?: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsDateString()
  actualDeliveryDate?: string;

  @IsEnum(RatingType)
  ratingType: RatingType = RatingType.PROJECT_COMPLETION;
}