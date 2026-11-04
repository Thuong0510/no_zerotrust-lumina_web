# Kiểm thử bản xuất ngày 04/11/2026

Môi trường: Windows, Node.js v24.16.0. Toàn bộ lệnh chạy trong bản sao riêng, dùng database PGlite tạm hoặc API giả lập, không đọc `.env` cá nhân và không kết nối database đang dùng. TypeScript và build frontend đều thành công.

| Nhóm | Kết quả |
| --- | --- |
| API integration và HTTP thật trên máy | 183 kiểm tra đạt |
| Checkout COD/đơn hàng/tồn kho | 74 kiểm tra đạt |
| Xóa mềm tài khoản/đăng ký lại/phân quyền | 68 kiểm tra đạt |
| Security regression | 58 kiểm tra đạt |
| OWASP recovery/email/token/session | 10 kiểm tra đạt, 0 thất bại |
| OWASP chống dò tài khoản qua đăng ký | 3 kiểm tra đạt, 0 thất bại |
| Production: khởi tạo Admin, cookie Secure/HttpOnly, đăng nhập và truy cập API quản lý qua dispatcher | 15 kiểm tra đạt |
| Runtime role/PostgreSQL/RLS | 7 kiểm tra đạt |
| Shopping UI: Admin/Employee, giỏ, COD, retry và cách ly tài khoản | Đạt |
| Storefront: khách công khai/Guest/Admin/Employee | Đạt |
| Navigation: đổi trang, phản hồi cũ, lỗi 401, StrictMode | Đạt |
| Request URL/origin | 55 kiểm tra đạt |
| Users UI: duyệt/khóa/xóa/tự bảo vệ | Đạt |
| API rewrite/routing | 20 kiểm tra đạt |
| Fashion demo: dữ liệu, rerun, concurrency, rollback | Đạt |

Log và thời gian chạy ở `bao-ve/evidence/2026-11-04-owasp-export/`. Các log có lỗi SQL hoặc API 4xx được chủ động tạo bởi tình huống âm (rollback, truy cập bị từ chối, dữ liệu không hợp lệ); mọi command trong hai file `*-results.json` đều có exitCode 0.

Đã đồng bộ lockfile bằng `npm install --package-lock-only --ignore-scripts --offline --no-audit --no-fund`. Gói `jose` đã bỏ khỏi dependency trực tiếp của ứng dụng; lockfile vẫn có bản dependency gián tiếp của `@vercel/oidc` phục vụ SDK Vercel.

Tests ban đầu gặp lỗi `uv_os_get_passwd` do giới hạn Windows sandbox khi tsx đọc thông tin tài khoản hệ điều hành. Đã chạy lại cùng source trong bản sao riêng ngoài sandbox, toàn bộ kiểm tra đạt. Không sửa thư viện để bỏ qua lỗi này.

Chưa triển khai hoặc kiểm tra Vercel, SMTP, Storage và TLS trên dịch vụ thật; chưa chạy lại npm audit trực tuyến. Build có cảnh báo dung lượng bundle trên 500 kB; build vẫn thành công. Báo cáo và audit cũ là hồ sơ lịch sử, không chứng minh trạng thái dependency hiện tại.

Bốn migration SQL giữ nguyên SHA-256 so với source gốc. Trước và sau đóng gói, đối chiếu toàn bộ 263 file hiện có ngoài `.git` và `node_modules`: không file nào bị sửa hoặc xóa. Source gốc chỉ nhận thêm file ZIP kết quả.
