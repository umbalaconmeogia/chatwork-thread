import { MigrationContext } from '../UmzugMigrationManager';

export const up = async ({ db }: MigrationContext): Promise<void> => {
  console.log('Creating initial schema...');
  
  // Create threads table
  db.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      root_message_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, -- Chatwork message_id
      room_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      send_time INTEGER NOT NULL, -- Chatwork send_time (timestamp)
      update_time INTEGER NOT NULL, -- Chatwork update_time (timestamp)
      cache_expires_at DATETIME NOT NULL, -- Local cache expiration
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create thread_messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS thread_messages (
      thread_id INTEGER NOT NULL,
      message_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (thread_id, message_id),
      FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    )
  `);

  // Create chatwork_users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chatwork_users (
      account_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
    CREATE INDEX IF NOT EXISTS idx_messages_send_time ON messages(send_time);
    CREATE INDEX IF NOT EXISTS idx_messages_cache_expires ON messages(cache_expires_at);
    CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_id ON thread_messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_thread_messages_message_id ON thread_messages(message_id);
    CREATE INDEX IF NOT EXISTS idx_threads_root_message_id ON threads(root_message_id);
  `);

  // Create triggers for updated_at
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_threads_updated_at 
    AFTER UPDATE ON threads
    BEGIN
      UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_messages_updated_at 
    AFTER UPDATE ON messages
    BEGIN
      UPDATE messages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_chatwork_users_updated_at 
    AFTER UPDATE ON chatwork_users
    BEGIN
      UPDATE chatwork_users SET updated_at = CURRENT_TIMESTAMP WHERE account_id = NEW.account_id;
    END;
  `);

  console.log('✅ Initial schema created successfully');
};

export const down = async ({ db }: MigrationContext): Promise<void> => {
  console.log('Rolling back initial schema...');
  
  // Drop triggers
  db.exec('DROP TRIGGER IF EXISTS update_chatwork_users_updated_at');
  db.exec('DROP TRIGGER IF EXISTS update_messages_updated_at');
  db.exec('DROP TRIGGER IF EXISTS update_threads_updated_at');
  
  // Drop indexes
  db.exec('DROP INDEX IF EXISTS idx_threads_root_message_id');
  db.exec('DROP INDEX IF EXISTS idx_thread_messages_message_id');
  db.exec('DROP INDEX IF EXISTS idx_thread_messages_thread_id');
  db.exec('DROP INDEX IF EXISTS idx_messages_cache_expires');
  db.exec('DROP INDEX IF EXISTS idx_messages_send_time');
  db.exec('DROP INDEX IF EXISTS idx_messages_room_id');
  
  // Drop tables (order matters due to foreign keys)
  db.exec('DROP TABLE IF EXISTS thread_messages');
  db.exec('DROP TABLE IF EXISTS messages');
  db.exec('DROP TABLE IF EXISTS chatwork_users');
  db.exec('DROP TABLE IF EXISTS threads');
  
  console.log('✅ Initial schema rolled back successfully');
};
