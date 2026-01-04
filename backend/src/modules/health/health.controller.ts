/**
 * Health Check Controller
 *
 * Provides health check endpoints for monitoring and ops:
 * - Database connectivity
 * - Table existence verification
 * - Basic query execution test
 *
 * Following industry best practices for health checks
 */

import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { HealthCheckService, HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { SupabaseHealthIndicator } from './indicators/supabase.health';
import { Response } from 'express';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly supabaseIndicator: SupabaseHealthIndicator,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Overall health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.supabaseIndicator.isHealthy('supabase'),
    ]);
  }

  @Get('/db')
  @ApiOperation({ summary: 'Database health check with table verification' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  @HealthCheck()
  checkDatabase(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.supabaseIndicator.checkDatabase('database'),
    ]);
  }
}

/**
 * Handles common browser requests that shouldn't trigger errors
 */
@Controller()
export class CommonRoutesController {
  /**
   * Favicon handler - prevents 404 errors in logs
   * Returns 204 No Content (standard for missing favicons)
   */
  @Get('favicon.ico')
  @ApiExcludeEndpoint()
  getFavicon(@Res() res: Response) {
    res.status(204).end();
  }

  /**
   * Root API info endpoint
   * Provides basic service information
   */
  @Get('api/v1')
  @ApiOperation({ summary: 'API service information' })
  @ApiResponse({
    status: 200,
    description: 'API information',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            service: { type: 'string', example: 'mithran API Gateway' },
            version: { type: 'string', example: '1.0.0' },
            apiVersion: { type: 'string', example: 'v1' },
            documentation: { type: 'string', example: '/api/docs' },
            health: { type: 'string', example: '/health' },
            timestamp: { type: 'string', example: '2026-01-03T18:37:00.000Z' },
          },
        },
      },
    },
  })
  getApiInfo() {
    return {
      service: 'mithran API Gateway',
      version: '1.0.0',
      apiVersion: 'v1',
      documentation: '/api/docs',
      health: '/health',
      endpoints: {
        mhr: '/api/v1/mhr',
        lsr: '/api/v1/lsr',
        processes: '/api/v1/processes',
        rawMaterials: '/api/v1/raw-materials',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
