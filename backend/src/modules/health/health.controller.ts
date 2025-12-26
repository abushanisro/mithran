import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const checks = [];

    // Only check projects-service if URL is configured
    const projectsServiceUrl = this.configService.get('PROJECTS_SERVICE_URL');
    if (projectsServiceUrl) {
      checks.push(() =>
        this.http.pingCheck(
          'projects-service',
          `${projectsServiceUrl}/health`,
        ),
      );
    }

    // If no checks configured, return basic health status
    if (checks.length === 0) {
      return {
        status: 'ok',
        info: {
          'api-gateway': {
            status: 'up',
          },
        },
        error: {},
        details: {
          'api-gateway': {
            status: 'up',
          },
        },
      };
    }

    return this.health.check(checks);
  }
}
