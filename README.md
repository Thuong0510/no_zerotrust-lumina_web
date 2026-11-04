# LUMINA FASHION

Ứng dụng web mua sắm và quản lý cửa hàng thời trang, xây dựng bằng React, Node.js và PostgreSQL theo kiến trúc MVC kết hợp lớp service. Dự án gồm cửa hàng công khai cho khách mua và workspace quản lý theo quyền của nhân viên, quản trị viên.

## Mục lục

- [Chức năng](#chức-năng)
- [Công nghệ](#công-nghệ)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Cài đặt và cấu hình](#cài-đặt-và-cấu-hình)
- [Chuẩn bị database](#chuẩn-bị-database)
- [Chạy dự án](#chạy-dự-án)
- [Các lệnh có sẵn](#các-lệnh-có-sẵn)
- [Kiểm thử](#kiểm-thử)
- [Triển khai Vercel](#triển-khai-vercel)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)
- [Tài liệu và quy ước đóng góp](#tài-liệu-và-quy-ước-đóng-góp)

## Chức năng

- **Cửa hàng công khai:** xem danh sách, tìm kiếm, lọc sản phẩm Active, xem chi tiết và chính sách mua hàng khi chưa đăng nhập.
- **Mua hàng:** chọn biến thể size/màu, giỏ hàng, báo giá từ server, đặt hàng COD, lưu thông tin giao hàng, theo dõi và hủy đơn cá nhân khi đủ điều kiện.
- **Sản phẩm và kho:** quản lý danh mục, sản phẩm, biến thể, ảnh, tồn kho và lịch sử nhập/xuất/điều chỉnh.
- **Đơn hàng:** tạo đơn nội bộ, sửa chi tiết, cập nhật trạng thái, trừ/hoàn kho trong transaction.
- **Quản trị:** khách hàng, nhà cung cấp, nhân viên, tài khoản, vai trò/quyền, thông báo, nhật ký hoạt động, dashboard, báo cáo và xuất CSV.
- **Tài khoản:** đăng nhập bằng username/email, session cookie, duyệt đăng ký, khóa hoặc xóa tài khoản, hồ sơ, đổi mật khẩu và đặt lại mật khẩu qua SMTP khi được cấu hình. Tài khoản đã xóa cho phép dùng lại email/username để đăng ký hồ sơ mới chờ duyệt; xem [cách hoạt động và triển khai migration 004](docs/ACCOUNT-DELETION.md).

| Người sử dụng | Quyền mặc định |
| --- | --- |
| Chưa đăng nhập | Xem cửa hàng và chính sách; cần đăng nhập để thêm giỏ hoặc mua |
| `Guest` | Giao diện mua sắm riêng, đặt COD, xem/hủy đơn của mình theo điều kiện |
| `Employee` | Workspace: xem sản phẩm/danh mục/khách hàng, xử lý kho và đơn, xem thông báo theo quyền |
| `Admin` | Quản trị toàn hệ thống, gồm tài khoản, phân quyền và báo cáo |

Tên role khách mua trong mã nguồn là `Guest`. Quyền thực tế được kiểm tra tại API. Đăng ký mới tạo tài khoản chờ Admin duyệt. Checkout hiện chỉ hỗ trợ COD; chưa tích hợp cổng thanh toán online, vận đơn hoặc quy trình hoàn tiền tự động.

## Công nghệ

Phiên bản dưới đây theo `package.json`; `package-lock.json` khóa các phiên bản được cài bằng `npm ci`.

| Lớp | Công nghệ / vai trò |
| --- | --- |
| Frontend | React 19, TypeScript 5, Vite 8; CSS thuần; Lucide React cho biểu tượng; Recharts cho biểu đồ |
| Backend | Node.js 24, TypeScript chạy qua `tsx`; HTTP server, routing và controller tự viết |
| Kiểm tra dữ liệu | Zod |
| Database | PostgreSQL, driver `pg`, migration SQL có checksum, transaction và runtime role riêng |
| Lưu ảnh | Supabase private Storage qua SDK phía server; filesystem khi chạy local không cấu hình Storage |
| Xử lý ảnh / email | Sharp / Nodemailer |
| Xác thực | Session cookie, PBKDF2, RBAC, CSRF, giới hạn tần suất request; không dùng Supabase Auth |
| Kiểm thử | Node assert, jsdom, PGlite và PGlite Socket cho PostgreSQL tạm |
| Triển khai / CI | Vercel static frontend + Node.js Function; GitHub Actions, Dependabot |

Luồng chính: **React → `/api/...` → kiểm tra request/session/quyền → Controller → Service → Model → PostgreSQL → JSON → React**.

Xem [mô tả công cụ, nền tảng, luồng hoạt động và ERD](docs/bao-ve/CONG-NGHE-LUONG-HOAT-DONG-ERD.md) để theo dõi luồng đăng nhập, đặt COD, xử lý/hủy đơn, kho và ảnh. ERD theo migration 001–003 có **24 bảng và 24 khóa ngoại**, tính cả bảng theo dõi migration; có [ảnh tổng thể](docs/bao-ve/diagrams/08-erd-tong-the.png) và [Mermaid độc lập](docs/bao-ve/ERD.mmd).

## Cấu trúc dự án

```text
lumina-mvc-vercel/
├── api/index.ts                 # Adapter API cho Vercel
├── backend/
│   ├── scripts/                 # Migration, seed, runtime role, import SQLite
│   └── src/
│       ├── config/              # Môi trường, URL và Storage adapter
│       ├── controllers/         # Điều phối request/response
│       ├── data/                # Dữ liệu fashion demo
│       ├── middleware/          # Session, RBAC, CSRF và bảo mật
│       ├── models/              # SQL, kết nối, transaction, migration runner
│       ├── routes/              # Điểm vào routing API
│       ├── services/            # Nghiệp vụ và validation
│       ├── app.ts               # Dispatch request
│       └── server.ts            # HTTP server local, phục vụ API và bản build
├── database/
│   ├── migrations/              # 001 initial, 002 checkout, 003 media, 004 account deletion
│   └── harden-supabase.sql      # SQL tham khảo gia cố schema Supabase
├── frontend/
│   ├── public/                  # Tài nguyên tĩnh
│   ├── src/
│   │   ├── components/lumina/   # Storefront, workspace và các màn hình
│   │   ├── lib/                 # API client, giỏ hàng
│   │   ├── App.tsx             # Điều hướng và phân chia giao diện theo role
│   │   └── main.tsx            # Điểm vào React
│   ├── index.html
│   └── vite.config.ts          # Dev proxy và build frontend
├── shared/entities.ts          # Metadata entity/form dùng chung
├── tests/                      # Kiểm thử API, UI, bảo mật và dữ liệu demo
├── docs/                       # Hướng dẫn, kết quả kiểm thử, báo cáo và sơ đồ
├── .github/                    # CI và cấu hình Dependabot
├── .env.example                # Mẫu cấu hình local, không chứa secret thật
├── .env.vercel.example         # Mẫu cấu hình triển khai
├── package.json                # Dependencies và toàn bộ npm scripts
├── package-lock.json           # Lockfile dùng chung cho cả dự án
├── tsconfig.json
└── vercel.json
```

Xem [bản đồ file và quy tắc dọn dẹp](docs/huong-dan-cau-hinh/09-PROJECT-STRUCTURE.md). Dependencies nằm trong `node_modules/`; bản build nằm trong `frontend/dist/`. Các thư mục này, `.env`, chứng chỉ local, uploads và log không đưa vào Git.

## Yêu cầu môi trường

- **Node.js 24.x** và npm đi kèm, đúng `engines` của dự án.
- Git nếu lấy source bằng clone; VS Code hoặc trình soạn thảo tùy chọn.
- PostgreSQL đã cấu hình; hướng dẫn chính dùng Supabase PostgreSQL và private Storage.
- Internet khi dùng database/Storage trên Supabase. Không cần Docker hay PostgreSQL local nếu dùng Supabase.
- Tài khoản LUMINA đang Active nếu dùng database đã có; tài khoản Supabase Dashboard không phải tài khoản đăng nhập web.

Kiểm tra trong terminal:

```sh
node -v
npm -v
```

Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd` thay cho `npm` trong các lệnh dưới đây hoặc mở terminal CMD.

## Cài đặt và cấu hình

### 1. Lấy source và cài dependencies

```sh
git clone REPOSITORY_URL lumina-mvc-vercel
cd lumina-mvc-vercel
npm ci
```

Thay `REPOSITORY_URL` bằng URL repository của bạn. Nếu nhận ZIP, giải nén và mở thư mục chứa `package.json`. Dự án dùng một `package.json` chung; mọi lệnh chạy từ thư mục gốc.

### 2. Tạo `.env`

Nếu chưa có `.env`, sao chép mẫu; giữ file cấu hình hiện có nếu đã được cung cấp.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```sh
cp .env.example .env
```

Điền giá trị thật vào `.env`. Mẫu đi kèm dùng connection quản trị để khởi tạo; khi chạy ứng dụng thường xuyên, chuyển sang runtime role `lumina_app` sau bước chuẩn bị database.

| Biến | Cách dùng |
| --- | --- |
| `NODE_ENV` | `development` khi chạy HTTP local; `production` khi triển khai HTTPS |
| `PORT` | Cổng backend, mặc định `3000` |
| `APP_ORIGIN` | `http://localhost:5173` khi dùng Vite; `http://localhost:3000` khi chạy bản build; production là domain HTTPS chính thức |
| `DATABASE_URL` | Connection PostgreSQL; lấy đúng host/username/port từ project. Supabase transaction pooler thường dùng port `6543` |
| `DATABASE_SCHEMA` | Schema ứng dụng, mặc định `lumina`; giữ đúng schema khi dùng dữ liệu đã có |
| `DATABASE_SSL` | `true` khi dùng Supabase; bắt buộc trong production |
| `DATABASE_POOL_MAX` | Số kết nối tối đa mỗi process, mẫu dùng `2` |
| `DATABASE_CA_PEM` / `DATABASE_CA_FILE` | CA tin cậy nếu cần; PEM nhận xuống dòng thật hoặc `\n`; đường dẫn file dành cho máy local |
| `SUPABASE_URL` | URL project chứa Storage |
| `SUPABASE_STORAGE_KEY` | Server secret hoặc legacy `service_role` key; không dùng anon/publishable key |
| `SUPABASE_BUCKET` | Private bucket, mặc định `lumina-private` |
| `DEMO_MODE` / `DEMO_PASSWORD` | Mặc định `false`; chỉ bật demo trên database thử riêng với mật khẩu tự đặt |
| `INIT_ADMIN_EMAIL` / `INIT_ADMIN_PASSWORD` | Chỉ dùng lúc khởi tạo Admin; mật khẩu tối thiểu 12 ký tự |
| `INIT_RUNTIME_PASSWORD` | Chỉ dùng khi tạo role `lumina_app`; mật khẩu riêng tối thiểu 16 ký tự |
| `UPLOADS_DIR` | Mặc định `./uploads`, dùng khi không cấu hình Supabase Storage ở local |
| `SHIPPING_FEE` / `FREE_SHIPPING_THRESHOLD` | Mặc định phí 30.000đ, miễn phí từ 500.000đ tiền hàng; server chốt khi đặt đơn |
| `SHOP_SUPPORT_EMAIL` / `SHOP_SUPPORT_PHONE` | Liên hệ cửa hàng hiển thị trong chính sách |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP tùy chọn để gửi email reset; mẫu dùng port `587`, secure `false` |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Tài khoản gửi mail và người gửi |

Không đưa `.env`, database URL hay Storage key vào Git, React hoặc biến `VITE_*`. Nếu mật khẩu database chứa ký tự đặc biệt, URL-encode phần mật khẩu. Với CA chuyển từ máy cũ, kiểm tra lại đường dẫn `DATABASE_CA_FILE`.

Khi dùng chung project/schema Supabase, thao tác thêm/sửa/xóa từ local tác động trực tiếp lên dữ liệu chung.

## Chuẩn bị database

### Database đã có dữ liệu

Dùng connection runtime và schema do chủ project cung cấp. Không cần seed, tạo lại bucket hay bật demo khi chuyển máy. Đăng nhập bằng tài khoản LUMINA hiện có.

Nếu source mới có migration chưa áp dụng, backup rồi dùng connection quản trị chạy:

```sh
npm run db:migrate
npm run db:role
```

Bản source gồm đủ migration 001–004, bao gồm xóa mềm tài khoản. Runner chỉ áp dụng migration chưa chạy và kiểm tra checksum migration cũ. Sau khi cập nhật, chuyển lại connection runtime rồi restart/redeploy. Không chỉnh sửa hoặc xóa migration đã áp dụng.

### Database mới, chưa có schema/tài khoản

1. Chuẩn bị Supabase project, connection quản trị và private bucket theo [hướng dẫn Supabase](docs/huong-dan-cau-hinh/02-SUPABASE.md).
2. Điền `.env`: `NODE_ENV=development`, `DEMO_MODE=false`, connection quản trị, `INIT_ADMIN_EMAIL`, `INIT_ADMIN_PASSWORD`, `INIT_RUNTIME_PASSWORD`.
3. Chạy:

```sh
npm run db:seed
npm run db:role
```

`db:seed` chạy migration và khởi tạo roles/quyền/Admin khi chưa có user; không tạo hàng hóa demo với `DEMO_MODE=false`. Admin đăng nhập bằng username `admin` hoặc email đã cấu hình và mật khẩu đã đặt. Không có mật khẩu Admin dùng chung. Chạy lại không reset Admin cũ.

`db:role` tạo/cấp quyền runtime role và RLS; không tự đổi mật khẩu nếu role đã tồn tại. Sau setup, chuyển `DATABASE_URL` sang `lumina_app.PROJECT_REF` với mật khẩu runtime khi dùng Supabase pooler; giữ host/port/database từ connection được cung cấp. Lưu thông tin quản trị riêng, bỏ các giá trị `INIT_*` khỏi môi trường chạy thường xuyên khi đã lưu an toàn.

Để bổ sung dữ liệu thời trang vào database thử đã khởi tạo, đọc [fashion demo](docs/huong-dan-cau-hinh/06-FASHION-DEMO.md) rồi dùng `npm run db:seed:fashion`. Nếu cần nhập SQLite cũ, đọc [quy trình import](docs/huong-dan-cau-hinh/05-TROUBLESHOOTING.md) trước khi seed vào database đích.

## Chạy dự án

### Phát triển: hai terminal

Giữ `.env`:

```dotenv
NODE_ENV=development
PORT=3000
APP_ORIGIN=http://localhost:5173
DEMO_MODE=false
```

Terminal 1, chạy backend:

```sh
npm run dev:server
```

Terminal 2, chạy frontend:

```sh
npm run dev
```

Mở **http://localhost:5173**. Vite proxy `/api` về `http://127.0.0.1:3000`. Nếu Vite đổi cổng vì cổng bận, mở URL thực tế được in trong terminal. `PORT` quyết định cổng backend; nếu đổi cổng này, sửa cả target proxy trong `frontend/vite.config.ts`.

Có thể dùng hostname `127.0.0.1` ở local; cookie đăng nhập riêng theo hostname. Dừng server bằng `Ctrl+C`; restart backend sau khi sửa `.env`.

### Chạy bản build: một terminal

Dừng các server dev, đặt `APP_ORIGIN=http://localhost:3000` và giữ `NODE_ENV=development` cho HTTP local:

```sh
npm run build
npm start
```

Mở **http://localhost:3000**. Node phục vụ frontend từ `frontend/dist/` và API. Sửa frontend thì build lại. Script start dùng `tsx`, nên máy chạy cần cài dependencies đầy đủ bằng `npm ci`.

Khởi động server không tự migrate hay seed. Build frontend không có nghĩa đang chạy chế độ production; cấu hình production yêu cầu HTTPS, SSL database và Supabase Storage.

### Kiểm tra sau khi chạy

1. Backend local `http://localhost:3000/healthz` trả `{"status":"ok"}` khi kết nối DB thành công; endpoint này chưa kiểm tra schema/quyền/Storage.
2. `/api/bootstrap` trên URL giao diện trả JSON có `user: null` khi chưa đăng nhập.
3. Mở trang chủ, đăng nhập và kiểm tra các màn hình được cấp quyền.
4. Kiểm tra ảnh sản phẩm; nếu thử upload, dùng PNG/JPEG hợp lệ tối đa 2 MiB trên dữ liệu thử được phép.

## Các lệnh có sẵn

| Lệnh | Mục đích |
| --- | --- |
| `npm ci` | Cài đúng dependencies trong lockfile |
| `npm run dev` / `npm run dev:server` | Chạy frontend / backend có watch |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run build` | Typecheck rồi build frontend vào `frontend/dist/` |
| `npm start` | Phục vụ bản build và API bằng Node |
| `npm run db:migrate` | Áp dụng migration, dùng connection quản trị |
| `npm run db:seed` | Migration và khởi tạo ban đầu |
| `npm run db:role` | Tạo/cập nhật quyền runtime role và RLS |
| `npm run db:seed:fashion` | Thêm dữ liệu fashion demo có chủ đích |
| `npm run db:import -- PATH_TO_SQLITE` | Import SQLite vào database đích trống theo quy trình riêng |
| `npm run test:embedded` | Build và chạy integration, checkout, security, OWASP verification/registration, production, DB role trên DB tạm |
| `npm run test:checkout` / `npm run test:security` | Chạy riêng suite backend qua harness DB tạm |
| `npm run test:owasp` / `npm run test:owasp-registration` | Kiểm tra recovery email/session/token, lỗi SMTP/URL và phản hồi đăng ký chống dò tài khoản |
| `npm run test:shopping` / `npm run test:storefront` | Kiểm tra UI mua hàng / cửa hàng công khai với API giả lập |
| `npm run test:navigation` / `npm run test:request-url` | Kiểm tra điều hướng / URL và origin |
| `npm run test:seed:fashion` | Kiểm tra dữ liệu demo bằng DB tạm riêng |
| `npm run test:integration` / `npm run test:production` | Chạy riêng integration / cấu hình production bằng DB test tạm qua harness |

## Kiểm thử

Chạy bộ kiểm tra local từ thư mục gốc:

```sh
npm run test:embedded
npm run test:shopping
npm run test:storefront
npm run test:navigation
npm run test:request-url
npm run test:seed:fashion
```

`test:embedded` tạo PostgreSQL WASM qua PGlite, không lấy connection cloud từ `.env`. Nó đã bao gồm build/typecheck. Cổng mặc định DB `55432` và HTTP test `3199` cần trống; đổi cổng DB qua `TEST_PG_PORT` nếu cần. Fashion test dùng cổng `55434`, đổi qua `FASHION_TEST_PG_PORT`.

Các suite UI dùng jsdom và API giả lập. Kết quả local không thay thế kiểm chứng trình duyệt, TLS, SMTP, Storage và Vercel thực tế. Xem [kết quả kiểm thử và giới hạn](docs/bao-ve/VALIDATION.md). CI chạy embedded, shopping, storefront, navigation, request URL và dependency audit; fashion test có lệnh riêng như trên.

## Triển khai Vercel


1. Kiểm tra build/test và cập nhật đủ migration/quyền database bằng máy quản trị.
2. Import repository vào Vercel, chọn thư mục gốc `./`, Node.js `24.x`.
3. Theo `vercel.json`: install `npm ci`, build `npm run build`, output `frontend/dist`.
4. Tạo biến môi trường theo `.env.vercel.example`: domain HTTPS đúng `APP_ORIGIN`, `NODE_ENV=production`, `DATABASE_SSL=true`, `DEMO_MODE=false`, connection runtime và private Storage.
5. Deploy, kiểm tra `/api/bootstrap`, đăng nhập và các chức năng bằng dữ liệu thử được phép.

Không đưa connection quản trị hoặc mật khẩu `INIT_*` lên Vercel. Migration/seed không chạy trong build hay mỗi request. Xem [hướng dẫn GitHub → Vercel](docs/huong-dan-cau-hinh/03-VERCEL-GITHUB.md) để cấu hình và kiểm chứng đầy đủ.

## Xử lý lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| PowerShell chặn `npm.ps1` | Dùng `npm.cmd` hoặc CMD |
| Thiếu `package.json` / không tìm thấy `.env` | Chạy tại thư mục gốc; `.env` đặt cạnh `package.json`, không phải `.env.txt` |
| `npm ci` lỗi engine/lockfile | Dùng Node 24.x và cặp manifest/lockfile cùng phiên bản |
| Frontend có nhưng API `ECONNREFUSED` | Chạy backend, kiểm tra cổng `3000` và proxy Vite |
| `EADDRINUSE` | Dừng server cũ hoặc đổi cổng cùng cấu hình liên quan |
| `npm start` không có giao diện | Chạy `npm run build` trước và mở cổng backend |
| Lỗi xác thực DB / timeout | Kiểm tra runtime role, mật khẩu đã encode, pooler host/port, mạng và trạng thái project |
| Lỗi CA/TLS | Cấu hình CA tin cậy; không tắt kiểm tra chứng chỉ để chữa lỗi |
| Healthz OK nhưng API lỗi schema/quyền | Kiểm tra migration và `db:role` bằng connection quản trị |
| 403 / CSRF | Local dùng development và origin phù hợp; giữ proxy `changeOrigin:false`, login lại; production dùng đúng domain |
| Đăng ký nhưng chưa đăng nhập được | Tài khoản mới cần Admin duyệt Active |
| Upload lỗi / ảnh mất | Kiểm tra private bucket, server Storage key, PNG/JPEG và giới hạn 2 MiB |
| Không nhận email reset | Kiểm tra SMTP hoặc nhờ Admin đặt lại mật khẩu |

Xem thêm [troubleshooting, import dữ liệu và backup](docs/huong-dan-cau-hinh/05-TROUBLESHOOTING.md).

## Tài liệu và quy ước đóng góp

| Nhóm | Tài liệu |
| --- | --- |
| Cài đặt và vận hành | [VS Code](docs/huong-dan-cau-hinh/01-VS-CODE.md), [Supabase](docs/huong-dan-cau-hinh/02-SUPABASE.md), [Vercel](docs/huong-dan-cau-hinh/03-VERCEL-GITHUB.md), [xử lý lỗi](docs/huong-dan-cau-hinh/05-TROUBLESHOOTING.md) |
| Chức năng và dữ liệu | [Fashion demo](docs/huong-dan-cau-hinh/06-FASHION-DEMO.md), [checkout COD](docs/huong-dan-cau-hinh/07-SHOPPING.md), [storefront](docs/huong-dan-cau-hinh/08-STOREFRONT.md) |
| Tổ chức mã nguồn | [Bản đồ file và quy tắc dọn dẹp](docs/huong-dan-cau-hinh/09-PROJECT-STRUCTURE.md) |
| Bảo mật và kiểm chứng | [OWASP](docs/huong-dan-cau-hinh/04-OWASP.md), [kết quả kiểm thử](docs/bao-ve/VALIDATION.md), [báo cáo bảo mật tổng hợp 17/10–20/10](docs/bao-ve/BAO-CAO-BAO-MAT-OWASP.md) |
| Báo cáo đồ án | [Công nghệ, luồng hoạt động và ERD](docs/bao-ve/CONG-NGHE-LUONG-HOAT-DONG-ERD.md), [tài liệu bảo vệ](docs/bao-ve/BAO-CAO-BAO-VE.md), [các luồng Mermaid](docs/bao-ve/SO-DO.mmd), [ERD Mermaid](docs/bao-ve/ERD.mmd), [ERD tổng thể](docs/bao-ve/diagrams/08-erd-tong-the.png) |

Đặt thay đổi giao diện ở `frontend/src/`, nghiệp vụ ở `backend/src/services/`, SQL ở `backend/src/models/`. Khi đổi schema, thêm migration mới rồi cập nhật quyền runtime. Chạy build và các suite liên quan trước khi gửi thay đổi; cập nhật tài liệu khi đổi cách chạy hoặc cấu hình.

Không commit dependencies, build output, log, ảnh upload, dữ liệu dump, `.env` hoặc khóa riêng. Giữ `package-lock.json` đồng bộ với dependencies. Repository hiện chưa có file `LICENSE`; chưa công bố giấy phép mã nguồn mở.
