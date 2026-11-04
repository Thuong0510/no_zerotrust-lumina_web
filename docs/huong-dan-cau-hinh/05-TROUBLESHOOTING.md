# Xử lý lỗi và chuyển dữ liệu cũ

| Lỗi | Cách kiểm tra |
|---|---|
| Trắng trang khi chuyển chức năng, tải lại thì bình thường | Frontend phải gắn dữ liệu với đúng trang và chỉ nhận kết quả request còn hiệu lực. Dữ liệu trang cũ có thể làm trang mới lỗi render (ví dụ Dashboard nhận danh sách thay vì object có `counts`). Chạy `npm run test:navigation` để kiểm tra chuyển trang và API trả về lệch thứ tự; bộ kiểm tra dùng API giả lập, không truy cập database |
| `no such table: settings` / `relation settings does not exist` | Đã chọn đúng source chưa? Bản này không chạy Wrangler/D1. Chạy `npm run db:seed` bằng connection quản trị; kiểm tra schema `lumina.settings` trong Supabase. Local và Vercel phải cùng `DATABASE_SCHEMA` |
| `/api/bootstrap` trả 503 | Xem Logs; kiểm tra project Supabase có pause không, DATABASE_URL/SSL/schema và migration. Không chạy migration trong function để chữa lỗi |
| API 404 trên Vercel | Root Directory phải là gốc repo; phải có `api/index.ts`, `vercel.json`; không chỉ upload frontend |
| API 403 do tên miền | Mở domain đúng `APP_ORIGIN`; nếu đổi domain cập nhật env và Redeploy. URL deployment khác hostname sẽ bị chặn khi production |
| CSRF 403 local | Với `NODE_ENV=development` và `APP_ORIGIN` là địa chỉ loopback, cả localhost và 127.0.0.1 đều được hỗ trợ trên port thực tế. Restart backend sau khi cập nhật code; đăng nhập riêng ở từng hostname vì cookie không dùng chung. Vite cần giữ `changeOrigin:false`; Origin phải khớp Host và thao tác đã đăng nhập phải có đúng CSRF token |
| `ECONNREFUSED`, `ENETUNREACH`, timeout | Kiểm tra hostname/port của Transaction pooler 6543; không dùng direct IPv6 endpoint trên mạng IPv4; kiểm tra trạng thái Supabase |
| Password authentication failed | Phân biệt password database với password tài khoản app; username `postgres.PROJECT_REF` để setup, `lumina_app.PROJECT_REF` cho runtime; encode ký tự đặc biệt trong password |
| Lỗi CA/TLS | Dùng trusted CA của Supabase qua DATABASE_CA_PEM hoặc CA file local. Không đặt SSL=false trong production |
| Runtime `permission denied` | Chạy `db:role` bằng connection postgres sau migration, kiểm tra RLS policy cho lumina_app; không cấp quyền public để chữa lỗi |
| Ảnh mất/không upload được | Bucket đúng tên, private, server key đúng, quota còn; kiểm tra Supabase URL/Storage key. Không dùng filesystem local trên Vercel |
| Upload 422 | Chỉ PNG/JPEG thật <2 MB, không phải SVG/WebP/HTML hoặc ảnh hỏng; save/export lại ảnh rồi thử |
| Forgot không có email | Cấu hình SMTP hoặc nhờ Admin reset; production không trả token ra API |
| Tài khoản bị khóa 429 | Chờ 15 phút, dừng scan hoặc đổi kịch bản test; không tắt rate limit trên production |
| Vercel báo 503 hết thời gian | Kiểm tra DB connection, region, log/request ID, pooler và tải; code có SQL timeout 15s/function 30s. Không tăng timeout để che lỗi DB |

## Chuyển dữ liệu từ D1/SQLite

Không copy file SQLite vào frontend hoặc upload nó lên GitHub. Backup dữ liệu trước.

1. Tạo Supabase project/schema đích **trống**, chưa chạy `db:seed` hoặc `db:role`.
2. Đặt `.env` bằng connection postgres quản trị, `NODE_ENV=development`, `DEMO_MODE=false`.
3. Dùng file SQLite ứng dụng thật có bảng users/products/settings, không chọn file cache của công cụ.
4. Chạy `npm run db:import -- C:/duong-dan/application.sqlite`.
5. Import tự chạy migration, kiểm tra đích trống, đưa dữ liệu theo thứ tự FK; không chuyển sessions, reset tokens hoặc throttle counters.
6. Chạy `npm run db:role` rồi dùng connection runtime trên Vercel như hướng dẫn.
7. Đăng nhập với tài khoản cũ và kiểm tra inventory/order/report. Hash PBKDF2 cũ được hỗ trợ và nâng lên định dạng mới sau login thành công.

**Ảnh cũ không tự nằm trong SQLite** nếu bản trước dùng R2/ổ đĩa. Phải đưa từng file ảnh sang private bucket, giữ object key `uploads/<64hex>.png|jpg` để URL `/api/media/...` hoạt động. Kiểm tra ảnh hợp lệ; không import tùy tiện mọi tệp trong bucket cũ. Nếu trước đây thiếu bảng settings hoặc database bị lỗi, xác minh/export đủ dữ liệu trước khi import.

## Chuyển từ bản PostgreSQL cũ có public schema

Không chạy seed lên public rồi tưởng ứng dụng mới đọc được: bản MVC dùng schema `lumina` riêng. Với dữ liệu cần giữ, backup/export các bảng nghiệp vụ rồi import có kiểm soát vào schema mới hoặc dùng migration riêng sau khi đối chiếu schema. Không có lệnh tự động di chuyển một public schema đang có dữ liệu khác. Dùng database/project mới để tránh đụng dữ liệu của ứng dụng khác.

## Backup

Supabase Free không bao gồm automatic backups theo pricing hiện tại. Dùng PostgreSQL tooling/export của Supabase để backup schema `lumina`, và backup ảnh riêng. Không commit dump lên GitHub. Thử restore vào database test trước khi tin rằng backup dùng được.
