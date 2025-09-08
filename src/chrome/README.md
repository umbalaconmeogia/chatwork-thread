# Chatwork Thread Tool - Chrome Extension

Công cụ Chrome Extension để hiển thị thread chat từ Chatwork theo nhóm để dễ theo dõi.

## Tính năng

- 📱 **Side Panel**: Hiển thị panel bên phải trang web Chatwork
- 🧵 **Thread Creation**: Tạo thread từ Message ID
- 💾 **Thread Storage**: Lưu trữ các thread đã tạo
- 🎨 **Modern UI**: Giao diện đẹp và dễ sử dụng
- ⚡ **Real-time**: Tương tác trực tiếp với trang Chatwork

## Cài đặt Extension

### Bước 1: Chuẩn bị file extension

1. Tải về hoặc clone repository này
2. Đảm bảo bạn có thư mục `src/chrome/` với các file sau:
   - `manifest.json`
   - `sidepanel.html`
   - `sidepanel.css`
   - `sidepanel.js`
   - `content.js`
   - `background.js`
   - `popup.html`
   - `popup.js`
   - `icons/icon.svg`

### Bước 2: Mở Chrome Extension Manager

1. Mở Google Chrome
2. Vào địa chỉ: `chrome://extensions/`
3. Hoặc: Menu Chrome (⋮) → More tools → Extensions

### Bước 3: Bật Developer Mode

1. Ở góc trên bên phải, bật **Developer mode**
2. Bạn sẽ thấy xuất hiện thêm các nút: "Load unpacked", "Pack extension", "Update"

### Bước 4: Load Extension

1. Nhấn nút **"Load unpacked"**
2. Chọn thư mục `src/chrome/` trong project
3. Nhấn **"Select Folder"** (hoặc "Chọn thư mục")

### Bước 5: Xác nhận cài đặt

1. Extension sẽ xuất hiện trong danh sách với tên "Chatwork Thread Tool"
2. Đảm bảo toggle button bên cạnh extension được bật (ON)
3. Bạn sẽ thấy icon extension xuất hiện trên thanh công cụ Chrome

## Cách sử dụng

### Mở Side Panel

**Cách 1: Sử dụng Extension Icon**
1. Truy cập trang Chatwork (https://www.chatwork.com)
2. Nhấn vào icon extension trên thanh công cụ Chrome
3. Trong popup, nhấn **"サイドパネルを開く"**

**Cách 2: Sử dụng Thread Button**
1. Truy cập trang Chatwork
2. Tìm nút thread (🧵) ở bên phải màn hình
3. Nhấn vào nút này để mở side panel

### Tạo Thread

1. Trong side panel, nhập **Message ID** vào ô input
2. Nhấn **"Tạo Thread"**
3. Thread sẽ được hiển thị với các message liên quan

### Lưu và xem Thread

1. Thread được tạo sẽ tự động hiển thị trong phần "Thread"
2. Các thread đã lưu sẽ xuất hiện trong phần "Threads đã lưu"
3. Nhấn vào thread đã lưu để xem lại

## Cấu trúc File

```
src/chrome/
├── manifest.json          # Cấu hình extension
├── sidepanel.html         # HTML cho side panel
├── sidepanel.css          # CSS styling cho panel
├── sidepanel.js           # JavaScript cho panel logic
├── content.js             # Content script inject vào Chatwork
├── background.js          # Background service worker
├── popup.html             # HTML cho extension popup
├── popup.js               # JavaScript cho popup
├── icons/
│   └── icon.svg          # Icon SVG cho extension
└── README.md             # Hướng dẫn này
```

## Troubleshooting

### Extension không hiển thị
1. Kiểm tra Developer mode đã được bật
2. Refresh lại page `chrome://extensions/`
3. Kiểm tra thư mục src/chrome/ có đầy đủ file

### Side panel không mở
1. Đảm bảo đang ở trang Chatwork
2. Refresh lại trang Chatwork
3. Kiểm tra console để xem lỗi (F12 → Console)

### Thread button không xuất hiện
1. Refresh lại trang Chatwork
2. Kiểm tra content script đã được inject
3. Xem console để debug

### Lỗi permissions
1. Kiểm tra `manifest.json` có đúng permissions
2. Reload extension trong Chrome Extension Manager

## Development Notes

### Để debug extension:

1. **Background Script**: 
   - Vào `chrome://extensions/`
   - Nhấn "Service worker" trong extension card

2. **Content Script**:
   - Mở DevTools trên trang Chatwork (F12)
   - Xem tab Console

3. **Side Panel**:
   - Right-click vào side panel → "Inspect"

### Để update extension:

1. Sửa đổi code
2. Vào `chrome://extensions/`
3. Nhấn nút refresh (⟳) trong extension card

## Ghi chú

- Extension này hiện tại là phiên bản demo với mock data
- Cần tích hợp với Chatwork API thực tế để có chức năng đầy đủ
- Side panel sử dụng Chrome Extensions Manifest V3
- Chỉ hoạt động trên các trang Chatwork (*.chatwork.com)

## Phiên bản tương lai

- [ ] Tích hợp với Chatwork API thật
- [ ] AI analysis cho thread content
- [ ] Export thread ra các format khác
- [ ] Share thread với người khác
- [ ] Dark mode
- [ ] Keyboard shortcuts
