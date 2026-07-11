# HomeStay Dorm — Roles and Permissions

## 1. Quy tắc chung

Hệ thống có bốn role:

- `SALE`
- `ACCOUNTANT`
- `MANAGER`
- `ADMIN`

Quy tắc chi nhánh:

- Sale, Kế toán và Quản lý thuộc đúng một chi nhánh.
- Ba role này chỉ được xem và xử lý dữ liệu thuộc chi nhánh của mình.
- Admin được xem dữ liệu toàn hệ thống.
- Backend phải kiểm tra role và chi nhánh; không chỉ ẩn nút ở frontend.

---

## 2. SALE

Sale được phép:

- xem Dashboard Sale;
- xem phòng, giường, dịch vụ và trạng thái khả dụng;
- tạo và cập nhật khách hàng;
- tạo và cập nhật yêu cầu thuê;
- thêm, sửa, xóa thành viên dự kiến ở;
- tìm phòng phù hợp;
- tạo, đổi, hủy lịch xem;
- xác nhận khách đã xem;
- ghi nhận kết quả xem;
- tạo hồ sơ đặt cọc;
- xác nhận khách đã đồng ý nội quy;
- gửi hồ sơ để Manager kiểm tra phòng;
- hẹn ngày nhận phòng sau khi cọc thành công;
- xác nhận khách đã đến;
- cập nhật thông tin cư trú;
- ghi nhận hợp đồng giấy;
- xác nhận hợp đồng giấy đã ký;
- tạo yêu cầu trả phòng.

Sale không được:

- xác nhận phòng còn khả dụng để nhận cọc;
- phát hành hoặc ghi nhận thanh toán;
- xác nhận tiền cọc;
- duyệt điều kiện cư trú;
- hoàn tất bàn giao;
- kiểm tra trả phòng;
- tính đối soát;
- hoàn tiền hoặc thu thêm;
- hoàn tất trả phòng.

---

## 3. ACCOUNTANT

Kế toán được phép:

- xem Dashboard Kế toán;
- xem hồ sơ đặt cọc thuộc chi nhánh;
- tính tiền cọc;
- phát hành yêu cầu thanh toán cọc;
- ghi nhận tiền mặt hoặc chuyển khoản;
- gửi khoản tiền cọc cho Manager xác nhận;
- tạo các khoản thanh toán ban đầu;
- ghi nhận và xác nhận đã thu đủ thanh toán ban đầu;
- tạo bảng đối soát trả phòng;
- nhập các khoản khấu trừ;
- tính số dư cuối;
- ghi nhận khách trả thêm;
- ghi nhận đã hoàn cọc.
- xác nhận không phát sinh thu hoặc hoàn khi số dư đối soát bằng 0.

Kế toán không được:

- xác nhận phòng còn khả dụng;
- xác nhận cuối cùng khoản tiền cọc;
- duyệt điều kiện cư trú;
- ghi nhận hợp đồng giấy;
- hoàn tất bàn giao;
- kiểm tra hiện trạng trả phòng;
- xác nhận khách đồng ý đối soát;
- thanh lý hợp đồng;
- giải phóng giường.

---

## 4. MANAGER

Quản lý được phép:

- xem Dashboard Quản lý;
- tạo và cập nhật phòng, giường của chi nhánh;
- gắn danh mục dịch vụ và loại tài sản toàn hệ thống vào phòng thuộc chi nhánh;
- xác nhận phòng hoặc giường còn khả dụng để nhận cọc;
- từ chối nhận cọc khi phòng không còn phù hợp;
- xác nhận khoản tiền cọc hợp lệ;
- yêu cầu Kế toán kiểm tra lại thanh toán;
- từ chối khoản thanh toán không hợp lệ;
- duyệt hoặc từ chối từng thành viên cư trú;
- dừng thủ tục nhận phòng;
- lập và hoàn tất bàn giao;
- kiểm tra hiện trạng khi trả phòng;
- ghi nhận hư hỏng, mất mát và vệ sinh;
- xác nhận khách đồng ý hoặc khiếu nại kết quả đối soát;
- xác nhận biên bản trả phòng và thanh lý hợp đồng;
- xác nhận đã thu hồi khóa hoặc thẻ;
- hoàn tất trả phòng và giải phóng giường.

Quản lý không được:

- tạo yêu cầu thuê thay Sale;
- ghi nhận giao dịch thanh toán thay Kế toán;
- tự sửa số tiền đối soát;
- hoàn tiền hoặc ghi nhận thu thêm thay Kế toán.

---

## 5. ADMIN

Admin được phép:

- xem Dashboard toàn hệ thống;
- xem danh sách chi nhánh;
- cập nhật thông tin cơ bản của chi nhánh;
- xem danh sách nhân viên;
- xem báo cáo toàn hệ thống;
- xem phòng và giường của tất cả chi nhánh.

Admin không được:

- tạo hoặc sửa nhân viên;
- thay đổi role của nhân viên;
- quản lý tài khoản đăng nhập;
- đổi hoặc đặt lại mật khẩu;
- khóa hoặc mở tài khoản;
- thực hiện nghiệp vụ của Sale;
- ghi nhận thanh toán;
- xác nhận tiền cọc;
- duyệt cư trú;
- bàn giao phòng;
- kiểm tra trả phòng;
- xác nhận đối soát;
- hoàn tất trả phòng.

---

## 6. Ma trận quyền chính

| Hành động | Sale | Accountant | Manager | Admin |
|---|:---:|:---:|:---:|:---:|
| Tạo yêu cầu thuê | ✓ |  |  |  |
| Tìm phòng | ✓ |  | Xem | Xem |
| Quản lý phòng/giường |  |  | ✓ | Xem |
| Tạo lịch xem | ✓ |  |  |  |
| Tạo hồ sơ cọc | ✓ |  |  |  |
| Xác nhận phòng nhận cọc |  |  | ✓ |  |
| Phát hành yêu cầu thanh toán |  | ✓ |  |  |
| Ghi nhận thanh toán |  | ✓ | Xem |  |
| Xác nhận tiền cọc |  |  | ✓ |  |
| Cập nhật thông tin nhận phòng | ✓ |  | Xem |  |
| Duyệt thành viên |  |  | ✓ |  |
| Ghi nhận hợp đồng giấy | ✓ |  | Xem |  |
| Xác nhận thanh toán ban đầu |  | ✓ | Xem |  |
| Hoàn tất bàn giao |  |  | ✓ |  |
| Tạo yêu cầu trả phòng | ✓ |  | Xem |  |
| Kiểm tra trả phòng |  | Xem | ✓ |  |
| Tính đối soát |  | ✓ | Xem |  |
| Xác nhận khách đồng ý |  |  | ✓ |  |
| Thu thêm hoặc hoàn cọc |  | ✓ | Xem |  |
| Xác nhận không chênh lệch |  | ✓ | Xem |  |
| Hoàn tất trả phòng |  |  | ✓ |  |
| Xem báo cáo toàn hệ thống |  |  |  | ✓ |
7. Kiểm tra quyền tại backend

Mỗi Service phải kiểm tra:

role có được thực hiện hành động không
AND
hồ sơ có thuộc chi nhánh của người dùng không
AND
trạng thái hiện tại có cho phép hành động không

Nếu sai role:

403 FORBIDDEN

Nếu khác chi nhánh:

403 BRANCH_ACCESS_DENIED

Nếu sai trạng thái:

409 INVALID_STATE_TRANSITION
