import { Command } from 'commander';
import { DatabaseManager } from '../../core/database/DatabaseManager';
import { StoryThreadClusterer } from '../../core/analyzer/StoryThreadClusterer';

interface ThreadStoriesOptions {
  dryRun?: boolean;
  minSize?: string;
}

export class CreateThreadStoriesCommand {
  constructor(private dbManager: DatabaseManager) {}

  async execute(rootThreadIdStr: string, options: ThreadStoriesOptions): Promise<void> {
    const rootThreadId = parseInt(rootThreadIdStr, 10);
    if (!Number.isFinite(rootThreadId) || rootThreadId < 1) {
      console.error('❌ Invalid thread id. Provide a positive integer (root thread).');
      process.exit(1);
    }

    const minSize = options.minSize != null ? parseInt(options.minSize, 10) : 2;
    if (!Number.isFinite(minSize) || minSize < 2) {
      console.error('❌ --min-size must be an integer >= 2');
      process.exit(1);
    }

    try {
      await this.dbManager.initialize();

      if (options.dryRun) {
        console.log(`🔍 Dry run: clustering root thread ${rootThreadId} (min component size ${minSize})...`);
      } else {
        console.log(`🧵 Creating story threads from root ${rootThreadId} (min component size ${minSize})...`);
      }

      const stats = StoryThreadClusterer.clusterRootThread(this.dbManager, rootThreadId, {
        dryRun: options.dryRun,
        minSize,
      });

      console.log('\n📊 Result:');
      console.log(`   Story threads ${options.dryRun ? 'would be created' : 'created'}: ${stats.storyThreadsCreated}`);
      console.log(`   Messages in stories: ${stats.totalMessagesInStories}`);
      console.log(`   Singleton / below min (stay root-only for stories): ${stats.singletonCount}`);
      const orphanVerb = options.dryRun ? 'would be placed' : 'placed';
      console.log(
        `   Orphan messages (${orphanVerb} in thread_kind=orphan bucket): ${stats.orphanMessageCount}`
      );
      console.log(
        `   Orphan thread ${options.dryRun ? 'would be created' : 'created'}: ${stats.orphanThreadCreated ? 'yes' : 'no'}`
      );
      if (stats.components.length > 0 && stats.components.length <= 30) {
        console.log(`   Component sizes: ${stats.components.map((c) => c.size).join(', ')}`);
      } else if (stats.components.length > 30) {
        console.log(`   (${stats.components.length} components — sizes omitted)`);
      }

      if (options.dryRun) {
        console.log('\n💡 Run without --dry-run to write to the database.');
      } else {
        console.log(`\n💡 Use 'chatwork-thread list' or the GUI to browse story threads under root ${rootThreadId}.`);
      }
    } catch (error) {
      console.error('❌ create thread-stories failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /** Attach `thread-stories` subcommand to the `create` command (register before CreateCommand.register). */
  static register(createParent: Command, dbManager: DatabaseManager): void {
    const cmd = new CreateThreadStoriesCommand(dbManager);
    createParent
      .command('thread-stories <thread-id>')
      .description(
        'Create story threads from a root thread using reply/quote links (local DB only; no Chatwork API)'
      )
      .option('--dry-run', 'Print stats without writing', false)
      .option('--min-size <n>', 'Minimum messages per story component (default: 2)', '2')
      .action(async (threadId: string, options: ThreadStoriesOptions) => {
        await cmd.execute(threadId, options);
      });
  }
}
