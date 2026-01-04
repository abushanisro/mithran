import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { SupabaseService } from '../../../common/supabase/supabase.service';

@Injectable()
export class SupabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  /**
   * Check if Supabase is healthy
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.supabaseService.getAdminClient();
      const { error } = await client.from('mhr').select('count').limit(1);

      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }

      return this.getStatus(key, true, { message: 'Supabase is healthy' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HealthCheckError(
        'Supabase health check failed',
        this.getStatus(key, false, { message }),
      );
    }
  }

  /**
   * Check database connectivity and verify tables exist
   */
  async checkDatabase(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.supabaseService.getAdminClient();

      // Check if key tables exist by querying them
      const tables = ['mhr', 'lsr', 'raw_materials', 'processes'];
      const results: Record<string, boolean> = {};

      for (const table of tables) {
        const { error } = await client.from(table).select('count').limit(1);
        results[table] = !error;
      }

      const allTablesExist = Object.values(results).every((exists) => exists);

      if (!allTablesExist) {
        const missingTables = Object.entries(results)
          .filter(([_, exists]) => !exists)
          .map(([table]) => table);

        throw new Error(
          `Missing or inaccessible tables: ${missingTables.join(', ')}`,
        );
      }

      return this.getStatus(key, true, {
        message: 'Database is healthy',
        tables: results,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HealthCheckError(
        'Database health check failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
