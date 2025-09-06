import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { UmzugMigrationManager } from './UmzugMigrationManager';
import { 
  Message, 
  Thread, 
  ThreadMessage, 
  ChatworkUserLocal, 
  RelationshipType,
  ThreadWithMessages
} from '../types/chatwork';

export class DatabaseError extends Error {
  constructor(message: string, public operation?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseManager {
  private db: Database.Database;
  private migrationManager: UmzugMigrationManager;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    
    // Ensure directory exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Setup migration manager
    const migrationsPath = this.resolveMigrationsPath();
    this.migrationManager = new UmzugMigrationManager(this.db, migrationsPath);
  }

  private resolveMigrationsPath(): string {
    // Try to find migrations in dist directory
    const possiblePaths = [
      join(process.cwd(), 'dist/core/database/migrations'),
      join(__dirname, 'migrations'),
      join(__dirname, '../database/migrations')
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    throw new Error(`Migration path not found. Tried: ${possiblePaths.join(', ')}`);
  }

  async initialize(): Promise<void> {
    // Quick initialization with minimal logging
    await this.initializeWithoutMigrations();
    await this.checkMigrationsQuiet();
  }

  async initializeWithoutMigrations(): Promise<void> {
    // Just ensure database connection is ready
    // Migration setup was already done in constructor
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  async initializeWithMigrations(options: { silent?: boolean } = {}): Promise<void> {
    if (!options.silent) {
      console.log('🔧 Initializing database...');
      console.log('🔧 Setting up migration system...');
    }
    await this.setupMigrations();
    if (!options.silent) {
      console.log('✅ Database initialized successfully');
    }
  }

  private async checkMigrationsQuiet(): Promise<void> {
    const pending = await this.getPendingMigrations();
    if (pending.length > 0) {
      console.log(`⚠️  Database needs migration. Run: chatwork-thread migrate`);
      console.log(`   Pending migrations: ${pending.length}`);
      process.exit(1);
    }
  }

  private async setupMigrations(): Promise<void> {
    await this.migrationManager.setup();
  }

  async getPendingMigrations(): Promise<string[]> {
    return await this.migrationManager.getPendingMigrations();
  }

  async getExecutedMigrations(): Promise<string[]> {
    return await this.migrationManager.getExecutedMigrations();
  }

  async resetDatabase(): Promise<void> {
    // Close current connection
    this.db.close();
    
    // Delete database file
    const fs = require('fs');
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }
    
    // Recreate database
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    // Recreate migration manager
    const migrationsPath = this.resolveMigrationsPath();
    this.migrationManager = new UmzugMigrationManager(this.db, migrationsPath);
  }

  // Thread operations
  async createThread(name: string, description?: string): Promise<Thread> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO threads (name, description, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      const result = stmt.run(name, description || null);
      
      return {
        id: result.lastInsertRowid as number,
        name,
        description,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      throw new DatabaseError(`Failed to create thread: ${error}`, 'createThread');
    }
  }

  createThreadSync(name: string, description?: string): Thread {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO threads (name, description, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      const result = stmt.run(name, description || null);
      
      return {
        id: result.lastInsertRowid as number,
        name,
        description,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      throw new DatabaseError(`Failed to create thread: ${error}`, 'createThread');
    }
  }

  async getThread(threadId: number): Promise<Thread | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM threads WHERE id = ?');
      const row = stmt.get(threadId) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      };
    } catch (error) {
      throw new DatabaseError(`Failed to get thread: ${error}`, 'getThread');
    }
  }

  async getAllThreads(limit: number = 50): Promise<Thread[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM threads 
        ORDER BY updated_at DESC 
        LIMIT ?
      `);
      
      const rows = stmt.all(limit) as any[];
      
      return rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      }));
    } catch (error) {
      throw new DatabaseError(`Failed to get threads: ${error}`, 'getAllThreads');
    }
  }

  async deleteThread(threadId: number): Promise<void> {
    try {
      const transaction = this.db.transaction(() => {
        // Delete thread messages first (foreign key constraint)
        this.db.prepare('DELETE FROM thread_messages WHERE thread_id = ?').run(threadId);
        
        // Delete thread
        const result = this.db.prepare('DELETE FROM threads WHERE id = ?').run(threadId);
        
        if (result.changes === 0) {
          throw new Error(`Thread ${threadId} not found`);
        }
      });
      
      transaction();
    } catch (error) {
      throw new DatabaseError(`Failed to delete thread: ${error}`, 'deleteThread');
    }
  }

  // Message operations
  async saveMessage(message: Message): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO messages 
        (id, content, send_time, room_id, sender_id, sender_name, raw_data, created_at, updated_at, cache_expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        message.id,
        message.content,
        message.send_time,
        message.room_id,
        message.sender_id,
        message.sender_name,
        message.raw_data || null,
        message.created_at?.toISOString() || new Date().toISOString(),
        message.updated_at?.toISOString() || new Date().toISOString(),
        message.cache_expires_at?.toISOString() || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      );
    } catch (error) {
      throw new DatabaseError(`Failed to save message: ${error}`, 'saveMessage');
    }
  }

  async getMessage(messageId: string): Promise<Message | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM messages WHERE id = ?');
      const row = stmt.get(messageId) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        content: row.content,
        send_time: row.send_time,
        room_id: row.room_id,
        sender_id: row.sender_id,
        sender_name: row.sender_name,
        raw_data: row.raw_data,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        cache_expires_at: new Date(row.cache_expires_at)
      };
    } catch (error) {
      throw new DatabaseError(`Failed to get message: ${error}`, 'getMessage');
    }
  }

  async getMessagesByRoom(roomId: string): Promise<Message[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM messages 
        WHERE room_id = ? 
        ORDER BY send_time ASC
      `);
      
      const rows = stmt.all(roomId) as any[];
      
      return rows.map(row => ({
        id: row.id,
        content: row.content,
        send_time: row.send_time,
        room_id: row.room_id,
        sender_id: row.sender_id,
        sender_name: row.sender_name,
        raw_data: row.raw_data,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        cache_expires_at: new Date(row.cache_expires_at)
      }));
    } catch (error) {
      throw new DatabaseError(`Failed to get messages by room: ${error}`, 'getMessagesByRoom');
    }
  }

  // Thread-Message operations
  async addMessageToThread(
    threadId: number, 
    messageId: string, 
    relationshipType: RelationshipType
  ): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO thread_messages 
        (thread_id, message_id, relationship_type, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(threadId, messageId, relationshipType);
      
      // Update thread's updated_at
      const updateStmt = this.db.prepare('UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      updateStmt.run(threadId);
    } catch (error) {
      throw new DatabaseError(`Failed to add message to thread: ${error}`, 'addMessageToThread');
    }
  }

  addMessageToThreadSync(
    threadId: number, 
    messageId: string, 
    relationshipType: RelationshipType
  ): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO thread_messages 
        (thread_id, message_id, relationship_type, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(threadId, messageId, relationshipType);
      
      // Update thread's updated_at
      const updateStmt = this.db.prepare('UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      updateStmt.run(threadId);
    } catch (error) {
      throw new DatabaseError(`Failed to add message to thread: ${error}`, 'addMessageToThread');
    }
  }

  async getThreadMessages(threadId: number): Promise<Message[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT m.*, tm.relationship_type
        FROM messages m
        JOIN thread_messages tm ON m.id = tm.message_id
        WHERE tm.thread_id = ?
        ORDER BY m.send_time ASC
      `);
      
      const rows = stmt.all(threadId) as any[];
      
      return rows.map(row => ({
        id: row.id,
        content: row.content,
        send_time: row.send_time,
        room_id: row.room_id,
        sender_id: row.sender_id,
        sender_name: row.sender_name,
        raw_data: row.raw_data,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        cache_expires_at: new Date(row.cache_expires_at)
      }));
    } catch (error) {
      throw new DatabaseError(`Failed to get thread messages: ${error}`, 'getThreadMessages');
    }
  }

  async removeMessageFromThread(threadId: number, messageId: string): Promise<void> {
    try {
      const stmt = this.db.prepare('DELETE FROM thread_messages WHERE thread_id = ? AND message_id = ?');
      const result = stmt.run(threadId, messageId);
      
      if (result.changes === 0) {
        throw new Error(`Message ${messageId} not found in thread ${threadId}`);
      }
      
      // Update thread's updated_at
      const updateStmt = this.db.prepare('UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      updateStmt.run(threadId);
    } catch (error) {
      throw new DatabaseError(`Failed to remove message from thread: ${error}`, 'removeMessageFromThread');
    }
  }

  async checkMessageInThreads(messageId: string): Promise<{ exists: boolean; threadIds: number[] }> {
    try {
      const stmt = this.db.prepare('SELECT thread_id FROM thread_messages WHERE message_id = ?');
      const rows = stmt.all(messageId) as any[];
      
      const threadIds = rows.map(row => row.thread_id);
      
      return {
        exists: threadIds.length > 0,
        threadIds
      };
    } catch (error) {
      throw new DatabaseError(`Failed to check message in threads: ${error}`, 'checkMessageInThreads');
    }
  }

  // Chatwork user operations
  async saveChatworkUser(user: ChatworkUserLocal): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO chatwork_users 
        (id, name, email, avatar_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        user.id,
        user.name,
        user.email || null,
        user.avatar_url || null,
        user.created_at?.toISOString() || new Date().toISOString(),
        user.updated_at?.toISOString() || new Date().toISOString()
      );
    } catch (error) {
      throw new DatabaseError(`Failed to save chatwork user: ${error}`, 'saveChatworkUser');
    }
  }

  async getChatworkUser(userId: string): Promise<ChatworkUserLocal | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM chatwork_users WHERE id = ?');
      const row = stmt.get(userId) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        avatar_url: row.avatar_url,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      };
    } catch (error) {
      throw new DatabaseError(`Failed to get chatwork user: ${error}`, 'getChatworkUser');
    }
  }

  // Utility methods
  close(): void {
    this.db.close();
  }

  async backup(): Promise<void> {
    // Implementation for database backup
    console.log('Database backup not implemented yet');
  }

  async restore(backupPath: string): Promise<void> {
    // Implementation for database restore
    console.log('Database restore not implemented yet');
  }

  executeInTransaction<T>(callback: () => T): T {
    const transaction = this.db.transaction(callback);
    return transaction();
  }
}
