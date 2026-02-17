# Cách để lấy về toàn bộ một Chatwork room

1. **Lấy message trong room** (nếu chưa có):
   ```bash
   node dist/cli/chatwork-thread.js fetch-room <room-id>
   ```

2. **Tạo thread chứa toàn bộ message trong room**:
   ```bash
   node dist/cli/chatwork-thread.js create-from-room <room-id> --name "Tên room"
   ```

3. **Xem / xuất** bằng lệnh `show` như mọi thread khác:
   ```bash
   node dist/cli/chatwork-thread.js show <thread-id> --format html --output room.html
   ```
