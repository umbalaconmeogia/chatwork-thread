// Chatwork API Types
export interface ChatworkMessage {
  message_id: string;
  account: {
    account_id: number;
    name: string;
    avatar_image_url: string;
  };
  body: string;
  send_time: number;
  update_time: number;
}

export interface ChatworkRoom {
  room_id: number;
  name: string;
  type: string;
  role: string;
  sticky: boolean;
  unread_num: number;
  mention_num: number;
  mytask_num: number;
  message_num: number;
  file_num: number;
  task_num: number;
  icon_path: string;
  last_update_time: number;
}

export interface ChatworkUser {
  account_id: number;
  name: string;
  avatar_image_url: string;
}

export interface ChatworkAPIResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

export interface ChatworkAPIError {
  message: string;
  code: string;
  status: number;
}

// Local Database Types
export interface Thread {
  id: number;
  name: string;
  root_message_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string; // Chatwork message_id
  room_id: number;
  account_id: number;
  body: string;
  send_time: number;
  update_time: number;
  cache_expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ThreadMessage {
  thread_id: number;
  message_id: string;
  created_at: string;
}

export interface ChatworkUserLocal {
  account_id: number;
  name: string;
  avatar_image_url: string;
  created_at: string;
  updated_at: string;
}

// Configuration Types
export interface ChatworkAPIConfig {
  apiToken: string;
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Error Types
export class ChatworkAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = 'ChatworkAPIError';
  }
}

export class MessageNotFoundError extends Error {
  constructor(messageId: string) {
    super(`Message not found: ${messageId}`);
    this.name = 'MessageNotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(retryAfter?: number) {
    super(`Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter} seconds` : ''}`);
    this.name = 'RateLimitError';
  }
}
