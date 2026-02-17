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

/** Thrown when Chatwork API returns 429 and retries are exhausted. */
export class ChatworkRateLimitError extends ChatworkAPIError {
  constructor(
    message: string,
    public resetAt?: Date,
    public resetUnix?: number,
    response?: any
  ) {
    super(message, 429, response);
    this.name = 'ChatworkRateLimitError';
  }
}

const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_LOW_THRESHOLD = 10; // sleep until reset when remaining <= this

export class ChatworkAPI {
  private client: AxiosInstance;
  private config: ChatworkAPIConfig;
  private lastRateLimitRemaining: number | null = null;
  private lastRateLimitReset: number | null = null; // Unix seconds
  /** Optional progress for request logging: current/total (e.g. parse-room-html --fetch). */
  private requestProgress: { current: number; total: number } | null = null;

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

  /**
   * Set progress for next API request log (e.g. "3/100" at start of line).
   * Cleared after the next request. Pass null to clear without logging.
   */
  setRequestProgress(current: number, total: number): void {
    this.requestProgress = { current, total };
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      const p = this.requestProgress;
      const prefix = p ? `${p.current}/${p.total} ` : '';
      this.requestProgress = null;
      console.log(`${prefix}🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Response: capture rate limit headers on success
    this.client.interceptors.response.use(
      (response) => {
        this.saveRateLimitHeaders(response.headers);
        return response;
      },
      async (error) => {
        if (error.response) {
          const { status, data, headers } = error.response;

          if (status === 429) {
            const retries = (error.config._rateLimitRetries ?? 0) + 1;
            error.config._rateLimitRetries = retries;

            const resetUnix = headers['x-ratelimit-reset']
              ? parseInt(String(headers['x-ratelimit-reset']), 10)
              : null;
            const resetAt = resetUnix ? new Date(resetUnix * 1000) : null;

            if (retries >= RATE_LIMIT_MAX_RETRIES) {
              const resetMsg = resetAt
                ? ` Chờ đến ${resetAt.toLocaleString()} (Unix: ${resetUnix}) rồi thử lại.`
                : ' Đợi vài phút rồi thử lại.';
              throw new ChatworkRateLimitError(
                `Chatwork API đã chặn do vượt giới hạn request (429). Giới hạn: 300 request / 5 phút.${resetMsg} Xem: https://developer.chatwork.com/docs/endpoints`,
                resetAt ?? undefined,
                resetUnix ?? undefined,
                data
              );
            }

            const waitMs = resetUnix
              ? Math.max(2000, resetUnix * 1000 - Date.now())
              : this.config.retryDelay * retries;
            console.log(
              `⏱️ Rate limit (429), lần thử ${retries}/${RATE_LIMIT_MAX_RETRIES}. Chờ ${Math.round(waitMs / 1000)}s...`
            );
            await new Promise((r) => setTimeout(r, Math.min(waitMs, 60_000)));
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

  private saveRateLimitHeaders(headers: Record<string, unknown>): void {
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    if (remaining !== undefined && remaining !== '') {
      this.lastRateLimitRemaining = parseInt(String(remaining), 10);
    }
    if (reset !== undefined && reset !== '') {
      this.lastRateLimitReset = parseInt(String(reset), 10);
    }
  }

  /**
   * If we're close to rate limit, sleep until the reset window.
   * Call this between paginated requests to avoid 429.
   */
  private async waitIfNearRateLimit(): Promise<void> {
    if (
      this.lastRateLimitRemaining != null &&
      this.lastRateLimitRemaining <= RATE_LIMIT_LOW_THRESHOLD &&
      this.lastRateLimitReset != null
    ) {
      const waitMs = this.lastRateLimitReset * 1000 - Date.now();
      if (waitMs > 1000) {
        console.log(
          `⏳ Gần đạt rate limit (còn ${this.lastRateLimitRemaining} request). Chờ ${Math.round(waitMs / 1000)}s đến khi reset...`
        );
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
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
  async getMessages(
    roomId: string,
    forceOrOptions: boolean | { force?: boolean; limit?: number; offset?: number } = false
  ): Promise<Message[]> {
    const options =
      typeof forceOrOptions === 'boolean'
        ? { force: forceOrOptions }
        : { force: false, ...forceOrOptions };
    const params = new URLSearchParams();
    if (options.force) params.set('force', '1');
    if (options.limit != null) params.set('limit', String(options.limit));
    if (options.offset != null) params.set('offset', String(options.offset));
    const query = params.toString();
    const url = `/rooms/${roomId}/messages${query ? `?${query}` : ''}`;
    const response = await this.makeRequest<ChatworkMessageResponse[] | { errors?: string[] }>(
      'GET',
      url
    );

    if (!Array.isArray(response)) {
      const errMsg =
        response && typeof response === 'object' && Array.isArray((response as any).errors)
          ? `Chatwork API error: ${(response as any).errors.join(', ')}`
          : `Invalid response format: expected array of messages. Got: ${typeof response}${response && typeof response === 'object' ? ' (keys: ' + Object.keys(response).join(', ') + ')' : ''}`;
      throw new ChatworkAPIError(errMsg, undefined, response);
    }

    return response.map((msg: ChatworkMessageResponse) => {
      const account = msg.account || {};
      const name = account.name && String(account.name).trim();
      return {
      id: msg.message_id,
      content: msg.body,
      send_time: msg.send_time,
      room_id: roomId,
      sender_id: account.account_id ?? '',
      sender_name: name || '(Account cancelled)',
      raw_data: JSON.stringify(msg),
      created_at: new Date(),
      updated_at: new Date(),
      cache_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    };
    });
  }

  /**
   * Fetch all messages in a room using pagination (limit/offset).
   * Throttles requests (delay + optional wait until rate-limit reset) to avoid 429.
   * @param startOffset - Bắt đầu từ offset này (resume sau khi bị 429).
   * @param onChunk - Gọi sau mỗi chunk thành công; dùng để lưu vào DB ngay.
   * @param onProgress - Gọi với offset tiếp theo sau mỗi chunk; dùng để lưu tiến độ (resume).
   */
  async getAllRoomMessages(
    roomId: string,
    options: {
      force?: boolean;
      pageSize?: number;
      startOffset?: number;
      onChunk?: (chunk: Message[]) => Promise<void>;
      onProgress?: (nextOffset: number) => Promise<void>;
    } = {}
  ): Promise<Message[]> {
    const { force = true, pageSize = 100, startOffset = 0, onChunk, onProgress } = options;
    const all: Message[] = [];
    let offset = startOffset;
    const delayMs = 1200; // baseline: ~250 req/5min, dưới 300

    while (true) {
      try {
        const chunk = await this.getMessages(roomId, {
          force: offset === 0 ? force : false,
          limit: pageSize,
          offset
        });
        all.push(...chunk);
        if (onChunk && chunk.length > 0) await onChunk(chunk);
        const nextOffset = offset + chunk.length;
        if (onProgress && chunk.length > 0) await onProgress(nextOffset);
        if (chunk.length < pageSize) break;
        offset = nextOffset;
        await this.waitIfNearRateLimit();
        await new Promise((r) => setTimeout(r, delayMs));
      } catch (err) {
        if (offset > 0 && err instanceof ChatworkAPIError) {
          console.warn(
            '⚠️ Request with offset failed (API may not support limit/offset). Returning messages fetched so far. Error:',
            err.message
          );
          break;
        }
        throw err;
      }
    }
    return all;
  }

  // Get specific message
  async getMessage(roomId: string, messageId: string): Promise<Message> {
    const response = await this.makeRequest<ChatworkMessageResponse>(
      'GET', 
      `/rooms/${roomId}/messages/${messageId}`
    );
    
    const account = response.account || {};
    return {
      id: response.message_id,
      content: response.body,
      send_time: response.send_time,
      room_id: roomId,
      sender_id: account.account_id ?? '',
      sender_name: (account.name && String(account.name).trim()) ? account.name : '(Account cancelled)',
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
