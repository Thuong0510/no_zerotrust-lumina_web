# Kết quả kiểm thử

## Đối chiếu công nghệ, luồng hoạt động và ERD — 20/10/2026

- Thêm [mô tả công nghệ, luồng hoạt động và dữ liệu](CONG-NGHE-LUONG-HOAT-DONG-ERD.md), [ERD Mermaid độc lập](ERD.mmd); đồng bộ SO-DO.mmd, báo cáo bảo vệ và liên kết README.
- Áp dụng ba migration 001–003 vào PGlite trong RAM, tạo thêm schema_migrations đúng định nghĩa runner: xác nhận **24 bảng, 24 FK**. So khớp tên bảng, 126 thuộc tính được trình bày, các FK/UK, tính nullable và cardinality của ERD với catalog DB: đạt.
- So khớp 24 node và 24 quan hệ của script PNG với ERD/schema; kiểm tra ERD trong SO-DO.mmd giống bản độc lập: đạt. Xuất lại 7 PNG, đọc được metadata cả 8 ảnh và xem trực tiếp ERD tổng thể; bảng uploaded_media và quan hệ owner đã có trong hình.
- Kiểm tra liên kết tương đối/anchor và UTF-8 của README, báo cáo bảo vệ, mô tả mới và tài liệu kiểm chứng: đạt. `git diff --check` đạt.
- Phạm vi lần này là tài liệu và script sơ đồ; không chạy lại bộ test ứng dụng hoặc audit dependency. Kiểm tra DB dùng PGlite độc lập, không import cấu hình ứng dụng, không đọc `.env`, không kết nối/ghi cloud, không gửi SMTP hoặc deploy.

## Kiểm thử và khắc phục OWASP — 20/10/2026

- [Báo cáo tổng hợp mới](BAO-CAO-BAO-MAT-OWASP.md) phân loại 5 vấn đề, vị trí sửa, bằng chứng trước/sau và hạng mục còn mở/chưa kiểm chứng cloud.
- 13 kiểm tra mới: trước vá 10 không đạt + 3 đối chứng đạt; sau vá 13/13 đạt. Các kiểm tra cũ không được tính lại thành lỗ hổng mới.
- Build/typecheck và backend suites sau bản vá cuối đạt **344 lượt**: 183 integration + 74 checkout + 58 security + 10 OWASP + 3 registration + 9 production + 7 DB role. UI shopping/storefront/navigation và 55 URL checks đạt.
- npm ls hợp lệ; audit registry hiện tại 0 advisory, gồm cả dev. Log gốc, JSON và SHA-256 được lưu ở [hồ sơ bằng chứng](evidence/2026-10-20/README.md).
- Không đọc `.env` trong harness, không ghi database cloud, không gửi email thật, không deploy. Đợt này không thêm migration; không suy trạng thái cloud hiện tại từ kết quả local.

## Dọn cấu trúc và cập nhật tài liệu — 20/10/2026

- Build/typecheck đạt. Vite tạo bundle JavaScript khoảng 752,38 kB (gzip 218,40 kB), vẫn cảnh báo chunk lớn hơn 500 kB.
- Harness `tests/embedded.ts` đạt 183 integration + 74 checkout/public API + 58 security + 9 production + 7 DB role = 331 lượt ghi nhận. Build được chạy trước harness; không thay đổi mã nguồn ứng dụng hoặc migration trong lần dọn này.
- `test:shopping`, `test:storefront`, `test:navigation`, `test:request-url` (55 checks) và `test:seed:fashion` đều đạt.
- Kiểm tra liên kết Markdown tương đối và mục lục README hợp lệ; README có đủ 20 npm scripts hiện có.
- Chuyển báo cáo này từ thư mục gốc vào `docs/`, cập nhật liên kết, thêm [bản đồ file](../huong-dan-cau-hinh/09-PROJECT-STRUCTURE.md) và đồng bộ hướng dẫn nâng cấp đến migration 003.
- Dọn 4 log dev cũ và 37 ảnh trong `.test-uploads/` sau kiểm thử (31 ảnh đã tồn tại và 6 ảnh phát sinh trong lần kiểm tra). Giữ cấu hình local, chứng chỉ và dependencies.
- Lần chạy test ban đầu trong sandbox gặp lỗi hệ thống `uv_os_get_passwd` từ `tsx`; chạy lại ngoài sandbox thành công. Tests dùng PGlite tạm/API giả lập, không dùng database Supabase thật. Không chạy audit mới hoặc xác minh cloud/SMTP/Storage/Vercel trong lần này.

Các mục có ngày cũ bên dưới là lịch sử kiểm chứng, giữ nguyên phạm vi tại thời điểm thực hiện.

## Rà soát bảo mật OWASP — 17/10/2026

- Chi tiết: [Báo cáo bảo mật OWASP](BAO-CAO-BAO-MAT-OWASP.md), gồm vấn đề, vị trí sửa, phạm vi kiểm thử và việc cần làm khi triển khai.
- `npm ci`, `npm ls --depth=0` và build/typecheck thành công với dependency đúng lockfile. `npm audit --json`: 0 advisory cho production và development tại lần chạy này.
- Integration 183, checkout/public API 74, security 58, production 9, DB role 7: tổng 331 lượt ghi nhận ở các suite hiện tại. Suite security tích hợp vào `test:embedded`.
- Migration mới `003_media_ownership.sql` chỉ thử trên database tạm; chưa áp dụng lên cloud, chưa deploy Vercel, chưa kiểm chứng SMTP/Storage live.
- Các mục bên dưới là snapshot của những lần kiểm tra trước trong ngày, không thay thế kết quả bảo mật mới này.

## Storefront công khai và giao diện Guest — 17/10/2026

- Build/typecheck và `test:embedded` đạt: 183 integration + 74 checkout/public-store API + 9 production + 7 DB role = 273 lượt ghi nhận, kèm assertion bổ sung.
- `test:storefront` đạt: trang chủ không cần login, chi tiết và policy, thêm giỏ chuyển login, tiếp tục chọn hàng sau login, Guest COD/hủy, logout isolation, filter và Admin/Employee vào workspace đúng quyền.
- `test:shopping` kiểm tra shopping trong workspace Admin/Employee; coverage Guest chuyển sang `test:storefront` để kiểm tra đúng giao diện mới. Navigation và 55 request URL checks đạt.
- API public kiểm: projection không dữ liệu nội bộ, không Draft/Archived, media chỉ khi Active tham chiếu, file private/avatar không tự được public, method/ID sai và API riêng vẫn 401.
- Đã xem ảnh chụp Edge headless desktop và mobile thật 390px với dữ liệu giả lập; mobile có innerWidth/bodyWidth/rootWidth đều 390px, không tràn ngang. Chưa coi là visual QA toàn bộ phiên mua hàng trên Supabase/Vercel live.
- Không đổi role Guest thành Customer, không sửa schema hoặc apply migration mới. Bundle frontend khoảng 723 kB (gzip khoảng 210 kB), vẫn có cảnh báo chunk >500 kB. Không chạy audit mới.
- CI bổ sung `npm run test:storefront`.
- Smoke test chỉ đọc với cấu hình Supabase hiện có qua backend tạm cổng 3210: public catalog 200 (96 sản phẩm tại lúc kiểm tra, không có trường nội bộ), public policy 200, Users chưa login 401. Backend tạm đã dừng, không thay server người dùng hoặc ghi dữ liệu cloud. Không có ảnh upload được công bố trong dữ liệu kiểm tra nên chưa xác minh Storage live; phần media được kiểm thử bằng file local/database tạm.

## Cập nhật checkout COD — 17/10/2026

### Xác minh sau khi người dùng nâng cấp Supabase

Đã kiểm tra chỉ đọc trên project đang cấu hình: có `001_initial.sql` và `002_customer_checkout.sql`, đủ các cột checkout được kiểm tra, role `lumina_app` kết nối qua TLS xác minh chứng chỉ và có quyền dữ liệu cần thiết. `.env` local đã chuyển từ connection quản trị sang runtime sau khi xác minh. Web được khởi động tại `http://localhost:3000`; trang chính và hai asset trả 200, `/healthz` kết nối DB thành công, bootstrap trả user null khi chưa login, API đơn cá nhân/chính sách trả 401 khi chưa xác thực. Chưa đăng nhập Guest hoặc tạo/hủy đơn thử trên database dùng chung; Storage và Vercel live chưa được xác minh trong bước này.

### Kiểm thử tự động trên database tạm

- `npm run test:embedded`: build/typecheck thành công; 183 kiểm tra tích hợp, 53 lượt API checkout, 9 production và 7 DB role (tổng 252 lượt ghi nhận bởi harness, kèm các assertion bổ sung).
- `npm run test:shopping`: đạt cho Admin/Employee/Guest; quote từ server, đồng ý chính sách, xác nhận COD, retry sau mất mạng dùng đúng payload/key, điều hướng đơn cá nhân và chỉ xóa giỏ sau thành công.
- `npm run test:navigation`: đạt điều hướng/StrictMode, response lệch thứ tự, lỗi và unmount.
- `npm run test:request-url`: đạt 55 kiểm tra URL.
- Checkout kiểm tra: giá/phí từ server, free ship theo ngưỡng, thiếu kho/đổi giá, input giả total/buyer, ownership và thông báo riêng, snapshot địa chỉ, replay đồng thời, khách mua món cuối, hủy lặp và giữ phí khi nhân viên sửa items.
- Migration 002 được thử trên schema 001 đã seed đơn cũ; giữ nguyên số đơn, buyer_id cũ null và shipping_fee cũ 0; apply lại không chạy lại migration đã ghi checksum.
- CI bổ sung UI shopping/navigation/request-url, ngoài embedded và audit có sẵn. Không chạy audit mới trong lần thay đổi này; con số audit lịch sử phía dưới không phải kết quả hiện tại.

Giới hạn: dùng PostgreSQL WASM/PGlite và mock API cho UI, chưa kiểm thử tương tác bằng trình duyệt trên Supabase/Vercel thật; migration đã được người dùng áp dụng và schema/runtime đã được xác minh chỉ đọc. Bundle JS hiện khoảng 709 kB (gzip khoảng 206 kB), build vẫn cảnh báo chunk >500 kB. Không có payment gateway, đồng bộ giỏ server, vận đơn hoặc workflow đổi trả tự động. Chủ cửa hàng cần cấu hình thông tin hỗ trợ; quy trình áp migration bằng connection quản trị vẫn áp dụng cho các môi trường khác chưa nâng cấp.

## Snapshot cũ — 07/10/2026

- `npm run build`: đạt TypeScript check và production Vite build.
- `npm run test:embedded`: đạt 163 lượt kiểm tra API/chức năng, 9 kiểm tra chế độ production và 7 kiểm tra quyền database, tổng 179.
- `npm audit` sau cập nhật dependencies: 0 advisory ở snapshot kiểm tra; đây không phải cam kết không có lỗ hổng.
- CSS có SHA-256 giống bản PostgreSQL trước. Các màn hình React/component giữ cấu trúc và bố cục; chỉnh cách đọc timestamp nhật ký để nhận ISO PostgreSQL và tăng bảo vệ export CSV, không đổi thiết kế.

## Bộ kiểm tra có gì?

Auth/session, Admin/Employee/Guest RBAC, CSRF/origin, CRUD, variants, stock rollback, orders/create/edit/cancel, reports, seed idempotent, registration approval, reset token một lần, account lock/rate limit, ảnh PNG/JPEG và từ chối ảnh lỗi, cookie, HTTP thật, adapter Vercel rewrite/query string, invalid JSON/content type/body lớn và cross-site requests.

Runtime database role đã được thử đọc/ghi, bị từ chối DROP TABLE, DELETE audit logs và DELETE schema_migrations; RLS được bật, role không có superuser hoặc bypass RLS.

## Giới hạn kiểm chứng

Database kiểm thử là PostgreSQL chạy qua PGlite 0.5.8 (WASM), kết nối bằng `pg` qua TCP local. Chưa chạy trên Supabase project thật. Ở bài production của harness local, transport TLS được tắt riêng vì PGlite socket không cung cấp TLS; ứng dụng production vẫn bắt buộc DATABASE_SSL=true và rejectUnauthorized=true. Không kết luận TLS live đã đạt từ kết quả local.

Adapter Vercel đã được gọi trực tiếp bằng Web Request/Response, chưa được deploy lên tài khoản Vercel thật. Supabase private Storage SDK đã được tích hợp, nhưng chưa xác minh live bằng key/project của người dùng. Upload local đã được kiểm tra với Sharp. Chưa có browser visual QA cho bản đóng gói, full pentest hoặc load test.

Vite hiện cảnh báo chunk JS lớn hơn 500 KB. Build vẫn thành công; chưa tách thêm bundle để giữ cách tổ chức màn hình của source hiện tại.

Sau khi cấu hình dịch vụ, cần thực hiện các bước live trong [hướng dẫn Vercel](../huong-dan-cau-hinh/03-VERCEL-GITHUB.md) và ma trận security trong [hướng dẫn OWASP](../huong-dan-cau-hinh/04-OWASP.md). Không có credentials production nằm trong ZIP.
