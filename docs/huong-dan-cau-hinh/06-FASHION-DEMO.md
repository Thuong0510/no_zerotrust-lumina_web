# Bộ dữ liệu demo LUMINA FASHION Việt Nam

Đây là bộ dữ liệu giả lập, không phải danh sách hàng hóa, nhà cung cấp hoặc khách hàng thật. Giá bán và giá vốn tính bằng VND, chỉ phục vụ demo. Email dùng miền `example.invalid`; số điện thoại và địa chỉ là dữ liệu mô phỏng, không dùng để liên hệ.

## Chạy seed

Database trong `.env` phải có schema của ứng dụng và ít nhất một tài khoản Admin đang Active hoặc Employee có quyền `order.create`. Script không chạy migrate/initialize, không tạo tài khoản và không thay đổi quyền.

```powershell
npm.cmd run db:seed:fashion
# Chỉ định tài khoản hiện có làm người tạo đơn và ghi lịch sử kho:
npm.cmd run db:seed:fashion -- --created-by 1
```

Lệnh bổ sung dữ liệu vào `DATABASE_URL` / `DATABASE_SCHEMA` đang cấu hình. Nếu không chỉ định ID, script chọn tài khoản đủ điều kiện có ID nhỏ nhất. Không cần `DEMO_MODE=true` hoặc `DEMO_PASSWORD`. Không thay thế lệnh `db:seed` cũ và không seed tự động mỗi lần mở web.

## Nội dung

| Dữ liệu | Số lượng |
| --- | ---: |
| Sản phẩm, SKU `LF-DEMO-001` đến `LF-DEMO-100` | 100 |
| Danh mục riêng, có hậu tố `[Demo LUMINA]` | 10 |
| Biến thể và bản ghi tồn kho | 520 |
| Nhà cung cấp mô phỏng | 5 |
| Khách hàng mô phỏng | 30 |
| Đơn hàng `LF-DEMO-ORDER-001` đến `060` | 60 |
| Chi tiết đơn hàng | 120 |
| Thông báo theo phạm vi All/Admin/Employee/Guest | 4 |

Danh mục: áo thun, sơ mi, quần, chân váy, đầm, áo dài, áo khoác, giày dép, túi xách, phụ kiện. Mỗi danh mục có 10 thiết kế riêng, SKU, giá bán, giá vốn thấp hơn giá bán và mô tả tiếng Việt.

Quần áo dùng size S/M/L, giày dép dùng 37/38/39, túi và phụ kiện dùng One Size. Mỗi size có hai màu Đen/Kem. Tồn kho phản ánh tổng các giao dịch có dấu: nhập dương, xuất âm, điều chỉnh là chênh lệch. Đơn hủy có cả xuất kho và hoàn kho; đơn khác đã trừ/giữ hàng từ khi tạo theo logic hiện có của ứng dụng. Đơn Completed luôn Paid. Tổng đơn bằng tổng số lượng × giá bán lưu trên chi tiết.

Đơn hàng trải đều trong sáu tháng hoàn chỉnh trước thời điểm seed. Lịch sử nhập đầu kỳ, nhập bổ sung, xuất mẫu và kiểm kê bắt đầu trước các đơn hàng. Tiền sử kho, giá và thời gian không được tạo lại khi chạy lần hai.

## Các trường hợp kiểm thử

| Dữ liệu | Mục đích |
| --- | --- |
| `LF-DEMO-001`, tất cả biến thể tồn 0 | Chặn tạo đơn hết hàng |
| `LF-DEMO-002`, tồn 3 | Tồn thấp; thử mua vượt tồn |
| `LF-DEMO-003`, tồn 10 bằng ngưỡng cảnh báo | Kiểm tra biên Low Stock |
| `LF-DEMO-097` và `098`, Draft | Không cho bán; ẩn với Guest |
| `LF-DEMO-099` và `100`, Archived | Không cho bán; ẩn với Guest |
| Nhà cung cấp số 5, Inactive | Nhà cung cấp ngừng hợp tác, vẫn giữ sản phẩm/lịch sử |
| Sáu trạng thái đơn, mỗi trạng thái 10 đơn | Pending, Confirmed, Processing, Shipped, Completed, Cancelled |
| Cash / Bank Transfer / Card; Paid / Unpaid | Bộ lọc, báo cáo, điều kiện hoàn tất |
| Khách hàng nhiều đơn, đơn có hai sản phẩm | Liên kết chi tiết và lịch sử mua |
| Bốn phạm vi thông báo | Admin xem cả bốn; Employee/Guest xem All và phạm vi của mình |

Dùng các tài khoản sẵn có để thử phân quyền. Guest chỉ thấy 96 sản phẩm Active, không thấy giá vốn, nhà cung cấp hoặc tồn kho; không truy cập quản lý đơn/kho. Employee có quyền tạo/sửa đơn và xem kho theo phân quyền hiện có, không được xem nhà cung cấp. Admin kiểm tra đủ trạng thái, báo cáo và lịch sử. Bộ seed không thay đổi chính sách quyền hay tạo tài khoản kiểm thử.

## Chạy lại và bảo toàn dữ liệu

Toàn bộ seed chạy trong một transaction, dùng cùng advisory lock với các thao tác ghi của ứng dụng. ID do database sinh; không giả định ID danh mục, sản phẩm hay tài khoản. Không sửa giao diện, API, schema, tài khoản, mật khẩu, quyền, dữ liệu hay tồn kho có sẵn.

Marker `settings.key = lumina-fashion-demo-v1` được ghi cuối transaction. Chạy lại trả `skipped: true` và không ghi dữ liệu, kể cả khi bạn đã thay đổi sản phẩm, kho hoặc đơn demo. Nếu có dữ liệu trùng namespace nhưng thiếu marker, script dừng thay vì ghi đè hoặc ghép nhầm. Nếu lỗi giữa chừng, toàn bộ bản ghi mới được rollback (sequence PostgreSQL có thể tăng, đây là hành vi bình thường). Không xóa marker để seed lại.

## Kiểm thử tự động

```powershell
npm.cmd run test:seed:fashion
npm.cmd run typecheck
```

Kiểm thử dùng PostgreSQL WASM cục bộ riêng, không đọc `.env` và không dùng database thật. Bao gồm bảo toàn bản ghi cũ, rollback giữa chừng, hai lần chạy đồng thời, seed lại sau chỉnh sửa tồn kho, va chạm namespace, tổng tiền, sổ kho và các ca sản phẩm/đơn/phân quyền. Cổng mặc định `55434`, có thể đổi qua `FASHION_TEST_PG_PORT`.
