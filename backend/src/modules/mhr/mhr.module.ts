import { Module } from '@nestjs/common';
import { MHRController } from './mhr.controller';
import { MHRService } from './mhr.service';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { LoggerModule } from '../../common/logger/logger.module';

@Module({
  imports: [SupabaseModule, LoggerModule],
  controllers: [MHRController],
  providers: [MHRService],
  exports: [MHRService],
})
export class MHRModule {}
