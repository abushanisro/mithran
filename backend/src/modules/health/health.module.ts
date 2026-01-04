import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController, CommonRoutesController } from './health.controller';
import { SupabaseHealthIndicator } from './indicators/supabase.health';
import { SupabaseModule } from '../../common/supabase/supabase.module';

@Module({
  imports: [TerminusModule, HttpModule, SupabaseModule],
  controllers: [HealthController, CommonRoutesController],
  providers: [SupabaseHealthIndicator],
})
export class HealthModule {}
