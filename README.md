# Chatwork thread

Chatwork không có tính năng hiển thị các nội dung chat có liên quan theo thread. Trong một group chat, dù có nhiều nội dung khác nhau thì chúng được hiển thị theo thời gian gửi lên, không phân theo thread khiến việc truy đọc nội dung liên quan trở nên khó khăn. Và không có cách nào (ví dụ như plugin, tool) để hiển thị nội dung theo thread cả.

Chương trình này được viết ra với mục đích muốn hiển thị nội dung chat có liên quan theo thread để dễ theo dõi.

## Quick Start

### Prerequisites
- Node.js v18+, npm, Chatwork API Token

### Setup
```bash
git clone https://github.com/your-username/chatwork-thread.git
cd chatwork-thread
npm install
cp env.example .env  # Edit .env with your Chatwork API token
npm run build
node dist/cli/chatwork-thread.js migrate  # Setup database
```

## Basic Commands

### Database Migration
```bash
node dist/cli/chatwork-thread.js migrate        # Run migrations
node dist/cli/chatwork-thread.js migrate --check # Check status
```

### Thread Operations
```bash
# Create thread from message
node dist/cli/chatwork-thread.js create <message-id> --name "Thread Name"

# List threads
node dist/cli/chatwork-thread.js list

# Show thread content
node dist/cli/chatwork-thread.js show <thread-id>

# Export to HTML
node dist/cli/chatwork-thread.js show <thread-id> --format html --output thread.html
```

## Documentation

- **[Complete Command Reference](docs/commands.md)** - Detailed documentation cho tất cả CLI commands
- **[System Design](docs/SystemDesign/)** - Architecture và design documents
- **[Development Guide](docs/dev/)** - Development workflow và best practices

## Features

HTML export với clickable links, file attachments, auto-linking URLs, và modern responsive design.