// Chatwork API Response Types
export interface ChatworkMessageResponse {
  message_id: string;
  body: string;
  send_time: number;
  update_time: number;
  account: {
    account_id: string;
    name: string;
    avatar_image_url?: string;
  };
}

export interface ChatworkRoomResponse {
  room_id: string;
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

export interface ChatworkUserResponse {
  account_id: string;
  room_id: string;
  name: string;
  chatwork_id: string;
  organization_id: string;
  organization_name: string;
  department: string;
  title: string;
  url: string;
  introduction: string;
  mail: string;
  tel_organization: string;
  tel_extension: string;
  tel_mobile: string;
  skype: string;
  facebook: string;
  twitter: string;
  avatar_image_url: string;
  login_mail: string;
}

// Local Data Models
export interface Message {
  id: string;                    // Chatwork's message_id (string)
  content: string;               // Chatwork's body
  send_time: number;             // Chatwork's send_time (timestamp)
  room_id: string;               // Chatwork's room_id (from request)
  sender_id: string;             // Chatwork's account.account_id
  sender_name: string;           // Chatwork's account.name
  raw_data?: string;             // JSON string of original Chatwork API response
  created_at?: Date;             // Local timestamp
  updated_at?: Date;             // Local timestamp
  cache_expires_at?: Date;       // Local cache management
}

export interface Thread {
  id: number;                    // Local auto-increment ID
  name: string;                  // User-defined thread name
  description?: string;          // User-defined thread description
  created_at: Date;              // Local timestamp
  updated_at: Date;              // Local timestamp
}

export interface ThreadMessage {
  thread_id: number;             // Local thread ID
  message_id: string;            // Chatwork API: message_id
  relationship_type: RelationshipType; // Local: 'root', 'reply', 'quote', 'manual'
  created_at: Date;              // When message was added to thread
}

export interface ChatworkUserLocal {
  id: string;                    // Chatwork API: account_id
  name: string;                  // Chatwork API: name
  email?: string;                // Chatwork API: email (if available)
  avatar_url?: string;           // Chatwork API: avatar_url (if available)
  created_at?: Date;             // Local cache timestamp
  updated_at?: Date;             // Local cache timestamp
}

// Enums and Union Types
export type RelationshipType = 'root' | 'reply' | 'quote' | 'manual';

export interface ThreadWithMessages extends Thread {
  messages: Message[];
}

// Error Types
export interface ChatworkAPIError {
  status: number;
  message: string;
  errors?: string[];
}

// Configuration Types
export interface ChatworkAPIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Analysis Types
export interface MessageAnalysisResult {
  messageIds: string[];
  relationshipType: RelationshipType;
  confidence: number;
}

export interface ThreadAnalysisResult {
  rootMessageId: string;
  relatedMessages: Message[];
  analysisDepth: number;
  totalFound: number;
}
