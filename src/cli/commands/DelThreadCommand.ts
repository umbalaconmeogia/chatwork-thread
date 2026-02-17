import { Command } from 'commander';
import { DatabaseManager } from '../../core/database/DatabaseManager';

interface DelThreadOptions {
  force?: boolean;
}

export class DelThreadCommand {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  async execute(threadId: string, options: DelThreadOptions): Promise<void> {
    try {
      console.log(`🗑️ Deleting thread ${threadId}...`);

      const id = parseInt(threadId);
      if (isNaN(id) || id < 1) {
        throw new Error('Thread ID must be a positive number');
      }

      await this.dbManager.initialize();

      const thread = await this.dbManager.getThread(id);
      if (!thread) {
        console.error(`❌ Thread ${id} not found`);
        process.exit(1);
      }

      const messages = await this.dbManager.getThreadMessages(id);
      const messageCount = messages.length;

      if (!options.force) {
        console.log(`\n⚠️ Thread: "${thread.name}" (ID: ${id})`);
        console.log(`   Messages in thread: ${messageCount}`);
        console.log('   This will delete the thread and all its thread_messages. Cannot be undone.');
        console.log('   Use --force to proceed.');
        console.error('\n❌ Confirmation required. Use --force flag to proceed.');
        process.exit(1);
      }

      await this.dbManager.deleteThread(id);

      console.log(`✅ Thread ${id} "${thread.name}" deleted (${messageCount} message(s) removed from thread).`);
    } catch (error) {
      console.error('❌ Failed to delete thread:', error);
      process.exit(1);
    }
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const delThreadCommand = new DelThreadCommand(dbManager);

    program
      .command('del-thread <thread-id>')
      .description('Delete a thread and all its thread_messages')
      .option('--force', 'Skip confirmation prompt')
      .action(async (threadId: string, options: DelThreadOptions) => {
        await delThreadCommand.execute(threadId, options);
      });
  }
}
