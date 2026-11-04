# Database PostgreSQL và lưu ảnh miễn phí trên Supabase

**Storefront công khai không cần đổi quyền Supabase:** giữ schema và bucket private. Backend chỉ phục vụ ảnh qua `/api/store/media/:key` khi được sản phẩm Active tham chiếu; `/api/media/:key` và ảnh hồ sơ vẫn cần session. Không tạo policy bucket public để mở trang chủ. Không có migration mới ngoài checkout 002 cho thay đổi giao diện này.

**Nâng cấp từ bản trước:** repository hiện có migration `001_initial.sql`, `002_customer_checkout.sql` và `003_media_ownership.sql`. Backup, dùng connection quản trị chạy `npm run db:migrate`, sau đó `npm run db:role`, rồi chuyển lại runtime connection và restart/redeploy. Không seed lại dữ liệu hiện có. Migration 002 thêm dữ liệu checkout; migration 003 bổ sung ownership ảnh upload. Xem [checkout](07-SHOPPING.md) và [báo cáo bảo mật](../bao-ve/BAO-CAO-BAO-MAT-OWASP.md).

## 1. Tạo project

Đăng nhập Supabase → New project → chọn Free → đặt tên → tạo mật khẩu database mạnh và lưu ở nơi riêng. Chọn region gần bạn, chờ project sẵn sàng. Free hiện có 500 MB database, 1 GB storage, tối đa 2 project active và có thể pause sau 1 tuần không sử dụng; theo [pricing](https://supabase.com/pricing), kiểm tra lại quota khi đăng ký.

## 2. Điền connection string

Trong project → **Connect** → **Transaction pooler** → copy URL có port **6543**. Dùng hostname trả về trong dashboard, không tự đoán region. Pooler tương thích IPv4, phù hợp backend serverless. Driver không tạo named prepared statements; mỗi transaction dùng `SET LOCAL search_path` nên không lệ thuộc trạng thái session qua pooler.

Điền trong `.env`:

```dotenv
DATABASE_URL=postgresql://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@POOLER_HOST:6543/postgres
DATABASE_SCHEMA=lumina
DATABASE_SSL=true
DATABASE_POOL_MAX=2
```

Thay toàn bộ các chữ viết hoa bằng dữ liệu của bạn. Nếu mật khẩu có `@`, `:`, `#`, `%`, `/`, phải URL-encode **phần mật khẩu**. Dùng công cụ local, không đưa password vào website encode công cộng. Có thể chọn mật khẩu random dạng hex để tránh lỗi ký tự đặc biệt.

TLS kiểm tra chứng chỉ, không dùng `rejectUnauthorized:false`. Nếu gặp lỗi CA, tải chứng chỉ CA trong phần cấu hình SSL của Supabase rồi điền `DATABASE_CA_FILE` local, hoặc `DATABASE_CA_PEM` trên Vercel. `DATABASE_CA_PEM` nhận chuỗi PEM với xuống dòng thật hoặc `\n`. Không upload `.env` hoặc chứng chỉ có private key lên repository.

## 3. Tạo private bucket

Supabase → Storage → New bucket:

- Tên: `lumina-private`.
- **Public bucket: OFF**.
- File size limit: 2 MB.
- Allowed MIME types: `image/png,image/jpeg`.

Trong Settings/API Keys, lấy **server secret key** hoặc legacy `service_role` key. Không dùng publishable/anon key cho adapter này. Điền:

```dotenv
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_STORAGE_KEY=YOUR_SERVER_ONLY_SECRET
SUPABASE_BUCKET=lumina-private
```

Không thêm policy công khai cho bucket. Browser upload qua API của LUMINA; backend kiểm tra phiên đăng nhập, CSRF, dung lượng, giải mã và chuẩn hóa PNG/JPEG rồi mới lưu. URL `/api/media/...` cũng yêu cầu đăng nhập. Không đặt secret key trong `VITE_*`, không copy vào component React.

## 4. Khởi tạo schema và Admin

Trong `.env` điền email thật của bạn và mật khẩu Admin riêng tối thiểu 12 ký tự:

```dotenv
DEMO_MODE=false
INIT_ADMIN_EMAIL=YOUR_EMAIL
INIT_ADMIN_PASSWORD=YOUR_UNIQUE_ADMIN_PASSWORD
INIT_RUNTIME_PASSWORD=ANOTHER_UNIQUE_DATABASE_PASSWORD_16_CHARS
```

Giữ `NODE_ENV=development` khi setup ở máy. Chạy từ thư mục gốc:

```bat
npm run db:seed
npm run db:role
```

`db:seed` tự chạy migration, tạo đủ bảng gồm `settings` và một Admin, không thêm dữ liệu demo khi `DEMO_MODE=false`. Chạy lại không tạo lại Admin. Nếu muốn chỉ cập nhật schema sau này, dùng `npm run db:migrate`.

`db:role` tạo `lumina_app` một lần, cấp quyền thao tác dữ liệu; không cấp quyền tạo/xóa bảng. Nó thu hồi quyền `PUBLIC`, `anon`, `authenticated`, bật RLS và tạo policy chỉ cho role backend. Role này không được sửa lịch sử migration hay sửa/xóa audit logs. Chạy lại cập nhật quyền và policy; không tự đổi password của role đã tồn tại.

Nếu migration/seed lỗi thì xử lý lỗi trước, không deploy. Nếu `db:role` chỉ báo thất bại, xem mã lỗi: `42501` là thiếu quyền; kiểm tra `.env` đang dùng connection `postgres` trong dashboard, không phải `lumina_app`.

## 5. Kiểm tra database không lộ qua REST

Trong Supabase → cấu hình Data API / Exposed schemas: **không thêm `lumina`**. Database ứng dụng nằm ở schema `lumina`, không nằm trong `public`. SDK Supabase chỉ được dùng phía backend cho Storage, không truy cập các bảng qua REST.

Trong SQL Editor kiểm tra:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables WHERE schemaname='lumina';
SELECT rolname, rolsuper, rolbypassrls
FROM pg_roles WHERE rolname='lumina_app';
```

Các bảng phải có `rowsecurity=true`; `lumina_app` phải `rolsuper=false`, `rolbypassrls=false`. Policy `server_only` cho phép role backend thao tác theo quyền database; quyền từng người dùng Admin/Employee/Guest tiếp tục được kiểm tra ở Node API vì ứng dụng dùng phiên đăng nhập riêng.

## 6. Connection dùng trên Vercel

Lấy lại connection Transaction pooler, thay username từ `postgres.PROJECT_REF` thành **`lumina_app.PROJECT_REF`**, thay mật khẩu bằng `INIT_RUNTIME_PASSWORD` đã dùng khi tạo role. Hostname, port 6543 và `/postgres` giữ nguyên.

Vercel chỉ nhận connection này; không đưa connection migration/Admin lên Vercel. Local cũng chuyển sang runtime connection sau setup. Xóa `INIT_ADMIN_PASSWORD` và `INIT_RUNTIME_PASSWORD` khỏi `.env` sau setup nếu bạn đã cất ở nơi riêng. Admin vẫn đăng nhập bằng mật khẩu đã seed. Giữ connection quản trị riêng để chạy migration sau này.

Nếu có database D1/SQLite cũ, đọc phần chuyển dữ liệu trong [05-TROUBLESHOOTING.md](05-TROUBLESHOOTING.md) **trước khi seed vào database đích**.

Nguồn: [kết nối PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).
