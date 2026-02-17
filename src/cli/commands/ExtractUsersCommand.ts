import { Command } from 'commander';
import { DatabaseManager } from '../../core/database/DatabaseManager';

/**
 * Parse [To:account_id]DisplayName from message content.
 * Example: [To:6452503]DTM_ジェプさん -> { account_id: '6452503', name: 'DTM_ジェプさん' }
 * Multiple per line: [To:6447481]DTM-ヴィエトさん[To:8615948]DTM_ロック...
 */
const TO_MENTION_REGEX = /\[To:(\d+)\]([^\[]+)/g;

function parseToMentions(content: string): Array<{ account_id: string; name: string }> {
  const out: Array<{ account_id: string; name: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = TO_MENTION_REGEX.exec(content)) !== null) {
    const name = m[2].trim();
    if (name.length > 0) out.push({ account_id: m[1], name });
  }
  return out;
}

export class ExtractUsersCommand {
  constructor(private dbManager: DatabaseManager) {}

  async execute(options: { dryRun?: boolean; roomId?: string; messageId?: string[] }): Promise<void> {
    await this.dbManager.initialize();

    const hasRoom = !!options.roomId?.trim();
    const hasMessages = (options.messageId?.length ?? 0) > 0;
    if (!hasRoom && !hasMessages) {
      console.error('❌ Specify --room-id <roomId> or --message-id <id> (or both) to limit scope. Scanning entire DB is disabled.');
      process.exit(1);
    }

    const contents = this.dbManager.getMessageContentsForExtract({
      roomId: options.roomId?.trim() || undefined,
      messageIds: hasMessages ? options.messageId : undefined
    });
    const userMap = new Map<string, string>(); // account_id -> name (last seen wins)

    for (const content of contents) {
      const pairs = parseToMentions(content);
      for (const { account_id, name } of pairs) {
        userMap.set(account_id, name);
      }
    }

    const scope = options.roomId
      ? `room ${options.roomId}`
      : options.messageId?.length
        ? `${options.messageId.length} message(s)`
        : 'all messages';
    if (options.dryRun) {
      console.log(`[dry-run] From ${scope}: would upsert ${userMap.size} users into chatwork_users`);
      for (const [id, name] of [...userMap.entries()].slice(0, 10)) {
        console.log(`  ${id} -> ${name}`);
      }
      if (userMap.size > 10) console.log(`  ... and ${userMap.size - 10} more`);
      return;
    }

    const now = new Date().toISOString();
    let saved = 0;
    for (const [account_id, name] of userMap) {
      await this.dbManager.saveChatworkUser({
        id: account_id,
        name,
        created_at: new Date(now),
        updated_at: new Date(now)
      });
      saved++;
    }
    console.log(`✅ From ${scope}: extracted and saved ${saved} users to chatwork_users.`);
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const cmd = new ExtractUsersCommand(dbManager);
    program
      .command('extract-users')
      .description('Parse [To:account_id]Name from messages and upsert into chatwork_users (for cancelled-account display)')
      .option('--room-id <roomId>', 'Only scan messages in this room')
      .option('--message-id <id>', 'Only scan this message (can be repeated)', (v: string, prev: string[] | undefined) => (prev || []).concat([v]))
      .option('--dry-run', 'Only report how many users would be saved, do not write')
      .action(async (opts: { dryRun?: boolean; roomId?: string; messageId?: string[] }) => {
        try {
          await cmd.execute(opts);
        } catch (error) {
          console.error('❌ extract-users failed:', error);
          process.exit(1);
        }
      });
  }
}
