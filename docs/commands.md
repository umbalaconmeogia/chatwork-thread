# Command Reference

Detailed documentation cho tất cả CLI commands.

## Database Migration Commands

### migrate --check
Kiểm tra trạng thái migration (không thay đổi database):

```bash
node dist/cli/chatwork-thread.js migrate --check
```

**Output:**
- ✅ Database is up to date (nếu không có pending migrations)
- ⚠️ Database needs migration (nếu có pending migrations)

### migrate
Chạy các pending migrations:

```bash
node dist/cli/chatwork-thread.js migrate
```

### migrate --verbose
Chạy migrations với detailed logging:

```bash
node dist/cli/chatwork-thread.js migrate --verbose
```

### migrate --reset
Reset database hoàn toàn và chạy lại tất cả migrations:

```bash
node dist/cli/chatwork-thread.js migrate --reset
```

⚠️ **Warning**: Command này sẽ xóa toàn bộ data!

## Thread Management Commands

### create
Tạo thread từ message ID hoặc Chatwork URL:

```bash
# Từ message ID
node dist/cli/chatwork-thread.js create 2016140743370084352 --name "API Discussion" --description "Thread về thảo luận API"

# Từ Chatwork URL
node dist/cli/chatwork-thread.js create "https://www.chatwork.com/#!rid409502735-2016140743370084352" --name "スレッド 1" --description "Initial message thread"

# Force tạo thread với message đã tồn tại trong thread khác
node dist/cli/chatwork-thread.js create 2016140743370084352 --name "New Thread" --force-double
```

**Options:**
- `--name <name>`: Tên thread
- `--description <desc>`: Mô tả thread
- `--room-id <id>`: Room ID (nếu không có trong URL)
- `--max-depth <number>`: Độ sâu tối đa khi tìm related messages (default: 10)
- `--force-double`: Cho phép message tồn tại trong nhiều threads

### list
Hiển thị danh sách threads:

```bash
# Hiển thị tất cả threads
node dist/cli/chatwork-thread.js list

# Với giới hạn số lượng
node dist/cli/chatwork-thread.js list --limit 10

# Sắp xếp theo tên
node dist/cli/chatwork-thread.js list --sort name

# Sắp xếp theo thời gian tạo
node dist/cli/chatwork-thread.js list --sort created

# Tìm kiếm theo keyword
node dist/cli/chatwork-thread.js list --search "API"
```

**Options:**
- `--limit <number>`: Giới hạn số thread hiển thị (default: 20)
- `--sort <field>`: Sắp xếp theo 'name', 'created', 'updated' (default: updated)
- `--search <keyword>`: Tìm kiếm trong tên và description

### show
Hiển thị nội dung thread:

```bash
# Format text (default)
node dist/cli/chatwork-thread.js show 1

# Với metadata chi tiết
node dist/cli/chatwork-thread.js show 1 --include-metadata

# Format JSON
node dist/cli/chatwork-thread.js show 1 --format json

# Format Markdown
node dist/cli/chatwork-thread.js show 1 --format markdown

# Format HTML (khuyến nghị)
node dist/cli/chatwork-thread.js show 1 --format html
```

**Export to file:**

```bash
# Xuất ra HTML với styling đẹp
node dist/cli/chatwork-thread.js show 2 --format html --output thread-2.html --include-metadata

# Xuất ra JSON
node dist/cli/chatwork-thread.js show 1 --format json --output thread1.json

# Xuất ra Markdown
node dist/cli/chatwork-thread.js show 1 --format markdown --output thread1.md

# Xuất ra text
node dist/cli/chatwork-thread.js show 1 --format text --output thread1.txt
```

**Options:**
- `--format <format>`: Output format ('text', 'json', 'markdown', 'html')
- `--output <file>`: Save to file
- `--include-metadata`: Include message metadata (ID, room ID, timestamps)

## Message Operations

### add-message
Thêm message vào thread:

```bash
# Thêm bằng message ID
node dist/cli/chatwork-thread.js add-message 4 2016143355800715264 --type manual

# Thêm bằng Chatwork URL
node dist/cli/chatwork-thread.js add-message 4 "https://www.chatwork.com/#!rid409502735-2016143355800715264" --type manual

# Thêm với relationship type khác
node dist/cli/chatwork-thread.js add-message 1 9876543210 --type reply
node dist/cli/chatwork-thread.js add-message 2 "https://www.chatwork.com/#!rid409502735-2016143486063218688" --type quote
```

**Relationship Types:**
- `manual`: Manually added to thread
- `reply`: Reply relationship
- `quote`: Quote relationship
- `root`: Root message của thread

**Options:**
- `--type <type>`: Relationship type (default: manual)
- `--room-id <id>`: Room ID (nếu không có trong URL)

### del-message
Xóa message khỏi thread:

```bash
node dist/cli/chatwork-thread.js del-message 4 2016143355800715264
```

**Parameters:**
- `<thread-id>`: ID của thread
- `<message-id>`: ID của message cần xóa

## HTML Output Features

Khi sử dụng `--format html`, file HTML sẽ có:

### Chatwork Content Processing
- **Reply Links**: `[rp aid=xxx to=roomid-messageid]` → Clickable [RE] buttons
- **Quote Blocks**: `[qt]...[/qt]` → Styled blockquotes
- **Quote Timestamps**: `[qtmeta aid=xxx time=timestamp]` → Formatted dates
- **Mentions**: `[To:user_id]username[/To]` → Highlighted @mentions
- **Code Blocks**: `[code]...[/code]` → Syntax highlighted code

### File Attachments
- **Compact Display**: File attachments hiển thị như clickable links
- **Download Links**: `[info][preview][download]` → 📎 Download links
- **External Downloads**: Click để mở download qua Chatwork web
- **No Inline Images**: Optimized cho space efficiency

### Auto-Linking & Navigation
- **URL Auto-Detection**: Tự động convert URLs thành clickable links
- **External Links**: Links mở trong tab mới (`target="_blank"`)
- **Clickable Metadata**: Message ID và Room ID clickable
- **Mobile-Friendly**: Responsive design

### Styling & UX
- **Modern CSS**: Professional styling với hover effects
- **Readable Typography**: Optimized fonts và spacing
- **Color Coding**: Different colors cho reply links, mentions, files
- **Print-Friendly**: CSS optimized cho screen và print

## Best Practices

### Migration Workflow
- ✅ **Production**: Luôn chạy `migrate --check` trước khi deploy
- ✅ **Development**: Sử dụng `migrate --verbose` để debug
- ⚠️ **Cẩn thận**: `--reset` sẽ xóa toàn bộ data
- 💡 **CI/CD**: Thêm `migrate --check` vào build pipeline

### Thread Organization
- 📝 **Naming**: Sử dụng tên thread descriptive
- 📄 **Description**: Thêm context cho thread
- 🔗 **Related Messages**: Sử dụng appropriate relationship types
- 📊 **Regular Cleanup**: Review và organize threads định kỳ

### HTML Export
- 🎨 **Format**: Sử dụng HTML format cho best readability
- 📋 **Metadata**: Include metadata cho reference links
- 📱 **Mobile**: HTML output responsive cho mobile viewing
- 🖨️ **Print**: CSS optimized cho cả digital và print use
