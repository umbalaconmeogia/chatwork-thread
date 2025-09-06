#!/usr/bin/env node

import { Command } from 'commander';
import { ConfigManager } from '../core/config/ConfigManager';
import { DatabaseManager } from '../core/database/DatabaseManager';

// Import commands
import { CreateCommand } from './commands/CreateCommand';
import { ListCommand } from './commands/ListCommand';
import { ShowCommand } from './commands/ShowCommand';
import { AddMessageCommand } from './commands/AddMessageCommand';
import { DelMessageCommand } from './commands/DelMessageCommand';
import { MigrateCommand } from './commands/MigrateCommand';

async function main(): Promise<void> {
  try {
    // Initialize configuration
    const config = ConfigManager.getInstance();
    const dbConfig = config.getConfig().database;
    
    // Initialize database manager
    const dbManager = new DatabaseManager(dbConfig.path);
    
    // Create CLI program
    const program = new Command();
    
    program
      .name('chatwork-thread')
      .description('Chatwork Thread Tool - Display Chatwork content in thread format')
      .version('1.0.0');

    // Register commands
    MigrateCommand.register(program, dbManager);
    CreateCommand.register(program, dbManager);
    ListCommand.register(program, dbManager);
    ShowCommand.register(program, dbManager);
    AddMessageCommand.register(program, dbManager);
    DelMessageCommand.register(program, dbManager);

    // Add global options
    program
      .option('--debug', 'Enable debug output')
      .option('--config <path>', 'Config file path');

    // Handle global options
    program.hook('preAction', (thisCommand) => {
      const options = thisCommand.opts();
      if (options.debug) {
        process.env.LOG_LEVEL = 'debug';
        console.log('🐛 Debug mode enabled');
      }
    });

    // Add help examples
    program.on('--help', () => {
      console.log('\nExamples:');
      console.log('  $ chatwork-thread create 1234567890 --name "API Discussion"');
      console.log('  $ chatwork-thread create "https://www.chatwork.com/#!rid368838329-2015782344493105152"');
      console.log('  $ chatwork-thread list --limit 10');
      console.log('  $ chatwork-thread show 1 --format json');
      console.log('  $ chatwork-thread add-message 1 9876543210 --type reply');
      console.log('  $ chatwork-thread del-message 1 9876543210 --force');
      console.log('');
      console.log('Environment Variables:');
      console.log('  CHATWORK_API_TOKEN    Chatwork API token (required)');
      console.log('  DATABASE_PATH         Database file path (default: ./data/chatwork-thread.db)');
      console.log('  LOG_LEVEL            Logging level (default: info)');
      console.log('');
      console.log('Configuration:');
      console.log('  Copy env.example to .env and set your Chatwork API token');
    });

    // Parse command line arguments
    await program.parseAsync(process.argv);
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('CHATWORK_API_TOKEN')) {
      console.error('❌ Configuration Error:', error.message);
      console.log('\n💡 Setup Instructions:');
      console.log('1. Copy env.example to .env');
      console.log('2. Set your CHATWORK_API_TOKEN in .env file');
      console.log('3. Get your API token from: https://www.chatwork.com/service/packages/chatwork/subpackages/api/apply_beta.php');
    } else {
      console.error('❌ Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the CLI
if (require.main === module) {
  main();
}

export default main;
