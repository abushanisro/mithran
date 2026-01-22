import { Module } from '@nestjs/common';
import { SupplierEvaluationController } from './supplier-evaluation.controller';
import { SupplierEvaluationService } from './supplier-evaluation.service';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { LoggerModule } from '../../common/logger/logger.module';

@Module({
  imports: [SupabaseModule, LoggerModule],
  controllers: [SupplierEvaluationController],
  providers: [SupplierEvaluationService],
  exports: [SupplierEvaluationService],
})
export class SupplierEvaluationModule {}
