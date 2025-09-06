import { Command } from 'commander';
import { DatabaseManager } from '../../core/database/DatabaseManager';

interface MigrateOptions {
  check?: boolean;
  reset?: boolean;
  verbose?: boolean;
}

export class MigrateCommand {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  async execute(options: MigrateOptions): Promise<void> {
    try {
      if (options.check) {
        await this.checkMigrations();
      } else if (options.reset) {
        await this.resetDatabase();
      } else {
        await this.runMigrations(options.verbose);
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  private async checkMigrations(): Promise<void> {
    console.log('🔍 Checking migration status...');
    
    // Just initialize database connection without running migrations
    await this.dbManager.initializeWithoutMigrations();
    
    const pending = await this.dbManager.getPendingMigrations();
    const executed = await this.dbManager.getExecutedMigrations();
    
    console.log(`✅ Executed migrations: ${executed.length}`);
    if (executed.length > 0) {
      executed.forEach(name => console.log(`  ✓ ${name}`));
    }
    
    if (pending.length > 0) {
      console.log(`⚠️  Pending migrations: ${pending.length}`);
      pending.forEach(name => console.log(`  ⏳ ${name}`));
      console.log('\n💡 Run "chatwork-thread migrate" to apply pending migrations');
      process.exit(1);
    } else {
      console.log('✅ Database is up to date');
    }
  }

  private async runMigrations(verbose = false): Promise<void> {
    console.log('🔄 Running database migrations...');
    
    if (!verbose) {
      // Suppress verbose migration logs
      await this.dbManager.initializeWithMigrations({ silent: true });
    } else {
      await this.dbManager.initializeWithMigrations({ silent: false });
    }
    
    console.log('✅ All migrations completed successfully');
  }

  private async resetDatabase(): Promise<void> {
    console.log('⚠️  Resetting database (this will delete all data)...');
    
    // TODO: Add confirmation prompt in interactive mode
    await this.dbManager.resetDatabase();
    await this.runMigrations();
    
    console.log('✅ Database reset and migrations applied');
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const migrateCommand = new MigrateCommand(dbManager);

    program
      .command('migrate')
      .description('Manage database migrations')
      .option('--check', 'Check migration status without running')
      .option('--reset', 'Reset database and run all migrations')
      .option('--verbose', 'Show detailed migration logs')
      .action(async (options: MigrateOptions) => {
        await migrateCommand.execute(options);
      });
  }
}
