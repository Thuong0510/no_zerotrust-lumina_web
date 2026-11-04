# Cài đặt và chạy với VS Code trên Windows

**Luồng vào web:** mở URL local thấy trang chủ mua sắm công khai. Chọn Đăng nhập khi cần thêm giỏ/mua hoặc vào workspace; role Guest dùng storefront riêng, Admin/Employee dùng giao diện quản lý theo quyền. Không cần migration mới cho storefront nếu đã có schema checkout 002. Xem [08-STOREFRONT.md](08-STOREFRONT.md).

## 1. Tải phần mềm

- [Visual Studio Code](https://code.visualstudio.com/download): chọn Windows installer rồi cài.
- [Node.js](https://nodejs.org/en/download): chọn bản **24.x LTS**, Windows `.msi`, giữ tùy chọn thêm vào PATH. npm có sẵn trong Node.js.
- [Git for Windows](https://git-scm.com/downloads/win): cài với tùy chọn mặc định.
- Tạo tài khoản [GitHub](https://github.com/), [Supabase](https://supabase.com/) và [Vercel](https://vercel.com/).

Nếu dùng Supabase, không cần cài PostgreSQL, Docker hoặc Wrangler trên máy để chạy ứng dụng. VS Code có thể cài thêm ESLint, Prettier; đây là tiện ích tùy chọn.

Sau khi cài Node và Git, đóng rồi mở lại VS Code. Terminal → New Terminal, chọn **Command Prompt** để các lệnh dưới đây chạy giống CMD:

```bat
node -v
npm -v
git --version
```

Node phải hiện `v24...`. Nếu thấy `not recognized`, kiểm tra PATH hoặc khởi động lại Windows.

## 2. Mở toàn bộ source

Giải nén ZIP. Chọn File → Open Folder → thư mục `lumina-mvc-vercel` chứa `package.json`, `frontend`, `backend`, `api`, `database`. Không chỉ mở riêng frontend. Không copy từng component vào dự án cũ; bản này đã được sắp xếp đủ imports và dependencies.

Trong terminal ở thư mục này:

```bat
npm ci
copy .env.example .env
```

PowerShell dùng `Copy-Item .env.example .env` thay cho `copy` nếu cần. Chỉ chạy `npm ci` ở thư mục gốc, không cần cài npm riêng trong frontend và backend.

## 3. Cấu hình database trước

Nếu dùng database đã có schema và tài khoản, giữ dữ liệu và dùng connection runtime được cung cấp, không seed lại khi chuyển máy. Nếu database mới, làm đầy đủ [02-SUPABASE.md](02-SUPABASE.md), gồm `db:seed` và `db:role`. Chỉ dùng connection quản trị khi setup/migrate; sau đó chuyển `.env` local và cấu hình Vercel sang role `lumina_app`. Khi nâng cấp, áp dụng đủ migration hiện có đến `003_media_ownership.sql` và cập nhật quyền bằng `db:role`.

Để phát triển, giữ:

```dotenv
NODE_ENV=development
APP_ORIGIN=http://localhost:5173
PORT=3000
DEMO_MODE=false
```

`APP_ORIGIN` là URL chuẩn của ứng dụng, có scheme và port, không có dấu `/` cuối; URL này cũng được dùng trong email đặt lại mật khẩu. Vite chuyển `/api` đến Node tại port 3000. Khi chạy local với `APP_ORIGIN` là địa chỉ loopback, backend nhận hostname và port thực tế từ request của trình duyệt, kể cả khi Vite tự chuyển sang port khác.

## 4. Chạy hai terminal

Terminal thứ nhất:

```bat
npm run dev:server
```

Terminal thứ hai:

```bat
npm run dev
```

Mở **http://localhost:5173** và đăng nhập `admin` hoặc email trong `INIT_ADMIN_EMAIL`, với mật khẩu bạn đã điền vào `INIT_ADMIN_PASSWORD` khi seed. Không có mật khẩu Admin mặc định dùng chung. Nút demo chỉ hiện khi bạn chủ động bật `DEMO_MODE=true` trên database test riêng.

Bạn cũng có thể mở `http://127.0.0.1:5173` mà không phải đổi `APP_ORIGIN`. Cả `localhost` và `127.0.0.1` đều hỗ trợ đăng nhập và lưu dữ liệu ở local. Cookie đăng nhập thuộc từng hostname, nên khi chuyển sang hostname kia bạn cần đăng nhập riêng. Production vẫn dùng đúng domain trong `APP_ORIGIN`.

## 5. Build thử

```bat
npm run build
```

Frontend build ra `frontend/dist`. Để thử Node phục vụ bản build tại máy, dừng hai terminal dev, đổi `APP_ORIGIN=http://localhost:3000` trong `.env` rồi:

```bat
npm start
```

Mở http://localhost:3000 hoặc http://127.0.0.1:3000. Khi quay lại Vite dev, đặt URL chuẩn về port Vite để link đặt lại mật khẩu mở đúng frontend.

## Sửa phần nào ở đâu?

- Đổi giao diện: `frontend/src/`, giữ lời gọi API trong `frontend/src/lib/client.ts`.
- Thêm endpoint: Controller và routing trong `backend/src/controllers/`, `backend/src/routes/`.
- Đổi quy tắc nghiệp vụ: `backend/src/services/`.
- Đổi truy vấn: `backend/src/models/`.
- Đổi bảng: thêm file migration `.sql` mới, không sửa file đã apply, sau đó chạy `npm run db:migrate` và `npm run db:role` để cập nhật quyền.
- Đổi secrets: `.env` local hoặc Environment Variables của Vercel; không đặt trong React hay biến `VITE_*`.
