import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { DatabaseManager } from '../../core/database/DatabaseManager';

interface ShowOptions {
  format?: 'text' | 'json' | 'markdown';
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

  static register(program: Command, dbManager: DatabaseManager): void {
    const showCommand = new ShowCommand(dbManager);
    
    program
      .command('show <thread-id>')
      .description('Show thread content')
      .option('-f, --format <format>', 'Output format (text, json, markdown)', 'text')
      .option('-o, --output <file>', 'Save to file')
      .option('--include-metadata', 'Include detailed metadata')
      .action(async (threadId: string, options: ShowOptions) => {
        await showCommand.execute(threadId, options);
      });
  }
}
