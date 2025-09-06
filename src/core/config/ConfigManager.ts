import dotenv from 'dotenv';
import path from 'path';
import { ChatworkAPIConfig } from '../types/chatwork';

// Load environment variables from .env file
dotenv.config();

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ChatworkAPIConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): ChatworkAPIConfig {
    // Validate required environment variables
    const apiToken = process.env.CHATWORK_API_TOKEN;
    if (!apiToken || apiToken === 'your_api_token_here') {
      throw new Error('CHATWORK_API_TOKEN is required. Please set it in .env file or environment variables.');
    }

    return {
      apiToken,
      baseURL: process.env.CHATWORK_API_BASE_URL || 'https://api.chatwork.com/v2',
      timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
      retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3', 10),
      retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000', 10)
    };
  }

  public getChatworkAPIConfig(): ChatworkAPIConfig {
    return { ...this.config };
  }

  public getDatabasePath(): string {
    return process.env.DB_PATH || './data/threads.db';
  }

  public getBackupPath(): string {
    return process.env.DB_BACKUP_PATH || './data/backups/';
  }

  public getBackupInterval(): number {
    return parseInt(process.env.DB_BACKUP_INTERVAL || '86400000', 10);
  }

  public getLogLevel(): string {
    return process.env.LOG_LEVEL || 'info';
  }

  public getLogFile(): string | undefined {
    return process.env.LOG_FILE || undefined;
  }

  public getThreadMaxMessages(): number {
    return parseInt(process.env.THREAD_MAX_MESSAGES || '1000', 10);
  }

  public getThreadAnalysisTimeout(): number {
    return parseInt(process.env.THREAD_ANALYSIS_TIMEOUT || '30000', 10);
  }

  public validateConfig(): boolean {
    try {
      this.loadConfig();
      return true;
    } catch (error) {
      console.error('Configuration validation failed:', error.message);
      return false;
    }
  }

  public printConfig(): void {
    console.log('📋 Current Configuration:');
    console.log(`   API Base URL: ${this.config.baseURL}`);
    console.log(`   API Timeout: ${this.config.timeout}ms`);
    console.log(`   Retry Attempts: ${this.config.retryAttempts}`);
    console.log(`   Retry Delay: ${this.config.retryDelay}ms`);
    console.log(`   Database Path: ${this.getDatabasePath()}`);
    console.log(`   Log Level: ${this.getLogLevel()}`);
    console.log(`   Thread Max Messages: ${this.getThreadMaxMessages()}`);
    console.log(`   Thread Analysis Timeout: ${this.getThreadAnalysisTimeout()}ms`);
  }
}
