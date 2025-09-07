import { Command } from 'commander';
import { ConfigManager } from '../../core/config/ConfigManager';
import { ChatworkAPI } from '../../core/api/ChatworkAPI';
import { DatabaseManager } from '../../core/database/DatabaseManager';
import { ThreadAnalyzer } from '../../core/analyzer/ThreadAnalyzer';

interface RefreshOptions {
  roomId?: string;
  autoDetect?: boolean;
}

export class RefreshCommand {
  private config: ConfigManager;
  private api: ChatworkAPI;
  private threadAnalyzer: ThreadAnalyzer;

  constructor(dbManager: DatabaseManager) {
    this.config = ConfigManager.getInstance();
    
    const apiConfig = this.config.getConfig().api;
    this.api = new ChatworkAPI(apiConfig.token, apiConfig);
    
    this.threadAnalyzer = new ThreadAnalyzer(dbManager, this.api);
  }

  async execute(threadId: string, options: RefreshOptions): Promise<void> {
    try {
      console.log(`🔄 Refreshing thread ${threadId} with new messages...`);
      
      // Validate input
      if (!threadId) {
        throw new Error('Thread ID is required');
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

      // Get current messages in thread to determine room ID
      const currentMessages = await this.threadAnalyzer.dbManager.getThreadMessages(id);
      if (currentMessages.length === 0) {
        console.error(`❌ Thread ${id} has no messages - cannot determine room ID`);
        process.exit(1);
      }

      // Get room ID from existing messages or use provided room ID
      let roomId = options.roomId;
      if (!roomId) {
        // Use room ID from the first message in thread
        roomId = currentMessages[0].room_id;
        console.log(`📡 Auto-detected room ID: ${roomId}`);
      }

      // Get current message IDs in thread
      const currentMessageIds = new Set(currentMessages.map(msg => msg.id));
      const messageCount = currentMessages.length;

      console.log(`📊 Current thread has ${messageCount} messages`);
      console.log(`🔍 Fetching latest messages from room ${roomId}...`);

      // Fetch all messages from room (force=1 to get latest)
      const allMessages = await this.api.getMessages(roomId, true);
      
      // Save all messages to database (new ones will be inserted, existing ones updated)
      let savedCount = 0;
      for (const message of allMessages) {
        await this.threadAnalyzer.dbManager.saveMessage(message);
        savedCount++;
      }
      console.log(`💾 Processed ${savedCount} messages from Chatwork`);

      // Find messages that are related to existing thread messages but not yet in thread
      const newRelatedMessages: Array<{ message: any; relationshipType: string }> = [];
      
      for (const message of allMessages) {
        // Skip if message is already in thread
        if (currentMessageIds.has(message.id)) {
          continue;
        }

        // Check if this message is related to any existing thread message
        let isRelated = false;
        let relationshipType = 'manual';

        for (const threadMessage of currentMessages) {
          // Check if new message replies to thread message
          const referencedIds = this.threadAnalyzer.extractMessageIds(message.content);
          if (referencedIds.includes(threadMessage.id)) {
            isRelated = true;
            relationshipType = this.threadAnalyzer.detectRelationshipType(message.content);
            break;
          }

          // Check if thread message replies to new message
          const threadReferencedIds = this.threadAnalyzer.extractMessageIds(threadMessage.content);
          if (threadReferencedIds.includes(message.id)) {
            isRelated = true;
            relationshipType = 'referenced'; // This message was referenced by thread message
            break;
          }
        }

        if (isRelated) {
          newRelatedMessages.push({ message, relationshipType });
        }
      }

      // Add new related messages to thread
      let addedCount = 0;
      for (const { message, relationshipType } of newRelatedMessages) {
        try {
          await this.threadAnalyzer.dbManager.addMessageToThread(
            id, 
            message.id, 
            relationshipType as any
          );
          addedCount++;
        } catch (error) {
          console.warn(`⚠️  Failed to add message ${message.id}: ${error}`);
        }
      }

      // Note: Thread's updated_at timestamp is automatically updated by addMessageToThread

      console.log('\n✅ Thread refresh completed!');
      console.log(`📈 Added ${addedCount} new related messages to thread`);
      
      // Show updated thread info
      const updatedMessages = await this.threadAnalyzer.dbManager.getThreadMessages(id);
      const newMessageCount = updatedMessages.length;
      console.log(`📊 Thread "${thread.name}" now has ${newMessageCount} messages (was ${messageCount})`);
      
      if (addedCount > 0) {
        console.log('\n📨 Newly added messages:');
        const sortedNewMessages = newRelatedMessages
          .sort((a, b) => a.message.send_time - b.message.send_time)
          .slice(0, 5); // Show first 5 new messages
        
        sortedNewMessages.forEach((item, index) => {
          const date = new Date(item.message.send_time * 1000).toLocaleString();
          const preview = item.message.content.length > 100 
            ? item.message.content.substring(0, 100) + '...' 
            : item.message.content;
          console.log(`  ${index + 1}. [${date}] ${item.message.sender_name}: ${preview}`);
        });
        
        if (newRelatedMessages.length > 5) {
          console.log(`  ... and ${newRelatedMessages.length - 5} more messages`);
        }
      } else {
        console.log('🎯 No new related messages found');
      }

      console.log(`\n💡 Use 'chatwork-thread show ${id}' to view updated thread content`);
      
    } catch (error) {
      console.error('❌ Failed to refresh thread:', error);
      process.exit(1);
    }
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const refreshCommand = new RefreshCommand(dbManager);
    
    program
      .command('refresh <thread-id>')
      .description('Refresh thread with new messages from Chatwork')
      .option('-r, --room-id <room-id>', 'Room ID (auto-detected from existing messages if not provided)')
      .option('--auto-detect', 'Automatically detect room ID from thread messages (default behavior)')
      .action(async (threadId: string, options: RefreshOptions) => {
        await refreshCommand.execute(threadId, options);
      });
  }
}
