/* =========================================================================
 * config.js — Cấu hình đọc dữ liệu từ Google Sheet
 * =========================================================================
 * Cách hoạt động:
 *  - Ứng dụng đọc dữ liệu dưới dạng CSV xuất ra từ Google Sheet.
 *  - Để phương pháp này hoạt động, bạn cần "Publish to the web" (Xuất bản
 *    lên web) cho bảng tính, hoặc đặt quyền chia sẻ là "Ai cũng xem được".
 *
 * Hướng dẫn xuất bản:
 *   1. Mở Google Sheet.
 *   2. Vào menu "Tệp" (File) -> "Chia sẻ" -> "Xuất bản lên web" (Publish to web).
 *   3. Chọn "Toàn bộ tài liệu" hoặc "Trang tính cụ thể", định dạng "Giá trị được phân tách bằng dấu phẩy (.csv)".
 *   4. Nhấn "Xuất bản".
 *   (Nếu không muốn xuất bản, chỉ cần đặt quyền chia sẻ là "Bất kỳ ai có đường liên kết đều có thể xem".)
 * ========================================================================= */

const APP_CONFIG = {
  // ID của bảng tính (lấy từ URL):
  // https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
  spreadsheetId: "1f-F5737EZBhApaGm2l68G2fXwjcq9prMNakppKWsQG4",

  // ID của trang tính (gid), lấy từ URL ?gid=...#gid=...
  // Nếu để trống, sẽ dùng trang tính đầu tiên.
  gid: "0",

  // Tên các cột trong bảng (theo thứ tự). Dùng để ánh xạ dữ liệu.
  // Phải khớp với hàng tiêu đề trong Google Sheet của bạn.
  columns: {
    stt: "STT",
    link: "link",
    description: "description", // giữ nguyên chính tả của bạn trong sheet
    kind: "kind",
  },

  // Có dùng dòng đầu tiên làm tiêu đề cột hay không.
  hasHeader: true,

  // Ký tự phân tách (CSV mặc định là dấu phẩy).
  delimiter: ",",

  // Tự động làm mới dữ liệu sau mỗi N phút (0 = không tự làm mới).
  autoRefreshMinutes: 0,

  // Tiêu đề hiển thị trên trang.
  pageTitle: "Link Hub",
  pageSubtitle: "Tổng hợp liên kết hữu ích",

  // Các "kind" (loại) để lọc. Để rỗng [] để hiện tất cả không lọc.
  // Ví dụ: ["website", "tool", "doc"]
  filterKinds: [],
};

/* Tạo URL xuất CSV từ Google Sheet (không cần API key).
 * Có thể ghi đè bằng cách đặt exportUrl trực tiếp bên dưới nếu muốn.
 */
APP_CONFIG.exportUrl =
  `https://docs.google.com/spreadsheets/d/${APP_CONFIG.spreadsheetId}/export?format=csv` +
  (APP_CONFIG.gid ? `&gid=${APP_CONFIG.gid}` : "");
