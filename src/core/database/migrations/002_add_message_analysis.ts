import { MigrationContext } from '../UmzugMigrationManager';

export const up = async ({ db }: MigrationContext): Promise<void> => {
  console.log('Adding message analysis fields...');
  
  // Add analysis fields to messages table
  db.exec('ALTER TABLE messages ADD COLUMN analysis_score REAL DEFAULT 0.0');
  db.exec('ALTER TABLE messages ADD COLUMN is_reply BOOLEAN DEFAULT 0');
  db.exec('ALTER TABLE messages ADD COLUMN reply_to_message_id TEXT');
  db.exec('ALTER TABLE messages ADD COLUMN thread_keywords TEXT');

  // Add thread analysis fields
  db.exec('ALTER TABLE threads ADD COLUMN analysis_status TEXT DEFAULT "pending"');
  db.exec('ALTER TABLE threads ADD COLUMN last_analyzed_at DATETIME');
  db.exec('ALTER TABLE threads ADD COLUMN message_count INTEGER DEFAULT 0');

  // Create new indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_analysis_score ON messages(analysis_score)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_threads_analysis_status ON threads(analysis_status)');

  console.log('✅ Message analysis fields added successfully');
};

export const down = async ({ db }: MigrationContext): Promise<void> => {
  console.log('Rolling back message analysis fields...');
  
  // Drop new indexes
  db.exec('DROP INDEX IF EXISTS idx_threads_analysis_status');
  db.exec('DROP INDEX IF EXISTS idx_messages_analysis_score');
  db.exec('DROP INDEX IF EXISTS idx_messages_reply_to');
  
  // Note: SQLite doesn't support DROP COLUMN easily
  // In a real scenario, you'd need to recreate the table
  // For now, we'll just drop the indexes
  console.log('⚠️ Note: SQLite doesn\'t support DROP COLUMN easily');
  console.log('⚠️ Columns remain in database but are not indexed');
  
  console.log('✅ Message analysis fields rolled back (indexes removed)');
};
