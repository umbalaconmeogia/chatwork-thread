# DatabaseManager Implementation

## ✅ Đã hoàn thành:

### 1. Database Schema (`src/core/database/DatabaseManager.ts`)

#### **Tables Created:**
- **`threads`** - Quản lý threads
- **`messages`** - Lưu trữ messages từ Chatwork API
- **`thread_messages`** - Quan hệ many-to-many giữa threads và messages
- **`chatwork_users`** - Lưu trữ thông tin users

#### **Indexes for Performance:**
- `idx_messages_room_id` - Tìm messages theo room
- `idx_messages_send_time` - Sắp xếp messages theo thời gian
- `idx_messages_cache_expires` - Tìm expired cache
- `idx_thread_messages_thread_id` - Tìm messages trong thread
- `idx_thread_messages_message_id` - Tìm threads chứa message
- `idx_threads_root_message_id` - Tìm thread theo root message

#### **Triggers:**
- Auto-update `updated_at` cho tất cả tables

### 2. Core Features

#### **Thread Operations:**
- `createThread(name, rootMessageId)` - Tạo thread mới
- `getThread(threadId)` - Lấy thread theo ID
- `getThreadByRootMessage(rootMessageId)` - Tìm thread theo root message
- `getAllThreads()` - Lấy tất cả threads
- `updateThread(threadId, name)` - Cập nhật tên thread
- `deleteThread(threadId)` - Xóa thread

#### **Message Operations:**
- `saveMessage(chatworkMessage, cacheExpiresAt)` - Lưu message từ API
- `getMessage(messageId)` - Lấy message theo ID
- `getMessagesByRoom(roomId)` - Lấy messages theo room
- `getExpiredMessages()` - Lấy messages đã hết hạn cache
- `deleteMessage(messageId)` - Xóa message

#### **Thread-Message Operations:**
- `addMessageToThread(threadId, messageId)` - Thêm message vào thread
- `removeMessageFromThread(threadId, messageId)` - Xóa message khỏi thread
- `getThreadMessages(threadId)` - Lấy tất cả messages trong thread
- `getMessageThreads(messageId)` - Lấy threads chứa message

#### **User Operations:**
- `saveUser(chatworkUser)` - Lưu user từ API
- `getUser(accountId)` - Lấy user theo ID
- `getAllUsers()` - Lấy tất cả users

#### **Utility Operations:**
- `isMessageInThread(messageId)` - Kiểm tra message có trong thread
- `getThreadMessageCount(threadId)` - Đếm messages trong thread
- `getDatabaseStats()` - Thống kê database
- `close()` - Đóng database connection

### 3. Database Configuration

#### **SQLite Settings:**
- **WAL Mode**: `journal_mode = WAL` cho better concurrency
- **Foreign Keys**: `foreign_keys = ON` cho data integrity
- **Auto Directory Creation**: Tự động tạo thư mục database

#### **Data Types:**
- **Message ID**: `TEXT` (Chatwork message_id là string)
- **Timestamps**: `INTEGER` cho Chatwork timestamps, `DATETIME` cho local
- **Cache Expiration**: `DATETIME` cho cache management

### 4. Error Handling

#### **Data Validation:**
- Primary key constraints
- Foreign key constraints
- NOT NULL constraints
- Unique constraints

#### **Transaction Safety:**
- Prepared statements cho SQL injection protection
- Atomic operations
- Rollback on errors

## 🧪 Testing Results:

### **Test Coverage:**
- ✅ **Database Initialization** - Tạo tables, indexes, triggers
- ✅ **Thread CRUD** - Create, Read, Update, Delete threads
- ✅ **Message CRUD** - Save, retrieve, delete messages
- ✅ **Thread-Message Relations** - Add/remove messages from threads
- ✅ **User Management** - Save and retrieve users
- ✅ **Utility Functions** - Stats, counts, checks
- ✅ **Database Cleanup** - Close connections, cleanup files

### **Performance Features:**
- ✅ **Indexes** - Fast queries on frequently accessed columns
- ✅ **Prepared Statements** - SQL injection protection
- ✅ **WAL Mode** - Better concurrency
- ✅ **Foreign Keys** - Data integrity

## 🚀 Ready for Integration:

### **1. With ChatworkAPI:**
```javascript
const { DatabaseManager, ChatworkAPI, ConfigManager } = require('./dist/core/index.js');

const configManager = ConfigManager.getInstance();
const api = new ChatworkAPI(configManager.getChatworkAPIConfig());
const db = new DatabaseManager(configManager.getDatabasePath());

// Save message from API to database
const message = await api.getMessage(roomId, messageId);
const cacheExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
const savedMessage = db.saveMessage(message, cacheExpiresAt);
```

### **2. Thread Management:**
```javascript
// Create thread
const thread = db.createThread('My Thread', '123456789');

// Add messages to thread
db.addMessageToThread(thread.id, 'message1');
db.addMessageToThread(thread.id, 'message2');

// Get thread with messages
const messages = db.getThreadMessages(thread.id);
```

### **3. Cache Management:**
```javascript
// Get expired messages for refresh
const expiredMessages = db.getExpiredMessages();

// Refresh from API
for (const message of expiredMessages) {
  const freshMessage = await api.getMessage(roomId, message.id);
  const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  db.saveMessage(freshMessage, newExpiresAt);
}
```

## 📋 Database Schema:

### **threads Table:**
```sql
CREATE TABLE threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  root_message_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **messages Table:**
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY, -- Chatwork message_id
  room_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  send_time INTEGER NOT NULL, -- Chatwork timestamp
  update_time INTEGER NOT NULL, -- Chatwork timestamp
  cache_expires_at DATETIME NOT NULL, -- Local cache expiration
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **thread_messages Table:**
```sql
CREATE TABLE thread_messages (
  thread_id INTEGER NOT NULL,
  message_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (thread_id, message_id),
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

### **chatwork_users Table:**
```sql
CREATE TABLE chatwork_users (
  account_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Configuration:

```typescript
const db = new DatabaseManager('./data/threads.db');
```

## 📝 Notes:

- **SQLite**: Lightweight, file-based database
- **WAL Mode**: Better concurrency for read/write operations
- **Foreign Keys**: Data integrity with cascade deletes
- **Indexes**: Optimized for common query patterns
- **Cache Management**: Built-in expiration handling
- **Type Safety**: Full TypeScript support
