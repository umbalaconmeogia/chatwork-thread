import { MigrationFn } from 'umzug';
import { Database } from 'better-sqlite3';

export const up: MigrationFn<Database> = ({ context: db }) => {
  console.log('Adding message analysis fields...');

  // Add analysis fields to messages table
  db.exec(`
    ALTER TABLE messages ADD COLUMN analysis_score REAL;
  `);

  db.exec(`
    ALTER TABLE messages ADD COLUMN is_reply BOOLEAN;
  `);

  db.exec(`
    ALTER TABLE messages ADD COLUMN reply_to_message_id TEXT;
  `);

  db.exec(`
    ALTER TABLE messages ADD COLUMN thread_keywords TEXT;
  `);

  // Create index for analysis fields
  db.exec(`
    CREATE INDEX idx_messages_analysis_score ON messages(analysis_score);
    CREATE INDEX idx_messages_is_reply ON messages(is_reply);
    CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id);
  `);

  console.log('✅ Message analysis fields added successfully');
};

export const down: MigrationFn<Database> = ({ context: db }) => {
  console.log('Removing message analysis fields...');
  
  // Drop indexes first
  db.exec('DROP INDEX IF EXISTS idx_messages_reply_to');
  db.exec('DROP INDEX IF EXISTS idx_messages_is_reply');
  db.exec('DROP INDEX IF EXISTS idx_messages_analysis_score');
  
  // Note: SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
  // For now, we'll just comment this as down migration
  console.log('Note: SQLite does not support DROP COLUMN. Analysis fields will remain.');
  console.log('✅ Message analysis fields migration reversed (indexes dropped)');
};
