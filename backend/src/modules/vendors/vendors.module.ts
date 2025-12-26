import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { LoggerModule } from '../../common/logger/logger.module';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Module({
  imports: [
    HttpModule,
    LoggerModule,
  ],
  controllers: [VendorsController],
  providers: [VendorsService, SupabaseService],
  exports: [VendorsService],
})
export class VendorsModule {}
