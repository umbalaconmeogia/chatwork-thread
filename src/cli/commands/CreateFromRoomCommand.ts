import { Command } from 'commander';
import { ConfigManager } from '../../core/config/ConfigManager';
import { DatabaseManager } from '../../core/database/DatabaseManager';
import { ChatworkAPI } from '../../core/api/ChatworkAPI';
import type { RelationshipType } from '../../core/types/chatwork';

interface CreateFromRoomOptions {
  name?: string;
  description?: string;
}

export class CreateFromRoomCommand {
  private api: ChatworkAPI;

  constructor(private dbManager: DatabaseManager) {
    const config = ConfigManager.getInstance();
    this.api = new ChatworkAPI(config.getConfig().api.token, config.getConfig().api);
  }

  async execute(roomId: string, options: CreateFromRoomOptions): Promise<void> {
    try {
      if (!roomId || !ChatworkAPI.isValidRoomId(roomId)) {
        console.error('❌ Invalid or missing room ID. Use a numeric room ID (e.g. 409502735).');
        process.exit(1);
      }

      await this.dbManager.initialize();

      const messages = await this.dbManager.getMessagesByRoom(roomId);
      if (messages.length === 0) {
        console.error('❌ Chưa có message nào trong DB cho room này.');
        console.log('💡 Chạy trước: node dist/cli/chatwork-thread.js fetch-room ' + roomId);
        process.exit(1);
      }

      messages.sort((a, b) => a.send_time - b.send_time);

      let name: string;
      if (options.name) {
        name = options.name;
      } else {
        let roomInfo = this.dbManager.getRoom(roomId);
        if (!roomInfo) {
          try {
            const room = await this.api.getRoom(roomId);
            this.dbManager.saveRoom(roomId, room.name, room.type);
            roomInfo = { room_id: roomId, name: room.name, type: room.type };
          } catch {
            roomInfo = null;
          }
        }
        name = roomInfo?.name ?? `Room ${roomId}`;
      }
      const description = options.description || 'Toàn bộ message trong room (coi như một thread)';

      const thread = await this.dbManager.createThread(name, description, { roomId: roomId });

      for (let i = 0; i < messages.length; i++) {
        const relationshipType: RelationshipType = i === 0 ? 'root' : 'manual';
        await this.dbManager.addMessageToThread(thread.id, messages[i].id, relationshipType);
      }

      console.log(`✅ Đã tạo thread ${thread.id} với ${messages.length} message(s).`);
      console.log(`💡 Xem/xuất: node dist/cli/chatwork-thread.js show ${thread.id} --format html --output room.html`);
    } catch (error) {
      console.error('❌ Failed to create thread from room:', error);
      process.exit(1);
    }
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const cmd = new CreateFromRoomCommand(dbManager);
    program
      .command('create-from-room <room-id>')
      .description('Tạo một thread chứa toàn bộ message trong room (cần đã fetch-room trước)')
      .option('-n, --name <name>', 'Tên thread (mặc định: lấy tên room từ Chatwork/DB nếu có)')
      .option('-d, --description <desc>', 'Mô tả thread')
      .action(async (roomId: string, options: CreateFromRoomOptions) => {
        await cmd.execute(roomId, options);
      });
  }
}
