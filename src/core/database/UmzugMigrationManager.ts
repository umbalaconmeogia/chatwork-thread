import { Umzug, UmzugOptions } from 'umzug';
import Database from 'better-sqlite3';
import path from 'path';

// Custom storage for better-sqlite3
class SQLiteStorage {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.initializeTable();
  }

  private initializeTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS umzug_meta (
        name TEXT PRIMARY KEY,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async executed(): Promise<string[]> {
    const stmt = this.db.prepare('SELECT name FROM umzug_meta ORDER BY executed_at ASC');
    const rows = stmt.all() as { name: string }[];
    return rows.map(row => row.name);
  }

  async logMigration(name: string): Promise<void> {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO umzug_meta (name) VALUES (?)');
    stmt.run(name);
  }

  async unlogMigration(name: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM umzug_meta WHERE name = ?');
    stmt.run(name);
  }
}

export interface MigrationContext {
  db: Database.Database;
}

export class UmzugMigrationManager {
  private umzug: Umzug<MigrationContext>;
  private db: Database.Database;

  constructor(db: Database.Database, migrationsPath: string) {
    this.db = db;
    
    console.log(`🔍 Looking for migrations in: ${migrationsPath}`);
    
    // Check if migrations directory exists
    const fs = require('fs');
    if (!fs.existsSync(migrationsPath)) {
      console.log(`⚠️ Migrations directory not found: ${migrationsPath}`);
      // Create empty migrations array
      this.umzug = new Umzug({
        migrations: [],
        context: { db },
        storage: new SQLiteStorage(db),
        logger: console
      });
      return;
    }
    
    // List migration files
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter((file: string) => file.endsWith('.js'))
      .sort();
    
    console.log(`📋 Found ${migrationFiles.length} migration files:`, migrationFiles);
    
    // Create migrations array manually
    const migrations = migrationFiles.map(file => {
      const migrationPath = path.join(migrationsPath, file);
      const name = file.replace('.js', '');
      
      console.log(`🔍 Loading migration: ${name} from ${migrationPath}`);
      
      try {
        const migration = require(migrationPath);
        console.log(`🔍 Migration ${name} exports:`, Object.keys(migration));
        return {
          name,
          up: async (context: MigrationContext) => {
            if (migration.up && typeof migration.up === 'function') {
              await migration.up(context);
            } else {
              console.error(`❌ Migration ${name} does not have valid up function`);
            }
          },
          down: async (context: MigrationContext) => {
            if (migration.down && typeof migration.down === 'function') {
              await migration.down(context);
            } else {
              console.error(`❌ Migration ${name} does not have valid down function`);
            }
          }
        };
      } catch (error) {
        console.error(`❌ Error loading migration ${name}:`, error);
        throw error;
      }
    });

    const options: UmzugOptions<MigrationContext> = {
      migrations,
      context: { db },
      storage: new SQLiteStorage(db),
      logger: console
    };

    this.umzug = new Umzug(options);
  }

  async getAppliedMigrations(): Promise<string[]> {
    return await this.umzug.executed();
  }

  async getPendingMigrations(): Promise<string[]> {
    const pending = await this.umzug.pending();
    return pending.map(m => m.name);
  }

  async applyAllPendingMigrations(): Promise<boolean> {
    try {
      console.log('🔄 Applying pending migrations...');
      const pending = await this.umzug.pending();
      
      if (pending.length === 0) {
        console.log('✅ No pending migrations');
        return true;
      }

      console.log(`📋 Found ${pending.length} pending migrations`);
      
      for (const migration of pending) {
        console.log(`Applying migration: ${migration.name}`);
        await migration.up({ db: this.db });
        console.log(`✅ Migration ${migration.name} applied successfully`);
      }

      console.log('🎉 All migrations applied successfully');
      return true;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }
  }

  async rollbackMigration(migrationName: string): Promise<boolean> {
    try {
      console.log(`🔄 Rolling back migration: ${migrationName}`);
      await this.umzug.down({ to: migrationName });
      console.log(`✅ Migration ${migrationName} rolled back successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to rollback migration ${migrationName}:`, error);
      return false;
    }
  }

  async rollbackToMigration(migrationName: string): Promise<boolean> {
    try {
      console.log(`🔄 Rolling back to migration: ${migrationName}`);
      await this.umzug.down({ to: migrationName });
      console.log(`✅ Rolled back to migration ${migrationName} successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to rollback to migration ${migrationName}:`, error);
      return false;
    }
  }

  async getMigrationStatus(): Promise<any> {
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();
    
    return {
      applied: applied.length,
      pending: pending.length,
      appliedMigrations: applied,
      pendingMigrations: pending
    };
  }

  async printMigrationStatus(): Promise<void> {
    const status = await this.getMigrationStatus();
    
    console.log('📋 Migration Status:');
    console.log(`   Applied: ${status.applied}`);
    console.log(`   Pending: ${status.pending}`);
    
    if (status.appliedMigrations.length > 0) {
      console.log(`   Applied migrations: ${status.appliedMigrations.join(', ')}`);
    }
    
    if (status.pendingMigrations.length > 0) {
      console.log(`   Pending migrations: ${status.pendingMigrations.join(', ')}`);
    }
  }

  // Setup/Teardown methods
  async setup(): Promise<void> {
    console.log('🔧 Setting up migration system...');
    // Umzug doesn't have built-in setup, but we can create our own
    await this.applyAllPendingMigrations();
  }

  async teardown(): Promise<void> {
    console.log('🧹 Tearing down migration system...');
    // Rollback all migrations
    const applied = await this.getAppliedMigrations();
    for (const migration of applied.reverse()) {
      await this.rollbackMigration(migration);
    }
  }

  async reset(): Promise<void> {
    console.log('🔄 Resetting database...');
    await this.teardown();
    await this.setup();
  }
}
