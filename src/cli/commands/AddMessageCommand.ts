import { Command } from 'commander';
import { ConfigManager } from '../../core/config/ConfigManager';
import { ChatworkAPI } from '../../core/api/ChatworkAPI';
import { DatabaseManager } from '../../core/database/DatabaseManager';
import { ThreadAnalyzer } from '../../core/analyzer/ThreadAnalyzer';
import { RelationshipType } from '../../core/types/chatwork';

interface AddMessageOptions {
  type?: RelationshipType;
  roomId?: string;
}

export class AddMessageCommand {
  private config: ConfigManager;
  private api: ChatworkAPI;
  private threadAnalyzer: ThreadAnalyzer;

  constructor(dbManager: DatabaseManager) {
    this.config = ConfigManager.getInstance();
    
    const apiConfig = this.config.getConfig().api;
    this.api = new ChatworkAPI(apiConfig.token, apiConfig);
    
    this.threadAnalyzer = new ThreadAnalyzer(dbManager, this.api);
  }

  async execute(threadId: string, messageIdOrUrl: string, options: AddMessageOptions): Promise<void> {
    try {
      console.log(`➕ Adding message to thread ${threadId}...`);
      
      // Validate input
      if (!threadId || !messageIdOrUrl) {
        throw new Error('Thread ID and message ID/URL are required');
      }

      // Parse thread ID
      const id = parseInt(threadId);
      if (isNaN(id) || id < 1) {
        throw new Error('Thread ID must be a positive number');
      }

      // Initialize database
      await this.threadAnalyzer.dbManager.initialize();

      // Check if thread exists
      const thread = await this.threadAnalyzer.dbManager.getThread(id);
      if (!thread) {
        console.error(`❌ Thread ${id} not found`);
        process.exit(1);
      }

      // Add message to thread
      const relationshipType = options.type || 'manual';
      
      await this.threadAnalyzer.addMessageToThread(
        id,
        messageIdOrUrl,
        options.roomId,
        relationshipType
      );

      console.log('✅ Message added to thread successfully!');
      
      // Show updated thread info
      const messages = await this.threadAnalyzer.dbManager.getThreadMessages(id);
      console.log(`📊 Thread "${thread.name}" now has ${messages.length} messages`);
      
      // Show the added message
      const allMessages = await this.threadAnalyzer.dbManager.getThreadMessages(id);
      const sortedMessages = allMessages.sort((a, b) => b.send_time - a.send_time);
      const newestMessage = sortedMessages[0];
      
      if (newestMessage) {
        const date = new Date(newestMessage.send_time * 1000).toLocaleString();
        const preview = newestMessage.content.length > 100 
          ? newestMessage.content.substring(0, 100) + '...' 
          : newestMessage.content;
        
        console.log(`\n📨 Added message:`);
        console.log(`👤 ${newestMessage.sender_name} | ⏰ ${date}`);
        console.log(`💬 ${preview}`);
      }

      console.log(`\n💡 Use 'chatwork-thread show ${id}' to view full thread content`);
      
    } catch (error) {
      console.error('❌ Failed to add message to thread:', error);
      process.exit(1);
    }
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const addMessageCommand = new AddMessageCommand(dbManager);
    
    program
      .command('add-message <thread-id> <message-id-or-url>')
      .description('Add message to existing thread')
      .option('-t, --type <type>', 'Relationship type (reply, quote, manual)', 'manual')
      .option('-r, --room-id <room-id>', 'Room ID (auto-detected from URL)')
      .action(async (threadId: string, messageIdOrUrl: string, options: AddMessageOptions) => {
        // Validate relationship type
        const validTypes: RelationshipType[] = ['reply', 'quote', 'manual', 'root'];
        if (options.type && !validTypes.includes(options.type)) {
          console.error(`❌ Invalid relationship type: ${options.type}`);
          console.error(`Valid types: ${validTypes.join(', ')}`);
          process.exit(1);
        }
        
        await addMessageCommand.execute(threadId, messageIdOrUrl, options);
      });
  }
}
