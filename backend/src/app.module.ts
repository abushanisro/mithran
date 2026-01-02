import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { BOMsModule } from './modules/boms/boms.module';
import { BOMItemsModule } from './modules/bom-items/bom-items.module';
import { ProcessesModule } from './modules/processes/processes.module';
import { ProcessRoutesModule } from './modules/process-routes/process-routes.module';
import { ProcessTemplatesModule } from './modules/process-templates/process-templates.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { RawMaterialsModule } from './modules/raw-materials/raw-materials.module';
import { MHRModule } from './modules/mhr/mhr.module';
import { LSRModule } from './modules/lsr/lsr.module';
import { HealthModule } from './modules/health/health.module';
import { LoggerModule } from './common/logger/logger.module';
import { SupabaseService } from './common/supabase/supabase.service';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL', 60000),
            limit: config.get('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),

    LoggerModule,
    AuthModule,
    ProjectsModule,
    VendorsModule,
    BOMsModule,
    BOMItemsModule,
    ProcessesModule,
    ProcessRoutesModule,
    ProcessTemplatesModule,
    MaterialsModule,
    RawMaterialsModule,
    MHRModule,
    LSRModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    SupabaseService,
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
  ],
})
export class AppModule {}
