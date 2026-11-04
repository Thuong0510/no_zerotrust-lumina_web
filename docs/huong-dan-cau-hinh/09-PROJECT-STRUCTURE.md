# Bản đồ file và quy tắc dọn dẹp

Tài liệu này phân loại các file của dự án để xác định nơi sửa code, nơi lưu tài liệu và những dữ liệu được phép dọn. Các đường dẫn trong bảng tính từ thư mục gốc repository.

## 1. Cấu hình và điểm vào

| File / nhóm file | Vai trò |
| --- | --- |
| `README.md` | Giới thiệu, công nghệ, cài đặt, chạy, kiểm thử và triển khai |
| `package.json`, `package-lock.json` | Scripts và dependencies dùng chung; giữ cả hai |
| `tsconfig.json` | Cấu hình TypeScript cho frontend, backend, shared và API |
| `vercel.json`, `api/index.ts` | Build, header, rewrite và adapter API Vercel |
| `.env.example`, `.env.vercel.example` | Mẫu cấu hình local và production |
| `.gitignore` | Loại secrets, dependencies và dữ liệu sinh ra khỏi Git |
| `.github/workflows/ci.yml`, `.github/dependabot.yml` | Kiểm tra CI và theo dõi dependency |

## 2. Frontend

| File trong `frontend/` | Vai trò |
| --- | --- |
| `index.html`, `public/favicon.svg`, `vite.config.ts` | HTML gốc, favicon, dev proxy và build |
| `src/main.tsx`, `src/App.tsx` | Mount React, bootstrap phiên, điều hướng và phân chia giao diện theo role |
| `src/styles.css`, `src/storefront.css` | Giao diện workspace và cửa hàng |
| `src/lib/client.ts`, `src/lib/cart.ts` | Gọi API/CSRF, định dạng/xuất CSV và quản lý giỏ hàng |
| `src/components/lumina/storefront.tsx`, `auth-screen.tsx` | Cửa hàng công khai và màn hình xác thực |
| `src/components/lumina/shopping.tsx`, `customer-shopping.tsx` | Chọn hàng, giỏ, checkout, đơn cá nhân và chính sách |
| `src/components/lumina/dashboard.tsx`, `entity-page.tsx` | Dashboard, form/danh sách/chi tiết entity |
| `src/components/lumina/operations.tsx`, `system-pages.tsx` | Kho, đơn nội bộ, phân quyền, báo cáo, hồ sơ và nhật ký |
| `src/components/lumina/ui.tsx` | Thành phần giao diện dùng chung |
| `shared/entities.ts` (ngoài frontend) | Metadata entity, trường form và nhãn dùng chung |

## 3. Backend và database

| File / nhóm file | Vai trò |
| --- | --- |
| `backend/src/server.ts`, `app.ts` | HTTP local, phục vụ bản build, kiểm tra và dispatch request |
| `backend/src/config/runtime.ts`, `apiPath.ts`, `requestUrl.ts` | Môi trường, Storage adapter, chuẩn hóa API path và origin |
| `backend/src/routes/apiRoutes.ts`, `controllers/apiController.ts` | Điểm vào route và điều phối request/response |
| `backend/src/config/accessPolicy.ts` | Ánh xạ quyền RBAC cho API, độc lập hạ tầng triển khai |
| `backend/src/middleware/security.ts` | Mật khẩu, session, quyền, CSRF, throttle và audit |
| `backend/src/models/database.ts`, `migrate.ts` | Pool, truy vấn, transaction và migration runner |
| `backend/src/models/*Model.ts` | SQL cho auth, catalog, business, shopping, store, media, system, security và demo seed |
| `backend/src/services/*Service.ts`, `validation.ts` | Nghiệp vụ tương ứng, khởi tạo, seed, gửi mail và kiểm tra input |
| `backend/src/data/fashionDemo.ts` | Dataset thời trang dùng bởi fashion seed |
| `backend/scripts/migrate.ts`, `seed.ts`, `runtime-role.ts` | Lệnh quản trị database; không phải mã thừa dù không chạy mỗi lần mở web |
| `backend/scripts/seed-fashion-demo.ts`, `import-sqlite.ts` | Tác vụ bổ sung dữ liệu demo và chuyển dữ liệu SQLite |
| `database/migrations/001_initial.sql` | Schema ban đầu |
| `database/migrations/002_customer_checkout.sql` | Đơn khách mua, địa chỉ, phí vận chuyển và retry checkout |
| `database/migrations/003_media_ownership.sql` | Ownership file upload |
| `database/harden-supabase.sql` | SQL tham khảo gia cố Supabase; quy trình tự động dùng `npm run db:role` |

Giữ nguyên migration đã áp dụng vì runner lưu checksum. Không gộp/xóa migration cũ để làm gọn thư mục. Script import vẫn cần cho nguồn SQLite cũ, không phải dependency của luồng chạy thường ngày.

## 4. Kiểm thử

| File trong `tests/` | Vai trò |
| --- | --- |
| `embedded.ts` | Harness PostgreSQL tạm, chạy integration/checkout/security/production/role |
| `integration.ts`, `checkout.ts`, `security.ts`, `production.ts` | API và nghiệp vụ, checkout/public store, bảo mật và cấu hình production |
| `shopping.tsx`, `storefront.tsx`, `navigation.tsx` | UI với jsdom và API giả lập |
| `request-url.ts` | URL, origin và cổng local |
| `fashion-demo.ts` | Dataset, tính lặp an toàn và rollback fashion seed |

Các entry test được gọi qua npm scripts hoặc import động từ harness. Không xác định chúng là file bỏ đi chỉ vì không được import trong ứng dụng.

## 5. Tài liệu

| Nhóm | Nơi lưu |
| --- | --- |
| Cài đặt và cấu hình | `docs/huong-dan-cau-hinh/`: `01-VS-CODE.md`, `02-SUPABASE.md`, `03-VERCEL-GITHUB.md`, `05-TROUBLESHOOTING.md` |
| Hướng dẫn kiểm tra bảo mật | `docs/huong-dan-cau-hinh/04-OWASP.md`; báo cáo kết quả tổng hợp ở `docs/bao-ve/BAO-CAO-BAO-MAT-OWASP.md` |
| Dữ liệu và chức năng mua hàng | `docs/huong-dan-cau-hinh/06-FASHION-DEMO.md` đến `08-STOREFRONT.md` trong cùng thư mục |
| Cấu trúc và quy tắc lưu file | Tài liệu này |
| Kết quả kiểm thử theo từng thời điểm | [VALIDATION.md](../bao-ve/VALIDATION.md) trong `docs/bao-ve/` |
| Báo cáo bảo vệ và bảo mật | `docs/bao-ve/BAO-CAO-BAO-VE.md`, `BAO-CAO-BAO-MAT-OWASP.md` |
| Bằng chứng kiểm thử OWASP | `docs/bao-ve/evidence/2026-10-20/`: log, JSON và hash được báo cáo tham chiếu; giữ để đối chiếu kết quả |
| Xóa tài khoản và đăng ký lại | `docs/ACCOUNT-DELETION.md`, hướng dẫn hành vi và migration 004 |
| Sơ đồ | `docs/bao-ve/SO-DO.mmd`, 8 ảnh trong `docs/bao-ve/diagrams/` và `tools/render-diagrams.mjs` |

Giữ ảnh sơ đồ vì báo cáo đang tham chiếu chúng. Script render PNG và file Mermaid là hai nguồn sơ đồ được quản lý riêng; kiểm tra lại báo cáo khi thay đổi. Chạy script từ thư mục gốc bằng `node docs/bao-ve/tools/render-diagrams.mjs`.

Đã gom bốn hướng dẫn cài đặt/cấu hình vào thư mục riêng và xóa file báo cáo ngày 20/10 chỉ còn liên kết chuyển tiếp sau khi hợp nhất. Hai báo cáo chính và hồ sơ bằng chứng được giữ; hướng dẫn OWASP, nghiệp vụ và lịch sử kiểm thử có nội dung riêng, không xóa như bản trùng.

## 6. File local và dữ liệu sinh ra

| Đường dẫn | Cách xử lý |
| --- | --- |
| `node_modules/` | Dependency do npm quản lý, không sửa thủ công; có thể cài lại bằng `npm ci` |
| `frontend/dist/` | Bản build; có thể xóa rồi tạo lại bằng `npm run build`; `npm start` cần thư mục này |
| `.test-dev-*.log` | Log chạy thử; đã dọn 4 file tồn từ lần chạy trước |
| `.test-uploads/` | Ảnh do các suite kiểm thử sinh ra; đã dọn 37 ảnh sau kiểm thử ngày 20/10/2026; có thể tạo lại khi chạy test |
| `.env`, `.certs/`, `*.pem`, `*.key` | Cấu hình/chứng chỉ local, giữ riêng; không xóa như file rác và không commit |
| `uploads/` | Có thể chứa ảnh thật khi dùng filesystem; cần backup/đối chiếu trước khi xóa |
| `.vercel/`, `coverage/`, `dist-server/` | Metadata/output local nếu được công cụ tạo; đã có ignore |
| `*.sqlite`, `*.sqlite3`, `*.db` | Có thể là dữ liệu nguồn/backup; không xóa chỉ vì được ignore |

`.gitignore` ngăn commit nhầm, không tự xóa file trên máy. Các bài integration/checkout/security có thể tạo lại `.test-uploads/` sau mỗi lần chạy.

## 7. Phạm vi rà soát ngày 20/10/2026

Đã lập danh sách 101 file Git quản lý trước khi dọn, kiểm tra nội dung cấu hình/tài liệu, quan hệ import của mã TypeScript/TSX/MJS, entry scripts và tham chiếu ảnh. Không phát hiện file trùng nội dung theo SHA-256; chưa có bằng chứng đủ để xóa cả module mã nguồn. Đây là rà soát cấu trúc, không phải kiểm toán toàn bộ logic hay đo coverage.

Phần local được kiểm tra riêng để nhận diện log, ảnh test và build output; không duyệt từng file thư viện bên trong `node_modules/` hoặc nội dung Git nội bộ như mã nguồn dự án. Thay đổi tổ chức gồm gom kết quả kiểm thử vào `docs/`, bổ sung bản đồ này và cập nhật README/liên kết. Các file bị dọn là output có thể tái tạo, không phải dữ liệu nghiệp vụ.
