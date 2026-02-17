import { Command } from 'commander';
import { ConfigManager } from '../../core/config/ConfigManager';
import { ChatworkAPI, ChatworkRateLimitError } from '../../core/api/ChatworkAPI';
import { DatabaseManager } from '../../core/database/DatabaseManager';

interface FetchRoomOptions {
  save?: boolean;   // default true; --no-save to only fetch and print
  single?: boolean; // --single: one API request only (no pagination). Default = full room with pagination.
}

export class FetchRoomCommand {
  private config: ConfigManager;
  private api: ChatworkAPI;
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.config = ConfigManager.getInstance();
    this.dbManager = dbManager;
    const apiConfig = this.config.getConfig().api;
    this.api = new ChatworkAPI(apiConfig.token, apiConfig);
  }

  async execute(roomId: string, options: FetchRoomOptions): Promise<void> {
    try {
      if (!roomId || !ChatworkAPI.isValidRoomId(roomId)) {
        console.error('❌ Invalid or missing room ID. Use a numeric room ID (e.g. 409502735).');
        process.exit(1);
      }

      const doSave = options.save !== false; // default true
      const singleRequest = options.single === true;

      if (singleRequest) {
        console.log(`📡 Fetching messages from room ${roomId} (single request)...`);
      } else {
        console.log(`📡 Fetching full room ${roomId} (paginated, rate-limited)...`);
      }

      let messages: Awaited<ReturnType<ChatworkAPI['getMessages']>>;
      let totalSaved = 0;

      if (singleRequest) {
        messages = await this.api.getMessages(roomId, true);
        if (doSave && messages.length > 0) {
          await this.dbManager.initialize();
          try {
            const room = await this.api.getRoom(roomId);
            this.dbManager.saveRoom(roomId, room.name, room.type);
          } catch {
            // ignore
          }
          for (const msg of messages) {
            await this.dbManager.saveMessage(msg);
            totalSaved++;
          }
          console.log(`💾 Saved ${totalSaved} message(s) to local database.`);
        }
      } else {
        let startOffset = 0;
        if (doSave) {
          await this.dbManager.initialize();
          try {
            const room = await this.api.getRoom(roomId);
            this.dbManager.saveRoom(roomId, room.name, room.type);
          } catch {
            // ignore: fetch-room continues without room name in DB
          }
          startOffset = this.dbManager.getFetchRoomProgress(roomId) ?? 0;
        }
        if (startOffset > 0) {
          console.log(`▶️ Resume from offset ${startOffset} (tiếp tục từ lần chạy trước).`);
        }
        if (doSave) {
          messages = await this.api.getAllRoomMessages(roomId, {
            force: startOffset === 0,
            pageSize: 100,
            startOffset,
            onChunk: async (chunk) => {
              for (const msg of chunk) {
                await this.dbManager.saveMessage(msg);
                totalSaved++;
              }
              if (totalSaved > 0 && (totalSaved % 500 === 0 || chunk.length < 100)) {
                console.log(`💾 Saved ${totalSaved} message(s) so far...`);
              }
            },
            onProgress: (nextOffset) => {
              this.dbManager.setFetchRoomProgress(roomId, nextOffset);
              return Promise.resolve();
            }
          });
          this.dbManager.clearFetchRoomProgress(roomId);
          if (totalSaved > 0) console.log(`💾 Saved ${totalSaved} message(s) to local database.`);
        } else {
          messages = await this.api.getAllRoomMessages(roomId, {
            force: startOffset === 0,
            pageSize: 100,
            startOffset
          });
        }
      }

      console.log(`📊 Fetched ${messages.length} message(s).`);

      if (!doSave) {
        console.log('💡 Use without --no-save to store messages in the database.');
      }

      if (messages.length > 0 && messages.length <= 5) {
        console.log('\nMessage IDs:', messages.map((m) => m.id).join(', '));
      } else if (messages.length > 5) {
        const sorted = [...messages].sort((a, b) => a.send_time - b.send_time);
        console.log(
          `\nOldest: ${sorted[0].id} (${new Date(sorted[0].send_time * 1000).toISOString().slice(0, 10)})`
        );
        console.log(
          `Newest: ${sorted[sorted.length - 1].id} (${new Date(sorted[sorted.length - 1].send_time * 1000).toISOString().slice(0, 10)})`
        );
      }
    } catch (error) {
      if (error instanceof ChatworkRateLimitError) {
        console.error('❌', error.message);
        if (error.resetAt) {
          console.log('💡 Chạy lại lệnh sau khi hết thời gian chờ trên.');
        }
        console.log('💡 Phần đã lấy đã lưu vào DB. Chạy lại lệnh sẽ tiếp tục từ chỗ dừng (resume), không gọi lại từ đầu.');
        process.exit(1);
      }
      console.error('❌ Failed to fetch room messages:', error);
      process.exit(1);
    }
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const cmd = new FetchRoomCommand(dbManager);
    program
      .command('fetch-room <room-id>')
      .description(
        'Fetch all messages from a Chatwork room (paginated, rate-limited by default) and save to local database. Does NOT create a thread.'
      )
      .option('--no-save', 'Do not save messages to database (only fetch and print count)')
      .option('--single', 'Single API request only (no pagination; use for quick check or small rooms)')
      .action(async (roomId: string, options: FetchRoomOptions) => {
        await cmd.execute(roomId, options);
      });
  }
}
