# Cách để lấy về toàn bộ một Chatwork room

1. **Lấy message trong room** (nếu chưa có):
   ```bash
   node dist/cli/chatwork-thread.js fetch-room <room-id>
   ```

2. **Tạo thread chứa toàn bộ message trong room**:
   ```bash
   node dist/cli/chatwork-thread.js create-from-room <room-id>
   ```

3. **Xem / xuất** bằng lệnh `show` như mọi thread khác:
   ```bash
   node dist/cli/chatwork-thread.js show <thread-id> --format html --output room.html
   ```

node dist/cli/chatwork-thread.js fetch-room 274638849

## Extract user

1. Chỉ room
   ```bash
   node dist/cli/chatwork-thread.js extract-users --room-id 409502735
   ```

2. Chỉ một hoặc vài message
   ```bash
   node dist/cli/chatwork-thread.js extract-users --message-id 1234567890
   node dist/cli/chatwork-thread.js extract-users --message-id id1 --message-id id2
   ```

3. Xem trước (dry-run)
   ```bash
   node dist/cli/chatwork-thread.js extract-users --room-id 409502735 --dry-run
   ```

