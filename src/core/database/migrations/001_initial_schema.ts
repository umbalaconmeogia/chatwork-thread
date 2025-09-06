import { MigrationFn } from 'umzug';
import { Database } from 'better-sqlite3';

export const up: MigrationFn<Database> = ({ context: db }) => {
  console.log('Creating initial schema...');

  // Threads table (local application data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Messages table (based on Chatwork API structure)
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      send_time INTEGER NOT NULL,
      room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      cache_expires_at DATETIME DEFAULT (datetime('now', '+48 hours'))
    )
  `);

  // Thread-Message relationship (local application data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS thread_messages (
      thread_id INTEGER,
      message_id TEXT,
      relationship_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (thread_id, message_id),
      FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    )
  `);

  // Chatwork users table (cache from Chatwork API)
  db.exec(`
    CREATE TABLE IF NOT EXISTS chatwork_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_send_time ON messages(send_time);
    CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
    CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_id ON thread_messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_thread_messages_created_at ON thread_messages(thread_id, created_at);
  `);

  console.log('✅ Initial schema created successfully');
};

export const down: MigrationFn<Database> = ({ context: db }) => {
  console.log('Dropping initial schema...');
  
  db.exec('DROP INDEX IF EXISTS idx_thread_messages_created_at');
  db.exec('DROP INDEX IF EXISTS idx_thread_messages_thread_id');
  db.exec('DROP INDEX IF EXISTS idx_messages_room_id');
  db.exec('DROP INDEX IF EXISTS idx_messages_send_time');
  
  db.exec('DROP TABLE IF EXISTS thread_messages');
  db.exec('DROP TABLE IF EXISTS chatwork_users');
  db.exec('DROP TABLE IF EXISTS messages');
  db.exec('DROP TABLE IF EXISTS threads');
  
  console.log('✅ Initial schema dropped successfully');
};
