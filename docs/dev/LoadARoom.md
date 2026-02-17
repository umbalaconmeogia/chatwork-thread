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
    console.log("%c--- Bắt đầu quá trình cuộn ngược thời gian Chatwork ---", "color: blue; font-weight: bold;");

    const scrollElement = document.querySelector('#_timeLine');
    if (!scrollElement) {
        alert("Không tìm thấy khung chat. Hãy đảm bảo bạn đang ở trong một room cụ thể.");
        return;
    }

    const stopText1 = "Let's get connected on Chatwork!";
    const stopText2 = "You can invite to group chats with ease by sharing the link.";

    let lastScrollTop = scrollElement.scrollTop;
    let noChangeCount = 0;

    const autoScroll = setInterval(() => {
        // Kiểm tra xem đã xuất hiện dòng chào mừng chưa
        const pageText = document.body.innerText;
        if (pageText.includes(stopText1) || pageText.includes(stopText2)) {
            clearInterval(autoScroll);
            console.log("%c--- Đã tìm thấy tin nhắn đầu tiên! Dừng cuộn. ---", "color: green; font-weight: bold;");
            alert("Đã chạm mốc tin nhắn đầu tiên của Room!");
            return;
        }

        // Thực hiện cuộn lên đỉnh
        scrollElement.scrollTop = 0;

        // Kiểm tra xem nội dung có thực sự load thêm không (tránh bị kẹt)
        if (scrollElement.scrollTop === lastScrollTop) {
            noChangeCount++;
        } else {
            noChangeCount = 0;
        }

        // Nếu cuộn mãi 10 lần (~15 giây) mà không thay đổi gì, có thể là đã hết hoặc mạng chậm
        if (noChangeCount > 10) {
            console.warn("Nội dung không đổi trong thời gian dài. Có thể đã hết hoặc mạng lag.");
        }

        lastScrollTop = scrollElement.scrollTop;
    }, 1500); // Nghỉ 1.5 giây mỗi lần cuộn để chờ server tải dữ liệu
})();
```