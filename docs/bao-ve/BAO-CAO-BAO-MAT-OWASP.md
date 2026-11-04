# Báo cáo tổng hợp kiểm thử và khắc phục bảo mật OWASP Top 10:2025

**Dự án:** LUMINA FASHION — lumina-mvc-vercel.

**Các đợt kiểm thử:** 17/10/2026 và 20/10/2026.

**Cập nhật nội dung hợp nhất:** 20/10/2026.

**Phạm vi kết luận:** mã nguồn và môi trường kiểm thử tạm; trạng thái triển khai cloud chưa được xác minh trong các đợt này.

Tài liệu này hợp nhất đầy đủ phát hiện, vị trí sửa, bằng chứng, kết quả kiểm thử và rủi ro còn lại của hai đợt. Đây là **báo cáo chính duy nhất** để đọc hoặc dùng khi bảo vệ; không cần ghép các báo cáo riêng để hiểu kết quả. Hồ sơ log/JSON vẫn được giữ ở các file bằng chứng và dẫn liên kết tại chỗ.

## Mục lục

1. [Phạm vi, phương pháp và cách hiểu trạng thái](#1-phạm-vi-phương-pháp-và-cách-hiểu-trạng-thái)
2. [Tổng quan hai đợt kiểm thử](#2-tổng-quan-hai-đợt-kiểm-thử)
3. [Các vấn đề và biện pháp khắc phục ngày 17/10](#3-các-vấn-đề-và-biện-pháp-khắc-phục-ngày-1710)
4. [Phát hiện và bằng chứng trước/sau ngày 20/10](#4-phát-hiện-và-bằng-chứng-trướcsau-ngày-2010)
5. [Đối chiếu đủ 10 nhóm OWASP](#5-đối-chiếu-đủ-10-nhóm-owasp)
6. [Kết quả kiểm thử và cách chạy lại](#6-kết-quả-kiểm-thử-và-cách-chạy-lại)
7. [Các hạng mục chưa khắc phục hoặc chưa xác minh](#7-các-hạng-mục-chưa-khắc-phục-hoặc-chưa-xác-minh)
8. [Áp dụng khi triển khai](#8-áp-dụng-khi-triển-khai)
9. [Nội dung trình bày khi bảo vệ](#9-nội-dung-trình-bày-khi-bảo-vệ)
10. [Tài liệu đối chiếu](#10-tài-liệu-đối-chiếu)

## 1. Phạm vi, phương pháp và cách hiểu trạng thái

- Rà soát auth/session, recovery email/password, RBAC/IDOR, media/upload, SQL/query, CSRF, request parsing, transaction/rollback, dependency, CI và security headers.
- Dùng database PGlite tạm, dữ liệu/tài khoản giả, SMTP giả lập và HTTP server ở loopback với cổng ngẫu nhiên. Harness không đọc `.env`, không ghi dữ liệu cloud, không gửi email thật.
- Giữ nguyên database/migration đang dùng chung; không sửa checksum migration cũ. Đợt 17/10 bổ sung migration 003; đợt 20/10 không thêm migration mới.
- Ghi kết quả có ID, expected/actual, thời điểm UTC và exit code. Không ghi password, cookie, CSRF token hoặc reset token vào bằng chứng. Các token trong test chỉ tồn tại trong RAM/database tạm.
- [Thư mục bằng chứng và hướng dẫn đối chiếu](evidence/2026-10-20/README.md) gồm log gốc, JSON trước/sau, manifest lệnh và SHA-256. Hash giúp kiểm tra tính nhất quán của artifact; không phải chữ ký số hoặc bằng chứng lưu trữ bất biến.

Trạng thái dùng trong báo cáo:

| Trạng thái | Ý nghĩa |
|---|---|
| Đã khắc phục trong source, retest đạt | Bản vá đã được xác minh trên môi trường thử nghiệm tại thời điểm từng đợt; không suy ra đã deploy |
| Còn tồn tại / cần hoàn thiện | Mã hiện tại còn thiếu kiểm soát hoặc còn rủi ro thiết kế; chưa được coi là đã xử lý |
| Chưa xác minh triển khai | Không đủ bằng chứng về trạng thái cloud/hosting thật; không tự coi là có lỗ hổng hoặc đã an toàn |

Phân loại Cao/Trung bình/Thấp là đánh giá định tính dựa trên điều kiện khai thác và tác động dưới đây, **không phải CVSS được tính chính thức**. Không ghi nhận lỗ hổng mức Nghiêm trọng/Critical đã tái hiện trong đợt này.

Mã nguồn gốc của đợt 20/10: `55044d18c6b4aacf8ab09d3a69f341f939adba3b`, được ghi tại [baseline-commit.txt](evidence/2026-10-20/baseline-commit.txt). Các bản vá của đợt đó chưa được tác vụ kiểm thử tự commit/deploy. Việc hợp nhất tài liệu này không chạy lại test, không đổi mã ứng dụng và không thay đổi kết quả đã ghi nhận.

## 2. Tổng quan hai đợt kiểm thử

| Nội dung | Đợt 17/10/2026 | Đợt 20/10/2026 |
|---|---|---|
| Phát hiện và gia cố | 10 mục F01–F10, gồm lỗ hổng xác nhận và biện pháp gia cố; không coi cả 10 là exploit độc lập | 5 vấn đề mới V01–V05: 2 mức Cao, 2 Trung bình, 1 Thấp |
| Kiểm tra bảo mật riêng | 58 lượt security | Giữ 58 lượt cũ, bổ sung 10 kiểm tra OWASP và 3 kiểm tra đăng ký |
| Bằng chứng trước/sau | Báo cáo ghi kết quả tại thời điểm 17/10; không có hồ sơ JSON trước/sau riêng được thu lại cho trạng thái trước các bản vá này | 13 kiểm tra mới: trước sửa 10 không đạt + 3 đối chứng đạt; sau sửa 13/13 đạt |
| Backend | 183 integration + 74 checkout + 58 security + 9 production + 7 DB role = **331 lượt** | Thêm 13 kiểm tra mới = **344 lượt** |
| UI và URL | Shopping/storefront/navigation đạt; 55 kiểm tra URL đạt | Các suite UI tiếp tục đạt; 55 kiểm tra URL đạt |
| Dependency audit | 0 advisory đã biết tại lần chạy ghi nhận trong báo cáo 17/10 | 0 advisory đã biết; có phản hồi registry và manifest lưu trong hồ sơ bằng chứng |
| Thay đổi schema | Thêm migration `003_media_ownership.sql`, thử trên database tạm | Không thêm migration; xác minh lại các test của bản vá media trên database tạm |

**Không cộng 331 + 344 thành số kiểm tra độc lập.** Hai đợt chạy lại nhiều kịch bản giống nhau; con số mới nhất được ghi nhận là **344 lượt backend**, ngoài các assertion nội bộ. Tương tự, tổng **15 mục F/V** là mục phát hiện/gia cố, không phải 15 nhóm OWASP hoặc 15 lỗ hổng cùng mức độ.

Trạng thái sau đợt 20/10: các bản vá và kịch bản nêu ở mục 3–4 đã được kiểm tra trong phạm vi mô tả; **R01–R07 còn mở, D01–D03 chưa xác minh** tại mục 7. Không xác nhận cấu hình Supabase/Vercel thật đã an toàn chỉ từ kết quả local.

## 3. Các vấn đề và biện pháp khắc phục ngày 17/10

Giữ nguyên mã F01–F10 để đối chiếu lịch sử. Các dòng ghi “gia cố” là cải thiện kiểm soát/phòng ngừa, không được chuyển thành tuyên bố đã khai thác thành công.

| Mã / nhóm | Vấn đề trước khi sửa và tác động | Khắc phục / vị trí |
|---|---|---|
| F01 — A07, A06 — Cao | Controller bỏ đoạn rỗng trong URL và bỏ qua hậu tố của auth, trong khi rate limiter chỉ khớp URL chính xác. Ví dụ `/api/auth//login`, `/api//auth/login`, `/api/auth/login/` và `/api/auth/login/extra` có thể vào login mà không tăng bộ đếm IP. Cơ chế khóa theo tài khoản vẫn còn nhưng không bảo vệ việc thử nhiều tài khoản khác nhau. | Thêm một bộ kiểm tra route chuẩn dùng chung, từ chối alias trước transaction. `backend/src/config/apiPath.ts`, `backend/src/models/database.ts`, `backend/src/controllers/apiController.ts`. Test alias trả 404; request login chuẩn thứ 16 cùng IP trả 429. |
| F02 — A01 — Trung bình | `/api/media/:key` chỉ kiểm tra có session. Một tài khoản biết URL ảnh có thể đọc ảnh upload/avatar của tài khoản khác, không cần quyền đối với bản ghi chứa ảnh. Tên ngẫu nhiên 256 bit làm việc đoán URL khó nhưng không thay thế kiểm tra quyền khi URL bị lộ. | Thêm bảng chủ sở hữu `uploaded_media` qua migration 003; owner được preview; kiểm tra ảnh theo quyền product/employee/user hoặc avatar chính mình. Kiểm tra quyền cả khi gán ảnh vào profile/catalog để ngăn nhận ảnh người khác làm avatar rồi đọc qua profile. `backend/src/models/mediaModel.ts`, `backend/src/services/mediaService.ts`, controller và `catalogService.ts`. |
| F03 — A01 — Trung bình | Employee không có `report.view` vẫn nhận doanh thu, dữ liệu theo tháng, sản phẩm bán chạy và số nhân viên từ dashboard; quyền của các API riêng chặt hơn đường truy cập này. | Dashboard trả chế độ giới hạn nếu không có `report.view`, dùng được nhánh UI giới hạn sẵn có. Thống nhất kiểm tra quyền order trong search bằng helper `hasPermission`. `backend/src/services/businessService.ts`, `backend/src/middleware/security.ts`, `backend/src/controllers/apiController.ts`. |
| F04 — A07 — Cao nếu token cũ bị lộ | Token reset chưa hết hạn vẫn sử dụng được sau khi người dùng đổi mật khẩu hoặc Admin sửa/reset/khóa tài khoản. Token cũ bị lộ có thể lấy lại quyền truy cập sau khi mật khẩu đã thay. Yêu cầu forgot mới cũng không hủy token trước. | Vô hiệu hóa token reset còn lại khi đổi mật khẩu, Admin chỉnh sửa/vô hiệu hóa user và khi phát hành token mới. Giữ cơ chế token một lần, hạn 15 phút, hash token trong DB và thu hồi session sau reset. `backend/src/services/authService.ts`, `backend/src/services/catalogService.ts`, dùng truy vấn `authQuery12` hiện có. |
| F05 — A02 — Trung bình khi bật proxy trust | HTTP server tin `x-forwarded-for` nếu `TRUST_PROXY=true`, nhưng không xác minh peer thuộc proxy tin cậy. Nếu truy cập trực tiếp được server, có thể giả IP để né giới hạn. | HTTP server lấy IP từ socket; cấu hình production từ chối `TRUST_PROXY=true` không được xác minh. Adapter Vercel tiếp tục dùng helper IP của nền tảng. `backend/src/server.ts`, `backend/src/config/runtime.ts`. |
| F06 — A04 — Gia cố đường truyền | SMTP dùng STARTTLS cơ hội: khi `secure=false`, cấu hình trước không bắt buộc nâng cấp TLS. Nếu server/đường truyền không cung cấp STARTTLS, email reset có thể đi qua kết nối không mã hóa. | `requireTLS: config.production`, thêm connection/greeting/socket timeout. SMTP production không đáp ứng TLS sẽ thất bại thay vì gửi reset token qua kết nối không mã hóa. `backend/src/services/mailService.ts`. Chưa kiểm chứng máy chủ SMTP live. |
| F07 — A10, A08 — Gia cố rollback | Mọi response lỗi ở đường dẫn kết thúc bằng `/auth/login` trước đây đều được miễn rollback, kể cả 500. Có thể giữ thay đổi dở dang nếu một bước JavaScript lỗi sau khi đã ghi thành công. | Chỉ cho phép giữ transaction của route login chuẩn ở các trạng thái 401/403/429 dự kiến; lỗi 500 phải rollback. Test chèn dữ liệu trong request login rồi trả 500 xác nhận dữ liệu không tồn tại. `backend/src/models/database.ts`. |
| F08 — A10 — Thấp | Body `null` khi mutate entity hoặc multipart hỏng có thể thành 500 thay vì lỗi đầu vào phù hợp. `old_password` chưa giới hạn chiều dài. | Validate object trước truy cập thuộc tính; multipart không parse được trả 400; mật khẩu cũ tối đa 128 ký tự. `backend/src/services/catalogService.ts`, `backend/src/controllers/apiController.ts`, `backend/src/services/authService.ts`. |
| F09 — A09, A02 — Gia cố ghi nhận và response | Các nhánh trả sớm của dispatcher như cross-site, method/content-type/body sai không đi qua phần log reject chung; header bảo mật khác nhau giữa các nhánh. Upload chưa có audit riêng. | Hoàn thiện header và log reject tại một hàm chung: request ID, method, status, resource/action hợp lệ; không ghi body/query/cookie/token. API có CSP hạn chế, no-store, no-referrer và HSTS production. Ghi `UPLOAD_IMAGE` cùng owner. `backend/src/app.ts`, `backend/src/services/mediaService.ts`, `backend/src/server.ts`. Chưa kết nối hệ thống cảnh báo bên ngoài. |
| F10 — A03 — Gia cố chuỗi cung ứng | CI dùng tag major có thể thay đổi; audit CI bỏ qua dependency build/dev. `node_modules` local thực tế lệch lockfile, nên kết quả kiểm thử ban đầu chưa đại diện dependency triển khai. | Pin checkout/setup-node bằng full SHA được xác minh qua `git ls-remote` từ repository chính thức; audit cả dev; chạy `npm ci`, xác nhận `npm ls --depth=0` hợp lệ rồi kiểm thử lại. `.github/workflows/ci.yml`. Không cần đổi phiên bản dependency trong package/lockfile. |

Các kiểm tra ngày 20/10 tiếp tục xác nhận: alias auth trả 404 và vượt ngưỡng login trả 429; owner đọc ảnh được nhưng tài khoản khác không đọc/gán ảnh; dashboard Employee không trả doanh thu; reset token cũ bị từ chối sau đổi password/Admin sửa user/forgot mới; login 500 rollback, input lỗi trả 400/422 và response có header bảo mật. Các suite integration/checkout còn kiểm tra IDOR đơn/thông báo, giá do server tính, idempotency, rollback tồn kho và hủy đơn không hoàn kho lặp.

Riêng F05/F06/F10 gồm cả rà soát cấu hình/mã nguồn: không coi đó là thử nghiệm proxy, SMTP TLS hoặc GitHub pipeline live. Production suite kiểm tra cookie và điều kiện ứng dụng; role suite kiểm tra quyền trên database thử nghiệm. Chi tiết hồ sơ kiểm tra lại nằm ở mục 6.

### Giới hạn yêu cầu hiện có sau hai đợt

| Hành động | Giới hạn IP / cửa sổ 15 phút |
|---|---|
| Login | 15 |
| Register / forgot / reset | 8 cho mỗi hành động |
| Change-password | 15 |
| Upload | 30 |
| PUT profile, bổ sung 20/10 | 30 |

Bộ đếm ghi vào database qua transaction riêng trước xử lý; input sai vẫn tiêu thụ lượt. Giới hạn này không thay thế WAF/chống DDoS hoặc quota dung lượng theo tài khoản.

## 4. Phát hiện và bằng chứng trước/sau ngày 20/10

Baseline của suite security cũ đạt **58/58**, nhưng các kiểm tra mới vẫn tái hiện được các vấn đề bên dưới. Bộ test cũ đạt không có nghĩa đã loại bỏ mọi lỗ hổng.

### V01 — Đổi email khôi phục không cần xác thực lại

- **Nhóm:** A07 Authentication Failures / A06 Insecure Design. **Rủi ro: Cao.** Điều kiện: đối tượng có session hợp lệ và CSRF của nạn nhân, ví dụ dùng một máy còn đăng nhập. Trước sửa không cần biết mật khẩu để chuyển email khôi phục, tạo khả năng duy trì quyền truy cập qua reset password.
- **Bằng chứng:** `EMAIL-01`: PUT `/api/profile` thay email, thiếu `current_password`: trước **200**, sau **403**. `EMAIL-02`: password sai, trước **422** vì field chưa được hỗ trợ, sau **403**; trước sửa có thể bỏ field để tránh kiểm tra. `EMAIL-03`: chủ tài khoản đổi email hợp lệ vẫn **200**.
- **Sửa:** thêm [profileService.ts](../../backend/src/services/profileService.ts), controller chuyển cập nhật profile vào service; so sánh email đã chuẩn hóa và verify mật khẩu hiện tại nếu đổi email. Thêm field mật khẩu vào [ProfilePage](../../frontend/src/components/lumina/system-pages.tsx), xóa giá trị field sau khi lưu thành công. PUT profile giới hạn **30 yêu cầu/IP/15 phút**, ghi bộ đếm trước transaction để lỗi xác thực không hoàn tác bộ đếm, tại [database.ts](../../backend/src/models/database.ts).
- **Kết quả:** chặn đúng kịch bản đã tái hiện. Chưa xác minh quyền sở hữu email mới qua link xác nhận; xem R01.

### V02 — Token reset và phiên khác còn sống sau đổi email

- **Nhóm:** A07 / A01 Broken Access Control. **Rủi ro: Cao nếu token từ email cũ đã bị lộ hoặc hộp thư cũ không còn an toàn.** Người giữ token cũ còn hạn có thể reset mật khẩu sau khi chủ tài khoản chuyển email.
- **Bằng chứng:** `EMAIL-05`: phát hành token trước khi đổi email, đổi email rồi sử dụng token đó tại POST `/api/auth/reset`: trước **200**, sau **400**. `EMAIL-04`: session thứ hai đọc profile sau đổi email: trước **200**, sau **401**. Test này không nhầm với bản vá cũ chỉ hủy token khi đổi password/Admin sửa user.
- **Sửa:** cùng transaction cập nhật profile, đánh dấu reset token cũ đã dùng, thu hồi các session khác, giữ session vừa xác thực lại và ghi audit `CHANGE_RECOVERY_EMAIL`. Vị trí: [profileService.ts](../../backend/src/services/profileService.ts), dùng truy vấn `authQuery12`/`authQuery17` hiện có.
- **Kết quả:** token cũ bị vô hiệu hóa và session khác bị thu hồi; cập nhật email đúng mật khẩu vẫn thành công.

Trong bước chuẩn bị `EMAIL-03`, baseline dùng body profile cũ, còn retest thêm `current_password` để hoàn thành đổi email hợp lệ theo giao thức mới. Các bước tấn công sử dụng token cũ/session thứ hai được giữ cùng ý nghĩa; không tính việc đổi giao thức hợp lệ là một exploit riêng.

### V03 — Lỗi SMTP tiết lộ email có tài khoản hay không

- **Nhóm:** A07 / A10 Mishandling of Exceptional Conditions. **Rủi ro: Trung bình.** Không cần đăng nhập; chỉ xuất hiện khi đường gửi mail lỗi. Có thể dò tập tài khoản để phục vụ phishing/password guessing, chưa trực tiếp chiếm tài khoản.
- **Bằng chứng:** giả lập SMTP ném lỗi, POST `/api/auth/forgot` cho email có/không có user: trước status **500/200**, body khác nhau; sau **200/200**, body giống nhau (`SMTP-01`, `SMTP-02`).
- **Sửa:** [authService.ts](../../backend/src/services/authService.ts) xử lý riêng lỗi gửi mail, giữ phản hồi công khai chung và ghi sự kiện `PASSWORD_RESET_DELIVERY_FAILED` không chứa email/token/password hoặc nội dung lỗi SMTP.
- **Kết quả:** đã xử lý kênh tiết lộ qua status/body trong kịch bản này. Chưa loại bỏ chênh lệch thời gian do gửi mail đồng bộ; xem R02.

### V04 — API đăng ký tiết lộ email/username đã tồn tại

- **Nhóm:** A07 / A06. **Rủi ro: Trung bình.** Người chưa đăng nhập có thể dò định danh qua status/thông báo đăng ký; giới hạn IP hiện có giảm tốc độ nhưng không loại bỏ việc dò từ nhiều IP.
- **Bằng chứng riêng:** [before-registration-observations.json](evidence/2026-10-20/before-registration-observations.json): email có user nhận **409**, email mới **200**, body khác nhau. [Sau sửa](evidence/2026-10-20/after-registration-observations.json): cả hai **200**, body giống nhau. Đối chứng `REGISTER-03`: tài khoản thực sự được tạo vẫn **Pending / Guest**.
- **Sửa:** [authService.ts](../../backend/src/services/authService.ts) trả thông báo trung tính cho cả định danh mới và đã có; cả hai nhánh đều chạy hash password trước kiểm tra tồn tại để giảm khác biệt chi phí rõ ràng. Không tạo tài khoản trùng hoặc cấp quyền cao hơn. Cập nhật kỳ vọng duplicate trong [integration.ts](../../tests/integration.ts).
- **Kết quả:** status/body không còn cho biết định danh tồn tại ở các request đã thử. Chưa chứng minh thời gian phản hồi không thể phân biệt bằng thống kê; không tuyên bố constant-time cho toàn endpoint.

### V05 — URL mã hóa sai thành 500 và thiếu no-store

- **Nhóm:** A10 / A02 Security Misconfiguration. **Rủi ro: Thấp.** Request không xác thực tới HTTP server với `/%E0%A4%A` làm `decodeURIComponent` ném lỗi. Đây là lỗi phân loại input/cache, chưa có bằng chứng vượt quyền hoặc thực thi mã.
- **Bằng chứng:** `URL-01`: trước **500**, sau **400**; `URL-02`: trước không có Cache-Control, sau **no-store**.
- **Sửa:** [server.ts](../../backend/src/server.ts) bắt lỗi decode, trả lỗi client chung và no-store; thêm no-store cho nhánh lỗi server chung.
- **Kết quả:** kịch bản HTTP thật qua loopback đạt. Chưa kiểm tra cách CDN/Vercel xử lý cùng URL ở môi trường live.

**Bằng chứng chung:** [JSON trước sửa](evidence/2026-10-20/before-observations.json), [JSON sau sửa](evidence/2026-10-20/after-observations.json), [log tái hiện](evidence/2026-10-20/baseline-probes.txt), [log retest](evidence/2026-10-20/retest-probes.txt). V04 có cặp bằng chứng riêng vì được phát hiện sau khi đã vá V01–V03/V05; không diễn giải baseline V04 là trạng thái chưa vá toàn repository.

## 5. Đối chiếu đủ 10 nhóm OWASP

| Nhóm OWASP Top 10:2025 | Nội dung đã xử lý/kiểm tra qua hai đợt | Bằng chứng và giới hạn |
|---|---|---|
| A01 Broken Access Control | F02/F03: quyền ảnh, dashboard; V02: vòng đời phiên khi đổi email; RBAC, IDOR đơn/thông báo và projection public/Guest | Integration/checkout/security và EMAIL-04 đạt; quyền/RLS/bucket cloud hiện tại chưa xác minh |
| A02 Security Misconfiguration | F05/F09: proxy trust, header/log; V05: URL lỗi và no-store; production yêu cầu HTTPS origin, TLS DB, cấm demo | Kiểm tra source/header/cookie và HTTP loopback; D01/D02 chưa kiểm chứng live, ngoại lệ CSP còn R07 |
| A03 Software Supply Chain Failures | F10: npm ci/lockfile, npm ls, audit cả dev, Dependabot và action pin SHA | Audit hai thời điểm ghi nhận 0 advisory; log registry hiện tại có trong hồ sơ 20/10; không bảo đảm không có lỗ hổng chưa công bố |
| A04 Cryptographic Failures | F06: SMTP bắt buộc TLS production và timeout; PBKDF2-HMAC-SHA256 600.000 vòng, salt ngẫu nhiên, session/reset token hash SHA-256 | Production/integration kiểm tra cookie/reset; PGlite không chứng minh TLS database hoặc SMTP thật đã đúng |
| A05 Injection | Bound parameters, identifier/field allowlist, Zod, React escape, CSV escaping, decode/re-encode PNG/JPEG | Login SQL injection bị từ chối; chuỗi SQL/HTML lưu như dữ liệu; HTML giả ảnh bị chặn. Chưa có full browser XSS scan hoặc DAST toàn hệ thống |
| A06 Insecure Design | F01: chặn bypass rate limit; V01/V04: recovery email và enumeration; giá/tổng/kho do server kiểm tra, transaction, idempotency/state transitions | Các bài checkout/concurrency đạt; xác nhận email, queue, quota và chống abuse còn R01/R02/R04/R05 |
| A07 Authentication Failures | F01/F04: throttle/reset lifecycle; V01/V02: xác thực lại và thu hồi token/session khi đổi email; V03/V04: phản hồi forgot/register | Các kịch bản retest đạt; status/body đã đồng nhất nhưng chưa chứng minh loại hết timing side channel; MFA/password policy còn R03 |
| A08 Software or Data Integrity Failures | F07: rollback; ownership khi gán ảnh, field allowlist, checksum migration, giá server | Login 500 rollback và các bài integrity checkout đạt; không sửa migration đã apply; external storage vẫn ngoài transaction DB |
| A09 Security Logging & Alerting Failures | F09: log/request ID/upload audit; thêm CHANGE_RECOVERY_EMAIL và PASSWORD_RESET_DELIVERY_FAILED | Không ghi password/cookie/token trong log mới; chưa có alert tập trung và chứng cứ retention/backup, xem R06 |
| A10 Mishandling of Exceptional Conditions | F07/F08: rollback/input; V03/V05: SMTP lỗi và URL lỗi; body/MIME/ảnh/DB error handling | JSON/multipart/body/constraint và retest SMTP/URL đạt; lỗi mạng/storage live chưa kiểm tra đầy đủ |

SSRF được rà soát trong nhóm A01: không tìm thấy luồng fetch backend dùng URL từ payload người dùng trong các đường mã đã đọc; đích Supabase/SMTP lấy từ cấu hình máy chủ. Đây là kết luận rà soát mã, không phải đã fuzz mọi khả năng SSRF. Nếu hội đồng dùng bản 2021, ghi rõ khác biệt: Injection là A03:2021 nhưng A05:2025; SSRF là A10:2021 và được gộp vào A01:2025.

## 6. Kết quả kiểm thử và cách chạy lại

### 6.1. Kết quả lịch sử ngày 17/10

Build/typecheck, npm ci và npm ls đã đạt theo ghi nhận đợt 17/10; security 58, integration 183, checkout 74, production 9 và DB role 7, tổng **331 lượt**. Shopping/storefront/navigation và 55 URL checks đạt. Bản báo cáo ngày đó ghi audit 0 advisory; không tạo lại hồ sơ trước/sau cho các bản vá F bằng cách suy ngược từ kết quả 20/10.

### 6.2. Kết quả mới nhất ngày 20/10 và tái lập

| Lệnh / suite | Kết quả ghi nhận |
|---|---|
| `npm run test:embedded` | Build/typecheck đạt; 183 integration + 74 checkout/public API + 58 security + 10 OWASP verification + 3 registration + 9 production + 7 DB role = **344 lượt** |
| `npm run test:shopping` | Đạt UI/cart/checkout với API mock |
| `npm run test:storefront` | Đạt storefront/Guest/login/checkout/routing với API mock |
| `npm run test:navigation` | Đạt; bổ sung kiểm tra field password cho đổi email trong profile |
| `npm run test:request-url` | **55 kiểm tra đạt** |
| `npm ls --depth=0` | Không có dependency invalid |
| `npm audit --json` | **0 advisory đã biết** ở lần kiểm tra này, gồm production và development |

[backend-manifest.json](evidence/2026-10-20/backend-manifest.json) và [backend-embedded.txt](evidence/2026-10-20/backend-embedded.txt) là lượt build/backend cuối cùng sau bản vá đăng ký. [final-manifest.json](evidence/2026-10-20/final-manifest.json) lưu các suite UI/URL/dependency và một lượt backend trước bản vá đăng ký; lượt đó chỉ là kết quả trung gian, không thay thế backend-manifest cuối.

Chạy kiểm tra bản hiện tại:

```powershell
npm.cmd run test:embedded
npm.cmd run test:shopping
npm.cmd run test:storefront
npm.cmd run test:navigation
npm.cmd run test:request-url
npm.cmd audit --json
```

Hai suite mới chạy độc lập:

```powershell
npm.cmd run test:owasp
npm.cmd run test:owasp-registration
```

Để thu artifact bằng script, có thể dùng `node scripts/security-evidence.mjs backend` hoặc phase `final`, `audit`. Script ghi đè artifact cùng tên trong thư mục ngày 20/10; nếu cần giữ nguyên hồ sơ đợt này, sao lưu/commit trước khi chạy lại. Không dùng phase `baseline` trên code đã sửa để khẳng định đã tái hiện trạng thái cũ. CI tự chạy hai suite mới thông qua `test:embedded`.

Build còn cảnh báo bundle frontend trên 500 kB. Đây là giới hạn hiệu năng, không được tự phân loại là một lỗ hổng OWASP có exploit.

## 7. Các hạng mục chưa khắc phục hoặc chưa xác minh

Các hạng mục dưới đây **không được coi là đã đóng**. “Chưa có kiểm soát” và “chưa kiểm chứng live” được tách riêng để tránh khẳng định có một exploit chưa tái hiện.

| Mã / ưu tiên định tính | Trạng thái hiện tại | Việc còn cần làm / tiêu chí đóng |
|---|---|---|
| R01 — Trung bình — A06/A07 | **Còn thiếu:** email mới được ghi ngay sau nhập đúng password, chưa có token xác nhận quyền sở hữu địa chỉ mới hoặc xác nhận từ email cũ. Phần reauthentication đã sửa nhưng quy trình đổi email chưa đầy đủ | Thiết kế pending email và xác nhận một lần có TTL; kiểm tra email cũ/mới, replay/expiry và thông báo thay đổi qua SMTP đã cấu hình. Chưa thêm workflow này trong đợt sửa hiện tại |
| R02 — Trung bình — A07/A06 | **Còn rủi ro thiết kế:** forgot vẫn gọi SMTP đồng bộ trong request/transaction; nhánh email có user có thể chậm hơn. Không đo thống kê timing hoặc load test trong lần này | Dùng queue/outbox và worker có retry, phản hồi công khai độc lập delivery; đo nhiều mẫu known/unknown dưới tải. Status/body đã sửa, chưa coi toàn bộ enumeration/availability đã hết |
| R03 — Trung bình, ưu tiên Admin — A07 | **Chưa triển khai:** MFA; policy password mới hiện tối thiểu 8 ký tự, chưa có kiểm tra password phổ biến/bị lộ | Hoàn thiện chính sách độ mạnh và blocklist, thiết kế MFA enrollment/recovery rồi kiểm thử. Throttle/account lock hiện có chỉ là lớp giảm thiểu; không tự coi SSO là bắt buộc cho ứng dụng này |
| R04 — Trung bình — A06 | **Chưa hoàn thiện:** rate limit chủ yếu ở auth/upload/profile, chưa có giới hạn tổng thể cho public catalog/media; mutations dùng advisory lock chung | Bổ sung kiểm soát abuse/quota/pagination theo tải thật, WAF/CDN và load test. Không active-scan hoặc gây tải lên cloud dùng chung trong lần này |
| R05 — Trung bình về quota/availability — A06/A10 | **Còn tồn tại:** storage ghi ngoài transaction DB; lỗi DB sau upload có thể để lại file mồ côi; chưa có quota dung lượng theo user/cleanup | Kiểm thử fault injection ở storage/DB; compensating delete hoặc garbage collection có lịch/quota. File mồ côi không tự trở thành public |
| R06 — Trung bình về phát hiện sự cố — A09 | **Chưa triển khai:** log/audit có sẵn nhưng chưa có kênh alert/SIEM và bằng chứng chính sách retention/backup | Kết nối hệ thống log/alert, thử ngưỡng 401/403/429/5xx và sự kiện recovery, xác nhận người nhận/retention/khôi phục. Tác vụ này không gửi thông báo cho người khác |
| R07 — Thấp, phụ thuộc chuỗi khai thác — A02/A05 | **Còn ngoại lệ cấu hình:** CSP Vercel có `style-src 'unsafe-inline'` cho UI. Chưa chứng minh có XSS thực thi từ ngoại lệ này; script-src vẫn self | Loại inline style hoặc dùng giải pháp CSP phù hợp, kiểm thử UI/browser thật trước siết policy; không xóa directive một cách làm hỏng biểu đồ/giao diện |
| D01 — Chưa đủ dữ liệu xếp mức — A01/A02 | **Chưa xác minh cloud hiện tại:** migration 003, quyền/RLS runtime, private bucket, REST schema grants | Xác minh chỉ đọc ở đúng Supabase project và staging; nếu 003 chưa áp dụng, chạy migration bằng connection quản trị trước dùng bản vá media. Không suy trạng thái hiện tại từ tài liệu ngày 17/10 |
| D02 — Chưa đủ dữ liệu xếp mức — A02/A04 | **Chưa xác minh live:** domain HTTPS, cookie/CSP/HSTS ở CDN/Vercel, chứng chỉ DB, SMTP TLS, proxy trust | Smoke test domain/staging thật với tài khoản test và cấu hình của môi trường; PGlite không có TLS thực nên production suite có ngoại lệ transport dành riêng test |
| D03 — Chưa đủ dữ liệu xếp mức — vận hành | **Chưa kiểm chứng:** rotation secrets, backup/restore, truy cập quản trị và dependency CI thực sự chạy trên GitHub | Kiểm tra cấu hình vận hành và kết quả pipeline/deployment thật. Không đưa `.env`, key hoặc connection URL vào bằng chứng công khai |

**Kết luận hiệu quả:** các exploit cụ thể V01/V02, tín hiệu status/body V03/V04 và lỗi parsing V05 đã được chặn trong bài kiểm tra. R01–R07 còn mở; D01–D03 chưa xác minh. Không có kết luận “an toàn tuyệt đối” hoặc “đạt chứng nhận OWASP”.

## 8. Áp dụng khi triển khai

### 8.1. Migration và quyền truy cập ảnh

**Bản vá media F02 cần migration `003_media_ownership.sql` trước khi phục vụ traffic bằng phiên bản mới.** Đợt 20/10 không thêm migration. Các tác vụ kiểm thử/bản tổng hợp này không chạy migration trên cloud và không deploy Vercel; không biết chắc 003 đã được áp dụng ở môi trường thật hay chưa.

1. Xác minh migration hiện có trên đúng database. Nếu chưa có 003, dùng connection quản trị migration chạy `npm run db:migrate`; runtime role thường không có quyền tạo bảng. Không đưa thông tin quản trị vào frontend/báo cáo.
2. Migration 003 giữ dữ liệu cũ, tạo bảng owner, bật RLS và thu hồi PUBLIC; nếu `lumina_app` tồn tại thì cấp SELECT/INSERT và policy server_only cho bảng mới. Với cài đặt mới, chạy quy trình `npm run db:role` sau migration/khởi tạo.
3. Ảnh cũ được tham chiếu bởi product/avatar được kiểm tra theo bản ghi đó. Không suy đoán owner cho file cũ chưa gắn bản ghi; tài khoản thường cần upload lại nếu muốn sử dụng file chưa có quyền.
4. Thử trên staging: A upload/preview được; B biết URL vẫn 404, không gán được vào profile; ảnh Active public hiển thị, ảnh Draft không lộ cho Guest. Xác minh bucket private và quyền REST anon/authenticated.

### 8.2. Thay đổi hành vi tài khoản

1. API/UI đổi email phải gửi `current_password` đúng; đổi tên/phone với email giữ nguyên vẫn dùng luồng cũ. Field password chỉ dùng xác thực, không lưu/log hoặc trả lại client.
2. Sau đổi email, các thiết bị khác phải đăng nhập lại; link reset phát hành trước đó bị vô hiệu hóa.
3. Đăng ký trùng định danh trả 200 và thông báo trung tính giống request mới. Không suy từ thông báo đó rằng đã tạo user; user mới vẫn Pending/Guest và cần Admin duyệt.
4. Lỗi gửi mail recovery không trả 500 để phân biệt user. Theo dõi sự kiện delivery failed; phản hồi chung không bảo đảm email đã được gửi. Chưa có queue/retry/alert đầy đủ.

### 8.3. Xác minh vận hành còn cần làm

- HTTP server dùng IP peer và từ chối production `TRUST_PROXY=true` chưa được xác minh. Nếu hỗ trợ reverse proxy phải thiết kế allowlist peer; Vercel tiếp tục dùng IP adapter nền tảng.
- Xác minh HTTPS, CSP/HSTS/cookie ở domain/CDN thật, TLS database và SMTP production; không suy từ PGlite.
- Thiết lập quota/cleanup ảnh mồ côi, retention/backup, rotation secrets và cảnh báo cho 401/403/429/5xx/recovery events. Giữ nguyên danh sách R/D còn mở đến khi có bằng chứng đóng.

## 9. Nội dung trình bày khi bảo vệ

“Em kiểm thử theo OWASP Top 10:2025 qua hai đợt. Đợt 17/10 xử lý lỗi né rate limit, quyền truy cập ảnh, dashboard và reset token, đồng thời gia cố TLS, rollback, log và CI. Đợt 20/10 phát hiện thêm lỗi đổi email khôi phục, token/session còn hiệu lực, dò tài khoản qua SMTP/đăng ký và URL lỗi. Em lưu bằng chứng trước/sau cho 13 kiểm tra mới; sau sửa đạt 13/13 và tổng backend 344 lượt. Em tách rõ phần đã sửa trong source với phần chưa hoàn thiện và cấu hình cloud chưa xác minh. Kết quả này không phải chứng nhận OWASP hay bảo đảm an toàn tuyệt đối.”

## 10. Tài liệu đối chiếu

- [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction/) — tên và phạm vi 10 nhóm.
- [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) — reauthentication, thông báo xác thực và quy trình thay email; R01/R03 còn chưa hoàn thiện theo hướng dẫn này.
- [Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) — phản hồi nhất quán, token và chống dò tài khoản.
