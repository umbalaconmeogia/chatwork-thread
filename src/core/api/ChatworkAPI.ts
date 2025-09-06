import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ChatworkMessage,
  ChatworkRoom,
  ChatworkUser,
  ChatworkAPIConfig,
  ChatworkAPIError,
  MessageNotFoundError,
  RateLimitError
} from '../types/chatwork';

export class ChatworkAPI {
  private client: AxiosInstance;
  private config: ChatworkAPIConfig;

  constructor(config: ChatworkAPIConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'X-ChatWorkToken': config.apiToken,
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[ChatworkAPI] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[ChatworkAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response;
          
          if (status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            throw new RateLimitError(retryAfter);
          }
          
          if (status === 404) {
            throw new MessageNotFoundError('Message not found');
          }
          
          throw new ChatworkAPIError(
            data?.message || error.message,
            data?.code || 'UNKNOWN_ERROR',
            status
          );
        }
        
        throw new ChatworkAPIError(
          error.message,
          'NETWORK_ERROR',
          0
        );
      }
    );
  }

  /**
   * Get message by ID
   */
  async getMessage(roomId: number, messageId: string): Promise<ChatworkMessage> {
    try {
      const response: AxiosResponse<ChatworkMessage> = await this.client.get(
        `/rooms/${roomId}/messages/${messageId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof MessageNotFoundError) {
        throw new MessageNotFoundError(messageId);
      }
      throw error;
    }
  }

  /**
   * Get messages from a room
   */
  async getMessages(roomId: number, force: boolean = false): Promise<ChatworkMessage[]> {
    try {
      const response: AxiosResponse<ChatworkMessage[]> = await this.client.get(
        `/rooms/${roomId}/messages`,
        {
          params: { force: force ? 1 : 0 }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get room information
   */
  async getRoom(roomId: number): Promise<ChatworkRoom> {
    try {
      const response: AxiosResponse<ChatworkRoom> = await this.client.get(
        `/rooms/${roomId}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user information
   */
  async getUser(userId: number): Promise<ChatworkUser> {
    try {
      const response: AxiosResponse<ChatworkUser> = await this.client.get(
        `/contacts/${userId}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get my information
   */
  async getMe(): Promise<ChatworkUser> {
    try {
      const response: AxiosResponse<ChatworkUser> = await this.client.get('/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get rooms list
   */
  async getRooms(): Promise<ChatworkRoom[]> {
    try {
      const response: AxiosResponse<ChatworkRoom[]> = await this.client.get('/rooms');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse message ID from Chatwork URL
   * Example: https://www.chatwork.com/#!rid368838329-2015782344493105152
   */
  static parseMessageIdFromUrl(url: string): { roomId: number; messageId: string } | null {
    try {
      // Extract room ID and message ID from URL
      const match = url.match(/rid(\d+)-(\d+)/);
      if (match) {
        const roomId = parseInt(match[1], 10);
        const messageId = match[2];
        return { roomId, messageId };
      }
      return null;
    } catch (error) {
      console.error('Error parsing Chatwork URL:', error);
      return null;
    }
  }

  /**
   * Validate message ID format
   */
  static isValidMessageId(messageId: string): boolean {
    // Chatwork message IDs are typically numeric strings
    return /^\d+$/.test(messageId);
  }

  /**
   * Validate room ID format
   */
  static isValidRoomId(roomId: number): boolean {
    return Number.isInteger(roomId) && roomId > 0;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getMe();
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}
