import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { LoggerModule } from '../../common/logger/logger.module';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Module({
  imports: [
    HttpModule,
    LoggerModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, SupabaseService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
