import { Command } from 'commander';
import { DatabaseManager } from '../../core/database/DatabaseManager';

interface DelMessageOptions {
  force?: boolean;
}

export class DelMessageCommand {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  async execute(threadId: string, messageId: string, options: DelMessageOptions): Promise<void> {
    try {
      console.log(`🗑️ Removing message from thread ${threadId}...`);
      
      // Validate input
      if (!threadId || !messageId) {
        throw new Error('Thread ID and message ID are required');
      }

      // Parse thread ID
      const id = parseInt(threadId);
      if (isNaN(id) || id < 1) {
        throw new Error('Thread ID must be a positive number');
      }

      // Initialize database
      await this.dbManager.initialize();

      // Check if thread exists
      const thread = await this.dbManager.getThread(id);
      if (!thread) {
        console.error(`❌ Thread ${id} not found`);
        process.exit(1);
      }

      // Check if message exists in thread
      const messages = await this.dbManager.getThreadMessages(id);
      const messageExists = messages.some(msg => msg.id === messageId);
      
      if (!messageExists) {
        console.error(`❌ Message ${messageId} not found in thread ${id}`);
        process.exit(1);
      }

      // Get message info for confirmation
      const message = await this.dbManager.getMessage(messageId);
      if (message) {
        const date = new Date(message.send_time * 1000).toLocaleString();
        const preview = message.content.length > 50 
          ? message.content.substring(0, 50) + '...' 
          : message.content;
        
        console.log(`\n📨 Message to remove:`);
        console.log(`👤 ${message.sender_name} | ⏰ ${date}`);
        console.log(`💬 ${preview}`);
      }

      // Confirmation prompt (unless --force)
      if (!options.force) {
        console.log(`\n⚠️ Are you sure you want to remove this message from thread "${thread.name}"?`);
        console.log('This action cannot be undone.');
        console.log('Use --force flag to skip this confirmation.');
        
        // In a real CLI, you'd prompt for user input here
        // For now, we'll require --force flag
        console.error('❌ Confirmation required. Use --force flag to proceed.');
        process.exit(1);
      }

      // Remove message from thread
      await this.dbManager.removeMessageFromThread(id, messageId);

      console.log('✅ Message removed from thread successfully!');
      
      // Show updated thread info
      const updatedMessages = await this.dbManager.getThreadMessages(id);
      console.log(`📊 Thread "${thread.name}" now has ${updatedMessages.length} messages`);

      console.log(`\n💡 Use 'chatwork-thread show ${id}' to view updated thread content`);
      
    } catch (error) {
      console.error('❌ Failed to remove message from thread:', error);
      process.exit(1);
    }
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const delMessageCommand = new DelMessageCommand(dbManager);
    
    program
      .command('del-message <thread-id> <message-id>')
      .description('Remove message from thread')
      .option('--force', 'Skip confirmation prompt')
      .action(async (threadId: string, messageId: string, options: DelMessageOptions) => {
        await delMessageCommand.execute(threadId, messageId, options);
      });
  }
}
