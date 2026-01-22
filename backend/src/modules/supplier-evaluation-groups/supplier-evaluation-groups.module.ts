import { Module } from '@nestjs/common';
import { SupplierEvaluationGroupsController } from './supplier-evaluation-groups.controller';
import { SupplierEvaluationGroupsService } from './supplier-evaluation-groups.service';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { LoggerModule } from '../../common/logger/logger.module';

@Module({
  imports: [SupabaseModule, LoggerModule],
  controllers: [SupplierEvaluationGroupsController],
  providers: [SupplierEvaluationGroupsService],
  exports: [SupplierEvaluationGroupsService],
})
export class SupplierEvaluationGroupsModule {}