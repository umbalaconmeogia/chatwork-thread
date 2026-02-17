import { readFileSync, writeFileSync } from 'fs';
import { Command } from 'commander';
import { ConfigManager } from '../../core/config/ConfigManager';
import { DatabaseManager } from '../../core/database/DatabaseManager';
import { ChatworkAPI, ChatworkAPIError, ChatworkRateLimitError } from '../../core/api/ChatworkAPI';

/**
 * Extract room_id and message IDs from Chatwork HTML (saved from room page).
 * Supports:
 * - id="_messageId2053320974253961216" (Save as HTML từ Chatwork)
 * - data-rid="274638849" data-mid="1575799508963426304"
 * - rid{roomId}-{messageId} in URLs (fallback)
 */
function extractMessageIdsFromHtml(html: string): { roomId: string | null; messageIds: string[] } | null {
  const messageIdSet = new Set<string>();
  let roomId: string | null = null;
  const roomIdCounts = new Map<string, number>();

  // 1) id="_messageId123456..." (format khi Save as HTML)
  const reMessageId = /id="_messageId(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = reMessageId.exec(html)) !== null) {
    messageIdSet.add(m[1]);
  }

  // 2) data-mid="123456..." (cùng dòng thường có data-rid)
  const reDataMid = /data-mid="(\d+)"/g;
  while ((m = reDataMid.exec(html)) !== null) {
    messageIdSet.add(m[1]);
  }

  // 3) data-rid="274638849" -> room ID (lấy giá trị xuất hiện nhiều nhất)
  const reDataRid = /data-rid="(\d+)"/g;
  while ((m = reDataRid.exec(html)) !== null) {
    const r = m[1];
    roomIdCounts.set(r, (roomIdCounts.get(r) ?? 0) + 1);
  }
  if (roomIdCounts.size > 0) {
    roomId = [...roomIdCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  // 4) Fallback: rid(roomId)-(messageId) trong URL
  const reRid = /rid(\d+)-(\d+)/g;
  while ((m = reRid.exec(html)) !== null) {
    messageIdSet.add(m[2]);
    if (!roomId) roomIdCounts.set(m[1], (roomIdCounts.get(m[1]) ?? 0) + 1);
  }
  if (!roomId && roomIdCounts.size > 0) {
    roomId = [...roomIdCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  if (messageIdSet.size === 0) return null;
  const messageIds = [...messageIdSet].sort((a, b) => String(a).localeCompare(b, undefined, { numeric: true }));
  return { roomId, messageIds };
}

interface ParseRoomHtmlOptions {
  roomId?: string;
  output?: string;
  fetch?: boolean;
  delay?: string;
}

export class ParseRoomHtmlCommand {
  private api: ChatworkAPI;

  constructor(private dbManager: DatabaseManager) {
    const config = ConfigManager.getInstance();
    this.api = new ChatworkAPI(config.getConfig().api.token, config.getConfig().api);
  }

  async execute(htmlPath: string, options: ParseRoomHtmlOptions): Promise<void> {
    try {
      const html = readFileSync(htmlPath, 'utf-8');
      const extracted = extractMessageIdsFromHtml(html);
      if (!extracted) {
        console.error('❌ Không tìm thấy message ID trong file HTML (cần id="_messageId..." hoặc data-mid="..." hoặc link rid...-...).');
        process.exit(1);
      }
      let { roomId, messageIds } = extracted;
      if (options.roomId) {
        roomId = options.roomId;
      }
      if (!roomId) {
        console.error('❌ Không xác định được room ID. Thêm option --room-id <room-id>.');
        process.exit(1);
      }
      console.log(`📄 Room ID: ${roomId}`);
      console.log(`📊 Số message ID: ${messageIds.length}`);

      if (options.output) {
        const content = messageIds.join('\n');
        writeFileSync(options.output, content, 'utf-8');
        console.log(`✅ Đã ghi ${messageIds.length} message ID vào: ${options.output}`);
      } else {
        console.log('Message IDs (10 đầu):', messageIds.slice(0, 10).join(', '));
        if (messageIds.length > 10) console.log('... và', messageIds.length - 10, 'id nữa. Dùng --output <file> để xuất hết.');
      }

      if (options.fetch) {
        await this.dbManager.initialize();
        const delayMs = Math.max(500, options.delay ? parseInt(options.delay, 10) : 1200);
        let toFetch = messageIds;
        const existing = await this.dbManager.getMessagesByRoom(roomId);
        const existingIds = new Set(existing.map(m => m.id));
        if (existingIds.size > 0) {
          toFetch = messageIds.filter(id => !existingIds.has(id));
          console.log(`⏭️ Bỏ qua ${messageIds.length - toFetch} message đã có trong DB. Còn ${toFetch.length} cần lấy.`);
        }
        let saved = 0;
        for (let i = 0; i < toFetch.length; i++) {
          try {
            const msg = await this.api.getMessage(roomId, toFetch[i]);
            await this.dbManager.saveMessage(msg);
            saved++;
            if (saved % 50 === 0 || saved === toFetch.length) {
              console.log(`💾 Đã lấy và lưu ${saved}/${toFetch.length} message...`);
            }
          } catch (e) {
            if (e instanceof ChatworkRateLimitError) {
              console.error('❌', e.message);
              if (e.resetAt) console.log('💡 Chạy lại lệnh sau khi hết thời gian chờ trên.');
              console.log(`💡 Đã lưu ${saved} message. Chạy lại cùng lệnh để tiếp tục (sẽ bỏ qua message đã có trong DB).`);
              process.exit(1);
            }
            if (e instanceof ChatworkAPIError && e.statusCode === 404) {
              console.warn(`⚠️ Bỏ qua message ${toFetch[i]}: không tồn tại hoặc đã bị xóa (404).`);
            } else {
              console.warn(`⚠️ Bỏ qua message ${toFetch[i]}:`, (e as Error).message);
            }
          }
          if (i < toFetch.length - 1) {
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
        console.log(`✅ Đã lưu ${saved} message vào DB. Có thể chạy: create-from-room ${roomId}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error('❌ File không tồn tại:', htmlPath);
      } else {
        console.error('❌ Lỗi:', error);
      }
      process.exit(1);
    }
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const cmd = new ParseRoomHtmlCommand(dbManager);
    program
      .command('parse-room-html <html-file>')
      .description(
        'Trích message ID từ file HTML đã save từ trang Chatwork (scroll hết room rồi Save as HTML). Có thể xuất danh sách ID hoặc --fetch để lấy từng message qua API vào DB.'
      )
      .option('-r, --room-id <id>', 'Room ID (ghi đè nếu trong HTML có nhiều room)')
      .option('-o, --output <file>', 'Ghi danh sách message ID ra file (mỗi dòng một ID)')
      .option('--fetch', 'Sau khi trích ID, gọi API lấy từng message và lưu vào DB (cần CHATWORK_API_TOKEN)')
      .option('--delay <ms>', 'Delay (ms) giữa mỗi request khi --fetch để tránh rate limit (mặc định 1200 ≈ 250 request/5ph)', '1200')
      .action(async (htmlPath: string, options: ParseRoomHtmlOptions) => {
        await cmd.execute(htmlPath, options);
      });
  }
}
