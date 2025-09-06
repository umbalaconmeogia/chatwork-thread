import { config } from 'dotenv';
import { join } from 'path';

export interface AppConfig {
  api: {
    token: string;
    baseURL: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  database: {
    path: string;
    backupPath: string;
    backupInterval: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
  thread: {
    maxMessages: number;
    analysisTimeout: number;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    // Load .env file
    config({ path: join(process.cwd(), '.env') });
    
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AppConfig {
    return {
      api: {
        token: process.env.CHATWORK_API_TOKEN || '',
        baseURL: process.env.CHATWORK_API_BASE_URL || 'https://api.chatwork.com/v2',
        timeout: parseInt(process.env.API_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000')
      },
      database: {
        path: process.env.DATABASE_PATH || './data/chatwork-thread.db',
        backupPath: process.env.DB_BACKUP_PATH || './data/backups/',
        backupInterval: parseInt(process.env.DB_BACKUP_INTERVAL || '86400000') // 24h
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
        file: process.env.LOG_FILE
      },
      thread: {
        maxMessages: parseInt(process.env.THREAD_MAX_MESSAGES || '1000'),
        analysisTimeout: parseInt(process.env.THREAD_ANALYSIS_TIMEOUT || '30000')
      }
    };
  }

  private validateConfig(): void {
    if (!this.config.api.token) {
      throw new Error('CHATWORK_API_TOKEN is required. Please set it in .env file.');
    }
    
    if (!this.config.database.path) {
      throw new Error('Database path is required');
    }
    
    // Validate API token format (basic validation)
    if (this.config.api.token && !/^[a-zA-Z0-9]{20,}$/.test(this.config.api.token)) {
      console.warn('Warning: Chatwork API token may have invalid format');
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public get<T>(key: string, defaultValue?: T): T {
    const keys = key.split('.');
    let value: any = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue as T;
      }
    }
    
    return value as T;
  }

  public updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }
}
