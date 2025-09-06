import { DatabaseManager } from '../database/DatabaseManager';
import { ChatworkAPI } from '../api/ChatworkAPI';
import { 
  Message, 
  Thread, 
  RelationshipType, 
  MessageAnalysisResult,
  ThreadAnalysisResult 
} from '../types/chatwork';

export class ThreadAnalysisError extends Error {
  constructor(message: string, public messageId?: string) {
    super(message);
    this.name = 'ThreadAnalysisError';
  }
}

export class MessageAlreadyExistsError extends Error {
  constructor(messageId: string, public threadIds: number[]) {
    super(`Message ${messageId} already exists in threads: ${threadIds.join(', ')}`);
    this.name = 'MessageAlreadyExistsError';
  }
}

export class ThreadAnalyzer {
  private db: DatabaseManager;
  private api: ChatworkAPI;

  constructor(db: DatabaseManager, api: ChatworkAPI) {
    this.db = db;
    this.api = api;
  }

  // Getter to expose DatabaseManager for CLI commands
  get dbManager(): DatabaseManager {
    return this.db;
  }

  // Parse Chatwork URL to extract message ID and room ID
  parseChatworkUrl(url: string): { roomId: string; messageId: string } | null {
    const parsed = ChatworkAPI.parseMessageIdFromUrl(url);
    return parsed;
  }

  // Check if message already exists in any thread
  async checkMessageExists(messageId: string): Promise<{ exists: boolean; threadIds: number[] }> {
    try {
      return await this.db.checkMessageInThreads(messageId);
    } catch (error) {
      throw new ThreadAnalysisError(`Failed to check message existence: ${error}`, messageId);
    }
  }

  // Analyze and create thread from root message
  async analyzeAndCreateThread(
    messageIdOrUrl: string,
    roomId?: string,
    options: {
      name?: string;
      description?: string;
      maxDepth?: number;
      forceDouble?: boolean;
    } = {}
  ): Promise<Thread> {
    try {
      // Parse input to get message ID and room ID
      let finalRoomId = roomId;
      let messageId = messageIdOrUrl;

      if (ChatworkAPI.isValidChatworkUrl(messageIdOrUrl)) {
        const parsed = this.parseChatworkUrl(messageIdOrUrl);
        if (!parsed) {
          throw new ThreadAnalysisError('Invalid Chatwork URL format', messageIdOrUrl);
        }
        finalRoomId = parsed.roomId;
        messageId = parsed.messageId;
      }

      if (!finalRoomId) {
        throw new ThreadAnalysisError('Room ID is required', messageId);
      }

      // Check if message already exists in threads
      if (!options.forceDouble) {
        const existsCheck = await this.checkMessageExists(messageId);
        if (existsCheck.exists) {
          throw new MessageAlreadyExistsError(messageId, existsCheck.threadIds);
        }
      }

      // Fetch root message
      const rootMessage = await this.api.getMessage(finalRoomId, messageId);
      await this.db.saveMessage(rootMessage);

      // Fetch all messages from room for analysis
      const allMessages = await this.api.getMessages(finalRoomId, true); // force=1
      
      // Save all messages to database
      for (const message of allMessages) {
        await this.db.saveMessage(message);
      }

      // Find related messages
      const relatedMessages = this.findRelatedMessagesBidirectional(messageId, allMessages);

      // Use transaction for thread creation and message linking
      const thread = this.db.executeInTransaction(() => {
        // Create thread
        const threadName = options.name || `Thread: ${rootMessage.content.substring(0, 50)}...`;
        const newThread = this.db.createThreadSync(threadName, options.description);

        // Add root message to thread
        this.db.addMessageToThreadSync(newThread.id, messageId, 'root');

        // Add related messages to thread
        for (const message of relatedMessages) {
          if (message.id !== messageId) { // Don't add root message again
            const relationshipType = this.detectRelationshipType(message.content);
            this.db.addMessageToThreadSync(newThread.id, message.id, relationshipType);
          }
        }

        return newThread;
      });
      
      // Debug: Check thread_messages after transaction
      try {
        const afterQuery = await this.db.checkMessageInThreads('dummy');
        console.log(`🔍 Debug: Transaction completed, database accessible`);
      } catch (e) {
        console.log(`🔍 Debug: Post-transaction issue: ${e}`);
      }

      return thread;
    } catch (error) {
      if (error instanceof MessageAlreadyExistsError || error instanceof ThreadAnalysisError) {
        throw error;
      }
      throw new ThreadAnalysisError(`Failed to analyze and create thread: ${error}`, messageIdOrUrl);
    }
  }

  // Find related messages bidirectionally using iterative expansion
  findRelatedMessagesBidirectional(messageId: string, allMessages: Message[]): Message[] {
    const relatedMessages = new Set<Message>();
    const rootMessage = allMessages.find(m => m.id === messageId);
    
    if (!rootMessage) return [];
    
    // Start with root message
    relatedMessages.add(rootMessage);
    let previousSize = 0;
    
    // Iterative expansion: scan all messages repeatedly until no new relationships found
    while (relatedMessages.size > previousSize) {
      previousSize = relatedMessages.size;
      
      // Scan all messages to find relationships with current set
      for (const message of allMessages) {
        if (relatedMessages.has(message)) continue;
        
        // Check if this message is related to any message in current set
        let isRelated = false;
        for (const relatedMsg of relatedMessages) {
          if (this.areMessagesRelated(message, relatedMsg) || 
              this.areMessagesRelated(relatedMsg, message)) {
            isRelated = true;
            break;
          }
        }
        
        if (isRelated) {
          relatedMessages.add(message);
        }
      }
    }
    
    return Array.from(relatedMessages);
  }

  // Check if two messages are related (one replies to/quotes the other)
  private areMessagesRelated(message1: Message, message2: Message): boolean {
    const messageIds1 = this.extractMessageIds(message1.content);
    return messageIds1.includes(message2.id);
  }

  // Find messages that the given message replies to
  private findPreviousMessages(message: Message, allMessages: Message[]): Message[] {
    const previousMessages: Message[] = [];
    const messageIds = this.extractMessageIds(message.content);
    
    for (const id of messageIds) {
      const prevMessage = allMessages.find(m => m.id === id && m.send_time < message.send_time);
      if (prevMessage) {
        previousMessages.push(prevMessage);
      }
    }
    
    return previousMessages;
  }

  // Find messages that reply to the given message
  private findSubsequentMessages(message: Message, allMessages: Message[]): Message[] {
    return allMessages.filter(m => 
      m.send_time > message.send_time && 
      this.extractMessageIds(m.content).includes(message.id)
    );
  }

  // Find related messages recursively
  private findRelatedMessagesRecursive(
    message: Message, 
    allMessages: Message[], 
    foundMessages: Set<Message>
  ): Message[] {
    const relatedMessages: Message[] = [];
    
    // Find messages related to this message
    const messageIds = this.extractMessageIds(message.content);
    
    for (const id of messageIds) {
      const relatedMessage = allMessages.find(m => m.id === id);
      if (relatedMessage && !foundMessages.has(relatedMessage)) {
        relatedMessages.push(relatedMessage);
      }
    }
    
    return relatedMessages;
  }

  // Extract message IDs from message content
  extractMessageIds(content: string): string[] {
    const messageIds: string[] = [];
    
    // Find message ID patterns in content
    // Examples: "返信: 1234567890", "引用: 9876543210", etc.
    const patterns = [
      /返信[：:]\s*(\d+)/g,
      /引用[：:]\s*(\d+)/g,
      /message[：:]\s*(\d+)/g,
      /msg[：:]\s*(\d+)/g,
      /\[To:(\d+)\]/g,
      /\[picon:(\d+)\]/g,
      /\[reply\s+time=\d+\s+to=(\d+)\]/g,
      // Chatwork specific patterns
      /\[rp\s+aid=\d+\s+to=\d+-(\d+)\]/g,     // [rp aid=xxx to=roomid-messageid]
      /\[qt\]\[qtmeta\s+aid=\d+\s+time=\d+\s+to=\d+-(\d+)\]/g,  // [qt][qtmeta aid=xxx time=xxx to=roomid-messageid]
      /rid\d+-(\d+)/g,                        // rid409502735-2016140743370084352
      /to=\d+-(\d+)/g                         // to=409502735-2016140743370084352
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        messageIds.push(match[1]);
      }
    }
    
    return [...new Set(messageIds)]; // Remove duplicates
  }

  // Detect relationship type based on content
  detectRelationshipType(content: string): RelationshipType {
    if (content.includes('返信') || content.includes('[reply')) return 'reply';
    if (content.includes('引用') || content.includes('[To:')) return 'quote';
    return 'manual';
  }

  // Add message to existing thread
  async addMessageToThread(
    threadId: number,
    messageIdOrUrl: string,
    roomId?: string,
    relationshipType: RelationshipType = 'manual'
  ): Promise<void> {
    try {
      // Parse input
      let finalRoomId = roomId;
      let messageId = messageIdOrUrl;

      if (ChatworkAPI.isValidChatworkUrl(messageIdOrUrl)) {
        const parsed = this.parseChatworkUrl(messageIdOrUrl);
        if (!parsed) {
          throw new ThreadAnalysisError('Invalid Chatwork URL format', messageIdOrUrl);
        }
        finalRoomId = parsed.roomId;
        messageId = parsed.messageId;
      }

      if (!finalRoomId) {
        throw new ThreadAnalysisError('Room ID is required', messageId);
      }

      // Fetch and save message
      const message = await this.api.getMessage(finalRoomId, messageId);
      await this.db.saveMessage(message);

      // Add to thread
      await this.db.addMessageToThread(threadId, messageId, relationshipType);
    } catch (error) {
      throw new ThreadAnalysisError(`Failed to add message to thread: ${error}`, messageIdOrUrl);
    }
  }
}
