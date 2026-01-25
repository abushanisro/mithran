import { Module } from '@nestjs/common';
import { VendorRatingsController } from './vendor-ratings.controller';
import { VendorRatingsService } from './vendor-ratings.service';
import { SupabaseModule } from '../../common/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [VendorRatingsController],
  providers: [VendorRatingsService],
  exports: [VendorRatingsService]
})
export class VendorRatingsModule {}