import { Module } from '@nestjs/common';
import { BOMsController } from './boms.controller';
import { BOMsService } from './boms.service';
import { BomItemCostService } from '../bom-items/services/bom-item-cost.service';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { LoggerModule } from '../../common/logger/logger.module';

@Module({
  imports: [SupabaseModule, LoggerModule],
  controllers: [BOMsController],
  providers: [BOMsService, BomItemCostService],
  exports: [BOMsService],
})
export class BOMsModule {}
