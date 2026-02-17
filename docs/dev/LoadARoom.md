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

## Scroll to top of a room

Open browser debug tool console to run

```javascript
(function() {
    // 1. Xác định đúng khung chứa tin nhắn của Chatwork
    const chatBox = document.querySelector('#_timeLine');
    
    if (!chatBox) {
        alert("Không tìm thấy khung chat '#_timeLine'. Hãy chắc chắn bạn đang mở một phòng chat cụ thể.");
        return;
    }

    console.log("%c--- Bắt đầu cuộn khung chat nội bộ ---", "color: orange; font-weight: bold;");

    const stopText1 = "Let's get connected on Chatwork!";
    const stopText2 = "You can invite to group chats with ease by sharing the link.";

    const autoScroll = setInterval(() => {
        // 2. Kiểm tra xem nội dung dừng đã xuất hiện trong khung chat chưa
        if (chatBox.innerText.includes(stopText1) || chatBox.innerText.includes(stopText2)) {
            clearInterval(autoScroll);
            alert("Đã chạm mốc tin nhắn đầu tiên của Room!");
            console.log("%c Hoàn thành!", "color: green; font-weight: bold;");
            return;
        }

        // 3. Cuộn khung chat lên đỉnh để kích hoạt load tin nhắn cũ (AJAX)
        chatBox.scrollTop = 0;

    }, 2000); // Nghỉ 2 giây để Chatwork kịp gọi API lấy tin cũ và render lên màn hình
})();
```