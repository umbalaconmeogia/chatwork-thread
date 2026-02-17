import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { DatabaseManager } from '../../core/database/DatabaseManager';

interface ShowOptions {
  format?: 'text' | 'json' | 'markdown' | 'html';
  output?: string;
  includeMetadata?: boolean;
}

/** Format date as yyyy/mm/dd HH:ii */
function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export class ShowCommand {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  async execute(threadId: string, options: ShowOptions): Promise<void> {
    try {
      console.log(`🔍 Showing thread ${threadId}...`);
      
      // Initialize database
      await this.dbManager.initialize();

      // Parse thread ID
      const id = parseInt(threadId);
      if (isNaN(id) || id < 1) {
        throw new Error('Thread ID must be a positive number');
      }

      // Get thread info
      const thread = await this.dbManager.getThread(id);
      if (!thread) {
        console.error(`❌ Thread ${id} not found`);
        process.exit(1);
      }

      // Get thread messages
      let messages = await this.dbManager.getThreadMessages(id);
      
      if (messages.length === 0) {
        console.log('📭 This thread has no messages');
        return;
      }

      // Resolve sender name from chatwork_users when message has no name (e.g. cancelled account)
      messages = await this.resolveSenderNames(messages);

      // Build map of user id -> name for [info][dtext:chatroom_member_is][piconname:id][dtext:chatroom_added][/info]
      const chatroomUserNamesMap = await this.buildChatroomAddedUserMap(messages);

      // Sort messages by message id (numeric order; stable when send_time is 0 for placeholders)
      messages.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));

      // Format output
      const format = options.format || 'text';
      const output = this.formatMessages(thread, messages, format, options.includeMetadata, chatroomUserNamesMap);

      // Output to file or console
      if (options.output) {
        writeFileSync(options.output, output, 'utf8');
        console.log(`✅ Thread content saved to: ${options.output}`);
      } else {
        console.log('\n' + output);
      }
      
    } catch (error) {
      console.error('❌ Failed to show thread:', error);
      process.exit(1);
    }
  }

  /** Collect user ids from [info]...(add-user patterns)[piconname:id][dtext:chatroom_added][/info] and resolve names. */
  private async buildChatroomAddedUserMap(messages: any[]): Promise<Map<string, string>> {
    const reMemberIs = /\[info\]\[dtext:chatroom_member_is\]\[piconname:(\d+)\]\[dtext:chatroom_added\]\[\/info\]/g;
    const reChatEdited = /\[info\]\[dtext:chatroom_chat_edited\]\[piconname:(\d+)\]\[dtext:chatroom_added\]\[\/info\]/g;
    const reTitleChatEdited = /\[info\]\[title\]\[dtext:chatroom_chat_edited\]\[\/title\]\[dtext:chatroom_member_is\]\[piconname:(\d+)\]\[dtext:chatroom_added\]\[\/info\]/g;
    const ids = new Set<string>();
    for (const m of messages) {
      if (!m.content) continue;
      for (const re of [reMemberIs, reChatEdited, reTitleChatEdited]) {
        re.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = re.exec(m.content)) !== null) ids.add(match[1]);
      }
    }
    const map = new Map<string, string>();
    for (const id of ids) {
      const user = await this.dbManager.getChatworkUser(ShowCommand.normalizeId(id));
      map.set(id, user?.name ?? `User ${id}`);
    }
    return map;
  }

  /** Resolve sender_name from chatwork_users when message has no/empty name (e.g. cancelled account). */
  private async resolveSenderNames(messages: any[]): Promise<any[]> {
    const out = [...messages];
    for (let i = 0; i < out.length; i++) {
      const m = out[i];
      if (!(m.sender_name && String(m.sender_name).trim()) && m.sender_id) {
        const lookupId = ShowCommand.normalizeId(m.sender_id);
        const user = await this.dbManager.getChatworkUser(lookupId);
        if (user?.name) {
          out[i] = { ...m, sender_name: `${user.name} (Cancelled)` };
        }
      }
    }
    return out;
  }

  /** Public so export-room can reuse. threadLike: { id, name, description?, created_at?, updated_at? } */
  formatMessages(
    threadLike: { id: number; name: string; description?: string; created_at?: Date; updated_at?: Date },
    messages: any[],
    format: 'text' | 'json' | 'markdown' | 'html',
    includeMetadata?: boolean,
    chatroomUserNamesMap?: Map<string, string>
  ): string {
    const userMap = chatroomUserNamesMap ?? new Map<string, string>();
    switch (format) {
      case 'json':
        return this.formatAsJson(threadLike, messages, includeMetadata);
      case 'markdown':
        return this.formatAsMarkdown(threadLike, messages, includeMetadata, userMap);
      case 'html':
        return this.formatAsHtml(threadLike, messages, includeMetadata, userMap);
      case 'text':
      default:
        return this.formatAsText(threadLike, messages, includeMetadata, userMap);
    }
  }

  private formatAsText(thread: any, messages: any[], includeMetadata?: boolean, chatroomUserNamesMap?: Map<string, string>): string {
    const userMap = chatroomUserNamesMap ?? new Map<string, string>();
    let output = '';
    
    // Thread header
    output += `🧵 Thread: ${thread.name}\n`;
    output += `📝 ID: ${thread.id}\n`;
    
    if (thread.description) {
      output += `📄 Description: ${thread.description}\n`;
    }
    
    if (includeMetadata) {
      output += `📅 Created: ${thread.created_at.toLocaleString()}\n`;
      output += `🔄 Updated: ${thread.updated_at.toLocaleString()}\n`;
    }
    
    output += `📊 Messages: ${messages.length}\n`;
    output += '═'.repeat(80) + '\n\n';

    // Messages
    messages.forEach((message, index) => {
      const date = new Date(message.send_time * 1000);
      const timestamp = formatDateTime(date);
      const senderLabel = (message.sender_name && String(message.sender_name).trim()) ? message.sender_name : '(Account cancelled)';
      output += `📨 Message ${index + 1}\n`;
      output += `👤 ${senderLabel} | ⏰ ${timestamp}\n`;
      
      if (includeMetadata) {
        output += `🆔 Message ID: ${message.id}\n`;
        output += `🏠 Room ID: ${message.room_id}\n`;
      }
      
      output += '─'.repeat(50) + '\n';
      const content = ShowCommand.replaceChatroomAdded(message.content || '', userMap, (name) => `  * [info] ${name} joined the group.\n`);
      output += content + '\n';
      output += '─'.repeat(50) + '\n\n';
    });

    return output;
  }

  private formatAsMarkdown(thread: any, messages: any[], includeMetadata?: boolean, chatroomUserNamesMap?: Map<string, string>): string {
    const userMap = chatroomUserNamesMap ?? new Map<string, string>();
    let output = '';
    
    // Thread header
    output += `# Thread: ${thread.name}\n\n`;
    output += `**Thread ID:** ${thread.id}\n\n`;
    
    if (thread.description) {
      output += `**Description:** ${thread.description}\n\n`;
    }
    
    if (includeMetadata) {
      output += `**Created:** ${thread.created_at.toLocaleString()}\n\n`;
      output += `**Updated:** ${thread.updated_at.toLocaleString()}\n\n`;
    }
    
    output += `**Messages:** ${messages.length}\n\n`;
    output += '---\n\n';

    // Messages
    messages.forEach((message, index) => {
      const date = new Date(message.send_time * 1000);
      const timestamp = formatDateTime(date);
      const senderLabel = (message.sender_name && String(message.sender_name).trim()) ? message.sender_name : '(Account cancelled)';
      output += `## Message ${index + 1}\n\n`;
      output += `**Sender:** ${senderLabel} | **Time:** ${timestamp}\n\n`;
      
      if (includeMetadata) {
        output += `**Message ID:** ${message.id}\n\n`;
        output += `**Room ID:** ${message.room_id}\n\n`;
      }
      
      const content = ShowCommand.replaceChatroomAdded(message.content || '', userMap, (name) => `> ** [info]** ${name} joined the group.\n\n`);
      output += '```\n';
      output += content + '\n';
      output += '```\n\n';
    });

    return output;
  }

  private formatAsJson(thread: any, messages: any[], includeMetadata?: boolean): string {
    const data = {
      thread: {
        id: thread.id,
        name: thread.name,
        description: thread.description,
        ...(includeMetadata && {
          created_at: thread.created_at,
          updated_at: thread.updated_at
        })
      },
      messages: messages.map(message => ({
        id: message.id,
        content: message.content,
        sender_name: message.sender_name,
        send_time: message.send_time,
        timestamp: new Date(message.send_time * 1000).toISOString(),
        ...(includeMetadata && {
          room_id: message.room_id,
          sender_id: message.sender_id,
          created_at: message.created_at,
          updated_at: message.updated_at
        })
      }))
    };

    return JSON.stringify(data, null, 2);
  }

  /** Replace add-user [info]...[/info] patterns with replacer(name). */
  private static replaceChatroomAdded(
    content: string,
    userMap: Map<string, string>,
    replacer: (name: string) => string
  ): string {
    const withTitle = /\[info\]\[title\]\[dtext:chatroom_chat_edited\]\[\/title\]\[dtext:chatroom_member_is\]\[piconname:(\d+)\]\[dtext:chatroom_added\]\[\/info\]/g;
    const withoutTitle = /\[info\]\[dtext:(?:chatroom_member_is|chatroom_chat_edited)\]\s*\[piconname:(\d+)\]\[dtext:chatroom_added\]\[\/info\]/g;
    return content
      .replace(withTitle, (_: string, id: string) => {
        const name = userMap.get(id) ?? `User ${id}`;
        return replacer(name);
      })
      .replace(withoutTitle, (_: string, id: string) => {
        const name = userMap.get(id) ?? `User ${id}`;
        return replacer(name);
      });
  }

  /** Id thực: bỏ phần .0 nếu có (vd 6452503.0 -> 6452503). */
  private static normalizeId(s: string): string {
    if (typeof s !== 'string') return String(s);
    return /^\d+\.0$/.test(s) ? s.slice(0, -2) : s;
  }

  /**
   * Replace [info]...[/info] by finding matching pairs (so we never match a [/info] inside nested [info] or code).
   * Ensures each replacement is a single closed <div> so one message's HTML cannot leak outside its .message block.
   */
  private static parseGenericInfoBlocks(s: string, replacer: (inner: string) => string): string {
    const open = '[info]';
    const close = '[/info]';
    let result = '';
    let i = 0;
    while (i < s.length) {
      const start = s.indexOf(open, i);
      if (start === -1) {
        result += s.slice(i);
        break;
      }
      result += s.slice(i, start);
      let depth = 1;
      let pos = start + open.length;
      let end = -1;
      while (pos < s.length && depth > 0) {
        const nextOpen = s.indexOf(open, pos);
        const nextClose = s.indexOf(close, pos);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + open.length;
        } else {
          depth--;
          if (depth === 0) {
            end = nextClose + close.length;
            break;
          }
          pos = nextClose + close.length;
        }
      }
      if (end === -1) {
        result += s.slice(start);
        break;
      }
      const inner = s.slice(start + open.length, end - close.length);
      result += replacer(inner);
      i = end;
    }
    return result;
  }

  private formatAsHtml(thread: any, messages: any[], includeMetadata?: boolean, chatroomUserNamesMap?: Map<string, string>): string {
    const userMap = chatroomUserNamesMap ?? new Map<string, string>();
    const escapeHtml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
    const normalizeId = ShowCommand.normalizeId;

    const inThreadMessageIds = new Set(messages.map((m: { id: string }) => normalizeId(m.id)));
    const formatContent = (content: string): string => {
      let s = escapeHtml(content).replace(/\n/g, '<br>');

      // Mask [code] and [qt] so generic [info] won't match a [/info] that appears inside them (would break layout)
      const codeBlocks: string[] = [];
      const qtBlocks: string[] = [];
      const CODE_PL = '\u0001CODE';
      const QT_PL = '\u0001QT';
      const PL_END = '\u0001';
      s = s.replace(/\[code\]([\s\S]*?)\[\/code\]/g, (_: string, inner: string) => {
        const idx = codeBlocks.length;
        codeBlocks.push(inner);
        return CODE_PL + idx + PL_END;
      });
      s = s.replace(/\[qt\]([\s\S]*?)\[\/qt\]/gs, (_: string, inner: string) => {
        const idx = qtBlocks.length;
        qtBlocks.push(inner);
        return QT_PL + idx + PL_END;
      });

      s = s
        // [info][dtext:chatroom_member_is][piconname:id][dtext:chatroom_added][/info] -> box "<name> joined the group."
        .replace(/\[info\]\[dtext:chatroom_member_is\]\[piconname:(\d+)\]\[dtext:chatroom_added\]\[\/info\]/g, (_: string, id: string) => {
          const name = userMap.get(id) ?? `User ${id}`;
          return `<div class="info-box info-box-system">${escapeHtml(name)} joined the group.</div>`;
        })
        // [info][dtext:chatroom_chat_edited][piconname:id][dtext:chatroom_added][/info] -> same (add user, alternate format)
        .replace(/\[info\]\[dtext:chatroom_chat_edited\]\[piconname:(\d+)\]\[dtext:chatroom_added\]\[\/info\]/g, (_: string, id: string) => {
          const name = userMap.get(id) ?? `User ${id}`;
          return `<div class="info-box info-box-system">${escapeHtml(name)} joined the group.</div>`;
        })
        // [info][title][dtext:chatroom_chat_edited][/title][dtext:chatroom_member_is][piconname:id][dtext:chatroom_added][/info] -> "<name> joined the group."
        .replace(/\[info\]\[title\]\[dtext:chatroom_chat_edited\]\[\/title\]\[dtext:chatroom_member_is\]\[piconname:(\d+)\]\[dtext:chatroom_added\]\[\/info\]/g, (_: string, id: string) => {
          const name = userMap.get(id) ?? `User ${id}`;
          return `<div class="info-box info-box-system">${escapeHtml(name)} joined the group.</div>`;
        })
        // Standalone [dtext:chatroom_chat_edited] (e.g. message edited, no add) -> short label
        .replace(/\[dtext:chatroom_chat_edited\]/g, () => '<span class="info-label">(Message edited)</span>')
        // Handle [qtmeta aid=xxx time=xxx] - Quote metadata with formatted time (BEFORE qt processing)
        .replace(/\[qtmeta\s+aid=\d+\s+time=(\d+)(?:\s+to=\d+-\d+)?\]/g, (match, timestamp) => {
          const date = new Date(parseInt(timestamp) * 1000);
          const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const weekday = weekdays[date.getDay()];
          return `<span class="quote-time">${year}/${month}/${day} (${weekday})</span>`;
        })
        // Handle URLs FIRST - convert http/https URLs to clickable links
        .replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" target="_blank" class="auto-link">$1</a>')
        // Handle [rp aid=xxx to=roomid-messageid] - Reply: link to in-thread anchor if in thread, else Chatwork
        .replace(/\[rp\s+aid=\d+\s+to=(\d+)-(\d+)\]/g, (_: string, roomId: string, messageId: string) => {
          const mid = normalizeId(messageId);
          const rid = normalizeId(roomId);
          const inThread = inThreadMessageIds.has(mid);
          const href = inThread ? `#msg-${mid}` : `https://www.chatwork.com/#!rid${rid}-${mid}`;
          const target = inThread ? '' : ' target="_blank"';
          return `<a href="${href}" class="reply-link"${target}><span class="reply-icon">[RE]</span></a>`;
        })
        // Handle [To:xxx] mentions
        .replace(/\[To:(\d+)\](.+?)\[\/To\]/g, '<span class="mention">@$2</span>')
        // Handle ANY [info] blocks with file attachments (ignore title, just focus on preview+download)
        .replace(/\[info\].*?\[preview\s+id=(\d+)\s+ht=(\d+)\].*?\[download:(\d+)\](.+?)\[\/download\].*?\[\/info\]/gs,
          (match, previewId, height, downloadId, filename) => {
            const trimmedFilename = escapeHtml(filename.trim());
            return `<div class="file-attachment">
  <a href="https://www.chatwork.com/gateway/download_file.php?bin=1&file_id=${downloadId}&preview=0" 
     target="_chatwork-image-${previewId}">
    ${trimmedFilename}
  </a>
</div>`;
          })
        // Handle file attachments without preview [info][download:xxx]filename[/download][/info]
        .replace(/\[info\]\[download:(\d+)\](.+?)\[\/download\]\[\/info\]/g,
          (match, downloadId, filename) => {
            const trimmedFilename = escapeHtml(filename.trim());
            return `<div class="file-attachment">
  <a href="https://www.chatwork.com/gateway/download_file.php?bin=1&file_id=${downloadId}&preview=0" class="file-download-link">📎 ${trimmedFilename}</a>
</div>`;
          });
        // (generic [info] done in parseGenericInfoBlocks below so we never emit an unclosed <div>)

      // Generic [info]...[/info]: find matching pairs so one message's output never "leaks" (unclosed tag would wrap all following content)
      s = ShowCommand.parseGenericInfoBlocks(s, (inner: string) => {
        const titleMatch = inner.match(/\[title\]([\s\S]*?)\[\/title\]/);
        let trimmed =
          titleMatch && titleMatch[1].trim()
            ? titleMatch[1].trim()
            : inner.replace(/\[\/?[^\]]*\]/g, '').trim();
        if (!trimmed) trimmed = '—';
        return `<div class="info-box">${escapeHtml(trimmed)}</div>`;
      });

      // Restore [code] and [qt] as HTML (placeholders are not touched by [info] now)
      const codePlaceholderRe = new RegExp(CODE_PL + '(\\d+)' + PL_END, 'g');
      const qtPlaceholderRe = new RegExp(QT_PL + '(\\d+)' + PL_END, 'g');
      s = s.replace(codePlaceholderRe, (_: string, i: string) => {
        const inner = codeBlocks[parseInt(i, 10)];
        return inner != null ? `<pre class="code-block"><code>${inner}</code></pre>` : '';
      });
      s = s.replace(qtPlaceholderRe, (_: string, i: string) => {
        const inner = qtBlocks[parseInt(i, 10)];
        return inner != null ? `<blockquote class="quote-block">${inner}</blockquote>` : '';
      });
      return s;
    };

    let html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thread: ${escapeHtml(thread.name)}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .thread-header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .thread-title {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .thread-meta {
            color: #666;
            font-size: 14px;
            margin-bottom: 5px;
        }
        .thread-description {
            background: #f8f9fa;
            padding: 10px;
            border-left: 4px solid #007bff;
            margin-top: 10px;
        }
        .message {
            background: white;
            margin-bottom: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .message-content {
            flex: 0 1 auto;
        }
        .message-header {
            background: #007bff;
            color: white;
            padding: 10px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }
        .message-sender {
            font-weight: bold;
            font-size: 16px;
        }
        .message-time {
            font-size: 12px;
            opacity: 0.9;
        }
        .message-ids {
            flex: 0 0 auto;
            background: #f0f4f8;
            padding: 6px 15px;
            font-size: 12px;
            color: #555;
            border-top: 1px solid #e0e0e0;
        }
        .message-ids .metadata-link {
            color: #007bff;
        }
        .message-content {
            padding: 15px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .message-metadata {
            background: #f8f9fa;
            padding: 8px 15px;
            border-top: 1px solid #dee2e6;
            font-size: 12px;
            color: #666;
        }
        .metadata-link {
            color: #007bff;
            text-decoration: none;
            font-weight: 500;
            padding: 1px 3px;
            border-radius: 2px;
            transition: all 0.2s;
        }
        .metadata-link:hover {
            color: #0056b3;
            background-color: #e7f3ff;
            text-decoration: underline;
        }
        .auto-link {
            color: #0066cc;
            text-decoration: underline;
            word-break: break-all;
            transition: all 0.2s;
        }
        .auto-link:hover {
            color: #0056b3;
            background-color: rgba(0, 102, 204, 0.1);
        }
        .mention {
            background: #e7f3ff;
            color: #0066cc;
            padding: 2px 4px;
            border-radius: 3px;
            font-weight: bold;
        }
        .info-box {
            background: #e8f4f8;
            border: 1px solid #b3d9e6;
            border-radius: 3px;
            margin: 2px 0;
            line-height: 1.2;
        }
        .info-label {
            color: #6c757d;
            font-size: 12px;
            font-style: italic;
        }
        .info-title {
            background: #d1ecf1;
            padding: 2px 6px;
            font-weight: bold;
            border-bottom: 1px solid #b3d9e6;
            font-size: 11px;
            line-height: 1.1;
        }
        .info-content {
            padding: 2px 6px;
            line-height: 1.2;
        }
        .code-block {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 12px;
            margin: 10px 0;
            overflow-x: auto;
        }
        .file-attachment {
            display: inline-block;
            margin: 0;
        }
        .file-attachment a {
            color: #007bff;
            text-decoration: none;
            font-weight: 500;
            background: #f0f7ff;
            padding: 1px 4px;
            border-radius: 2px;
            border: 1px solid #d1ecf1;
            display: inline-block;
            white-space: nowrap;
            transition: all 0.2s;
            font-size: 11px;
            line-height: 1.1;
        }
        .file-attachment a:hover {
            color: #0056b3;
            background: #e7f3ff;
            text-decoration: underline;
        }
        .file-attachment a:before {
            content: "📎 ";
            margin-right: 4px;
        }
        .file-download-link {
            color: #007bff;
            text-decoration: none;
            font-weight: 500;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .file-download-link:hover {
            background-color: #e7f3ff;
            text-decoration: underline;
        }
        .code-block code {
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
            color: #333;
        }
        .stats {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            text-align: center;
        }
        .reply-link {
            text-decoration: none;
            display: inline-block;
            margin-right: 8px;
        }
        .reply-icon {
            background: #007bff;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        .reply-link:hover .reply-icon {
            background: #0056b3;
        }
        .quote-block {
            background: #f8f9fa;
            border-left: 4px solid #6c757d;
            margin: 10px 0;
            padding: 10px 15px;
            font-style: italic;
            color: #495057;
        }
        .quote-block br {
            margin-bottom: 5px;
        }
        .quote-time {
            font-size: 11px;
            color: #6c757d;
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
            margin-right: 8px;
            font-weight: normal;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .message-header {
                flex-direction: column;
                align-items: flex-start;
            }
            .message-time {
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="thread-header">
        <div class="thread-title">🧵 ${escapeHtml(thread.name)}</div>
        <div class="thread-meta">📝 Thread ID: ${thread.id}</div>`;

    if (thread.description) {
      html += `        <div class="thread-description">
            <strong>📄 Description:</strong><br>
            ${escapeHtml(thread.description)}
        </div>`;
    }

    if (includeMetadata) {
      html += `        <div class="thread-meta">📅 Created: ${new Date(thread.created_at).toLocaleString()}</div>
        <div class="thread-meta">🔄 Updated: ${new Date(thread.updated_at).toLocaleString()}</div>`;
    }

    html += `    </div>

    <div class="stats">
        📊 Total Messages: ${messages.length}
    </div>`;

    // Messages
    const chatworkMessageUrl = (roomId: string, messageId: string) =>
      `https://www.chatwork.com/#!rid${roomId}-${messageId}`;
    messages.forEach((message, index) => {
      const date = new Date(message.send_time * 1000);
      const timestamp = formatDateTime(date);
      const senderLabel = (message.sender_name && String(message.sender_name).trim())
        ? escapeHtml(message.sender_name)
        : `(Account cancelled${message.sender_id ? ` / ID: ${escapeHtml(normalizeId(message.sender_id))}` : ''})`;

      const rid = normalizeId(message.room_id);
      const mid = normalizeId(message.id);
      const chatworkUrl = chatworkMessageUrl(rid, mid);
      html += `
    <div class="message" id="msg-${escapeHtml(mid)}" data-room-id="${escapeHtml(rid)}" data-message-id="${escapeHtml(mid)}">
        <div class="message-header">
            <div class="message-sender">👤 ${senderLabel}</div>
            <div class="message-time">⏰ ${timestamp}</div>
        </div>
        <div class="message-content">${formatContent(message.content)}</div>
        <div class="message-ids">🔗 <a href="${chatworkUrl}" target="_blank" rel="noopener" class="metadata-link">Open in Chatwork</a> | Room ID: <a href="https://www.chatwork.com/#!rid${rid}" target="_blank" class="metadata-link">${rid}</a> | Message ID: <a href="${chatworkUrl}" target="_blank" class="metadata-link">${mid}</a></div>`;
      
      if (includeMetadata) {
        html += `        <div class="message-metadata">
            🆔 Message ID: <a href="${chatworkMessageUrl(rid, mid)}" target="_blank" class="metadata-link">${mid}</a> | 
            🏠 Room ID: <a href="https://www.chatwork.com/#!rid${rid}" target="_blank" class="metadata-link">${rid}</a>
        </div>`;
      }
      
      html += `    </div>`;
    });

    html += `
</body>
</html>`;

    return html;
  }

  static register(program: Command, dbManager: DatabaseManager): void {
    const showCommand = new ShowCommand(dbManager);
    
    program
      .command('show <thread-id>')
      .description('Show thread content')
      .option('-f, --format <format>', 'Output format (text, json, markdown, html)', 'text')
      .option('-o, --output <file>', 'Save to file')
      .option('--include-metadata', 'Include detailed metadata')
      .action(async (threadId: string, options: ShowOptions) => {
        await showCommand.execute(threadId, options);
      });
  }
}
