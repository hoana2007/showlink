# Link Hub — Xem liên kết từ Google Sheet

Ứng dụng web nhẹ (HTML + CSS + JavaScript thuần) dùng để hiển thị danh sách
liên kết được lưu trong một Google Sheet. Hỗ trợ:

- Cột: **STT, link, description, kind**
- Nhấn vào liên kết sẽ mở trang web ở tab mới (`target="_blank"`)
- Giao diện **Ngày / Đêm** (tự động theo hệ điều hành, lưu lựa chọn)
- Thiết kế **responsive** (đẹp trên cả điện thoại và máy tính)
- Bộ lọc theo `kind`
- Không cần API key hay backend

## Cấu trúc file

| File         | Mô tả                                                         |
| ------------ | ------------------------------------------------------------- |
| `index.html` | Giao diện chính                                               |
| `style.css`  | Giao diện responsive + theme sáng/tối                         |
| `app.js`     | Tải & phân tích CSV, hiển thị thẻ, chuyển giao diện, lọc      |
| `config.js`  | **Cấu hình**: ID bảng tính, gid, tên cột, tiêu đề...          |

## Cách dùng

1. Mở `config.js` và kiểm tra `spreadsheetId` / `gid` (đã điền sẵn theo sheet của bạn).
2. Đảm bảo Google Sheet **có thể truy cập công khai**:
   - Cách 1 (khuyên dùng): `Tệp` → `Chia sẻ` → `Xuất bản lên web` (Publish to web),
     chọn định dạng **CSV**.
   - Cách 2: `Chia sẻ` → `Bất kỳ ai có đường liên kết đều có thể xem`.
3. Mở `index.html` bằng trình duyệt (hoặc chạy một web server nhỏ, xem dưới).

> Lưu ý: do trình duyệt hạn chế `fetch` từ file `file://`, nên chạy qua
> web server để tránh lỗi CORS, ví dụ:
>
> ```bash
> # Python
> python -m http.server 8000
> # rồi mở http://localhost:8000
> ```

## Tùy chỉnh

Trong `config.js`:

- `columns`: đổi tên cột nếu sheet của bạn dùng tiêu đề khác
  (hiện đang để `"desctiption"` theo chính tả trong sheet của bạn).
- `pageTitle` / `pageSubtitle`: tiêu đề trang.
- `autoRefreshMinutes`: tự làm mới sau N phút (0 = tắt).
- `filterKinds`: giới hạn danh sách nút lọc (để rỗng `[]` = hiện tất cả).

## Triển khai (hosting miễn phí)

Có thể đẩy cả 4 file lên GitHub Pages, Vercel, Netlify… (chỉ cần tĩnh).
Sau khi deploy, nhớ để Google Sheet ở chế độ công khai như bước 2.
