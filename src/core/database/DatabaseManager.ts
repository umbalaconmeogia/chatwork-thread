import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { 
  Thread, 
  Message, 
  ThreadMessage, 
  ChatworkUserLocal,
  ChatworkMessage,
  ChatworkUser
} from '../types/chatwork';
import { UmzugMigrationManager } from './UmzugMigrationManager';

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;
  private migrationManager: UmzugMigrationManager;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.ensureDatabaseDirectory();
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    // Initialize migration manager and apply migrations
    // Use compiled migrations path - get from project root
    const projectRoot = path.resolve(__dirname, '../../..');
    const migrationsPath = path.join(projectRoot, 'dist/core/database/migrations');
    this.migrationManager = new UmzugMigrationManager(this.db, migrationsPath);
    // Note: We'll apply migrations manually to handle async properly
  }

  private ensureDatabaseDirectory(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Migration management methods
  public async getMigrationStatus(): Promise<any> {
    return await this.migrationManager.getMigrationStatus();
  }

  public async printMigrationStatus(): Promise<void> {
    await this.migrationManager.printMigrationStatus();
  }

  public async applyPendingMigrations(): Promise<boolean> {
    return await this.migrationManager.applyAllPendingMigrations();
  }

  public async setupMigrations(): Promise<void> {
    await this.migrationManager.setup();
  }

  public async teardownMigrations(): Promise<void> {
    await this.migrationManager.teardown();
  }

  public async resetMigrations(): Promise<void> {
    await this.migrationManager.reset();
  }

  // Thread operations
  public createThread(name: string, rootMessageId: string): Thread {
    const stmt = this.db.prepare(`
      INSERT INTO threads (name, root_message_id)
      VALUES (?, ?)
    `);
    
    const result = stmt.run(name, rootMessageId);
    
    return {
      id: result.lastInsertRowid as number,
      name,
      root_message_id: rootMessageId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  public getThread(threadId: number): Thread | null {
    const stmt = this.db.prepare(`
      SELECT * FROM threads WHERE id = ?
    `);
    
    const row = stmt.get(threadId) as any;
    return row ? this.mapRowToThread(row) : null;
  }

  public getThreadByRootMessage(rootMessageId: string): Thread | null {
    const stmt = this.db.prepare(`
      SELECT * FROM threads WHERE root_message_id = ?
    `);
    
    const row = stmt.get(rootMessageId) as any;
    return row ? this.mapRowToThread(row) : null;
  }

  public getAllThreads(): Thread[] {
    const stmt = this.db.prepare(`
      SELECT * FROM threads ORDER BY created_at DESC
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToThread(row));
  }

  public updateThread(threadId: number, name: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE threads SET name = ? WHERE id = ?
    `);
    
    const result = stmt.run(name, threadId);
    return result.changes > 0;
  }

  public deleteThread(threadId: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM threads WHERE id = ?
    `);
    
    const result = stmt.run(threadId);
    return result.changes > 0;
  }

  // Message operations
  public saveMessage(chatworkMessage: ChatworkMessage, cacheExpiresAt: Date): Message {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO messages (
        id, room_id, account_id, body, send_time, update_time, cache_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      chatworkMessage.message_id,
      chatworkMessage.account.account_id,
      chatworkMessage.account.account_id,
      chatworkMessage.body,
      chatworkMessage.send_time,
      chatworkMessage.update_time,
      cacheExpiresAt.toISOString()
    );
    
    return this.mapChatworkMessageToMessage(chatworkMessage, cacheExpiresAt);
  }

  public getMessage(messageId: string): Message | null {
    const stmt = this.db.prepare(`
      SELECT * FROM messages WHERE id = ?
    `);
    
    const row = stmt.get(messageId) as any;
    return row ? this.mapRowToMessage(row) : null;
  }

  public getMessagesByRoom(roomId: number): Message[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages WHERE room_id = ? ORDER BY send_time ASC
    `);
    
    const rows = stmt.all(roomId) as any[];
    return rows.map(row => this.mapRowToMessage(row));
  }

  public getExpiredMessages(): Message[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages WHERE cache_expires_at < CURRENT_TIMESTAMP
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToMessage(row));
  }

  public deleteMessage(messageId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM messages WHERE id = ?
    `);
    
    const result = stmt.run(messageId);
    return result.changes > 0;
  }

  // Thread-Message operations
  public addMessageToThread(threadId: number, messageId: string): boolean {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO thread_messages (thread_id, message_id)
      VALUES (?, ?)
    `);
    
    const result = stmt.run(threadId, messageId);
    return result.changes > 0;
  }

  public removeMessageFromThread(threadId: number, messageId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM thread_messages WHERE thread_id = ? AND message_id = ?
    `);
    
    const result = stmt.run(threadId, messageId);
    return result.changes > 0;
  }

  public getThreadMessages(threadId: number): Message[] {
    const stmt = this.db.prepare(`
      SELECT m.* FROM messages m
      JOIN thread_messages tm ON m.id = tm.message_id
      WHERE tm.thread_id = ?
      ORDER BY m.send_time ASC
    `);
    
    const rows = stmt.all(threadId) as any[];
    return rows.map(row => this.mapRowToMessage(row));
  }

  public getMessageThreads(messageId: string): Thread[] {
    const stmt = this.db.prepare(`
      SELECT t.* FROM threads t
      JOIN thread_messages tm ON t.id = tm.thread_id
      WHERE tm.message_id = ?
    `);
    
    const rows = stmt.all(messageId) as any[];
    return rows.map(row => this.mapRowToThread(row));
  }

  // User operations
  public saveUser(chatworkUser: ChatworkUser): ChatworkUserLocal {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO chatwork_users (account_id, name, avatar_image_url)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(
      chatworkUser.account_id,
      chatworkUser.name,
      chatworkUser.avatar_image_url
    );
    
    return this.mapChatworkUserToLocal(chatworkUser);
  }

  public getUser(accountId: number): ChatworkUserLocal | null {
    const stmt = this.db.prepare(`
      SELECT * FROM chatwork_users WHERE account_id = ?
    `);
    
    const row = stmt.get(accountId) as any;
    return row ? this.mapRowToUser(row) : null;
  }

  public getAllUsers(): ChatworkUserLocal[] {
    const stmt = this.db.prepare(`
      SELECT * FROM chatwork_users ORDER BY name ASC
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToUser(row));
  }

  // Utility methods
  public isMessageInThread(messageId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM thread_messages WHERE message_id = ?
    `);
    
    const result = stmt.get(messageId) as any;
    return result.count > 0;
  }

  public getThreadMessageCount(threadId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM thread_messages WHERE thread_id = ?
    `);
    
    const result = stmt.get(threadId) as any;
    return result.count;
  }

  public getDatabaseStats(): any {
    const threadsCount = this.db.prepare('SELECT COUNT(*) as count FROM threads').get() as any;
    const messagesCount = this.db.prepare('SELECT COUNT(*) as count FROM messages').get() as any;
    const usersCount = this.db.prepare('SELECT COUNT(*) as count FROM chatwork_users').get() as any;
    
    return {
      threads: threadsCount.count,
      messages: messagesCount.count,
      users: usersCount.count,
      databasePath: this.dbPath
    };
  }

  public close(): void {
    this.db.close();
  }

  // Private mapping methods
  private mapRowToThread(row: any): Thread {
    return {
      id: row.id,
      name: row.name,
      root_message_id: row.root_message_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapRowToMessage(row: any): Message {
    return {
      id: row.id,
      room_id: row.room_id,
      account_id: row.account_id,
      body: row.body,
      send_time: row.send_time,
      update_time: row.update_time,
      cache_expires_at: row.cache_expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapRowToUser(row: any): ChatworkUserLocal {
    return {
      account_id: row.account_id,
      name: row.name,
      avatar_image_url: row.avatar_image_url,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapChatworkMessageToMessage(chatworkMessage: ChatworkMessage, cacheExpiresAt: Date): Message {
    return {
      id: chatworkMessage.message_id,
      room_id: chatworkMessage.account.account_id, // This should be room_id from API
      account_id: chatworkMessage.account.account_id,
      body: chatworkMessage.body,
      send_time: chatworkMessage.send_time,
      update_time: chatworkMessage.update_time,
      cache_expires_at: cacheExpiresAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private mapChatworkUserToLocal(chatworkUser: ChatworkUser): ChatworkUserLocal {
    return {
      account_id: chatworkUser.account_id,
      name: chatworkUser.name,
      avatar_image_url: chatworkUser.avatar_image_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}
