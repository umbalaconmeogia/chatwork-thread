# Chatwork thread

Chatwork không có tính năng hiển thị các nội dung chat có liên quan theo thread. Trong một group chat, dù có nhiều nội dung khác nhau thì chúng được hiển thị theo thời gian gửi lên, không phân theo thread khiến việc truy đọc nội dung liên quan trở nên khó khăn. Và không có cách nào (ví dụ như plugin, tool) để hiển thị nội dung theo thread cả.

Chương trình này được viết ra với mục đích muốn hiển thị nội dung chat có liên quan theo thread để dễ theo dõi.

## CLI usage

### Tạo thread liên quan đến một message

Syntax
```shell
node dist/cli/chatwork-thread.js create <message-id-or-url> --name <thread-name> --description <description>
```

Examples
```shell
# Tạo thread từ message ID
node dist/cli/chatwork-thread.js create 2016140743370084352 --name "API Discussion" --description "Thread về thảo luận API"

# Tạo thread từ Chatwork URL
node dist/cli/chatwork-thread.js create "https://www.chatwork.com/#!rid409502735-2016140743370084352" --name "スレッド 1" --description "Initial message thread"

# Tạo thread với message đã tồn tại trong thread khác (force)
node dist/cli/chatwork-thread.js create 2016140743370084352 --name "New Thread" --force-double
```

### Thêm message vào một thread

Syntax
```shell
node dist/cli/chatwork-thread.js add-message <thread-id> <message-id-or-url> --type <relationship-type>
```

* Thêm bằng message ID
```shell
# Thêm message ID vào thread với relationship type
node dist/cli/chatwork-thread.js add-message 4 2016143355800715264 --type manual

# Thêm message với type reply
node dist/cli/chatwork-thread.js add-message 1 9876543210 --type reply
```

* Có thể thêm bằng message URL
```shell
# Thêm message từ Chatwork URL
node dist/cli/chatwork-thread.js add-message 4 "https://www.chatwork.com/#!rid409502735-2016143355800715264" --type manual

# Thêm message với type quote
node dist/cli/chatwork-thread.js add-message 2 "https://www.chatwork.com/#!rid409502735-2016143486063218688" --type quote
```

### Hiện danh sách các thread

Syntax
```shell
node dist/cli/chatwork-thread.js list [options]
```

Examples
```shell
# Hiển thị tất cả threads
node dist/cli/chatwork-thread.js list

# Hiển thị với giới hạn số lượng
node dist/cli/chatwork-thread.js list --limit 10

# Sắp xếp theo tên
node dist/cli/chatwork-thread.js list --sort name

# Sắp xếp theo thời gian tạo
node dist/cli/chatwork-thread.js list --sort created

# Tìm kiếm thread theo keyword
node dist/cli/chatwork-thread.js list --search "API"
```

### Hiển thị nội dung một thread

Syntax
```shell
node dist/cli/chatwork-thread.js show <thread-id> [options]
```

Examples
```shell
# Hiển thị thread với format text (mặc định)
node dist/cli/chatwork-thread.js show 1

# Hiển thị với metadata chi tiết
node dist/cli/chatwork-thread.js show 1 --include-metadata

# Hiển thị với format JSON
node dist/cli/chatwork-thread.js show 1 --format json

# Hiển thị với format Markdown
node dist/cli/chatwork-thread.js show 1 --format markdown
```

### Xuất nội dung một thread ra file

Syntax
```shell
node dist/cli/chatwork-thread.js show <thread-id> --format <format> --output <filename> [options]
```

Examples
```shell
# Xuất ra file HTML với styling đẹp (khuyến nghị)
node dist/cli/chatwork-thread.js show 2 --format html --output thread-2.html --include-metadata

# Xuất ra file JSON
node dist/cli/chatwork-thread.js show 1 --format json --output thread1.json

# Xuất ra file Markdown
node dist/cli/chatwork-thread.js show 1 --format markdown --output thread1.md --include-metadata

# Xuất ra file text
node dist/cli/chatwork-thread.js show 1 --format text --output thread1.txt
```

### Xóa message khỏi thread

Syntax
```shell
node dist/cli/chatwork-thread.js del-message <thread-id> <message-id>
```

Example
```shell
# Xóa message khỏi thread
node dist/cli/chatwork-thread.js del-message 4 2016143355800715264
```

## HTML Output Features

Khi sử dụng `--format html`, file HTML sẽ có các tính năng:

- **Reply Links**: `[rp aid=xxx to=roomid-messageid]` → Clickable **[RE]** buttons linking to original Chatwork messages
- **Quote Blocks**: `[qt]...[/qt]` → Styled `<blockquote>` elements với background
- **Quote Timestamps**: `[qtmeta aid=xxx time=timestamp]` → Formatted dates như `2025/09/06 (Sat)`
- **Responsive Design**: Modern CSS với mobile-friendly layout
- **Syntax Highlighting**: Code blocks và mentions được highlight
- **Clickable Links**: Tất cả Chatwork references đều có thể click để mở trong browser