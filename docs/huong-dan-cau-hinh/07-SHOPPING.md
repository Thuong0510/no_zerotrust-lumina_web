# Mua hàng COD, đơn cá nhân và chính sách

**Giao diện mới:** người chưa login xem trang chủ/catalog/chi tiết/chính sách công khai; thêm giỏ và mua yêu cầu login. Tài khoản role Guest dùng storefront riêng, không còn workspace quản lý. Admin/Employee giữ workspace theo quyền. Giữ tên role Guest; không có migration mới cho phần giao diện công khai. Xem [08-STOREFRONT.md](08-STOREFRONT.md).

## Cập nhật database đang có

Phiên bản này cần migration `002_customer_checkout.sql`. Migration thêm cột và index, không xóa bảng/dữ liệu cũ. Trước khi chạy trên Supabase chung, người quản trị backup và dùng connection quản trị của đúng project/schema:

```sh
npm run db:migrate
npm run db:role
```

Sau đó dùng lại connection runtime `lumina_app`, build/restart local hoặc redeploy Vercel. Không seed lại, không sửa `001_initial.sql`. Ngày 17/10/2026 người dùng đã chạy migration và cập nhật role; đã xác minh chỉ đọc schema 002 và kết nối runtime trên Supabase, chưa tạo/hủy đơn thử trên dữ liệu dùng chung. Kiểm thử nghiệp vụ tự động dùng database tạm.

## Chạy luồng mua hàng

1. Đăng nhập tài khoản Active, có `product.view` (mặc định cả ba role).
2. Trong Products, tìm kiếm/lọc danh mục, giá và còn hàng; xem size/màu và trạng thái còn/hết hàng.
3. Thêm biến thể vào giỏ; mỗi biến thể tối đa 99, tối đa 50 dòng khi checkout.
4. Vào Thanh toán, nhập thông tin nhận hàng tại Việt Nam, đọc chính sách và bấm kiểm tra giá/xem lại đơn.
5. Backend kiểm tra sản phẩm Active, số lượng tồn và lấy giá hiện tại. UI hiển thị tiền hàng, phí giao hàng và tổng COD; báo nếu giá khác snapshot trong giỏ.
6. Đồng ý chính sách rồi xác nhận COD. Backend kiểm tra lại báo giá và tồn, tạo order Pending/Unpaid/Cash, trừ kho và ghi lịch sử trong cùng transaction.
7. Thành công mới xóa giỏ và chuyển đến **Đơn của tôi → chi tiết đơn**. COD là thanh toán lúc nhận hàng, không phải đã thu tiền.
8. Khách tự hủy đơn Pending/Unpaid; thao tác hủy có xác nhận và hoàn kho một lần. Từ Confirmed trở đi cần liên hệ cửa hàng.
9. Employee/Admin xử lý đơn trên Orders như trước, xem thông tin nhận hàng đã lưu riêng trên đơn. Khách nhận thông báo riêng khi tạo/hủy/chuyển trạng thái hoặc sửa items.

Không cấp `order.view`, `order.create` hoặc `customer.manage` nội bộ cho Guest. Tài khoản chỉ xem/hủy đơn mà `orders.buyer_id` trùng id trong session; đoán id của người khác trả 404. Đơn nội bộ cũ không được gán chủ sở hữu bằng email hoặc created_by một cách tự động.

## Chính sách được soạn cho cửa hàng

- Giao hàng tại Việt Nam; khả năng giao và thời gian dự kiến do cửa hàng xác nhận, chưa có tích hợp đơn vị vận chuyển.
- Phí mặc định **30.000đ/đơn**, miễn phí khi tiền hàng từ **500.000đ**. Tổng cuối được server xác nhận trước khi đặt.
- Chỉ COD ở checkout; không yêu cầu số thẻ/OTP, chưa thanh toán thẻ/chuyển khoản tự động.
- Khách tự hủy khi Pending và Unpaid. Đơn đã xác nhận/giao cần liên hệ hỗ trợ.
- Liên hệ đổi trả trong **7 ngày từ khi nhận hàng**, cung cấp mã đơn và ảnh. Đổi size/màu yêu cầu còn tem, chưa dùng/giặt/hỏng và còn hàng thay thế.
- Sai hàng/lỗi cửa hàng: cửa hàng chịu phí đổi trả sau xác minh. Đổi theo nhu cầu: khách chịu phí thực tế được báo trước. Không tự động nhận trả hoặc hoàn tiền trên web; cửa hàng xác nhận từng yêu cầu, không ảnh hưởng quyền khách theo quy định áp dụng.
- Lưu địa chỉ lần đặt thành công để điền lần sau; mỗi đơn giữ snapshot riêng. Liên hệ hỗ trợ qua thông tin do chủ cửa hàng cấu hình, không tạo số điện thoại/email giả.

Chính sách hiển thị trong mục **Chính sách mua hàng** và hộp đọc chính sách tại checkout. Cấu hình server trong `.env` hoặc Vercel:

```dotenv
SHIPPING_FEE=30000
FREE_SHIPPING_THRESHOLD=500000
SHOP_SUPPORT_EMAIL=
SHOP_SUPPORT_PHONE=
```

Điền email/điện thoại thật trước khi đưa vào vận hành. Để `SHIPPING_FEE=0` nếu muốn miễn phí mọi đơn; `FREE_SHIPPING_THRESHOLD=0` cũng làm mọi đơn đủ điều kiện miễn phí. Các số phải nguyên, không âm. Restart/redeploy sau thay đổi.

## API

| Endpoint | Chức năng |
|---|---|
| GET /api/shop-policy | Phí, ngưỡng miễn phí và liên hệ hỗ trợ |
| GET /api/checkout/address | Địa chỉ lần đặt thành công gần nhất của user |
| POST /api/checkout/quote | Kiểm tồn và báo giá từ DB; chưa tạo đơn hoặc giữ hàng |
| POST /api/checkout | Tạo COD sau khi đồng ý chính sách và xác nhận báo giá |
| GET /api/my-orders | Tối đa 200 đơn gần nhất của tài khoản |
| GET /api/my-orders/:id | Chi tiết đơn thuộc tài khoản |
| POST /api/my-orders/:id/cancel | Hủy đơn của mình Pending/Unpaid; hủy lặp không hoàn kho lặp |

Tất cả yêu cầu đăng nhập, POST cần CSRF. Quote/place yêu cầu `product.view`; xem lịch sử/hủy đơn kiểm tra chủ sở hữu, không phụ thuộc quyền Orders nội bộ.

Quote nhận `{items:[{variant_id,quantity}]}`. Place nhận `items`, `shipping:{name,email,phone,address,notes}`, `quote_hash`, `idempotency_key` UUID, `accept_policy:true`. Không nhận giá, total, trạng thái Paid, customer_id hoặc buyer_id do client tự chọn.

`quote_hash` được tính lại từ user, variant/số lượng/giá và phí. Nếu giá/phí thay đổi, trả 409 yêu cầu xem lại. Đây không phải token giữ hàng hoặc chữ ký thanh toán. Tồn vẫn kiểm tra lại tại lúc đặt.

Unique `(buyer_id,checkout_key)` + fingerprint và advisory lock bảo vệ retry. Cùng key/cùng nội dung trả lại đơn cũ trước khi kiểm tra tồn hiện tại; cùng key/khác nội dung trả 409. Frontend giữ nguyên payload khi thử lại sau lỗi mạng, giữ key theo user/giỏ trong sessionStorage và chỉ xóa key sau xác nhận thành công. Khi không rõ kết quả, kiểm tra Đơn của tôi trước khi tạo yêu cầu khác; đóng tab/xóa storage không được coi là cơ chế đảm bảo retry xuyên thiết bị.

## Dữ liệu và tính toàn vẹn

- `customers.user_id`: nullable FK + unique, liên kết hồ sơ mua hàng với tài khoản. Không liên kết bằng email vì có thể trùng với hồ sơ nội bộ khác.
- `orders.buyer_id`: nullable FK cho đơn online; đơn nội bộ cũ giữ null.
- `shipping_name/email/phone/address/notes`: snapshot thông tin nhận hàng tại lúc đặt.
- `shipping_fee`: snapshot phí, đơn cũ mặc định 0; `total` gồm tiền hàng và phí.
- `checkout_key/fingerprint`: nhận diện yêu cầu retry; API khách không trả các trường này.
- `notifications.target_user_id`: thông báo riêng. Không phát nội dung mã đơn/địa chỉ cho mọi Guest qua audience chung.
- Sửa items bởi nhân viên giữ phí đã chốt trên đơn, tính lại tiền hàng và gửi thông báo. Không tự áp lại ngưỡng miễn phí cho đơn đã chốt.
- Báo cáo doanh thu order gồm phí; doanh thu/lợi nhuận sản phẩm dựa order_items nên không bao gồm phí. Cost vẫn lấy từ sản phẩm hiện tại, chưa snapshot giá vốn.

Giỏ vẫn dùng state + sessionStorage theo user/tab, không đồng bộ thiết bị và không giữ hàng trước lúc tạo đơn. Địa chỉ chỉ lưu DB sau đặt thành công; frontend không lưu địa chỉ trong sessionStorage.

## Kiểm thử

```sh
npm run test:shopping
npm run test:storefront
npm run test:navigation
npm run test:checkout
npm run test:embedded
```

Shopping/navigation dùng jsdom và API giả lập. Checkout/embedded dùng PGlite tạm, không dùng Supabase/.env thật. Các case gồm quyền chủ sở hữu, CSRF, giá đổi, tồn thiếu, payload giả total/role, phí ship, snapshot địa chỉ, retry đồng thời, mua món cuối và hủy lặp.

Đã có catalog công khai khi chưa login. Chưa có payment gateway, mã vận đơn, yêu cầu đổi trả tự động, giỏ backend, wishlist hoặc review. Đăng ký vẫn Guest/Pending theo quy trình hiện tại.
