# Basic Design

## Overview

Basic Design mô tả cách thức implement các System Requirements, bao gồm kiến trúc hệ thống, lựa chọn công nghệ, và thiết kế các component.

## Technology Stack

### Core Technologies
- **Runtime:** Node.js (v18+)
- **Language:** TypeScript (v5+)
- **Package Manager:** npm hoặc yarn

### External APIs
- **Chatwork API:** [Official Documentation](https://developer.chatwork.com/docs/getting-started)
  - Base URL: `https://api.chatwork.com/v2`
  - Authentication: API Token (X-ChatWorkToken header)
  - Rate Limiting: Applied by Chatwork
  - API Token Setup: Chatwork → Service Integration → API Token

### Dependencies
- **HTTP Client:** Axios (v1.6+)
- **Database:** better-sqlite3 (v9+)
- **CLI Framework:** Commander.js (v11+)
- **Build Tool:** esbuild (v0.19+)
- **Testing:** Jest (v29+)
- **Linting:** ESLint + Prettier

### Development Tools
- **Type Checking:** TypeScript Compiler
- **Code Formatting:** Prettier
- **Linting:** ESLint
- **Testing:** Jest
- **Debugging:** Node.js Inspector

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chatwork Thread Tool                     │
├─────────────────────────────────────────────────────────────┤
│  CLI Interface  │  Web Interface (Future)  │  Core Logic   │
├─────────────────────────────────────────────────────────────┤
│              Business Logic Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ChatworkAPI  │ │ThreadAnalyzer│ │DatabaseMgr  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│              Data Access Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │HTTP Client  │ │SQLite DB    │ │File System  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│              External Services                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │Chatwork API │ │Local Storage│ │File System  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Component Design

#### 1. Core Logic Layer (Reusable)

```
src/
├── core/
│   ├── api/
│   │   ├── ChatworkAPI.ts
│   │   ├── types.ts
│   │   └── errors.ts
│   ├── analyzer/
│   │   ├── ThreadAnalyzer.ts
│   │   ├── StoryThreadClusterer.ts
│   │   ├── MessageParser.ts
│   │   └── RelationshipDetector.ts
│   ├── database/
│   │   ├── DatabaseManager.ts
│   │   ├── models/
│   │   │   ├── Thread.ts
│   │   │   ├── Message.ts
│   │   │   └── User.ts
│   │   └── migrations/
│   └── types/
│       ├── Message.ts
│       ├── Thread.ts
│       └── User.ts
```

#### 2. Application Layer

```
src/
├── app/
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── CreateThreadCommand.ts
│   │   │   ├── CreateThreadStoriesCommand.ts
│   │   │   ├── ListThreadsCommand.ts
│   │   │   ├── ShowThreadCommand.ts
│   │   │   └── AddMessageCommand.ts
│   │   ├── CliApp.ts
│   │   └── index.ts
│   ├── web/ (Future)
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── server.ts
│   └── config/
│       ├── database.ts
│       ├── api.ts
│       └── app.ts
```

## Database Design

### SQLite Schema

```sql
-- Threads table (local application data)
CREATE TABLE threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Local auto-increment ID
    name TEXT NOT NULL,                     -- User-defined thread name
    description TEXT,                       -- User-defined thread description
    room_id TEXT,                           -- Chatwork room_id (optional; set for root-from-room; denormalized on story threads)
    parent_thread_id INTEGER,               -- NULL = root (or legacy standalone); non-NULL = story thread under that root
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Local timestamp
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Local timestamp
    FOREIGN KEY (parent_thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

-- Messages table (based on Chatwork API structure)
CREATE TABLE messages (
    id TEXT PRIMARY KEY,              -- Chatwork API: message_id (string)
    content TEXT NOT NULL,            -- Chatwork API: body
    send_time INTEGER NOT NULL,       -- Chatwork API: send_time (timestamp)
    room_id TEXT NOT NULL,            -- Chatwork API: room_id (from request)
    sender_id TEXT NOT NULL,          -- Chatwork API: account.account_id
    sender_name TEXT NOT NULL,        -- Chatwork API: account.name
    raw_data TEXT,                    -- JSON string of original Chatwork API response
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Local timestamp
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Local timestamp
    cache_expires_at DATETIME DEFAULT (datetime('now', '+48 hours'))  -- Local cache management
);

-- Thread-Message relationship (local application data)
CREATE TABLE thread_messages (
    thread_id INTEGER,                    -- Local thread ID
    message_id TEXT,                      -- Chatwork API: message_id
    relationship_type TEXT,               -- Local: 'root', 'reply', 'quote', 'manual'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- When message was added to thread
    PRIMARY KEY (thread_id, message_id),
    FOREIGN KEY (thread_id) REFERENCES threads(id),
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Chatwork users table (cache from Chatwork API)
CREATE TABLE chatwork_users (
    id TEXT PRIMARY KEY,              -- Chatwork API: account_id
    name TEXT NOT NULL,               -- Chatwork API: name
    email TEXT,                       -- Chatwork API: email (if available)
    avatar_url TEXT,                  -- Chatwork API: avatar_url (if available)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Local cache timestamp
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- Local cache timestamp
);

-- Indexes
CREATE INDEX idx_messages_send_time ON messages(send_time);  -- For chronological ordering
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_thread_messages_thread_id ON thread_messages(thread_id);
CREATE INDEX idx_thread_messages_created_at ON thread_messages(thread_id, created_at);  -- For thread ordering
CREATE INDEX idx_threads_parent_thread_id ON threads(parent_thread_id);
CREATE INDEX idx_threads_room_id ON threads(room_id);
```

### Root thread và Story thread

**Bối cảnh:** Một phòng Chatwork có thể có một **root thread** trong DB chứa toàn bộ message đã fetch (ví dụ sau `fetch-room` + `create-from-room`). Trong đó có nhiều “câu chuyện” (story) độc lập. Story thread là **thread con** trong SQLite, trỏ tới cùng các bản ghi `messages` nhưng chỉ qua tập con message được gom bằng reply/quote.

**Phân cấp trong `threads`:**

- `parent_thread_id IS NULL` → **root thread** (hoặc thread độc lập legacy).
- `parent_thread_id` trỏ tới id root → **story thread** thuộc root đó.
- `room_id` trên root: nên gán khi tạo thread từ phòng (ví dụ `create-from-room`); story thread con **cùng `room_id`** với root (denormalize) để filter / validate mà không cần join `messages`.

**Quan hệ message:**

- Root và story **cùng dùng** bảng `thread_messages`: một `message_id` có thể thuộc **root** và đồng thời thuộc **một story** (PK là `(thread_id, message_id)`).
- Story **không** thay thế root; message “lạc loài” vẫn chỉ nằm ở root cho tới khi có bước gom bổ sung (AI / thread lạc loài — ngoài phạm vi basic design chi tiết tại đây).

**Điều kiện tạo story (bước reply/quote, chỉ local DB):**

- Chỉ xét message **đã nằm trong root thread**.
- Trích các message_id đích từ nội dung (reply/quote), cùng logic với `ThreadAnalyzer.extractMessageIds` / `detectRelationshipType` (có thể tách helper chỉ pattern reply/quote cấu trúc để giảm nhiễu từ pattern khác).
- Xây **đồ thị vô hướng**: đỉnh = message trong root; cạnh = có reply/quote tới message khác cũng trong root. **Union–Find / thành phần liên thông.**
- **Chỉ tạo row story + `thread_messages` cho story khi thành phần có ít nhất 2 message** (`|C| ≥ 2`): đúng nghĩa nghiệp vụ “message đầu chưa tạo story; khi có message thứ hai liên kết reply/quote thì mới sinh story và gom cả nhóm liên quan”.
- Hai cụm story riêng **tự merge** khi xuất hiện message nối (reply/quote) giữa chúng — không cần merge thủ công.

**Luồng thực thi (idempotent, batch):** Trong một transaction: xóa mọi story cũ của root (`DELETE threads WHERE parent_thread_id = ?`), tính lại component, insert story mới (`parent_thread_id`, `room_id` kế thừa root), insert `thread_messages` cho từng message trong từng component đủ lớn. Tùy chọn `--dry-run`, `--min-size` (mặc định 2).

**API Chatwork:** Bước này **chỉ đọc SQLite** (đã có message trong DB). Khác với `create <message-id-or-url>` (fetch API). Không giả định toàn app đã “DB trước, API sau” cho mọi lệnh.

**CLI:** `chatwork-thread create thread-stories <root-thread-id> [--dry-run] [--min-size <n>]` — đăng ký **trước** lệnh `create <message-id-or-url>` trong Commander để tránh parse nhầm.

**GUI:** Danh sách thread hiển thị phân cấp root → story (dựa `parent_thread_id`).

## File Attachment Handling

### Chatwork File Attachment Limitations

**⚠️ Important Constraint**: Chatwork không cho phép truy cập trực tiếp file attachments từ external applications.

#### Technical Limitations:
1. **No Direct Image Access**: Không thể hiển thị images trực tiếp từ Chatwork preview URLs
2. **Authentication Required**: File preview/download URLs yêu cầu Chatwork session authentication
3. **Browser-Only Access**: Files chỉ có thể access được qua Chatwork web interface

#### Implementation Strategy:
```typescript
// File attachment patterns in Chatwork message content:
// 1. With title: [info][title][dtext:file_uploaded][/title][preview id=123 ht=150][download:123]filename.png[/download][/info]
// 2. Without title: [info][preview id=123 ht=150][download:123]filename.png[/download][/info]

// Processing approach:
// - Parse file information from message content
// - Generate clickable download links
// - Display filename and size information
// - Open downloads in new browser tab/window
```

#### HTML Output Format:
```html
<!-- File with title (uploaded file notification) -->
<div class="info-box">
  <div class="info-title">[dtext:file_uploaded]</div>
  <div class="info-content">
    <div class="file-attachment">
      <a href="https://www.chatwork.com/gateway/download_file.php?bin=1&file_id=123&preview=0" 
         target="_chatwork-file-123">
        📎 filename.png (124.22 KB)
      </a>
    </div>
  </div>
</div>

<!-- File without title -->
<div class="file-attachment">
  <a href="https://www.chatwork.com/gateway/download_file.php?bin=1&file_id=123&preview=0" 
     target="_chatwork-file-123">
    📎 filename.png (124.22 KB)
  </a>
</div>
```

#### User Experience:
- **Click to Download**: Users click on file links to open download in browser
- **External Download**: Files are downloaded through Chatwork's web interface
- **No Inline Preview**: Images and files cannot be previewed inline in our tool
- **Filename Display**: Show original filename and file size for context

## API Design

### ChatworkAPI Class

```typescript
export class ChatworkAPI {
  private baseURL: string = 'https://api.chatwork.com/v2';
  private apiToken: string;
  
  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }
  
  // Get messages from a room
  async getMessages(roomId: string, force?: boolean): Promise<Message[]> {
    const response = await this.makeRequest(`/rooms/${roomId}/messages`);
    
    return response.map((msg: any) => ({
      id: msg.message_id,        // Chatwork's message_id (string)
      content: msg.body,
      send_time: msg.send_time,  // Chatwork's send_time (timestamp)
      room_id: roomId,
      sender_id: msg.account.account_id,
      sender_name: msg.account.name,
      raw_data: msg
    }));
  }
  
  // Get specific message
  async getMessage(messageId: string): Promise<Message>
  
  // Get room information
  async getRoom(roomId: string): Promise<Room>
  
  // Get user information
  async getUser(userId: string): Promise<User>
  
  // Rate limiting and error handling
  private async makeRequest<T>(endpoint: string): Promise<T>
  private handleRateLimit(): Promise<void>
  private handleError(error: any): never
}
```

### ThreadAnalyzer Class

```typescript
export class ThreadAnalyzer {
  // Parse Chatwork URL to extract message ID
  parseChatworkUrl(url: string): string | null {
    // Parse URL format: https://www.chatwork.com/#!rid{room_id}-{message_id}
    const match = url.match(/rid\d+-(\d+)$/);
    return match ? match[1] : null;
  }
  
  // Check if message already exists in any thread
  async checkMessageExists(messageId: string): Promise<{ exists: boolean; threadIds: number[] }> {
    // Check if message is already in any thread
    // Return thread IDs that contain this message
  }
  
  // Build thread from root message (bidirectional analysis)
  buildThread(rootMessageId: string, allMessages: Message[]): Thread {
    // Tìm tất cả message liên quan (bidirectional)
    const relatedMessages = this.findRelatedMessagesBidirectional(rootMessageId, allMessages);
    
    // Sắp xếp theo send_time (thời gian gửi)
    const sortedMessages = relatedMessages.sort((a, b) => a.send_time - b.send_time);
    
    return {
      id: this.generateThreadId(),
      messages: sortedMessages,
      created_at: new Date()
    };
  }
  
  // Find related messages bidirectionally
  private findRelatedMessagesBidirectional(messageId: string, allMessages: Message[]): Message[] {
    const relatedMessages = new Set<Message>();
    const rootMessage = allMessages.find(m => m.id === messageId);
    
    if (!rootMessage) return [];
    
    relatedMessages.add(rootMessage);
    
    // 1. Tìm messages trước đó (messages mà root message reply tới)
    const previousMessages = this.findPreviousMessages(rootMessage, allMessages);
    previousMessages.forEach(msg => relatedMessages.add(msg));
    
    // 2. Tìm messages sau đó (messages reply tới root message)
    const subsequentMessages = this.findSubsequentMessages(rootMessage, allMessages);
    subsequentMessages.forEach(msg => relatedMessages.add(msg));
    
    // 3. Recursive: Tìm messages liên quan đến các messages đã tìm được
    const allFoundMessages = Array.from(relatedMessages);
    for (const msg of allFoundMessages) {
      const related = this.findRelatedMessagesRecursive(msg, allMessages, relatedMessages);
      related.forEach(relatedMsg => relatedMessages.add(relatedMsg));
    }
    
    return Array.from(relatedMessages);
  }
  
  // Find messages that the given message replies to
  private findPreviousMessages(message: Message, allMessages: Message[]): Message[] {
    const previousMessages: Message[] = [];
    const messageIds = this.extractMessageIds(message.content);
    
    for (const id of messageIds) {
      const prevMessage = allMessages.find(m => m.id === id && m.send_time < message.send_time);
      if (prevMessage) {
        previousMessages.push(prevMessage);
      }
    }
    
    return previousMessages;
  }
  
  // Find messages that reply to the given message
  private findSubsequentMessages(message: Message, allMessages: Message[]): Message[] {
    return allMessages.filter(m => 
      m.send_time > message.send_time && 
      this.extractMessageIds(m.content).includes(message.id)
    );
  }
  
  // Find related messages recursively
  private findRelatedMessagesRecursive(message: Message, allMessages: Message[], foundMessages: Set<Message>): Message[] {
    const relatedMessages: Message[] = [];
    
    // Tìm messages liên quan đến message này
    const messageIds = this.extractMessageIds(message.content);
    
    for (const id of messageIds) {
      const relatedMessage = allMessages.find(m => m.id === id);
      if (relatedMessage && !foundMessages.has(relatedMessage)) {
        relatedMessages.push(relatedMessage);
      }
    }
    
    return relatedMessages;
  }
  
  // Extract message IDs from message content
  private extractMessageIds(content: string): string[] {
    const messageIds: string[] = [];
    
    // Tìm message ID patterns trong nội dung
    // Ví dụ: "返信: 1234567890", "引用: 9876543210", etc.
    const patterns = [
      /返信[：:]\s*(\d+)/g,
      /引用[：:]\s*(\d+)/g,
      /message[：:]\s*(\d+)/g,
      /msg[：:]\s*(\d+)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        messageIds.push(match[1]);
      }
    }
    
    return messageIds;
  }
  
  // Detect relationship type
  private detectRelationshipType(content: string): RelationshipType {
    if (content.includes('返信')) return 'reply';
    if (content.includes('引用')) return 'quote';
    return 'manual';
  }
}
```

### DatabaseManager Class

```typescript
export class DatabaseManager {
  private db: Database;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.runMigrations();
  }
  
  // Thread operations
  async createThread(name: string, description?: string): Promise<Thread>
  async getThread(threadId: number): Promise<Thread | null>
  async listThreads(): Promise<Thread[]>
  async updateThread(threadId: number, updates: Partial<Thread>): Promise<void>
  async deleteThread(threadId: number): Promise<void>
  
  // Message operations
  async saveMessage(message: Message): Promise<void>
  async getMessage(messageId: string): Promise<Message | null>
  async getMessagesByRoom(roomId: string): Promise<Message[]>
  
  // Thread-Message operations
  async addMessageToThread(threadId: number, messageId: string, relationshipType: string): Promise<void>
  async getThreadMessages(threadId: number): Promise<ThreadMessage[]>
  async removeMessageFromThread(threadId: number, messageId: string): Promise<void>
  async checkMessageInThreads(messageId: string): Promise<{ exists: boolean; threadIds: number[] }>
  
  // Chatwork user operations
  async saveChatworkUser(user: ChatworkUser): Promise<void>
  async getChatworkUser(userId: string): Promise<ChatworkUser | null>
  
  // Database maintenance
  private runMigrations(): void
  async backup(): Promise<void>
  async restore(backupPath: string): Promise<void>
}
```

## CLI Design

### Command Overview

Chatwork Thread Tool cung cấp các lệnh để quản lý thread từ Chatwork messages:

#### 1. Tạo Thread
**Lệnh:** `chatwork-thread create <message-id-or-url> [options]`

**Mô tả:** Tạo thread từ message ID hoặc URL Chatwork

**Tham số:**
- `<message-id-or-url>`: Message ID hoặc URL Chatwork (ví dụ: `1234567890` hoặc `https://www.chatwork.com/#!rid368838329-2015782344493105152`)

**Tùy chọn:**
- `-n, --name <name>`: Tên thread (nếu không có sẽ tự động tạo)
- `-d, --description <description>`: Mô tả thread
- `-r, --room-id <room-id>`: Room ID (nếu không có sẽ tự động detect)
- `--max-depth <number>`: Độ sâu tối đa khi tìm message liên quan (mặc định: 10)
- `--force-double`: Cho phép tạo thread với message đã tồn tại trong thread khác

#### 2. Tách story thread từ root (local DB)
**Lệnh:** `chatwork-thread create thread-stories <thread-id> [options]`

**Mô tả:** Từ một **root thread** đã có message trong DB, tự động tạo các **story thread** con dựa trên liên kết reply/quote giữa các message trong root. **Không gọi Chatwork API.**

**Loại trừ:** Message hệ thống (ví dụ chứa `dtext:chatroom_groupchat_created`, dạng văn bản `User <số> joined the group.`, hoặc các khối `[info]`…`chatroom_added` tương ứng markup Chatwork) **không** gán vào story cũng **không** gán vào orphan bucket; chúng vẫn nằm trên root thread trong DB.

**Tham số:**
- `<thread-id>`: ID thread **root** (thread chứa toàn bộ message phòng cần phân tích).

**Tùy chọn:**
- `--dry-run`: In thống kê (số component, kích thước) không ghi DB.
- `--min-size <n>`: Chỉ tạo story cho thành phần có ít nhất `n` message (mặc định: 2).

**Lưu ý triển khai:** Đăng ký lệnh `create thread-stories` trước lệnh `create <message-id-or-url>` trong CLI framework.

#### 3. Thêm Message vào Thread
**Lệnh:** `chatwork-thread add-message <thread-id> <message-id-or-url> [options]`

**Mô tả:** Thêm message vào thread đã có

**Tham số:**
- `<thread-id>`: Thread ID
- `<message-id-or-url>`: Message ID hoặc URL Chatwork

**Tùy chọn:**
- `-t, --type <type>`: Loại liên kết (reply, quote, manual) - mặc định: manual

#### 4. Xóa Message khỏi Thread
**Lệnh:** `chatwork-thread del-message <thread-id> <message-id>`

**Mô tả:** Xóa message khỏi thread

**Tham số:**
- `<thread-id>`: Thread ID
- `<message-id>`: Message ID cần xóa

#### 5. Xem Danh Sách Thread
**Lệnh:** `chatwork-thread list [options]`

**Mô tả:** Xem danh sách các thread đã tạo

**Tùy chọn:**
- `-l, --limit <number>`: Giới hạn số lượng kết quả (mặc định: 20)
- `-s, --sort <field>`: Sắp xếp theo (name, created, updated) - mặc định: updated
- `--search <keyword>`: Tìm kiếm theo tên hoặc mô tả

#### 6. Xem Nội Dung Thread
**Lệnh:** `chatwork-thread show <thread-id> [options]`

**Mô tả:** Xem nội dung chi tiết của thread

**Tham số:**
- `<thread-id>`: Thread ID cần xem

**Tùy chọn:**
- `-f, --format <format>`: Định dạng hiển thị (text, json, markdown) - mặc định: text
- `-o, --output <file>`: Xuất ra file
- `--include-metadata`: Bao gồm metadata (timestamp, sender info)

#### 7. Xóa Thread
**Lệnh:** `chatwork-thread delete <thread-id> [options]`

**Mô tả:** Xóa thread

**Tham số:**
- `<thread-id>`: Thread ID cần xóa

**Tùy chọn:**
- `--force`: Xóa không cần xác nhận

#### 7. Xuất Thread
**Lệnh:** `chatwork-thread export <thread-id> [options]`

**Mô tả:** Xuất thread ra file

**Tham số:**
- `<thread-id>`: Thread ID cần xuất

**Tùy chọn:**
- `-f, --format <format>`: Định dạng xuất (json, txt, md) - mặc định: json
- `-o, --output <file>`: Tên file xuất

### Command Examples

```bash
# 1. Tạo thread từ message ID
chatwork-thread create 1234567890 --name "Discussion about API" --description "Thread về thảo luận API"

# 1b. Tạo thread từ URL Chatwork
chatwork-thread create "https://www.chatwork.com/#!rid368838329-2015782344493105152" --name "API Discussion"

# 1c. Tạo thread với message đã tồn tại (force)
chatwork-thread create 1234567890 --force-double --name "New Thread"

# 2. Tách story thread từ root (chỉ DB, không gọi API)
chatwork-thread create thread-stories 1 --dry-run
chatwork-thread create thread-stories 1

# 3. Thêm message vào thread
chatwork-thread add-message 1 9876543210 --type manual

# 3b. Thêm message từ URL
chatwork-thread add-message 1 "https://www.chatwork.com/#!rid368838329-2015782344493105152"

# 4. Xóa message khỏi thread
chatwork-thread del-message 1 9876543210

# 5. Xem danh sách thread
chatwork-thread list --limit 10 --sort created

# 6. Xem nội dung thread
chatwork-thread show 1 --format text --include-metadata

# 7. Xóa thread
chatwork-thread delete 1 --force

# 8. Xuất thread
chatwork-thread export 1 --format json --output thread-backup.json
```

## URL Parsing and Input Validation

### Chatwork URL Format
Chatwork URLs có format: `https://www.chatwork.com/#!rid{room_id}-{message_id}`

**Ví dụ:**
- URL: `https://www.chatwork.com/#!rid368838329-2015782344493105152`
- Room ID: `368838329`
- Message ID: `2015782344493105152`

### Input Validation
- **Message ID**: Chỉ chấp nhận số (string format)
- **URL**: Validate format và extract message ID
- **Thread ID**: Chỉ chấp nhận số nguyên dương

## Error Handling Strategy

### Error Types

```typescript
// Custom error classes
export class ChatworkAPIError extends Error {
  constructor(message: string, public statusCode?: number, public response?: any) {
    super(message);
    this.name = 'ChatworkAPIError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public operation?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ThreadAnalysisError extends Error {
  constructor(message: string, public messageId?: string) {
    super(message);
    this.name = 'ThreadAnalysisError';
  }
}

export class MessageAlreadyExistsError extends Error {
  constructor(messageId: string, public threadIds: number[]) {
    super(`Message ${messageId} already exists in threads: ${threadIds.join(', ')}`);
    this.name = 'MessageAlreadyExistsError';
  }
}

export class InvalidInputError extends Error {
  constructor(message: string, public input?: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}
```

### Error Handling Flow

1. **API Errors**: Retry với exponential backoff, fallback strategies
2. **Database Errors**: Transaction rollback, data validation
3. **Analysis Errors**: Graceful degradation, partial results
4. **User Errors**: Clear error messages, usage examples
5. **Message Conflicts**: Check existing threads, suggest --force-double
6. **Input Validation**: Validate format, provide helpful error messages

### Error Messages

```typescript
// User-friendly error messages
const ERROR_MESSAGES = {
  MESSAGE_ALREADY_EXISTS: (messageId: string, threadIds: number[]) => 
    `Message ${messageId} already exists in thread(s): ${threadIds.join(', ')}. Use --force-double to create anyway.`,
  
  INVALID_MESSAGE_ID: (input: string) => 
    `Invalid message ID: ${input}. Please provide a valid message ID or Chatwork URL.`,
  
  INVALID_URL_FORMAT: (url: string) => 
    `Invalid Chatwork URL format: ${url}. Expected format: https://www.chatwork.com/#!rid{room_id}-{message_id}`,
  
  THREAD_NOT_FOUND: (threadId: number) => 
    `Thread ${threadId} not found. Use 'chatwork-thread list' to see available threads.`,
  
  MESSAGE_NOT_FOUND: (messageId: string) => 
    `Message ${messageId} not found. Please check the message ID or URL.`
};
```

## Configuration Management

### Configuration Structure

```typescript
export interface AppConfig {
  api: {
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
```

### Configuration Sources

1. **Environment Variables**: `CHATWORK_API_TOKEN`, `DB_PATH`
2. **Config File**: `config.json` hoặc `config.yaml`
3. **Command Line Options**: Override config values
4. **Default Values**: Fallback values

## Testing Strategy

### Test Structure

```
tests/
├── unit/
│   ├── core/
│   │   ├── ChatworkAPI.test.ts
│   │   ├── ThreadAnalyzer.test.ts
│   │   └── DatabaseManager.test.ts
│   └── app/
│       └── cli/
├── integration/
│   ├── api-integration.test.ts
│   └── database-integration.test.ts
├── e2e/
│   └── cli-e2e.test.ts
└── fixtures/
    ├── messages.json
    └── threads.json
```

### Testing Approach

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user workflows
4. **Mocking**: Mock external dependencies (API, database)

## Deployment and Distribution

### Build Process

```json
{
  "scripts": {
    "build": "esbuild src/app/cli/index.ts --bundle --platform=node --outfile=dist/chatwork-thread.js",
    "build:watch": "esbuild src/app/cli/index.ts --bundle --platform=node --outfile=dist/chatwork-thread.js --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

### Distribution

1. **npm Package**: Publish to npm registry
2. **Binary Distribution**: Build standalone executable
3. **Docker Image**: Containerized deployment
4. **Installation Scripts**: Automated setup

## Future Extensibility

### Chrome Extension Compatibility

- **Shared Core**: Core logic được thiết kế để chạy trong browser
- **Platform Abstraction**: Abstract layer cho file system, HTTP client
- **Storage Adapter**: Adapter pattern cho different storage backends

### AI Integration Points

- **Plugin Architecture**: Modular AI analysis plugins
- **Data Export**: Export thread data for AI processing
- **API Integration**: RESTful API for AI services
- **Caching Strategy**: Cache AI analysis results

## Data Models (Updated for Chatwork API)

### Message Interface
```typescript
// src/core/types/Message.ts
export interface Message {
  id: string;                    // Chatwork's message_id (string)
  content: string;
  send_time: number;             // Chatwork's send_time (timestamp)
  room_id: string;
  sender_id: string;
  sender_name: string;
  raw_data?: any;                // Original API response
  created_at?: Date;
  updated_at?: Date;
  cache_expires_at?: Date;
}
```

### Thread Interface
```typescript
// src/core/types/Thread.ts
export interface Thread {
  id: number;
  name: string;
  description?: string;
  room_id?: string | null;       // Chatwork room; set on root / copied to story threads
  parent_thread_id?: number | null;  // null = root; else story under that root
  messages: Message[];           // Sorted by send_time (when loaded with messages)
  created_at: Date;
  updated_at: Date;
}
```

### ChatworkUser Interface
```typescript
// src/core/types/ChatworkUser.ts
export interface ChatworkUser {
  id: string;                    // Chatwork API: account_id
  name: string;                  // Chatwork API: name
  email?: string;                // Chatwork API: email (if available)
  avatar_url?: string;           // Chatwork API: avatar_url (if available)
  created_at?: Date;             // Local cache timestamp
  updated_at?: Date;             // Local cache timestamp
}
```

### Key Design Decisions

1. **Message ID**: Sử dụng Chatwork's message_id (string) làm primary key
2. **Timestamp**: Sử dụng Chatwork's send_time (number) để sắp xếp
3. **Ordering**: Sắp xếp theo send_time, không phải message_id
4. **Caching**: Hybrid approach với cache expiration
5. **Root vs story thread**: `parent_thread_id` phân cấp thread trong DB; story chỉ tham chiếu tập con message qua `thread_messages`, dữ liệu nội dung vẫn là bảng `messages` dùng chung

## Performance Considerations

### Optimization Strategies

1. **Database Indexing**: Optimize query performance
2. **Message Caching**: Cache frequently accessed messages
3. **Lazy Loading**: Load messages on demand
4. **Batch Processing**: Process multiple messages together
5. **Memory Management**: Efficient memory usage for large threads

### Monitoring and Metrics

- **Performance Metrics**: Response times, memory usage
- **Error Tracking**: Error rates and types
- **Usage Analytics**: Feature usage patterns
- **Health Checks**: System health monitoring
