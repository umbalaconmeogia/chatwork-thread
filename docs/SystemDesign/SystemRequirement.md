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
LocalApp tập trung vào 4 tính năng chính:
1. **Tạo thread từ message ID khởi đầu** - Phân tích và tìm tất cả message liên quan
2. **Thêm message vào thread** - Cho phép thêm message không có mối liên quan tự động
3. **Xem danh sách thread** - Liệt kê tất cả thread đã tạo
4. **Xem nội dung thread** - Hiển thị chi tiết các message trong thread

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

### 3. LocalApp Interface

#### 3.1 Core Functionality
- **FR-006:** Hệ thống phải cung cấp 4 tính năng chính cho LocalApp:
  1. **Tạo thread từ message ID khởi đầu**: Phân tích và tìm tất cả message liên quan
  2. **Thêm message vào thread**: Cho phép thêm message không có mối liên quan tự động
  3. **Xem danh sách thread**: Liệt kê tất cả thread đã tạo
  4. **Xem nội dung thread**: Hiển thị chi tiết các message trong thread

#### 3.2 Command Line Interface
- **FR-007:** Hệ thống phải cung cấp CLI để tương tác với 4 tính năng chính
  - Command để tạo thread từ message ID
  - Command để thêm message vào thread
  - Command để liệt kê các thread đã tạo
  - Command để hiển thị nội dung thread

#### 3.3 Thread Display
- **FR-008:** Hệ thống phải hiển thị thread theo format dễ đọc
  - Hiển thị message theo thứ tự thời gian
  - Phân biệt message gốc và message reply
  - Hiển thị thông tin người gửi và thời gian
  - Hỗ trợ export ra file text/JSON

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
  - `Thread`: {id, name, description, created_at, messages}
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
- Hiển thị thread theo format dễ đọc
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
