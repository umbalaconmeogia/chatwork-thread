import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { DatabaseManager } from '../../core/database/DatabaseManager';

interface ShowOptions {
  format?: 'text' | 'json' | 'markdown' | 'html';
  output?: string;
  includeMetadata?: boolean;
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
      const messages = await this.dbManager.getThreadMessages(id);
      
      if (messages.length === 0) {
        console.log('📭 This thread has no messages');
        return;
      }

      // Sort messages by send_time
      messages.sort((a, b) => a.send_time - b.send_time);

      // Format output
      const format = options.format || 'text';
      let output = '';

      switch (format) {
        case 'json':
          output = this.formatAsJson(thread, messages, options.includeMetadata);
          break;
        case 'markdown':
          output = this.formatAsMarkdown(thread, messages, options.includeMetadata);
          break;
        case 'html':
          output = this.formatAsHtml(thread, messages, options.includeMetadata);
          break;
        case 'text':
        default:
          output = this.formatAsText(thread, messages, options.includeMetadata);
          break;
      }

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

  private formatAsText(thread: any, messages: any[], includeMetadata?: boolean): string {
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
      const timestamp = includeMetadata 
        ? date.toLocaleString() 
        : date.toLocaleTimeString();
      
      output += `📨 Message ${index + 1}\n`;
      output += `👤 ${message.sender_name} | ⏰ ${timestamp}\n`;
      
      if (includeMetadata) {
        output += `🆔 Message ID: ${message.id}\n`;
        output += `🏠 Room ID: ${message.room_id}\n`;
      }
      
      output += '─'.repeat(50) + '\n';
      output += message.content + '\n';
      output += '─'.repeat(50) + '\n\n';
    });

    return output;
  }

  private formatAsMarkdown(thread: any, messages: any[], includeMetadata?: boolean): string {
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
      const timestamp = includeMetadata 
        ? date.toLocaleString() 
        : date.toLocaleTimeString();
      
      output += `## Message ${index + 1}\n\n`;
      output += `**Sender:** ${message.sender_name} | **Time:** ${timestamp}\n\n`;
      
      if (includeMetadata) {
        output += `**Message ID:** ${message.id}\n\n`;
        output += `**Room ID:** ${message.room_id}\n\n`;
      }
      
      output += '```\n';
      output += message.content + '\n';
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

  private formatAsHtml(thread: any, messages: any[], includeMetadata?: boolean): string {
    const escapeHtml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const formatContent = (content: string): string => {
      return escapeHtml(content)
        .replace(/\n/g, '<br>')
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
        // Handle [rp aid=xxx to=roomid-messageid] - Reply references
        .replace(/\[rp\s+aid=\d+\s+to=(\d+-\d+)\]/g, 
          '<a href="https://www.chatwork.com/#!rid$1" class="reply-link" target="_blank">' +
          '<span class="reply-icon">[RE]</span></a>')
        // Handle [qt]...[/qt] - Quoted content
        .replace(/\[qt\](.+?)\[\/qt\]/gs, '<blockquote class="quote-block">$1</blockquote>')
        // Handle [To:xxx] mentions
        .replace(/\[To:(\d+)\](.+?)\[\/To\]/g, '<span class="mention">@$2</span>')
        // Handle [info] blocks
        .replace(/\[info\]\[title\](.+?)\[\/title\](.+?)\[\/info\]/gs, 
          '<div class="info-box"><div class="info-title">$1</div><div class="info-content">$2</div></div>')
        // Handle [code] blocks
        .replace(/\[code\](.+?)\[\/code\]/gs, '<pre class="code-block"><code>$1</code></pre>');
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
        }
        .message-header {
            background: #007bff;
            color: white;
            padding: 10px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .message-sender {
            font-weight: bold;
            font-size: 16px;
        }
        .message-time {
            font-size: 12px;
            opacity: 0.9;
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
            border-radius: 4px;
            margin: 10px 0;
        }
        .info-title {
            background: #d1ecf1;
            padding: 8px 12px;
            font-weight: bold;
            border-bottom: 1px solid #b3d9e6;
        }
        .info-content {
            padding: 8px 12px;
        }
        .code-block {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 12px;
            margin: 10px 0;
            overflow-x: auto;
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
    messages.forEach((message, index) => {
      const date = new Date(message.send_time * 1000);
      const timestamp = includeMetadata 
        ? date.toLocaleString() 
        : date.toLocaleTimeString();
      
      html += `
    <div class="message">
        <div class="message-header">
            <div class="message-sender">👤 ${escapeHtml(message.sender_name)}</div>
            <div class="message-time">⏰ ${timestamp}</div>
        </div>
        <div class="message-content">${formatContent(message.content)}</div>`;
      
      if (includeMetadata) {
        html += `        <div class="message-metadata">
            🆔 Message ID: ${message.id} | 🏠 Room ID: ${message.room_id}
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
