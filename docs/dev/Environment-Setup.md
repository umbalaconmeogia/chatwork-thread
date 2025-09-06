# Environment Setup Guide

## 🔧 Cách sử dụng .env file cho Chatwork API Token

### 1. Tạo file .env

Tạo file `.env` trong thư mục root của project:

```bash
# Chatwork API Configuration
CHATWORK_API_TOKEN=your_actual_token_here
CHATWORK_API_BASE_URL=https://api.chatwork.com/v2

# API Settings
API_TIMEOUT=30000
API_RETRY_ATTEMPTS=3
API_RETRY_DELAY=1000

# Database Configuration
DB_PATH=./data/threads.db
DB_BACKUP_PATH=./data/backups/
DB_BACKUP_INTERVAL=86400000

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=

# Thread Analysis Settings
THREAD_MAX_MESSAGES=1000
THREAD_ANALYSIS_TIMEOUT=30000
```

### 2. Lấy Chatwork API Token

1. Đăng nhập vào Chatwork
2. Vào **Settings** → **API Token**
3. Copy API token của bạn
4. Paste vào file `.env` thay thế `your_actual_token_here`

### 3. Test Configuration

```bash
# Build project
npm run build:core

# Test configuration
node test-env.js
```

### 4. Sử dụng trong Code

```javascript
const { ConfigManager, ChatworkAPI } = require('./dist/core/index.js');

// Load configuration
const configManager = ConfigManager.getInstance();
const apiConfig = configManager.getChatworkAPIConfig();

// Create API instance
const api = new ChatworkAPI(apiConfig);

// Test connection
api.testConnection().then(console.log);
```

## 🔒 Security Notes

### ✅ Đã được bảo vệ:
- File `.env` đã được thêm vào `.gitignore`
- API token không bao giờ được commit vào Git
- ConfigManager validate token trước khi sử dụng

### ⚠️ Lưu ý:
- **KHÔNG** commit file `.env` vào Git
- **KHÔNG** chia sẻ API token với người khác
- **KHÔNG** hardcode token trong source code

## 📋 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CHATWORK_API_TOKEN` | Chatwork API token | - | ✅ |
| `CHATWORK_API_BASE_URL` | API base URL | `https://api.chatwork.com/v2` | ❌ |
| `API_TIMEOUT` | Request timeout (ms) | `30000` | ❌ |
| `API_RETRY_ATTEMPTS` | Retry attempts | `3` | ❌ |
| `API_RETRY_DELAY` | Retry delay (ms) | `1000` | ❌ |
| `DB_PATH` | Database file path | `./data/threads.db` | ❌ |
| `DB_BACKUP_PATH` | Backup directory | `./data/backups/` | ❌ |
| `DB_BACKUP_INTERVAL` | Backup interval (ms) | `86400000` | ❌ |
| `LOG_LEVEL` | Log level | `info` | ❌ |
| `LOG_FILE` | Log file path | - | ❌ |
| `THREAD_MAX_MESSAGES` | Max messages per thread | `1000` | ❌ |
| `THREAD_ANALYSIS_TIMEOUT` | Analysis timeout (ms) | `30000` | ❌ |

## 🚀 Quick Start

1. **Copy template:**
   ```bash
   cp env.example .env
   ```

2. **Edit .env file:**
   ```bash
   # Replace your_actual_token_here with real token
   CHATWORK_API_TOKEN=your_actual_token_here
   ```

3. **Test:**
   ```bash
   npm run build:core
   node test-env.js
   ```

## 🔧 ConfigManager Features

- **Singleton Pattern**: Chỉ load config một lần
- **Validation**: Validate required environment variables
- **Type Safety**: Full TypeScript support
- **Error Handling**: Clear error messages
- **Security**: Không log sensitive data

## 📝 Example Usage

```typescript
import { ConfigManager, ChatworkAPI } from './core';

// Get configuration
const configManager = ConfigManager.getInstance();
const apiConfig = configManager.getChatworkAPIConfig();

// Create API instance
const api = new ChatworkAPI(apiConfig);

// Use API
const me = await api.getMe();
console.log(`Hello ${me.name}!`);
```
