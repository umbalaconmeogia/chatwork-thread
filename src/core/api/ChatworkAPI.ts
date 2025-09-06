import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ChatworkMessageResponse, 
  ChatworkRoomResponse, 
  ChatworkUserResponse,
  Message, 
  ChatworkAPIConfig 
} from '../types/chatwork';

export class ChatworkAPIError extends Error {
  constructor(
    message: string, 
    public statusCode?: number, 
    public response?: any
  ) {
    super(message);
    this.name = 'ChatworkAPIError';
  }
}

export class ChatworkAPI {
  private client: AxiosInstance;
  private config: ChatworkAPIConfig;

  constructor(apiToken: string, config?: Partial<ChatworkAPIConfig>) {
    this.config = {
      baseURL: 'https://api.chatwork.com/v2',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'X-ChatWorkToken': apiToken,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response) {
          const { status, data } = error.response;
          
          // Handle rate limiting
          if (status === 429) {
            console.log('⏱️ Rate limit hit, waiting...');
            await this.handleRateLimit();
            return this.client.request(error.config);
          }

          throw new ChatworkAPIError(
            `API Error: ${data?.message || error.message}`,
            status,
            data
          );
        }
        
        throw new ChatworkAPIError(`Network Error: ${error.message}`);
      }
    );
  }

  private async handleRateLimit(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.request({
        method,
        url: endpoint,
        data
      });
      
      
      return response.data;
    } catch (error) {
      if (error instanceof ChatworkAPIError) {
        throw error;
      }
      throw new ChatworkAPIError(`Request failed: ${error}`);
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getMe();
      return true;
    } catch (error) {
      console.error('❌ API Connection test failed:', error);
      return false;
    }
  }

  // Get current user info
  async getMe(): Promise<ChatworkUserResponse> {
    return this.makeRequest<ChatworkUserResponse>('GET', '/me');
  }

  // Get user rooms
  async getRooms(): Promise<ChatworkRoomResponse[]> {
    return this.makeRequest<ChatworkRoomResponse[]>('GET', '/rooms');
  }

  // Get room info
  async getRoom(roomId: string): Promise<ChatworkRoomResponse> {
    return this.makeRequest<ChatworkRoomResponse>('GET', `/rooms/${roomId}`);
  }

  // Get messages from a room
  async getMessages(roomId: string, force: boolean = false): Promise<Message[]> {
    const params = force ? '?force=1' : '';
    const response = await this.makeRequest<ChatworkMessageResponse[]>(
      'GET', 
      `/rooms/${roomId}/messages${params}`
    );
    
    // Response should be array of messages
    if (!Array.isArray(response)) {
      throw new ChatworkAPIError('Invalid response format: expected array of messages');
    }
    
    return response.map((msg: ChatworkMessageResponse) => ({
      id: msg.message_id,
      content: msg.body,
      send_time: msg.send_time,
      room_id: roomId,
      sender_id: msg.account.account_id,
      sender_name: msg.account.name,
      raw_data: JSON.stringify(msg),
      created_at: new Date(),
      updated_at: new Date(),
      cache_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    }));
  }

  // Get specific message
  async getMessage(roomId: string, messageId: string): Promise<Message> {
    const response = await this.makeRequest<ChatworkMessageResponse>(
      'GET', 
      `/rooms/${roomId}/messages/${messageId}`
    );
    
    return {
      id: response.message_id,
      content: response.body,
      send_time: response.send_time,
      room_id: roomId,
      sender_id: response.account.account_id,
      sender_name: response.account.name,
      raw_data: JSON.stringify(response),
      created_at: new Date(),
      updated_at: new Date(),
      cache_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000)
    };
  }

  // Static utility methods
  static parseMessageIdFromUrl(url: string): { roomId: string; messageId: string } | null {
    // Parse URL format: https://www.chatwork.com/#!rid{room_id}-{message_id}
    const match = url.match(/rid(\d+)-(\d+)$/);
    if (match) {
      return {
        roomId: match[1],
        messageId: match[2]
      };
    }
    return null;
  }

  static isValidMessageId(messageId: string): boolean {
    return /^\d+$/.test(messageId);
  }

  static isValidRoomId(roomId: string): boolean {
    return /^\d+$/.test(roomId);
  }

  static isValidChatworkUrl(url: string): boolean {
    return /^https:\/\/www\.chatwork\.com\/#!rid\d+-\d+$/.test(url);
  }
}
