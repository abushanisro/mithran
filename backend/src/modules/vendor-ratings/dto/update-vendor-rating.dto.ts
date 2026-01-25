import { PartialType } from '@nestjs/mapped-types';
import { CreateVendorRatingDto } from './create-vendor-rating.dto';

export class UpdateVendorRatingDto extends PartialType(CreateVendorRatingDto) {}