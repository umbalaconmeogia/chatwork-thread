import { Umzug } from 'umzug';
import { Database } from 'better-sqlite3';
import { readdirSync } from 'fs';
import { join } from 'path';

export class UmzugMigrationManager {
  private umzug: Umzug;
  private db: Database;
  private migrationsPath: string;

  constructor(db: Database, migrationsPath: string) {
    this.db = db;
    this.migrationsPath = migrationsPath;
    this.umzug = this.createUmzug();
  }

  private createUmzug(): Umzug {
    // Get migration files
    const migrationFiles = this.getMigrationFiles();
    console.log(`🔍 Looking for migrations in: ${this.migrationsPath}`);
    console.log(`📋 Found ${migrationFiles.length} migration files:`, migrationFiles.map(f => f.name));

    // Create migrations array
    const migrations = migrationFiles.map(file => {
      const migrationPath = join(this.migrationsPath, file.name);
      console.log(`🔍 Loading migration: ${file.name.replace('.js', '')} from ${migrationPath}`);
      
      // Load migration module
      const migrationModule = require(migrationPath);
      console.log(`🔍 Migration ${file.name.replace('.js', '')} exports:`, Object.keys(migrationModule));
      
      return {
        name: file.name.replace('.js', ''),
        path: migrationPath,
        up: migrationModule.up,
        down: migrationModule.down
      };
    });

    return new Umzug({
      migrations: migrations,
      context: this.db,
      storage: {
        logMigration: ({ name }: { name: string }) => {
          console.log(`📝 Logging migration: ${name}`);
          this.db.prepare('INSERT OR IGNORE INTO umzug_meta (name) VALUES (?)').run(name);
        },
        unlogMigration: ({ name }: { name: string }) => {
          console.log(`🗑️ Unlogging migration: ${name}`);
          this.db.prepare('DELETE FROM umzug_meta WHERE name = ?').run(name);
        },
        executed: () => {
          const rows = this.db.prepare('SELECT name FROM umzug_meta ORDER BY name').all() as any[];
          console.log(`📋 Executed migrations: ${rows.map(r => r.name).join(', ')}`);
          return rows.map(row => row.name);
        }
      },
      logger: {
        info: (message: any) => console.log(`ℹ️ ${message}`),
        warn: (message: any) => console.log(`⚠️ ${message}`),
        error: (message: any) => console.log(`❌ ${message}`),
        debug: (message: any) => console.log(`🐛 ${message}`)
      },
    });
  }

  private getMigrationFiles(): { name: string; path: string }[] {
    try {
      const files = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.js'))
        .sort()
        .map(file => ({
          name: file,
          path: join(this.migrationsPath, file)
        }));
      
      return files;
    } catch (error) {
      console.error('❌ Error reading migration files:', error);
      return [];
    }
  }

  async setup(): Promise<void> {
    console.log('🔧 Setting up migration system...');
    
    // Create umzug_meta table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS umzug_meta (
        name TEXT PRIMARY KEY
      )
    `);

    await this.applyAllPendingMigrations();
  }

  async applyAllPendingMigrations(): Promise<void> {
    console.log('🔄 Applying pending migrations...');
    
    const pendingMigrations = await this.umzug.pending();
    console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration: ${migration.name}`);
        await this.umzug.up({ migrations: [migration.name] });
        console.log(`✅ Migration ${migration.name} applied successfully`);
      } catch (error) {
        console.error(`❌ Migration failed: ${error}`);
        throw error;
      }
    }
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
    }
  }

  async getMigrationStatus(): Promise<any[]> {
    const executed = await this.umzug.executed();
    const pending = await this.umzug.pending();
    
    return [
      ...executed.map(m => ({ name: m.name, status: 'executed' })),
      ...pending.map(m => ({ name: m.name, status: 'pending' }))
    ];
  }

  async teardown(): Promise<void> {
    console.log('🔄 Rolling back all migrations...');
    await this.umzug.down({ to: 0 as any });
    console.log('✅ All migrations rolled back');
  }

  async reset(): Promise<void> {
    console.log('🔄 Resetting migration system...');
    await this.teardown();
    await this.setup();
    console.log('✅ Migration system reset complete');
  }
}
