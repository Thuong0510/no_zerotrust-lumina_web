# Kiểm tra bảo mật cơ bản — OWASP Top 10:2025

## Kiểm thử, bằng chứng và rủi ro còn lại — 20/10/2026

Xem [báo cáo kiểm thử mới](../bao-ve/BAO-CAO-BAO-MAT-OWASP.md): 5 vấn đề vừa khắc phục, 13 kiểm tra trước/sau, tổng 344 lượt backend đạt, các suite UI/URL đạt và audit 0 advisory. Báo cáo tách rõ rủi ro còn tồn tại với cấu hình cloud chưa kiểm chứng; có log/JSON và hash artifact để đối chiếu. Các mục ngày 17/10 bên dưới là lịch sử trước đợt kiểm thử này.

## Bổ sung checkout COD

**Rà soát bảo mật mới ngày 17/10/2026:** xem [Báo cáo lỗ hổng và vị trí sửa](../bao-ve/BAO-CAO-BAO-MAT-OWASP.md). Đã bổ sung route chuẩn để chặn né rate limit, media ownership, dashboard theo `report.view`, thu hồi reset token, SMTP TLS, rollback và log/header nhất quán; CI pin SHA và audit cả dev. Có 58 lượt security mới, tổng các suite backend hiện tại 331 lượt. Cần áp dụng migration 003 bằng connection quản trị trước triển khai; chưa thay đổi database cloud trong lần này. Các con số kiểm thử cũ bên dưới là snapshot trước bản vá.

**Storefront công khai:** GET `/api/store/products`, chi tiết, policy và ảnh sản phẩm Active được đọc khi chưa login; các API private vẫn yêu cầu session. Projection công khai loại cost/supplier/số lượng kho/threshold. Bucket private giữ nguyên; `/api/store/media/:key` chỉ mở ảnh được tham chiếu bởi sản phẩm Active, không mở avatar hoặc file bất kỳ. Test phương thức ghi public → 405, Draft/Archived/file chưa công bố → 404, API quản lý chưa login → 401. UI Guest không gọi/load workspace; bảo vệ backend vẫn bắt buộc, không chỉ ẩn menu.

Migration `002_customer_checkout.sql` thêm liên kết chủ sở hữu đơn và thông báo riêng. Kiểm tra Guest A không đọc/hủy đơn, đọc/đánh dấu thông báo của Guest B (404), nhưng vẫn bị 403 khi gọi Orders nội bộ. Quote/place/cancel cần session và CSRF. Client không được tự chọn total/buyer/payment; backend kiểm giá/tồn. Kiểm tra POST lặp cùng idempotency key chỉ tạo một đơn và trừ kho một lần; hủy lặp không hoàn kho lặp. Chạy `npm run test:checkout` trên DB tạm. Hướng dẫn chi tiết và giới hạn tại [07-SHOPPING.md](07-SHOPPING.md).

Source đã có các biện pháp nền tảng để bạn kiểm thử trên ứng dụng của mình. Đây không phải chứng nhận vượt toàn bộ OWASP, pentest hoàn chỉnh hoặc cam kết an toàn tuyệt đối. OWASP Top 10 là danh sách nhóm rủi ro, không phải bộ test pass/fail chỉ bằng một scanner.

## Chuẩn bị môi trường kiểm thử

Dùng database/project Supabase test riêng, dữ liệu giả và ba tài khoản Admin, Employee, Guest. Có thể tạo tài khoản qua Admin → Users, hoặc dùng demo seed trên database trống riêng với `NODE_ENV=development`, `DEMO_MODE=true`, `DEMO_PASSWORD` riêng. Không bật demo trên production. Không dùng chung secrets/dữ liệu thật cho môi trường kiểm thử.

Dùng Chrome/Edge DevTools → Network hoặc [OWASP ZAP](https://www.zaproxy.org/download/) / [Burp Suite Community](https://portswigger.net/burp/communitydownload). Khi dùng proxy, lấy request sau khi đăng nhập, giữ cookie và CSRF token riêng cho từng tài khoản. Bắt đầu bằng kiểm tra thủ công và passive scan. Active scan thực hiện trên môi trường test của bạn, với tốc độ thấp để không vượt quota hoặc khóa tài khoản.

## Ma trận kiểm thử

| Nhóm 2025 | Đã áp dụng | Cách thử và kỳ vọng |
|---|---|---|
| A01 Broken Access Control | Kiểm tra quyền ở API, Admin-only modules, Guest ẩn giá vốn/tồn kho; profile cập nhật user từ session | Không đăng nhập gọi `/api/users` → 401; Guest/Employee gọi roles/users/reports → 403. Gửi field `id`/`role` vào profile không được đổi user khác hoặc tăng quyền. Guest không đọc được notification ngoài audience |
| A02 Security Misconfiguration | TLS database kiểm chứng certificate, security headers, domain production cố định, schema private, bucket private, không lộ env | Kiểm tra CSP, nosniff, HSTS; request `/.env` không trả secrets; đọc trực tiếp Supabase REST schema `lumina` bị từ chối. Bucket không public. Kiểm tra không có credentials trong JS bundle |
| A03 Software Supply Chain Failures | `package-lock.json`, `npm ci`, CI build/audit cả dev, Dependabot, action pin full SHA | Chạy `npm audit`; xem từng advisory. Review PR dependency và cập nhật SHA action qua Dependabot có review |
| A04 Cryptographic Failures | Password PBKDF2-HMAC-SHA256 600.000 vòng với salt riêng, opaque session token hash trong DB, HttpOnly/Secure/Lax, SSL DB | Tài khoản mới có hash bắt đầu `pbkdf2_sha256:600000:`; không lưu plaintext. Cookie production có Secure/HttpOnly. Kiểm tra chứng chỉ DB vẫn được xác minh; không tắt TLS để chữa lỗi |
| A05 Injection | Dữ liệu dùng SQL parameters; entity/fields qua allowlist và Zod; React escape text; ảnh decode/re-encode, không SVG/HTML | Login với tên `' OR 1=1 --` không đăng nhập; test tên `<img src=x onerror=alert(1)>` phải chỉ hiện text. Không dùng `dangerouslySetInnerHTML`. Sửa đường dẫn resource/ID không biến thành câu SQL. Test CSV có dữ liệu bắt đầu `=`, `+`, `-`, `@` trong chức năng export hiện có |
| A06 Insecure Design | Transaction cho nghiệp vụ, stock constraints, serialize mutations và revision đơn, registration Pending + Guest | Hai request cùng mua vượt tồn kho không làm âm kho; hủy cùng một đơn không hoàn kho hai lần; tự đăng ký không thành Admin. Kiểm tra trạng thái đơn không nhảy bước sai |
| A07 Authentication Failures | Mật khẩu được validate, lock tài khoản sau 5 lần sai/15 phút, rate limit IP persistent DB; logout/reset xóa session; reset token 15 phút một lần | Sai mật khẩu 5 lần rồi thử lại → 429; 16 request login/IP trong 15 phút → 429. Sau logout hoặc reset, cookie cũ bị từ chối. Production forgot không trả reset URL/token |
| A08 Software or Data Integrity Failures | Field allowlist, validate body, migration checksum, decode ảnh, hạn dung lượng | Gửi `role`, `password_hash`, `created_by`, `total` ngoài schema không được tự set; đơn tự tính giá từ DB. Ảnh sai chữ ký/ảnh lỗi/file HTML giả PNG → 422; sửa migration đã apply bị phát hiện |
| A09 Security Logging and Alerting Failures | Audit DB cho thao tác quan trọng và login thất bại, log lỗi API với request ID, không ghi body/password/cookie/secret | Admin xem Activity Logs; kiểm tra LOGIN, CRUD, stock, order, role changes. Đối chiếu request ID trong Vercel Logs. Cần tự cấu hình theo dõi/cảnh báo; chưa có hệ thống alert/SIEM hoặc log chống sửa bởi DB admin |
| A10 Mishandling of Exceptional Conditions | Lỗi JSON → 400, CSRF → 403, quá dung lượng → 413, MIME → 415, ảnh lỗi → 422, lỗi DB trả generic; rollback mutations | Gửi JSON thiếu dấu đóng, body >3 MB, sửa stock vượt tồn, DB unavailable. Không được thấy SQL/stack trace/credentials; thao tác lỗi không để lại đơn hoặc kho bị cập nhật một nửa |

Danh sách chính thức: [OWASP Top 10:2025](https://top10.owasp.org/2025/). [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Nếu giáo viên dùng OWASP 2021, ghi rõ phiên bản trong báo cáo: các nhóm đã đổi thứ tự và phạm vi, ví dụ Injection là A03:2021 nhưng A05:2025.

## Một vài thao tác trong DevTools

Đăng nhập bằng Guest, mở Console trên chính trang app rồi chạy:

```js
await fetch('/api/roles').then(async r => ({status:r.status,body:await r.json()}));
```

Kỳ vọng 403. Đăng xuất rồi chạy `/api/users`: kỳ vọng 401. Đăng nhập Admin rồi thử PUT thiếu CSRF:

```js
await fetch('/api/profile', {
  method:'PUT', headers:{'Content-Type':'application/json'},
  body:JSON.stringify({name:'Test User',phone:'',email:'test@example.com'})
}).then(async r => ({status:r.status,body:await r.json()}));
```

Kỳ vọng 403. Để thử request hợp lệ, lấy token từ bootstrap của **chính phiên hiện tại**:

```js
const session = await fetch('/api/bootstrap').then(r=>r.json());
```

Header là `X-CSRF-Token: session.user.csrf`. Không chia sẻ token/cookie trong báo cáo công khai. Cookie HttpOnly không thể đọc bằng `document.cookie`, nhưng trình duyệt vẫn gửi khi fetch cùng origin.

## Kiểm thử tự động có sẵn

Sau `npm ci`, chạy bộ kiểm tra tự tạo PostgreSQL WASM trong RAM, không cần cài PostgreSQL và không dùng `.env` hoặc dữ liệu cloud:

```bat
npm run test:embedded
```

Bộ này build frontend rồi chạy integration, checkout COD, production và quyền DB; mỗi nhóm dùng database tạm riêng. Lần cập nhật 17/10/2026 ghi nhận 183 + 53 + 9 + 7 lượt (252); xem VALIDATION.md về phạm vi và giới hạn. Cần port 55432 và 3199 trống. Có thể đổi `TEST_PG_PORT` nếu port DB bị chiếm. TLS live và Storage Supabase không được giả định đã đạt chỉ vì bộ local này pass.


`tests/integration.ts` chỉ chấp nhận `TEST_DATABASE_URL` có tên database `lumina_test` hoặc `lumina_test_<suffix>`, kiểm tra database trống rồi seed dữ liệu test. Không nhập connection production hoặc sửa hàng rào này để chạy trên dữ liệu thật. Với PostgreSQL local riêng:

```bat
set TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/lumina_test
npm run build
npm run test:integration
```

Test production cần database trống khác và TLS; script cố tình bật `DATABASE_SSL=true`. Kết quả đã chạy trong quá trình chuẩn bị source được mô tả ở [VALIDATION.md](../bao-ve/VALIDATION.md); cloud Storage, TLS live và Vercel live cần kiểm tra sau khi bạn cấu hình tài khoản.

## Báo cáo kiểm thử

Với mỗi case lưu: nhóm OWASP/phiên bản, tài khoản/role, endpoint/method, input, status/body đã che secrets, kết quả kỳ vọng/thực tế và ảnh chụp. Scanner chỉ phát hiện một phần; RBAC, kho/đơn, registration Pending, reset một lần và quyền Supabase phải kiểm tra theo nghiệp vụ.

Giới hạn hiện tại: không MFA, không enterprise SSO, CSP Vercel cần `style-src 'unsafe-inline'` cho UI hiện tại, chưa có alert tập trung, chưa kiểm tra tải lớn/DoS. CI actions đã pin full SHA. Rate limit auth/upload dùng DB nhưng không thay thế WAF/chống DDoS của hosting. Khi vận hành thực tế cần đánh giá thêm backup, quyền quản trị, rotation secrets và monitoring.
