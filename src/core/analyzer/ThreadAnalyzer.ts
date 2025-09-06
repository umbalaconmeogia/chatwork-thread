import { ChatworkAPI } from '../api/ChatworkAPI';
import { DatabaseManager } from '../database/DatabaseManager';
import { ChatworkMessage, Message, Thread } from '../types/chatwork';

export interface ThreadAnalysisResult {
  thread: Thread;
  messages: Message[];
  relatedMessages: Message[];
  analysisScore: number;
  keywords: string[];
  isComplete: boolean;
}

export interface MessageRelationship {
  messageId: string;
  relatedMessageId: string;
  relationshipType: 'reply' | 'quote' | 'mention' | 'context';
  confidence: number;
}

export class ThreadAnalyzer {
  private api: ChatworkAPI;
  private db: DatabaseManager;
  private maxMessages: number;
  private analysisTimeout: number;

  constructor(api: ChatworkAPI, db: DatabaseManager, maxMessages: number = 1000, analysisTimeout: number = 30000) {
    this.api = api;
    this.db = db;
    this.maxMessages = maxMessages;
    this.analysisTimeout = analysisTimeout;
  }

  /**
   * Analyze and create a thread from a root message
   */
  async analyzeAndCreateThread(
    roomId: number, 
    rootMessageId: string, 
    threadName?: string
  ): Promise<ThreadAnalysisResult> {
    console.log(`🔍 Analyzing thread from root message: ${rootMessageId}`);

    try {
      // Check if message already exists in a thread
      const existingThreads = this.db.getMessageThreads(rootMessageId);
      if (existingThreads.length > 0) {
        throw new Error(`Message ${rootMessageId} already exists in thread(s): ${existingThreads.map(t => t.name).join(', ')}`);
      }

      // Get root message
      const rootMessage = await this.api.getMessage(roomId, rootMessageId);
      console.log(`✅ Root message retrieved: ${rootMessage.body.substring(0, 100)}...`);

      // Save root message to database
      const cacheExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const savedRootMessage = this.db.saveMessage(rootMessage, cacheExpiresAt);

      // Get all messages from the room
      const allMessages = await this.api.getMessages(roomId);
      console.log(`📋 Retrieved ${allMessages.length} messages from room`);

      // Save all messages to database
      const savedMessages = allMessages.map(msg => {
        const cacheExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        return this.db.saveMessage(msg, cacheExpiresAt);
      });

      // Find related messages
      const relatedMessages = this.findRelatedMessages(savedRootMessage, savedMessages);
      console.log(`🔗 Found ${relatedMessages.length} related messages`);

      // Generate thread name if not provided
      const finalThreadName = threadName || this.generateThreadName(rootMessage, relatedMessages);

      // Create thread
      const thread = this.db.createThread(finalThreadName, rootMessageId);
      console.log(`✅ Thread created: ${thread.name} (ID: ${thread.id})`);

      // Add all related messages to thread
      for (const message of relatedMessages) {
        this.db.addMessageToThread(thread.id, message.id);
      }

      // Analyze relationships and keywords
      const relationships = this.analyzeRelationships(relatedMessages);
      const keywords = this.extractKeywords(relatedMessages);
      const analysisScore = this.calculateAnalysisScore(relationships, relatedMessages.length);

      // Update thread with analysis results
      this.updateThreadAnalysis(thread.id, analysisScore, keywords, relatedMessages.length);

      const result: ThreadAnalysisResult = {
        thread,
        messages: relatedMessages,
        relatedMessages,
        analysisScore,
        keywords,
        isComplete: this.isThreadComplete(relatedMessages, relationships)
      };

      console.log(`🎉 Thread analysis completed: ${relatedMessages.length} messages, score: ${analysisScore.toFixed(2)}`);
      return result;

    } catch (error) {
      console.error(`❌ Thread analysis failed:`, error.message);
      throw error;
    }
  }

  /**
   * Find messages related to the root message
   */
  private findRelatedMessages(rootMessage: Message, allMessages: Message[]): Message[] {
    const relatedMessages = new Set<string>();
    const toAnalyze = [rootMessage];
    const analyzed = new Set<string>();

    // Add root message
    relatedMessages.add(rootMessage.id);

    while (toAnalyze.length > 0 && relatedMessages.size < this.maxMessages) {
      const currentMessage = toAnalyze.shift()!;
      if (analyzed.has(currentMessage.id)) continue;
      analyzed.add(currentMessage.id);

      // Find messages that reply to current message
      const replies = this.findRepliesToMessage(currentMessage, allMessages);
      for (const reply of replies) {
        if (!relatedMessages.has(reply.id)) {
          relatedMessages.add(reply.id);
          toAnalyze.push(reply);
        }
      }

      // Find messages that current message replies to
      const parentMessages = this.findParentMessages(currentMessage, allMessages);
      for (const parent of parentMessages) {
        if (!relatedMessages.has(parent.id)) {
          relatedMessages.add(parent.id);
          toAnalyze.push(parent);
        }
      }

      // Find messages with similar content
      const similarMessages = this.findSimilarMessages(currentMessage, allMessages);
      for (const similar of similarMessages) {
        if (!relatedMessages.has(similar.id)) {
          relatedMessages.add(similar.id);
          toAnalyze.push(similar);
        }
      }
    }

    // Convert to array and sort by send_time
    const result = Array.from(relatedMessages)
      .map(id => allMessages.find(msg => msg.id === id))
      .filter((msg): msg is Message => msg !== undefined)
      .sort((a, b) => a.send_time - b.send_time);

    return result;
  }

  /**
   * Find messages that reply to a specific message
   */
  private findRepliesToMessage(message: Message, allMessages: Message[]): Message[] {
    const replies: Message[] = [];
    const messageId = message.id;
    const messageContent = message.body.toLowerCase();

    // Patterns that indicate a reply
    const replyPatterns = [
      new RegExp(`>>${messageId}`, 'g'),
      new RegExp(`>${messageId}`, 'g'),
      new RegExp(`@${messageId}`, 'g'),
      /^re:/i,
      /^返信:/i,
      /^reply:/i
    ];

    for (const msg of allMessages) {
      if (msg.id === messageId) continue;
      if (msg.send_time <= message.send_time) continue; // Only messages after

      const msgContent = msg.body.toLowerCase();
      
      // Check for direct message ID references
      if (msgContent.includes(`>>${messageId}`) || msgContent.includes(`>${messageId}`)) {
        replies.push(msg);
        continue;
      }

      // Check for reply patterns
      for (const pattern of replyPatterns) {
        if (pattern.test(msgContent)) {
          replies.push(msg);
          break;
        }
      }

      // Check for contextual replies (messages that seem to respond to the content)
      if (this.isContextualReply(messageContent, msgContent)) {
        replies.push(msg);
      }
    }

    return replies;
  }

  /**
   * Find messages that the current message replies to
   */
  private findParentMessages(message: Message, allMessages: Message[]): Message[] {
    const parents: Message[] = [];
    const messageContent = message.body.toLowerCase();

    // Extract message IDs from content
    const messageIdPattern = />>(\d+)/g;
    let match;
    while ((match = messageIdPattern.exec(messageContent)) !== null) {
      const parentId = match[1];
      const parentMessage = allMessages.find(msg => msg.id === parentId);
      if (parentMessage) {
        parents.push(parentMessage);
      }
    }

    return parents;
  }

  /**
   * Find messages with similar content
   */
  private findSimilarMessages(message: Message, allMessages: Message[]): Message[] {
    const similar: Message[] = [];
    const messageContent = message.body.toLowerCase();
    const messageKeywords = this.extractKeywordsFromText(messageContent);

    for (const msg of allMessages) {
      if (msg.id === message.id) continue;
      if (Math.abs(msg.send_time - message.send_time) > 86400) continue; // Within 24 hours

      const msgContent = msg.body.toLowerCase();
      const msgKeywords = this.extractKeywordsFromText(msgContent);

      // Calculate similarity score
      const similarity = this.calculateSimilarity(messageKeywords, msgKeywords);
      if (similarity > 0.3) { // 30% similarity threshold
        similar.push(msg);
      }
    }

    return similar;
  }

  /**
   * Check if a message is a contextual reply
   */
  private isContextualReply(originalContent: string, replyContent: string): boolean {
    // Simple heuristics for contextual replies
    const originalWords = originalContent.split(/\s+/);
    const replyWords = replyContent.split(/\s+/);

    // Check for question-answer patterns
    if (originalContent.includes('?') && !replyContent.includes('?')) {
      return true;
    }

    // Check for shared keywords
    const sharedWords = originalWords.filter(word => 
      word.length > 3 && replyWords.includes(word)
    );
    
    return sharedWords.length >= 2;
  }

  /**
   * Analyze relationships between messages
   */
  private analyzeRelationships(messages: Message[]): MessageRelationship[] {
    const relationships: MessageRelationship[] = [];

    for (let i = 0; i < messages.length; i++) {
      for (let j = i + 1; j < messages.length; j++) {
        const msg1 = messages[i];
        const msg2 = messages[j];

        // Check for direct reply
        if (this.isDirectReply(msg1, msg2)) {
          relationships.push({
            messageId: msg1.id,
            relatedMessageId: msg2.id,
            relationshipType: 'reply',
            confidence: 0.9
          });
        }

        // Check for quote
        if (this.isQuote(msg1, msg2)) {
          relationships.push({
            messageId: msg1.id,
            relatedMessageId: msg2.id,
            relationshipType: 'quote',
            confidence: 0.8
          });
        }

        // Check for mention
        if (this.isMention(msg1, msg2)) {
          relationships.push({
            messageId: msg1.id,
            relatedMessageId: msg2.id,
            relationshipType: 'mention',
            confidence: 0.7
          });
        }

        // Check for context
        if (this.isContextual(msg1, msg2)) {
          relationships.push({
            messageId: msg1.id,
            relatedMessageId: msg2.id,
            relationshipType: 'context',
            confidence: 0.5
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Check if message2 is a direct reply to message1
   */
  private isDirectReply(msg1: Message, msg2: Message): boolean {
    const msg2Content = msg2.body.toLowerCase();
    return msg2Content.includes(`>>${msg1.id}`) || msg2Content.includes(`>${msg1.id}`);
  }

  /**
   * Check if message2 quotes message1
   */
  private isQuote(msg1: Message, msg2: Message): boolean {
    const msg1Content = msg1.body.toLowerCase();
    const msg2Content = msg2.body.toLowerCase();
    
    // Check if msg2 contains significant portion of msg1
    const msg1Words = msg1Content.split(/\s+/);
    const msg2Words = msg2Content.split(/\s+/);
    
    const sharedWords = msg1Words.filter(word => 
      word.length > 3 && msg2Words.includes(word)
    );
    
    return sharedWords.length >= Math.min(5, msg1Words.length * 0.3);
  }

  /**
   * Check if message2 mentions message1
   */
  private isMention(msg1: Message, msg2: Message): boolean {
    const msg2Content = msg2.body.toLowerCase();
    return msg2Content.includes(`@${msg1.id}`) || msg2Content.includes(`#${msg1.id}`);
  }

  /**
   * Check if messages are contextually related
   */
  private isContextual(msg1: Message, msg2: Message): boolean {
    const msg1Keywords = this.extractKeywordsFromText(msg1.body.toLowerCase());
    const msg2Keywords = this.extractKeywordsFromText(msg2.body.toLowerCase());
    
    const similarity = this.calculateSimilarity(msg1Keywords, msg2Keywords);
    return similarity > 0.3;
  }

  /**
   * Extract keywords from messages
   */
  private extractKeywords(messages: Message[]): string[] {
    const allText = messages.map(msg => msg.body).join(' ');
    return this.extractKeywordsFromText(allText);
  }

  /**
   * Extract keywords from text
   */
  private extractKeywordsFromText(text: string): string[] {
    // Simple keyword extraction
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));

    // Count word frequency
    const wordCount = new Map<string, number>();
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }

    // Return top keywords
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Check if a word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
      'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'can', 'shall', 'a', 'an', 'the'
    ]);
    return stopWords.has(word);
  }

  /**
   * Calculate similarity between two sets of keywords
   */
  private calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate analysis score
   */
  private calculateAnalysisScore(relationships: MessageRelationship[], messageCount: number): number {
    if (messageCount === 0) return 0;

    const totalConfidence = relationships.reduce((sum, rel) => sum + rel.confidence, 0);
    const avgConfidence = relationships.length > 0 ? totalConfidence / relationships.length : 0;
    
    // Score based on message count and relationship confidence
    const messageScore = Math.min(messageCount / 10, 1); // Max score at 10 messages
    const relationshipScore = avgConfidence;
    
    return (messageScore + relationshipScore) / 2;
  }

  /**
   * Generate thread name from messages
   */
  private generateThreadName(rootMessage: Message, relatedMessages: Message[]): string {
    const keywords = this.extractKeywords([rootMessage, ...relatedMessages]);
    const topKeywords = keywords.slice(0, 3).join(' ');
    
    if (topKeywords) {
      return `Thread: ${topKeywords}`;
    }
    
    return `Thread: ${rootMessage.body.substring(0, 50)}...`;
  }

  /**
   * Check if thread analysis is complete
   */
  private isThreadComplete(messages: Message[], relationships: MessageRelationship[]): boolean {
    // Thread is complete if it has multiple messages with good relationships
    return messages.length > 1 && relationships.length > 0;
  }

  /**
   * Update thread with analysis results
   */
  private updateThreadAnalysis(threadId: number, analysisScore: number, keywords: string[], messageCount: number): void {
    // This would update the thread with analysis results
    // For now, we'll just log the results
    console.log(`📊 Thread ${threadId} analysis: score=${analysisScore.toFixed(2)}, keywords=[${keywords.join(', ')}], messages=${messageCount}`);
  }

  /**
   * Add a message to an existing thread
   */
  async addMessageToThread(threadId: number, roomId: number, messageId: string): Promise<boolean> {
    try {
      // Check if message already exists in thread
      const threadMessages = this.db.getThreadMessages(threadId);
      if (threadMessages.some(msg => msg.id === messageId)) {
        console.log(`⚠️ Message ${messageId} already exists in thread ${threadId}`);
        return false;
      }

      // Get message from API
      const message = await this.api.getMessage(roomId, messageId);
      
      // Save message to database
      const cacheExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      this.db.saveMessage(message, cacheExpiresAt);

      // Add to thread
      const success = this.db.addMessageToThread(threadId, messageId);
      
      if (success) {
        console.log(`✅ Message ${messageId} added to thread ${threadId}`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Failed to add message to thread:`, error.message);
      return false;
    }
  }

  /**
   * Remove a message from thread
   */
  removeMessageFromThread(threadId: number, messageId: string): boolean {
    const success = this.db.removeMessageFromThread(threadId, messageId);
    
    if (success) {
      console.log(`✅ Message ${messageId} removed from thread ${threadId}`);
    }
    
    return success;
  }
}
