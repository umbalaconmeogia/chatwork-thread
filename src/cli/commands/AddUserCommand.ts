import { Command } from 'commander';
import { DatabaseManager } from '../../core/database/DatabaseManager';

export class AddUserCommand {
  constructor(private dbManager: DatabaseManager) {}

  async execute(userId: string, userName: string): Promise<void> {
    await this.dbManager.initialize();

    const id = userId.trim();
    const name = userName.trim();
    if (!id) {
      console.error('❌ User ID is required.');
      process.exit(1);
    }
    if (!name) {
      console.error('❌ User name is required.');
      process.exit(1);
    }

    const now = new Date();
    await this.dbManager.saveChatworkUser({
      id,
      name,
      created_at: now,
      updated_at: now
    });
    console.log(`✅ Saved chatwork user: ${id} -> ${name}`);
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const cmd = new AddUserCommand(dbManager);
    program
      .command('add-user <user-id> <user-name>')
      .description('Add or update a Chatwork user (id + name) for display when account is cancelled')
      .action(async (userId: string, userName: string) => {
        try {
          await cmd.execute(userId, userName);
        } catch (error) {
          console.error('❌ add-user failed:', error);
          process.exit(1);
        }
      });
  }
}
