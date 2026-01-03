import { Module } from '@nestjs/common';
import { CalculatorsController } from './calculators.controller';
import { CalculatorsService } from './calculators.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { Logger } from '../../common/logger/logger.service';

@Module({
  controllers: [CalculatorsController],
  providers: [CalculatorsService, SupabaseService, Logger],
  exports: [CalculatorsService],
})
export class CalculatorsModule {}
