import { Command } from 'commander';
import { ConfigManager } from '../../core/config/ConfigManager';
import { ChatworkAPI } from '../../core/api/ChatworkAPI';
import { DatabaseManager } from '../../core/database/DatabaseManager';
import { ThreadAnalyzer, MessageAlreadyExistsError } from '../../core/analyzer/ThreadAnalyzer';

interface CreateOptions {
  name?: string;
  description?: string;
  roomId?: string;
  maxDepth?: string;
  forceDouble?: boolean;
}

export class CreateCommand {
  private config: ConfigManager;
  private api: ChatworkAPI;
  private threadAnalyzer: ThreadAnalyzer;

  constructor(dbManager: DatabaseManager) {
    this.config = ConfigManager.getInstance();
    
    const apiConfig = this.config.getConfig().api;
    this.api = new ChatworkAPI(apiConfig.token, apiConfig);
    
    this.threadAnalyzer = new ThreadAnalyzer(dbManager, this.api);
  }

  async execute(messageIdOrUrl: string, options: CreateOptions): Promise<void> {
    try {
      console.log('🧵 Creating thread from message...');
      
      // Validate input
      if (!messageIdOrUrl) {
        throw new Error('Message ID or URL is required');
      }

      // Parse options
      const maxDepth = options.maxDepth ? parseInt(options.maxDepth) : 10;
      
      if (isNaN(maxDepth) || maxDepth < 1) {
        throw new Error('Max depth must be a positive number');
      }

      // Initialize database
      await this.threadAnalyzer.dbManager.initialize();

      // Create thread
      const thread = await this.threadAnalyzer.analyzeAndCreateThread(
        messageIdOrUrl,
        options.roomId,
        {
          name: options.name,
          description: options.description,
          maxDepth,
          forceDouble: options.forceDouble
        }
      );

      // Get thread messages for display
      const messages = await this.threadAnalyzer.dbManager.getThreadMessages(thread.id);

      console.log('\n✅ Thread created successfully!');
      console.log(`📋 Thread ID: ${thread.id}`);
      console.log(`📝 Thread Name: ${thread.name}`);
      if (thread.description) {
        console.log(`📄 Description: ${thread.description}`);
      }
      console.log(`📊 Messages found: ${messages.length}`);
      
      // Show first few messages
      if (messages.length > 0) {
        console.log('\n📨 Messages in thread:');
        messages.slice(0, 5).forEach((msg, index) => {
          const date = new Date(msg.send_time * 1000).toLocaleString();
          const preview = msg.content.length > 100 
            ? msg.content.substring(0, 100) + '...' 
            : msg.content;
          console.log(`  ${index + 1}. [${date}] ${msg.sender_name}: ${preview}`);
        });
        
        if (messages.length > 5) {
          console.log(`  ... and ${messages.length - 5} more messages`);
        }
      }

      console.log(`\n💡 Use 'chatwork-thread show ${thread.id}' to view full thread content`);
      
    } catch (error) {
      if (error instanceof MessageAlreadyExistsError) {
        console.error('❌ Error:', error.message);
        console.log('💡 Use --force-double flag to create thread anyway');
        process.exit(1);
      } else {
        console.error('❌ Failed to create thread:', error);
        process.exit(1);
      }
    }
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const createCommand = new CreateCommand(dbManager);
    
    program
      .command('create <message-id-or-url>')
      .description('Create thread from message ID or Chatwork URL')
      .option('-n, --name <name>', 'Thread name')
      .option('-d, --description <description>', 'Thread description')
      .option('-r, --room-id <room-id>', 'Room ID (auto-detected from URL)')
      .option('--max-depth <number>', 'Maximum analysis depth (default: 10)', '10')
      .option('--force-double', 'Allow creating thread with message that exists in other threads')
      .action(async (messageIdOrUrl: string, options: CreateOptions) => {
        await createCommand.execute(messageIdOrUrl, options);
      });
  }
}
