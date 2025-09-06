import { Command } from 'commander';
import { DatabaseManager } from '../../core/database/DatabaseManager';

interface ListOptions {
  limit?: string;
  sort?: 'name' | 'created' | 'updated';
  search?: string;
}

export class ListCommand {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  async execute(options: ListOptions): Promise<void> {
    try {
      console.log('📋 Listing all threads...');
      
      // Initialize database
      await this.dbManager.initialize();

      // Parse options
      const limit = options.limit ? parseInt(options.limit) : 20;
      
      if (isNaN(limit) || limit < 1) {
        throw new Error('Limit must be a positive number');
      }

      // Get threads
      const threads = await this.dbManager.getAllThreads(limit);

      if (threads.length === 0) {
        console.log('📭 No threads found. Create your first thread with: chatwork-thread create <message-id>');
        return;
      }

      // Filter by search if provided
      let filteredThreads = threads;
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        filteredThreads = threads.filter(thread => 
          thread.name.toLowerCase().includes(searchTerm) ||
          (thread.description && thread.description.toLowerCase().includes(searchTerm))
        );
      }

      // Sort threads
      if (options.sort) {
        filteredThreads.sort((a, b) => {
          switch (options.sort) {
            case 'name':
              return a.name.localeCompare(b.name);
            case 'created':
              return b.created_at.getTime() - a.created_at.getTime();
            case 'updated':
            default:
              return b.updated_at.getTime() - a.updated_at.getTime();
          }
        });
      }

      // Display results
      console.log(`\n📊 Found ${filteredThreads.length} thread(s):`);
      console.log('─'.repeat(80));

      for (const thread of filteredThreads) {
        const createdDate = thread.created_at.toLocaleDateString();
        const updatedDate = thread.updated_at.toLocaleDateString();
        
        console.log(`🧵 ID: ${thread.id}`);
        console.log(`📝 Name: ${thread.name}`);
        
        if (thread.description) {
          const desc = thread.description.length > 60 
            ? thread.description.substring(0, 60) + '...' 
            : thread.description;
          console.log(`📄 Description: ${desc}`);
        }
        
        console.log(`📅 Created: ${createdDate} | Updated: ${updatedDate}`);
        
        // Get message count
        try {
          const messages = await this.dbManager.getThreadMessages(thread.id);
          console.log(`📊 Messages: ${messages.length}`);
        } catch (error) {
          console.log('📊 Messages: Unable to count');
        }
        
        console.log('─'.repeat(40));
      }

      console.log(`\n💡 Use 'chatwork-thread show <thread-id>' to view thread content`);
      
    } catch (error) {
      console.error('❌ Failed to list threads:', error);
      process.exit(1);
    }
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const listCommand = new ListCommand(dbManager);
    
    program
      .command('list')
      .description('List all threads')
      .option('-l, --limit <number>', 'Limit number of results (default: 20)', '20')
      .option('-s, --sort <field>', 'Sort by field (name, created, updated)', 'updated')
      .option('--search <keyword>', 'Search threads by name or description')
      .action(async (options: ListOptions) => {
        await listCommand.execute(options);
      });
  }
}
