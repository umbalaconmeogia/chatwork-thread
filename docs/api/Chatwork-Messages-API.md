# Chatwork API: Lấy message trong room

Tài liệu này tóm tắt cách lấy **toàn bộ message** trong một room từ Chatwork API, đặc biệt khi số lượng message rất lớn (ví dụ từ 2022 đến nay).

## Endpoint

```
GET https://api.chatwork.com/v2/rooms/{room_id}/messages
```

**Tham số query (GET):**

| Tham số | Mô tả |
|--------|--------|
| `force` | `0` hoặc `1`. `force=1`: lấy dữ liệu mới nhất (bỏ qua cache). Nên dùng khi cần sync mới. |
| `limit` | (Tùy tài liệu từng phiên bản) Số message tối đa mỗi request. Một số nguồn gợi ý mặc định 100. |
| `offset` | (Nếu API hỗ trợ) Bỏ qua N message đầu – dùng để phân trang. |

**Lưu ý:** Tham số chính xác (limit/offset) nên kiểm tra tại [Chatwork API Reference - メッセージ一覧を取得](https://developer.chatwork.com/reference/get-rooms-room_id-messages). Tool hiện gửi `limit` và `offset` khi gọi phân trang; nếu API không hỗ trợ, có thể chỉ nhận được một batch (ví dụ 100 message mới nhất).

## Giới hạn API

1. **Rate limit:** 300 request / 5 phút. Vượt quá trả về HTTP 429.
2. **Header trả về:** `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`.
3. **Gói Free (áp dụng theo tổ chức):** Có thể giới hạn **5.000 message gần nhất trong 40 ngày**. Khi áp dụng, response header có `chatwork-message-limitation: true`.

## Cách tool lấy “toàn bộ” message

**Mặc định:** Tool tự điều chỉnh tốc độ request để tránh rate limit:
- Phân trang: `limit=100`, `offset=0`, `100`, `200`, ...; dừng khi nhận < 100 message.
- **Throttle chủ động:** Delay 1,2s giữa mỗi request. Sau mỗi response, đọc header `x-ratelimit-remaining`; nếu còn ≤ 10 request thì **sleep đến thời điểm reset** (`x-ratelimit-reset`) rồi mới gửi request tiếp.
- **Khi bị 429:** Thử lại tối đa 3 lần (chờ theo `x-ratelimit-reset`). Sau đó **báo lỗi rõ ràng** (ChatworkRateLimitError) kèm thời điểm được gọi lại, để người dùng biết khi nào chạy lại.

**CLI:**

```bash
# Mặc định: lấy toàn bộ room (phân trang + rate limit tự động)
node dist/cli/chatwork-thread.js fetch-room <room-id>

# Chỉ 1 request (room nhỏ hoặc kiểm tra nhanh)
node dist/cli/chatwork-thread.js fetch-room <room-id> --single
```

**Resume khi bị 429:**
- **Lưu ngay:** Mỗi chunk được lưu vào DB ngay khi lấy xong; tiến độ (offset) được ghi vào bảng **fetch_room_progress** trong DB.
- **Chạy lại = tiếp tục:** Khi bạn chạy lại lệnh sau khi hết thời gian chờ, chương trình **tiếp tục từ offset đã lưu** (resume), không gọi lại từ đầu → tránh lặp lại request đã thành công và giảm nguy cơ bị 429 lại.
- **Retry trong cùng lần chạy:** Khi một request bị 429, chương trình thử lại đúng request đó tối đa 3 lần (tiếp tục ở chỗ bị dừng).

**Lưu ý:** `fetch-room` **không tạo thread** — chỉ lưu message vào bảng `messages`. Để xem theo thread, dùng lệnh `create` và `show`.

## Tham khảo

- [Chatwork API - メッセージ一覧を取得](https://developer.chatwork.com/reference/get-rooms-room_id-messages)
- [API利用回数制限](https://developer.chatwork.com/docs/endpoints) (300 requests / 5 min)
- [2022/09/06 フリープラン グループチャットの利用上限](https://developer.chatwork.com/changelog/2022-09-06-notice) (5,000 messages / 40 days)
