# GitHub → Vercel, không cần VPS

**Cập nhật database trước triển khai:** quản trị viên áp dụng đủ migration hiện có (đến `003_media_ownership.sql`, gồm checkout 002 và ownership ảnh 003) và cập nhật quyền bằng `db:migrate` + `db:role` từ máy quản trị. Không chạy migration/seed mỗi request. Vercel có thể thêm `SHIPPING_FEE=30000`, `FREE_SHIPPING_THRESHOLD=500000`, `SHOP_SUPPORT_EMAIL`, `SHOP_SUPPORT_PHONE`; điền liên hệ thật và redeploy. Xem [luồng và chính sách mua hàng](07-SHOPPING.md).

## 1. Kiểm tra source trước khi đẩy

Từ thư mục gốc:

```bat
npm run build
```

`.gitignore` đã loại `.env`, uploads, SQLite, node_modules và thư mục build. Chỉ `.env.example` và `.env.vercel.example` được đưa vào Git, vì chúng chứa placeholder.

Tạo repository GitHub **Private**, ví dụ `lumina-fashion`, để trống repository khi tạo. Trong VS Code có thể chọn Source Control → Initialize Repository → Commit → Publish to GitHub, chọn private. Hoặc dùng CMD:

```bat
git init
git add .
git status
git commit -m "Prepare LUMINA MVC for Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/lumina-fashion.git
git push -u origin main
```

Thay `YOUR_ACCOUNT`. Lần đầu Git/GitHub sẽ hướng dẫn đăng nhập. Trước commit, `git status` không được có `.env`, database dump, ảnh uploads hoặc mật khẩu thật. Nếu từng lỡ commit secret, rotate secret ở dịch vụ, xóa khỏi Git history; chỉ thêm vào `.gitignore` chưa đủ.

## 2. Import trên Vercel

Vercel → Add New → Project → Import Git Repository → chọn repository này. Cho phép Vercel đọc repo private đó.

- Project Name: tên riêng, ví dụ `lumina-fashion-vinh` nếu còn trống.
- Root Directory: **gốc repository (`./`)**, nơi có `vercel.json`, `package.json`, `api/`.
- Framework Preset: **Other**; `vercel.json` đã cấu hình build.
- Node.js Version: **24.x**.
- Install Command: `npm ci`.
- Build Command: `npm run build`.
- Output Directory: `frontend/dist`.

Không chọn `frontend/` làm Root Directory vì Vercel sẽ bỏ mất backend và API. Không điền Start Command, không dùng `npm run dev:server` để deploy.

## 3. Environment Variables — Production

Đọc `.env.vercel.example`, rồi tạo từng biến trong Vercel. Thay placeholder bằng thông tin thật:

| Biến | Giá trị |
|---|---|
| `APP_ORIGIN` | `https://TEN_PROJECT.vercel.app`, đúng domain ổn định, không `/` cuối |
| `DATABASE_URL` | Connection Transaction pooler dùng `lumina_app.PROJECT_REF` |
| `DATABASE_SCHEMA` | `lumina` |
| `DATABASE_SSL` | `true` |
| `DATABASE_POOL_MAX` | `2` |
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_STORAGE_KEY` | Server secret hoặc legacy service_role key |
| `SUPABASE_BUCKET` | `lumina-private` |
| `DEMO_MODE` | `false` |
| `DATABASE_CA_PEM` | Chỉ điền khi cần CA của Supabase |

Vercel đặt `NODE_ENV=production` cho function; nếu cần kiểm tra, đảm bảo giá trị này là production. Không tạo `VITE_DATABASE_URL`, không đưa `INIT_ADMIN_PASSWORD`, `INIT_RUNTIME_PASSWORD`, `DEMO_PASSWORD` hoặc connection `postgres` vào Vercel.

Chỉ chọn phạm vi **Production** cho credentials production. Preview không nên dùng database production. Muốn preview có API, dùng project Supabase test riêng và origin preview phù hợp; hiện code từ chối request production có domain không trùng `APP_ORIGIN`.

SMTP tùy chọn: các biến `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. Khi chưa cấu hình SMTP, chức năng quên mật khẩu không tiết lộ reset token; Admin có thể reset tài khoản qua màn hình Users.

## 4. Deploy và kiểm tra

Chọn Deploy. Sau khi hoàn tất, mở **domain ổn định** trong `APP_ORIGIN`, không dùng URL deployment có hash khác hostname.

Kiểm tra:

1. `/api/bootstrap` trả JSON `user:null`, `demo:false` khi chưa đăng nhập.
2. Đăng nhập Admin đã tạo ở bước Supabase.
3. Thêm một category, product, variant rồi kiểm tra số lượng kho.
4. Upload ảnh PNG/JPEG thật; reload trang vẫn thấy ảnh.
5. Tạo đơn, xác nhận trừ kho; hủy đơn hoàn kho một lần.
6. Guest/Employee không vào được API quản trị.
7. Trình duyệt → Application → Cookies: `lumina_session` có Secure, HttpOnly, SameSite=Lax.
8. Network: response không lộ password hash, DB URL hoặc secret key.

Ảnh nằm trong Supabase Storage, dữ liệu nằm trong PostgreSQL. Deploy lại không xóa chúng. Build trên Vercel không chạy migration/seed; đó là việc bạn chủ động thực hiện ở máy quản trị, không phải mỗi lần gọi API.

## 5. Cập nhật lần sau

```bat
git add .
git commit -m "Update LUMINA"
git push
```

Vercel tự deploy từ GitHub. Nếu có thay đổi database: backup trước, chạy migration và `db:role` bằng connection quản trị, rồi deploy code tương thích. Rollback code không tự rollback dữ liệu.

Vercel Hobby hiện chỉ cho mục đích cá nhân phi thương mại: dùng cho học/demo. Khi dùng app để quản lý bán hàng thực tế, cần gói/hosting phù hợp điều khoản. Supabase Free có hạn mức và không gồm automatic backup như gói trả phí; chủ động export database và lưu bản sao ảnh khi cần.

Nguồn: [Vercel Node.js Function](https://vercel.com/docs/functions/runtimes/node-js), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Supabase pricing](https://supabase.com/pricing).
