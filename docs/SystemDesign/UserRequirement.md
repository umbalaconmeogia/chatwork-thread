# User requirement

## Overview

Chatwork không có tính năng hiển thị các nội dung chat có liên quan theo thread. Trong một group chat, dù có nhiều nội dung khác nhau thì chúng được hiển thị theo thời gian gửi lên, không phân theo thread khiến việc truy đọc nội dung liên quan trở nên khó khăn. Và không có cách nào (ví dụ như plugin, tool) để hiển thị nội dung theo thread cả.

Chương trình này được viết ra với mục đích muốn hiển thị nội dung chat có liên quan theo nhóm để dễ theo dõi.

Việc phát triển chương trình được chia ra thành các giai đoạn.
1. LocalApp: Phát triển chương trình chạy trên local để phục vụ mục đích trước mắt.
2. ChromeExtension: Phát triển extension cho Chrome browser để dễ sử dụng với Chatwork Web.
3. Tùy theo nhu cầu sử dụng, có thể phát triển thành hệ thống phức tạp hơn phục vụ doanh nghiệp.

## Từ vựng

| Term | Description |
|---|---|
| Message | (メッセージ) Là một tin nhắn được gửi lên. |
| Chat room | (チャットルーム) Là một nhóm nơi mọi người gửi thông tin lên. Có 3 loại chat room: My chat, Direct chat, Group chat. |
| Direct chat | (ダイレクトチャット) Chat room giữa 2 người. |
| Group chat | (グループチャット) Chat room giữa nhiều người. |
| My chat | (マイチャット) Chỉ dành cho bản thân, để memo thông tin. |

## Định hướng

### Cách tạo thread chat

Chú ý: Các thông tin dưới đây chỉ là giả định, cần phải kiểm chứng độ chính xác.

1. Sử dụng Chatwork API để lấy thông tin message (người dùng sẽ chỉ định một message để khởi động).
2. Dựa vào việc 返信 hay 引用 trong nội dung của message để tìm các message có liên quan.
3. Với mỗi message, lặp lại bước 2. để tìm thêm các chat liên quan.
4. Người dùng có thể chỉ định thêm các chat liên quan khác (không được tìm thấy bởi bước 2 và 3 ở trên).
5. Sắp xếp thứ tự theo thời gian (hay message id??) và hiển thị ra cho người dùng.

### Định hướng phát triển

#### LocalApp

LocalApp sẽ được phát triển theo các giai đoạn dưới đây, đáp ứng nhu cầu sử dụng.
1. Đầu tiên là phục vụ nhu cầu nhanh: Cho một message ID, từ đó tìm ra toàn bộ các message ID liên quan đến nhau, hiển thị nội dung chúng thành một thread (sắp xếp theo thứ tự thời gian).
2. Cho phép thêm vào danh sách các message ID không có liên quan, và hiển thị thread.
3. Lưu các thông tin trên vào local database (sqlite), để có thể tái sử dụng/xem lại thread đã tạo.

#### Chrome browser extension

Sau khi hoàn thành LocalApp (để chứng thực tính khả thi), phát triển thành Chrome browser extension.
1. Cho phép chọn lựa một thread ngay trên màn hình Chatwork Web, và tạo ra thread, hiển thị như là một panel trên màn hình web.
2. Lưu các thông tin của các thread vào storage.

#### Xây dựng hệ thống

Nếu có nhu cầu dùng trên nhiều máy tính/browser, hay chia sẻ nội dung thread cho nhiều người, thì sẽ dựng thành hệ thống lớn hơn.