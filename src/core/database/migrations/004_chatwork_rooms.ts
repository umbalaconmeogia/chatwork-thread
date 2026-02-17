import { MigrationFn } from 'umzug';
import { Database } from 'better-sqlite3';

export const up: MigrationFn<Database> = ({ context: db }) => {
  console.log('Creating chatwork_rooms table...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS chatwork_rooms (
      room_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ chatwork_rooms table created');
};

export const down: MigrationFn<Database> = ({ context: db }) => {
  console.log('Dropping chatwork_rooms table...');
  db.exec('DROP TABLE IF EXISTS chatwork_rooms');
  console.log('✅ chatwork_rooms table dropped');
};
