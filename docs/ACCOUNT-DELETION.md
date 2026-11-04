# Xóa tài khoản và đăng ký lại

Trang Users có các thao tác riêng:

- **Khóa tài khoản**: chuyển sang `Locked`, kết thúc phiên đăng nhập và vô hiệu hóa liên kết đặt lại mật khẩu. Email/username vẫn thuộc tài khoản này. Có thể mở khóa bằng Chỉnh sửa → trạng thái Active.
- **Xóa tài khoản**: đặt `deleted_at`, chuyển sang `Disabled`, kết thúc phiên đăng nhập và vô hiệu hóa liên kết đặt lại mật khẩu. Hồ sơ biến mất khỏi danh sách Users; không thể sửa/duyệt lại qua API. Email/username được giải phóng.
- **Duyệt tài khoản**: tài khoản Pending được chuyển sang Active, giữ vai trò đang được admin xem. Đăng ký công khai luôn tạo Guest.

Tài khoản đăng ký lại có ID mới, thông tin/mật khẩu mới, trạng thái Pending và thông báo cho Admin. Không kế thừa quyền, nhân viên liên kết, địa chỉ, đơn hàng, ảnh đại diện hoặc thông báo riêng của hồ sơ đã xóa. Admin thấy họ tên, username, email, điện thoại và ngày đăng ký trong bảng Users. Các đơn hàng/khách hàng/nhật ký cũ vẫn liên kết ID cũ.

Admin không thể tự xóa hoặc tự khóa tài khoản đang đăng nhập. Tài khoản Locked, Disabled hoặc Pending chưa xóa vẫn giữ email/username. Các tài khoản Disabled từ trước nâng cấp không tự bị coi là đã xóa; admin phải chủ động xóa nếu muốn giải phóng email.

Đây là xóa mềm tài khoản ứng dụng; lịch sử giao dịch và nhật ký vẫn được lưu theo ID cũ.

## Triển khai database và Vercel

1. Sao lưu database hiện có. Kiểm thử trên database tạm bằng `npm run test:accounts`; chạy `npm run build` và các kiểm tra tích hợp trước khi triển khai.
2. Dùng kết nối quản trị đến đúng database/schema đích, chạy `npm run db:migrate`. Migration `004_user_soft_delete.sql` thêm cột `deleted_at` và thay bốn index email/username bằng hai unique index không phân biệt hoa thường, chỉ áp dụng khi `deleted_at IS NULL`. Không sửa migration cũ, không seed/reset database.
3. Deploy code mới lên Vercel sau khi migration thành công. Build hiện tại không tự migrate. Giữ nguyên runtime connection/biến môi trường của ứng dụng; không đưa mật khẩu quản trị lên runtime.
4. Kiểm tra bằng tài khoản thử: khóa → không đăng nhập/đăng ký trùng được; xóa → đăng ký lại → thấy hồ sơ mới Pending → duyệt → đăng nhập bằng mật khẩu mới. Xác nhận phiên/reset link cũ không còn hiệu lực và đơn hàng cũ vẫn hiện cho admin.

Migration có thể chạy trước code vì mọi hồ sơ cũ có `deleted_at = NULL`, nhưng không dùng thao tác xóa trước khi code mới đã triển khai hoàn tất. Sau khi có tài khoản đã xóa/đăng ký lại, không rollback riêng code về bản chưa hiểu `deleted_at`: bản cũ có thể tìm nhầm hồ sơ trùng email. Cần bản sửa tương thích hoặc quy trình khôi phục database đã được kiểm tra.

Kiểm thử cục bộ dùng PGlite tạm, không đọc `.env` và không thay đổi database/Vercel thật.
