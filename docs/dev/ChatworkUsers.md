# Chatwork users (chatwork_users) và hiển thị tên người gửi

## Bối cảnh

- Bảng **chatwork_users** (id = account_id, name, ...) đã có trong schema, dùng để cache tên user.
- Với **account đã hủy**, API message thường không trả về `account.name` → message lưu `sender_name` rỗng, hiển thị "(Account cancelled)" hoặc ID.
- Trong nội dung message thường có dạng **`[To:account_id]Tên hiển thị`** (ví dụ `[To:6452503]DTM_ジェプさん`). Đây chính là user (kể cả user đã bị xóa) với tên do người gửi gõ.

## Phương án đã áp dụng

### 1. Bổ sung dữ liệu vào `chatwork_users`

- **Nguồn:** Parse nội dung message, tìm pattern `[To:(\d+)](...)` → lấy (account_id, name).
- **Thời điểm / cách:** Chạy **theo lệnh**, không tự chạy thường xuyên:
  - **Lệnh:** `extract-users`
  - **Phạm vi (bắt buộc chỉ định một trong hai hoặc cả hai):**
    - `--room-id <roomId>`: chỉ quét message thuộc room đó.
    - `--message-id <id>`: chỉ quét message có id đó (có thể lặp: `--message-id id1 --message-id id2`).
  - **Hành vi:** Đọc message trong phạm vi đã chọn, parse `[To:account_id]Name`, gom theo account_id (trùng thì giữ bản sau), upsert vào `chatwork_users`.
  - **Tùy chọn:** `--dry-run` để chỉ in ra số user sẽ ghi, không ghi DB.
  - **Lưu ý:** Không cho phép quét toàn bộ DB (phải có `--room-id` hoặc `--message-id`).

### 2. Hiển thị tên sender

- Khi **show thread** (text / markdown / html):
  - Nếu message có `sender_name` rỗng (hoặc chỉ khoảng trắng) và có `sender_id` → tra **chatwork_users** theo `sender_id`.
  - Nếu tìm thấy bản ghi → dùng `chatwork_users.name` làm tên hiển thị.
  - Nếu không tìm thấy → giữ fallback hiện tại: "(Account cancelled)" hoặc "(Account cancelled / ID: xxx)".

### 3. Luồng gợi ý

1. Fetch room / parse HTML / tạo thread như bình thường.
2. Khi cần bổ sung tên user (đặc biệt cho account đã hủy): chạy **`extract-users --room-id <roomId>`** (hoặc `--message-id <id>`). Có thể chạy lại với từng room khi đã có thêm message mới.
3. Từ lần sau, **show** thread sẽ tự dùng tên từ `chatwork_users` cho sender khi message không có tên.

## Lệnh

```bash
# Chỉ quét message trong một room (khuyến nghị)
node dist/cli/chatwork-thread.js extract-users --room-id 409502735

# Chỉ quét một hoặc vài message
node dist/cli/chatwork-thread.js extract-users --message-id 1234567890
node dist/cli/chatwork-thread.js extract-users --message-id id1 --message-id id2

# Chỉ xem sẽ ghi bao nhiêu user, không ghi DB
node dist/cli/chatwork-thread.js extract-users --room-id 409502735 --dry-run
```

## Ghi chú

- Parse chỉ dựa trên pattern `[To:account_id]...` trong body message; không gọi API Chatwork để lấy tên.
- Cùng một account_id có thể xuất hiện nhiều lần với tên khác nhau (ví dụ "DTM_ジェプ" vs "DTM_ジェプさん"); hiện tại **giữ bản ghi cuối** khi quét (last seen wins).
- Bảng `chatwork_users` có thể mở rộng sau (email, avatar từ API contacts, v.v.) nếu cần.
