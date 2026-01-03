import { Module } from '@nestjs/common';
import { ShotWeightController } from './shot-weight.controller';
import { ShotWeightService } from './shot-weight.service';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { LoggerModule } from '../../common/logger/logger.module';

@Module({
  imports: [SupabaseModule, LoggerModule],
  controllers: [ShotWeightController],
  providers: [ShotWeightService],
  exports: [ShotWeightService],
})
export class ShotWeightModule {}
