import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoggerModule } from '../../common/logger/logger.module';
import { SupabaseModule } from '../../common/supabase/supabase.module';

@Module({
  imports: [LoggerModule, SupabaseModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
