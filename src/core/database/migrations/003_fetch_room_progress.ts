import { MigrationFn } from 'umzug';
import { Database } from 'better-sqlite3';

export const up: MigrationFn<Database> = ({ context: db }) => {
  console.log('Creating fetch_room_progress table...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS fetch_room_progress (
      room_id TEXT PRIMARY KEY,
      offset INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ fetch_room_progress table created');
};

export const down: MigrationFn<Database> = ({ context: db }) => {
  console.log('Dropping fetch_room_progress table...');
  db.exec('DROP TABLE IF EXISTS fetch_room_progress');
  console.log('✅ fetch_room_progress table dropped');
};
