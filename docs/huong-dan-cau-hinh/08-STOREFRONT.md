# Trang cửa hàng công khai và phân chia giao diện

## Hành vi hiện tại

- **Chưa đăng nhập:** mở link web là thấy trang chủ LUMINA, không bị chặn ở form login. Có thể tìm/lọc sản phẩm, xem chi tiết, size/màu, trạng thái còn hàng và chính sách mua hàng.
- **Muốn thêm giỏ hoặc mua:** chuyển sang Đăng nhập. Nếu đang thêm một sản phẩm, đăng nhập thành công bằng Guest sẽ quay lại chọn biến thể của sản phẩm đó, chưa tự thêm hàng hoặc tạo đơn.
- **Tài khoản role Guest:** tiếp tục dùng cùng giao diện mua sắm, có giỏ, checkout COD, đơn cá nhân, thông báo và hồ sơ. Không render sidebar/navbar của workspace, không gọi API quản lý nền.
- **Admin/Employee:** đăng nhập cùng form nhưng được đưa vào workspace, theo đúng permission hiện tại.
- Logout trở lại trang chủ công khai; đường dẫn giỏ/đơn/hồ sơ khi chưa login hiển thị yêu cầu đăng nhập, không hiển thị dữ liệu tài khoản trước.

**Giữ nguyên tên role `Guest` theo yêu cầu cuối cùng**, không đổi thành Customer. “Khách vãng lai/chưa đăng nhập” là trạng thái user null, không phải role được lưu trong bảng roles. Khách mua có tài khoản hiện dùng role Guest. Đăng ký vẫn Guest/Pending và cần cửa hàng duyệt Active; không tự thay chính sách duyệt tài khoản.

## Ma trận truy cập

| Chức năng | Chưa đăng nhập | Guest đã đăng nhập | Admin/Employee |
|---|---|---|---|
| Trang chủ, catalog, chi tiết, chính sách | Có | Có, giao diện cửa hàng | Sau login vào workspace theo role |
| Thêm giỏ/checkout/đơn cá nhân/hồ sơ | Yêu cầu login | Có, theo quyền và ownership | Chức năng tương ứng trong workspace |
| Menu quản lý, kho, người dùng, nhân sự, báo cáo | Không | Không | Theo permission |
| Gọi API quản lý trực tiếp | 401 | 403 khi thiếu quyền | Theo permission |
| Ảnh sản phẩm Active đã công bố | Có, qua API storefront | Có | Có |
| Ảnh avatar/file private không gắn sản phẩm Active | Không | Yêu cầu phiên cho API private | Yêu cầu phiên cho API private |

Guest vẫn không được cấp `order.view`, `inventory.view` hoặc quyền quản trị để phục vụ giao diện mới. Public catalog không phụ thuộc permission nội bộ; thêm giỏ/checkout dùng endpoint được bảo vệ và quyền `product.view` hiện có.

## API công khai chỉ đọc

| Endpoint | Dữ liệu |
|---|---|
| GET /api/store/products | Sản phẩm Active với id/tên/SKU/mô tả/danh mục/giá/ảnh/cờ available |
| GET /api/store/products/:id | Chi tiết Active và biến thể id/SKU/size/màu/available |
| GET /api/store/policy | Phí ship, ngưỡng miễn phí, thông tin liên hệ được cấu hình |
| GET /api/store/media/:key | Chỉ file đang được tham chiếu trong image của ít nhất một sản phẩm Active |

Các method ghi ở `/api/store/*` bị từ chối 405. ID sai trả 400; sản phẩm Draft/Archived hoặc file không được công bố trả 404. API dùng projection SQL rõ ràng, không `SELECT p.*`: không lộ cost, supplier, số lượng kho, threshold hoặc tài khoản.

Ảnh trong public catalog dùng URL `/api/store/media/...`, backend kiểm tra sản phẩm còn Active trước khi đọc bucket. **Bucket vẫn private**, không mở public policy và không đưa Storage secret ra frontend. `/api/media/...` cũ tiếp tục yêu cầu session, để avatar và ảnh không công bố không tự bị mở theo.

Các API `/products`, `/orders`, `/checkout`, `/my-orders`, `/notifications`, `/profile` giữ cơ chế xác thực/phân quyền hiện có. Public store không tạo session, cart, customer, order hoặc giữ hàng khi xem.

## Source và đường dẫn

- `frontend/src/components/lumina/storefront.tsx`: shell mua sắm, home, card grid, bộ lọc, chi tiết, login gate và điều hướng sau login.
- `frontend/src/storefront.css`: layout mua sắm desktop/mobile.
- `frontend/src/App.tsx`: chọn Storefront khi user null/Guest, workspace cho Admin/Employee; ngừng tải nền module quản lý khi ở Guest.
- `backend/src/models/storeModel.ts`, `services/storeService.ts`: projection public và quy tắc công bố ảnh.
- `controllers/apiController.ts`: routing public độc lập trước phần yêu cầu session.
- `#home`, `#products`, `#products/ID`, `#shop-policy`, `#login` là các trang cửa hàng; `#cart`, `#checkout`, `#my-orders`, `#profile`, `#notifications` cần login. Role quyết định giao diện, đổi hash không tăng quyền.

Không có migration mới cho thay đổi này, không đổi role/id/quyền trong database. Database phải có migration 002 để dùng các chức năng COD đã có. Với Vite dev, restart backend nếu cần và reload frontend. Nếu chạy bản build hoặc Vercel, build/redeploy để có giao diện mới:

```sh
npm run build
npm start
```

Không chạy `start` cùng `dev:server` trên cổng 3000. Không seed hoặc chạy lại role setup chỉ để mở trang chủ công khai.

## Kiểm thử

```sh
npm run test:storefront
npm run test:shopping
npm run test:navigation
npm run test:embedded
```

Storefront test dùng App thật với API giả lập: anonymous home/detail/policy, login gate, tiếp tục chọn hàng sau login, Guest COD/hủy, logout isolation, bộ lọc, không render/call quản lý và phân nhánh Admin/Employee. Embedded checkout bổ sung kiểm tra public projection, Draft/Archived, file chưa công bố, ảnh avatar/private, method/ID sai và API private vẫn 401. Browser headless đã được xem ở desktop và mobile viewport 390px với dữ liệu giả lập; không coi là kiểm chứng tất cả tương tác trên dịch vụ cloud thật.
