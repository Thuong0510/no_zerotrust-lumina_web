# Bản source LUMINA — bảo mật ứng dụng OWASP

Bản xuất ngày 04/11/2026 được tạo từ source đang có trên máy, bao gồm các thay đổi tài liệu chưa commit. Bản này giữ cửa hàng công khai, tài khoản/đăng ký/duyệt tài khoản, đăng nhập/đăng xuất, quên/đổi mật khẩu, sản phẩm/biến thể/danh mục/nhà cung cấp, khách hàng/nhân viên, kho, giỏ hàng, checkout COD, đơn hàng, báo cáo, thông báo, hồ sơ, upload ảnh, Users, Roles & Permissions, audit log và xóa mềm/đăng ký lại tài khoản.

Bảo mật được giữ: mật khẩu PBKDF2, session ngẫu nhiên lưu hash, cookie HttpOnly/SameSite/Secure, phân quyền RBAC và ownership, CSRF, giới hạn đăng nhập/yêu cầu, kiểm tra dữ liệu, SQL tham số hóa, upload PNG/JPEG được decode và encode lại, security headers, xác minh origin, SSL database, runtime role giới hạn và bucket riêng tư. Đây là phạm vi bảo mật ứng dụng theo OWASP; không phải chứng nhận tuân thủ OWASP.

## Cài và chạy

1. Giải nén, mở thư mục chứa `package.json`. Cài Node.js 24.x.
2. Chạy `npm ci` (Windows PowerShell có thể dùng `npm.cmd` thay `npm`).
3. Sao chép `.env.example` thành `.env`, điền kết nối PostgreSQL và cấu hình cần dùng. Có thể dùng Supabase PostgreSQL/Storage như hướng dẫn hiện có. File cấu hình cá nhân, dữ liệu database, chứng chỉ và khóa bí mật không được đóng gói.
4. Với database mới: cấu hình `INIT_ADMIN_EMAIL`, `INIT_ADMIN_PASSWORD` và `INIT_RUNTIME_PASSWORD`, chạy `npm run db:seed`, rồi `npm run db:role`. Chuyển sang kết nối runtime sau khởi tạo. Với database cũ, đọc hướng dẫn migration trước; không seed/reset dữ liệu đang dùng.
5. Mở hai terminal: `npm run dev:server` và `npm run dev`. Truy cập `http://localhost:5173`.
6. Muốn chạy một server: đặt `APP_ORIGIN=http://localhost:3000`, giữ `NODE_ENV=development`, chạy `npm run build` rồi `npm start`.

Admin đăng nhập trực tiếp bằng tài khoản LUMINA. Production triển khai thẳng lên Vercel theo `.env.vercel.example`, dùng domain HTTPS trong `APP_ORIGIN`, SSL database, `DEMO_MODE=false` và Supabase private Storage.

## Kiểm tra

`npm test` chạy build/typecheck, integration, checkout, tài khoản, security, OWASP recovery/registration, cấu hình production, quyền database, UI mua hàng/storefront/điều hướng/Users, API routing, origin và fashion demo. Tests dùng PGlite tạm hoặc API giả lập; không dùng database cá nhân. Xem `docs/KIEM-THU-BAN-XUAT.md` để biết kết quả thực chạy của bản xuất này.

Xem `README.md` và `docs/huong-dan-cau-hinh/` để cấu hình chi tiết. Các báo cáo/log cũ trong `docs/bao-ve/` là hồ sơ lịch sử, không thay cho kết quả kiểm thử bản xuất. Giữ nguyên từng byte migration 001–004 để không phá checksum khi đối chiếu database cũ; chú thích lịch sử trong migration 001 không phải tích hợp đang hoạt động.

ZIP chứa source, lockfile, migration, scripts, tests và tài liệu. Cài lại dependencies bằng `npm ci`; build frontend bằng `npm run build`. Không bao gồm `node_modules`, output build, dữ liệu upload cá nhân hay bản dump database.
