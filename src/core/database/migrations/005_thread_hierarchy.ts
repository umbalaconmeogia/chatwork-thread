import { MigrationFn } from 'umzug';
import { Database } from 'better-sqlite3';

export const up: MigrationFn<Database> = ({ context: db }) => {
  console.log('Adding thread hierarchy columns (room_id, parent_thread_id)...');

  db.exec(`
    ALTER TABLE threads ADD COLUMN room_id TEXT;
  `);

  db.exec(`
    ALTER TABLE threads ADD COLUMN parent_thread_id INTEGER;
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_threads_room_id ON threads(room_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_threads_parent_thread_id ON threads(parent_thread_id);
  `);

  console.log('✅ Thread hierarchy columns added');
};

export const down: MigrationFn<Database> = ({ context: db }) => {
  console.log('Reverting thread hierarchy migration (indexes only; SQLite cannot DROP COLUMN)...');
  db.exec('DROP INDEX IF EXISTS idx_threads_parent_thread_id');
  db.exec('DROP INDEX IF EXISTS idx_threads_room_id');
  console.log('Note: room_id and parent_thread_id columns remain on threads (SQLite limitation).');
};
