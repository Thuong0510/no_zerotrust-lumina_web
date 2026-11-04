# Hồ sơ bằng chứng OWASP — 20/10/2026

Báo cáo chính: [Báo cáo tổng hợp kiểm thử, khắc phục và rủi ro còn lại ngày 17/10–20/10](../../BAO-CAO-BAO-MAT-OWASP.md).

| Artifact | Nội dung / cách đọc |
|---|---|
| `baseline-commit.txt` | Commit gốc trước các thay đổi ứng dụng của đợt này |
| `baseline-security.txt` | Suite bảo mật có sẵn: 58 lượt đạt ở trạng thái ban đầu |
| `before-observations.json`, `baseline-probes.txt` | 10 kiểm tra mới: 8 không đạt, 2 đối chứng đạt; gồm đổi email, token/session, SMTP và URL |
| `after-observations.json`, `retest-probes.txt` | Cùng nhóm kiểm tra: 10/10 đạt sau vá |
| `before-registration-observations.json`, `registration-baseline-registration.txt` | Baseline RIÊNG của registration, thu trước sửa register nhưng sau sửa nhóm trên: 2 không đạt, 1 đối chứng đạt |
| `after-registration-observations.json`, `registration-retest-registration.txt` | Sau vá registration: 3/3 đạt; vẫn tạo tài khoản Pending/Guest |
| `backend-embedded.txt`, `backend-manifest.json` | Build/typecheck và tất cả backend suites sau bản vá cuối: 344 lượt đạt |
| `final-*.txt`, `final-manifest.json` | UI/URL/dependency tests; phần embedded ở manifest này là lượt trung gian trước vá registration, đã được thay bằng backend-manifest |
| `audit-npm-audit.json`, `audit-manifest.json` | Phản hồi audit registry thật, 0 advisory; không phải file scan tạo bằng tay |
| `*-manifest.json` | Lệnh, giờ UTC bắt đầu/kết thúc, exit code và SHA-256 cho log tương ứng |
| `source-sha256.json` | Hash các file mã nguồn/test/tool liên quan sau bản vá; không chứa nội dung cấu hình bí mật |
| `evidence-sha256.json` | Hash toàn bộ file trong hồ sơ trừ chính file chỉ mục hash |
| `environment-audit-blocked.txt` | Lần gọi audit trong sandbox thất bại do môi trường; KHÔNG dùng làm kết luận về lỗ hổng. Kết quả chạy lại thành công ở audit-npm-audit.json |

`exitCode: 1` của baseline-probes/registration-baseline là kết quả mong đợi khi các assertion bảo mật chưa được thỏa mãn. Đối chiếu từng `id`, `expected`, `actual`, `pass` với JSON sau sửa. Không diễn giải 10 assertion thất bại thành 10 lỗ hổng độc lập.

SMTP là mock ném lỗi có chủ đích; HTTP test chạy loopback; PostgreSQL là PGlite tạm. Không có bằng chứng SMTP thật gửi email, TLS cloud, Storage private hoặc deploy Vercel trong hồ sơ này. Có thể thấy SQL/stack của **lỗi test giả lập** vì NODE_ENV=test; không phải payload/stack trả về cho client production.

Các file được tạo tự động từ test, không chứa password/cookie/CSRF/reset token. Hash chứng minh tính nhất quán cục bộ, không có chữ ký/chứng thực bên ngoài. Việc chạy lại script có thể ghi đè hồ sơ cùng tên; giữ phiên bản Git nếu cần đối chiếu lâu dài.
