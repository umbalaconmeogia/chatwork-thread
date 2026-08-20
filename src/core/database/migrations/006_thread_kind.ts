import { MigrationFn } from 'umzug';
import { Database } from 'better-sqlite3';

export const up: MigrationFn<Database> = ({ context: db }) => {
  console.log('Adding threads.thread_kind...');

  db.exec(`
    ALTER TABLE threads ADD COLUMN thread_kind TEXT;
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_threads_parent_kind ON threads(parent_thread_id, thread_kind);
  `);

  console.log('✅ threads.thread_kind added');
};

export const down: MigrationFn<Database> = ({ context: db }) => {
  console.log('Reverting thread_kind (index only; SQLite cannot DROP COLUMN)...');
  db.exec('DROP INDEX IF EXISTS idx_threads_parent_kind');
};
