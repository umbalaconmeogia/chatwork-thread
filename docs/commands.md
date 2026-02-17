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

### create-from-room
Tạo một thread chứa **toàn bộ message** trong room (coi room như một thread). Cần đã chạy `fetch-room` trước để có message trong DB.

- **Tên room:** Khi `fetch-room` hoặc khi gọi API room, tên room từ Chatwork được lưu vào bảng `chatwork_rooms`.
- **Tên thread mặc định:** Nếu không chỉ định `--name`, tên thread = tên room trong DB/API; nếu không có thì dùng "Room &lt;room-id&gt;".

```bash
# Tạo thread từ room (tên thread = tên room từ Chatwork nếu đã lưu)
node dist/cli/chatwork-thread.js create-from-room <room-id>

# Tùy chọn tên và mô tả
node dist/cli/chatwork-thread.js create-from-room 409502735 --name "Nhóm dự án X" --description "Toàn bộ chat room"
```

Sau đó dùng `show <thread-id>` để xem hoặc xuất (text, json, markdown, html).

**Options:**
- `--name <name>`: Tên thread (mặc định: tên room từ Chatwork/DB)
- `--description <desc>`: Mô tả thread

**Parameters:**
- `<room-id>`: Room ID của Chatwork (số)

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

### refresh
Cập nhật thread với messages mới từ Chatwork:

```bash
# Refresh thread (auto-detect room ID từ messages có sẵn)
node dist/cli/chatwork-thread.js refresh 1

# Refresh với room ID cụ thể
node dist/cli/chatwork-thread.js refresh 1 --room-id 409502735
```

**Mô tả:**
Command này sẽ:
1. Lấy tất cả messages mới từ Chatwork room
2. Tìm messages có liên quan đến thread hiện tại
3. Tự động thêm messages mới vào thread
4. Cập nhật timestamp của thread

**Use Cases:**
- 🔄 **Regular Updates**: Cập nhật thread với messages mới sau khi thread được tạo
- 📈 **Growing Conversations**: Theo dõi cuộc hội thoại đang phát triển
- 🔗 **Auto-Detection**: Tự động tìm replies và quotes mới
- ⏰ **Periodic Refresh**: Chạy định kỳ để keep threads up-to-date

**Options:**
- `--room-id <id>`: Room ID (tự động detect từ messages có sẵn nếu không có)
- `--auto-detect`: Tự động detect room ID từ thread messages (default behavior)

**Parameters:**
- `<thread-id>`: ID của thread cần refresh

## Room Operations

### fetch-room
Lấy **toàn bộ** message trong một room từ Chatwork (phân trang + rate limit tự động), tùy chọn lưu vào database. **Không tạo thread** — chỉ cập nhật bảng `messages`; dùng `create` / `show` khi cần xem theo thread.

**Mặc định:** phân trang và throttle để tránh vượt rate limit (300 request/5 phút).

```bash
# Lấy toàn bộ room (phân trang tự động), lưu database
node dist/cli/chatwork-thread.js fetch-room <room-id>

# Chỉ 1 request API (room ít message hoặc kiểm tra nhanh)
node dist/cli/chatwork-thread.js fetch-room <room-id> --single

# Chỉ fetch và in số lượng, không lưu
node dist/cli/chatwork-thread.js fetch-room <room-id> --no-save
```

**Ví dụ:**
```bash
node dist/cli/chatwork-thread.js fetch-room 409502735
node dist/cli/chatwork-thread.js fetch-room 409502735 --single
```

**Options:**
- `--no-save`: Không lưu message vào database (chỉ fetch và in số lượng)
- `--single`: Chỉ 1 request API (không phân trang; dùng cho room nhỏ hoặc thử nhanh)

**Parameters:**
- `<room-id>`: Room ID của Chatwork (số, ví dụ 409502735)

### parse-room-html
**Workaround khi API chỉ trả 100 message mới nhất:** Trích toàn bộ message ID từ file HTML đã save từ trang Chatwork (scroll hết room rồi Save as HTML). Sau đó có thể xuất danh sách ID hoặc dùng `--fetch` để gọi API lấy từng message và lưu vào DB.

```bash
# Trích message ID, in ra (và 10 id đầu)
node dist/cli/chatwork-thread.js parse-room-html room.html

# Ghi danh sách message ID ra file (mỗi dòng một ID) — dùng với tool khác nếu cần
node dist/cli/chatwork-thread.js parse-room-html room.html --output message-ids.txt

# Trích ID + gọi API lấy từng message, lưu DB (sau đó create-from-room)
node dist/cli/chatwork-thread.js parse-room-html room.html --fetch
node dist/cli/chatwork-thread.js parse-room-html room.html --fetch --delay 1500
```

**Options:**
- `-r, --room-id <id>`: Room ID (ghi đè nếu trong HTML có nhiều room)
- `-o, --output <file>`: Ghi danh sách message ID ra file (mỗi dòng một ID)
- `--fetch`: Sau khi trích ID, gọi API lấy từng message và lưu vào DB (cần CHATWORK_API_TOKEN)
- `--delay <ms>`: Delay giữa mỗi request khi --fetch (mặc định 1200)

**Parameters:**
- `<html-file>`: Đường dẫn file HTML đã save từ trang Chatwork (room)

**Rate limit & phân trang:**
- Mặc định luôn dùng phân trang và delay ~1,2s giữa các request để không vượt **300 request/5 phút**.
- Gói Free có thể giới hạn: **5,000 message gần nhất trong 40 ngày** (header `chatwork-message-limitation: true` khi áp dụng).

**Resume khi bị 429:**
- Mỗi chunk được **lưu vào DB ngay**; offset được ghi vào bảng **fetch_room_progress** trong DB.
- Chạy lại lệnh sau khi hết thời gian chờ → **tiếp tục từ offset đã lưu** (resume), không gọi API từ đầu.
- Khi lấy xong toàn bộ room, progress được xóa. Muốn lấy lại từ đầu: xóa bản ghi tương ứng room trong bảng `fetch_room_progress` (hoặc chạy migration --reset rồi migrate lại; cách đơn giản hơn: dùng SQL `DELETE FROM fetch_room_progress WHERE room_id = ?`).

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
