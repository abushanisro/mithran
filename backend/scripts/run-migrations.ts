#!/usr/bin/env ts-node

/**
 * Database Migration Runner
 *
 * Executes SQL migrations against the PostgreSQL/Supabase database.
 * Maintains a migrations table to track which migrations have been applied.
 *
 * Usage:
 *   npm run migrate        - Run all pending migrations
 *   npm run migrate:reset  - Drop all tables and re-run migrations (DESTRUCTIVE)
 */

import { Pool, PoolClient } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

interface Migration {
  filename: string;
  sql: string;
}

class MigrationRunner {
  private pool: Pool;
  private migrationsDir: string;

  constructor() {
    this.migrationsDir = join(__dirname, '../migrations');

    // Create connection pool
    this.pool = new Pool({
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    });

    this.pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  /**
   * Ensure the migrations tracking table exists
   */
  private async ensureMigrationsTable(client: PoolClient): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await client.query(query);
    console.log(' Migrations tracking table ready');
  }

  /**
   * Get list of already executed migrations
   */
  private async getExecutedMigrations(client: PoolClient): Promise<string[]> {
    const result = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    return result.rows.map(row => row.filename);
  }

  /**
   * Load migration files from disk
   */
  private loadMigrationFiles(): Migration[] {
    const files = readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensure migrations run in order

    return files.map(filename => ({
      filename,
      sql: readFileSync(join(this.migrationsDir, filename), 'utf-8'),
    }));
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(
    client: PoolClient,
    migration: Migration
  ): Promise<void> {
    console.log(`\n📄 Running migration: ${migration.filename}`);

    try {
      // Execute the migration SQL
      await client.query(migration.sql);

      // Record the migration as executed
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [migration.filename]
      );

      console.log(`✅ Completed: ${migration.filename}`);
    } catch (error) {
      console.error(`❌ Failed: ${migration.filename}`);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    const client = await this.pool.connect();

    try {
      console.log('🚀 Starting migration process...\n');
      console.log('📊 Database:', process.env.DATABASE_NAME);
      console.log('🏠 Host:', process.env.DATABASE_HOST);
      console.log('');

      // Start transaction
      await client.query('BEGIN');

      // Ensure migrations table exists
      await this.ensureMigrationsTable(client);

      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations(client);
      console.log(` Found ${executedMigrations.length} previously executed migration(s)`);

      // Load migration files
      const allMigrations = this.loadMigrationFiles();
      console.log(` Found ${allMigrations.length} total migration file(s)`);

      // Filter pending migrations
      const pendingMigrations = allMigrations.filter(
        m => !executedMigrations.includes(m.filename)
      );

      if (pendingMigrations.length === 0) {
        console.log('\n✨ Database is up to date - no migrations to run');
        await client.query('COMMIT');
        return;
      }

      console.log(`\n⏳ Running ${pendingMigrations.length} pending migration(s)...`);

      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(client, migration);
      }

      // Commit transaction
      await client.query('COMMIT');

      console.log('\n✅ All migrations completed successfully!');

    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('\n❌ Migration failed - all changes rolled back');
      console.error('Error details:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reset database - DROP all tables and re-run migrations
   * ⚠️ DESTRUCTIVE - USE WITH CAUTION
   */
  async resetDatabase(): Promise<void> {
    const client = await this.pool.connect();

    try {
      console.log('⚠️  WARNING: This will DROP all tables and data!');
      console.log('🗑️  Dropping all tables...\n');

      await client.query('BEGIN');

      // Drop all tables in public schema
      const dropTablesQuery = `
        DO $$ DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
        END $$;
      `;

      await client.query(dropTablesQuery);
      console.log('✅ All tables dropped');

      await client.query('COMMIT');

      // Re-run migrations
      await this.runMigrations();

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n❌ Reset failed');
      console.error('Error details:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, current_database() as db_name');
      console.log('✅ Database connection successful');
      console.log('   Database:', result.rows[0].db_name);
      console.log('   Server Time:', result.rows[0].current_time);
      client.release();
    } catch (error) {
      console.error('❌ Database connection failed');
      throw error;
    }
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Main execution
async function main() {
  const runner = new MigrationRunner();
  const command = process.argv[2] || 'migrate';

  try {
    // Test connection first
    await runner.testConnection();
    console.log('');

    switch (command) {
      case 'migrate':
        await runner.runMigrations();
        break;

      case 'reset':
        await runner.resetDatabase();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Available commands: migrate, reset');
        process.exit(1);
    }

    await runner.close();
    process.exit(0);

  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    await runner.close();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default MigrationRunner;
