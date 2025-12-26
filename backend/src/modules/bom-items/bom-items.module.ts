import { Module } from '@nestjs/common';
import { BOMItemsController } from './bom-items.controller';
import { BOMItemsService } from './bom-items.service';
import { FileStorageService } from './services/file-storage.service';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { LoggerModule } from '../../common/logger/logger.module';

@Module({
  imports: [SupabaseModule, LoggerModule],
  controllers: [BOMItemsController],
  providers: [BOMItemsService, FileStorageService],
  exports: [BOMItemsService],
})
export class BOMItemsModule {}
