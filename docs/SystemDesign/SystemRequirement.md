# System Requirement

## Overview

Dựa trên UserRequirement, hệ thống Chatwork Thread Tool được thiết kế để hiển thị nội dung chat có liên quan theo dạng thread, giải quyết vấn đề khó theo dõi cuộc hội thoại trong Chatwork.

## Technology Constraint

- **Programming Language:** Node.js/TypeScript
- **Rationale:** Để tái sử dụng code cho Chrome Extension trong tương lai
- **Impact:** Core business logic phải được thiết kế để tương thích với cả Node.js và browser environment

## LocalApp Scope

### Primary Purpose
LocalApp được phát triển để phục vụ nhu cầu trước mắt: **tập hợp thông tin về thread để làm việc**. Đây là bước đệm trước khi phát triển Chrome Extension.

### Core Features
LocalApp tập trung vào các tính năng chính sau:
1. **Tạo thread từ message ID khởi đầu** - Phân tích và tìm tất cả message liên quan (qua Chatwork API)
2. **Tách story thread từ root thread (local DB)** - Gom nhóm message trong một root thread đã có trong DB theo reply/quote, **không gọi Chatwork API**
3. **Thêm message vào thread** - Cho phép thêm message không có mối liên quan tự động
4. **Xem danh sách thread** - Liệt kê thread; hỗ trợ phân cấp root → story khi có dữ liệu `parent_thread_id`
5. **Xem nội dung thread** - Hiển thị chi tiết các message trong thread

### Interface Options
- **Primary**: Command Line Interface (CLI)
- **Optional**: Graphical User Interface (GUI) - có thể phát triển sau nếu cần thiết

## Functional Requirements

### 1. Thread Creation and Analysis

#### 1.1 Message Retrieval
- **FR-001:** Hệ thống phải có khả năng lấy thông tin message từ Chatwork API
  - Input: Message ID hoặc Room ID
  - Output: Message object với đầy đủ thông tin (content, timestamp, sender, etc.)

#### 1.2 Thread Analysis
- **FR-002:** Hệ thống phải phân tích nội dung message để tìm các message liên quan
  - Phân tích từ khóa "返信" (reply) và "引用" (quote)
  - Tìm message ID được đề cập trong nội dung
  - Xác định mối quan hệ giữa các message
  - Thuật toán recursive để tìm tất cả message liên quan

#### 1.3 Thread Construction
- **FR-003:** Hệ thống phải tạo thread từ các message liên quan
  - Sắp xếp message theo thứ tự thời gian
  - Hiển thị thread dạng cây (tree structure)
  - Cho phép thêm message không liên quan vào thread

#### 1.4 Story thread từ root thread (chỉ SQLite)
- **FR-009:** Hệ thống phải phân biệt **root thread** và **story thread** trong DB
  - Thread có `parent_thread_id` rỗng → root (hoặc thread độc lập legacy)
  - Thread có `parent_thread_id` trỏ tới root → story thread thuộc root đó
  - Story thread dùng chung bảng `messages`; quan hệ message–thread qua `thread_messages` (một message có thể thuộc root và đồng thời thuộc một story)

- **FR-010:** Hệ thống phải lưu `room_id` trên `threads` khi phù hợp (root tạo từ phòng; story con cùng `room_id` với root) để validate và hiển thị mà không phụ thuộc join suy diễn từ message

- **FR-011:** Hệ thống phải có khả năng **tách story** từ một root thread chỉ dựa trên message đã có trong DB
  - Input: ID root thread (tập message = các dòng `thread_messages` của root)
  - Trích liên kết reply/quote từ `content` (cùng nguyên tắc phân tích như thread từ API; ưu tiên pattern cấu trúc để giảm nhiễu)
  - Chỉ tạo story thread cho nhóm có **ít nhất hai message liên kết với nhau trong tập root** (thành phần liên thông kích thước ≥ 2); message đơn lẻ không tạo story — phục vụ bước gom “lạc loài” sau (AI / thread khác) nếu có
  - Hai cụm story phải **tự hợp nhất** khi xuất hiện message nối reply/quote giữa chúng
  - Thao tác **idempotent**: chạy lại trên cùng root xóa story con cũ của root rồi tính lại

- **FR-012:** Hệ thống phải cung cấp CLI **`create thread-stories <root-thread-id>`** cho luồng trên
  - **Không** gọi Chatwork API trong luồng này
  - Hỗ trợ tùy chọn dry-run và ngưỡng kích thước tối thiểu nhóm (mặc định 2)
  - Đăng ký lệnh sao cho không xung đột parse với `create <message-id-or-url>`

### 2. Data Management

#### 2.1 Local Storage
- **FR-004:** Hệ thống phải lưu trữ thread vào local database
  - Lưu thông tin thread và message
  - Hỗ trợ CRUD operations
  - Đảm bảo data persistence

#### 2.2 Thread Persistence
- **FR-005:** Hệ thống phải cho phép lưu và tái sử dụng thread
  - Lưu thread với tên và mô tả
  - Liệt kê các thread đã tạo
  - Xóa thread không cần thiết

#### 2.3 Phân cấp thread
- **FR-013:** Khi xóa root thread, story thread con (theo `parent_thread_id`) phải được xử lý thống nhất với ràng buộc DB (ví dụ `ON DELETE CASCADE`) để không để lại story mồ côi

### 3. LocalApp Interface

#### 3.1 Core Functionality
- **FR-006:** Hệ thống phải cung cấp đầy đủ tính năng chính cho LocalApp (mục **Core Features** ở trên), gồm tạo thread từ API, **tách story từ root (DB)**, thêm message, danh sách thread, xem nội dung thread

#### 3.2 Command Line Interface
- **FR-007:** Hệ thống phải cung cấp CLI cho các luồng trên
  - Command để tạo thread từ message ID / URL (API)
  - Command **`create thread-stories <root-thread-id>`** (chỉ DB)
  - Command để thêm message vào thread
  - Command để liệt kê các thread đã tạo
  - Command để hiển thị nội dung thread

#### 3.3 Thread Display
- **FR-008:** Hệ thống phải hiển thị thread theo format dễ đọc
  - Hiển thị message theo thứ tự thời gian
  - Phân biệt message gốc và message reply
  - Hiển thị thông tin người gửi và thời gian
  - Hỗ trợ export ra file text/JSON

#### 3.4 Giao diện đồ họa (khi có)
- **FR-014:** GUI phải hiển thị danh sách thread theo phân cấp **root → story** khi `parent_thread_id` có dữ liệu (indent hoặc cấu trúc tương đương)

## Non-Functional Requirements

### 1. Performance
- **NFR-001:** Hệ thống phải xử lý thread với tối đa 1000 messages trong vòng 30 giây
- **NFR-002:** Database operations phải hoàn thành trong vòng 1 giây
- **NFR-003:** API calls phải có timeout 30 giây

### 2. Reliability
- **NFR-004:** Hệ thống phải xử lý lỗi API gracefully
- **NFR-005:** Database phải có backup mechanism
- **NFR-006:** Hệ thống phải log tất cả operations để debug

### 3. Usability
- **NFR-007:** CLI commands phải có help documentation
- **NFR-008:** Error messages phải rõ ràng và hướng dẫn cách khắc phục
- **NFR-009:** Thread display phải dễ đọc và navigate

### 4. Maintainability
- **NFR-010:** Code phải được viết bằng TypeScript với type safety
- **NFR-011:** Core logic phải tách biệt để tái sử dụng cho Chrome Extension
- **NFR-012:** Hệ thống phải có unit tests với coverage > 80%

## External Dependencies

### 1. Chatwork API Integration
- **EXT-001:** Hệ thống phải tích hợp với Chatwork API
  - Authentication: API Token
  - Rate limiting: Tuân thủ giới hạn API của Chatwork
  - Error handling: Xử lý các HTTP status codes

### 2. Data Models
- **EXT-002:** Hệ thống phải định nghĩa các data models
  - `Message`: {id, content, timestamp, sender, room_id}
  - `Thread`: {id, name, description, room_id?, parent_thread_id?, created_at, messages?}
  - `User`: {id, name, email}

## Security Requirements

### 1. Data Protection
- **SEC-001:** API token phải được lưu trữ an toàn
- **SEC-002:** Database phải được encrypt
- **SEC-003:** Không lưu trữ sensitive data không cần thiết

### 2. Access Control
- **SEC-004:** Chỉ user có quyền mới có thể truy cập thread
- **SEC-005:** API calls phải được validate trước khi thực hiện

## Future Extensibility

### 1. Chrome Extension Compatibility
- **EXT-003:** Core logic phải được thiết kế để tái sử dụng cho Chrome Extension
- **EXT-004:** API interface phải consistent giữa LocalApp và Extension
- **EXT-005:** Data models phải tương thích với browser storage

### 2. AI Integration
- **AI-001:** Hệ thống phải có khả năng tích hợp AI để phân tích nội dung thread
- **AI-002:** Data structure phải hỗ trợ AI features như sentiment analysis, topic extraction
- **AI-003:** API design phải cho phép plugin AI modules
- **AI-004:** (Mở rộng) Sau khi tách story bằng reply/quote, message vẫn **chỉ nằm ở root** có thể được AI gán vào story hoặc thread “lạc loài” — ngoài phạm vi bắt buộc của giai đoạn story-chỉ-DB

## Constraints

### Technical Constraints
- Phụ thuộc vào Chatwork API availability
- Giới hạn rate limiting của Chatwork API
- Không thể modify Chatwork data, chỉ read-only
- Core logic phải tương thích với cả Node.js và browser environment

### Business Constraints
- Phải tuân thủ Chatwork Terms of Service
- Không được lưu trữ data nhạy cảm
- Phải có mechanism để user control data

## Success Criteria

### Functional Success
- Tạo được thread từ message ID
- Tách được story thread từ root thread chỉ với dữ liệu local DB
- Hiển thị thread theo format dễ đọc; danh sách phân cấp root → story khi có GUI / dữ liệu phân cấp
- Lưu trữ và tái sử dụng thread
- CLI interface hoạt động ổn định

### Technical Success
- Code coverage > 80%
- Performance requirements đạt được
- Error handling hoàn chỉnh
- Documentation đầy đủ

### User Success
- User có thể tạo thread trong vòng 5 phút
- Thread display dễ hiểu và navigate
- CLI commands intuitive
- Error messages helpful
