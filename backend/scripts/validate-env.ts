#!/usr/bin/env ts-node

/**
 * Environment Validation Script
 *
 * Validates that all required environment variables are set correctly
 * and that external services (Supabase) are accessible.
 *
 * Usage:
 *   npm run env:validate
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: join(__dirname, '../.env') });

interface ValidationResult {
  category: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  }>;
}

class EnvironmentValidator {
  private results: ValidationResult[] = [];

  /**
   * Validate required environment variables
   */
  private validateEnvVars(): ValidationResult {
    const result: ValidationResult = {
      category: 'Environment Variables',
      checks: [],
    };

    const requiredVars = [
      { name: 'NODE_ENV', example: 'development' },
      { name: 'PORT', example: '4000' },
      { name: 'DATABASE_HOST', example: 'your-project.supabase.co' },
      { name: 'DATABASE_PORT', example: '6543' },
      { name: 'DATABASE_USER', example: 'postgres' },
      { name: 'DATABASE_PASSWORD', example: 'your-password' },
      { name: 'DATABASE_NAME', example: 'postgres' },
      { name: 'SUPABASE_URL', example: 'https://your-project.supabase.co' },
      { name: 'SUPABASE_ANON_KEY', example: 'your-anon-key' },
    ];

    for (const { name, example } of requiredVars) {
      const value = process.env[name];

      if (!value || value.trim() === '') {
        result.checks.push({
          name,
          status: 'fail',
          message: `Missing or empty. Example: ${example}`,
        });
      } else if (value.includes('your-') || value.includes('example')) {
        result.checks.push({
          name,
          status: 'warn',
          message: `Looks like a placeholder value: ${value.substring(0, 30)}...`,
        });
      } else {
        result.checks.push({
          name,
          status: 'pass',
          message: value.length > 50
            ? `${value.substring(0, 30)}...`
            : value,
        });
      }
    }

    return result;
  }

  /**
   * Validate Supabase connection
   */
  private async validateSupabase(): Promise<ValidationResult> {
    const result: ValidationResult = {
      category: 'Supabase Connection',
      checks: [],
    };

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      result.checks.push({
        name: 'Client Initialization',
        status: 'fail',
        message: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY',
      });
      return result;
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Try to query a system table
      const { error } = await supabase.from('projects').select('id').limit(1);

      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          result.checks.push({
            name: 'Supabase API',
            status: 'warn',
            message: 'Connected, but tables not found. Run migrations: npm run db:migrate',
          });
        } else {
          result.checks.push({
            name: 'Supabase API',
            status: 'fail',
            message: error.message,
          });
        }
      } else {
        result.checks.push({
          name: 'Supabase API',
          status: 'pass',
          message: 'Successfully connected',
        });
      }
    } catch (error) {
      result.checks.push({
        name: 'Supabase API',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Validate PostgreSQL direct connection
   */
  private async validatePostgres(): Promise<ValidationResult> {
    const result: ValidationResult = {
      category: 'PostgreSQL Direct Connection',
      checks: [],
    };

    const pool = new Pool({
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await pool.connect();

      result.checks.push({
        name: 'Connection',
        status: 'pass',
        message: 'Successfully connected to PostgreSQL',
      });

      // Check PostgreSQL version
      const versionResult = await client.query('SELECT version()');
      result.checks.push({
        name: 'PostgreSQL Version',
        status: 'pass',
        message: versionResult.rows[0].version.split(' ').slice(0, 2).join(' '),
      });

      // Check if tables exist
      const tablesResult = await client.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      if (tablesResult.rows.length === 0) {
        result.checks.push({
          name: 'Database Tables',
          status: 'warn',
          message: 'No tables found. Run migrations: npm run db:migrate',
        });
      } else {
        result.checks.push({
          name: 'Database Tables',
          status: 'pass',
          message: `Found ${tablesResult.rows.length} tables: ${tablesResult.rows.map((r: any) => r.tablename).join(', ')}`,
        });
      }

      client.release();
      await pool.end();

    } catch (error) {
      result.checks.push({
        name: 'Connection',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      await pool.end();
    }

    return result;
  }

  /**
   * Run all validations
   */
  async validate(): Promise<void> {
    console.log('🔍 Mithran Platform - Environment Validation\n');
    console.log('='.repeat(70));

    // Validate environment variables
    this.results.push(this.validateEnvVars());

    // Validate Supabase connection
    this.results.push(await this.validateSupabase());

    // Validate PostgreSQL connection
    this.results.push(await validatePostgres());

    // Print results
    this.printResults();

    // Exit with appropriate code
    const hasFailures = this.results.some(r =>
      r.checks.some(c => c.status === 'fail')
    );

    if (hasFailures) {
      console.log('\n❌ Validation failed - please fix the issues above\n');
      process.exit(1);
    } else {
      console.log('\n✅ All validations passed!\n');
      process.exit(0);
    }
  }

  /**
   * Print validation results
   */
  private printResults(): void {
    for (const result of this.results) {
      console.log(`\n📋 ${result.category}`);
      console.log('-'.repeat(70));

      for (const check of result.checks) {
        const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️ ' : '❌';
        console.log(`${icon} ${check.name.padEnd(25)} ${check.message}`);
      }
    }

    console.log('\n' + '='.repeat(70));
  }
}

async function main() {
  const validator = new EnvironmentValidator();
  await validator.validate();
}

if (require.main === module) {
  main();
}
