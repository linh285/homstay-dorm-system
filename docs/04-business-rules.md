# HomeStay Dorm — Business Rules

## 1. Quy tắc chung

- Đây là web nội bộ; khách hàng không đăng nhập.
- `SALE`, `ACCOUNTANT`, `MANAGER` chỉ xử lý dữ liệu thuộc chi nhánh mình.
- `ADMIN` chỉ xem dữ liệu toàn hệ thống và cập nhật thông tin cơ bản của chi nhánh.
- Mọi quyền và trạng thái phải được kiểm tra tại backend.
- Giấy tờ, hợp đồng và biên bản được xử lý bên ngoài; hệ thống chỉ lưu thông tin xác nhận.

---

## 2. Phòng và giường

- Phòng hoặc giường `MAINTENANCE`, `OUT_OF_SERVICE` không được giới thiệu cho khách.
- Trạng thái kinh doanh của giường được xác định từ `PHAN_BO_GIUONG`.
- Một giường chỉ có tối đa một allocation đang hoạt động.
- Không được ngừng sử dụng phòng hoặc giường đang `DEPOSITED` hoặc `OCCUPIED`.

Trạng thái allocation:

```text
HELD → DEPOSITED → OCCUPIED → ENDED
```

3. Yêu cầu thuê và tìm phòng
Thuê nguyên phòng: số người không vượt sức chứa và toàn bộ giường phải khả dụng.
Ở ghép: số giường khả dụng phải đủ số người và khách phải chấp nhận ở ghép.
Phòng phải phù hợp chi nhánh, giới tính, giá và các tiện ích bắt buộc.
Tìm phòng và tạo lịch xem không giữ giường.
Manager phải kiểm tra lại tình trạng thực tế trước khi cho phép nhận cọc.
4. Lịch xem
Một lịch xem có thể gồm nhiều phòng.
Chỉ Sale của cùng chi nhánh được quản lý lịch.
Chỉ lịch CONFIRMED mới được xác nhận khách đã xem.
Chỉ lịch VISITED mới được lưu kết quả.
Chỉ kết quả CUSTOMER_WANTS_DEPOSIT mới được chuyển sang quy trình đặt cọc.
5. Đặt cọc

Luồng bắt buộc:

Sale xác nhận nội quy
→ Manager xác nhận phòng
→ Accountant phát hành yêu cầu thanh toán
→ Accountant ghi nhận tiền
→ Manager xác nhận tiền hợp lệ

Công thức:

Tiền cọc = 2 × tổng giá thuê tháng của các giường được thuê
Thuê nguyên phòng tính toàn bộ giường.
Hạn 24 giờ bắt đầu khi Accountant phát hành yêu cầu thanh toán.
Khi phát hành yêu cầu, các giường chuyển sang HELD.
`record-payment` chỉ thành công khi payment được ghi nhận trong hạn và chuyển hồ sơ
thẳng sang `WAITING_MANAGER_CONFIRMATION`. Manager có thể xác nhận sau hạn.
Job chỉ hết hạn hồ sơ còn `WAITING_PAYMENT`; khi đó phải kết thúc HELD.
`PAYMENT_RECHECK` sau hạn chỉ được sửa payment đã ghi nhận đúng hạn, không tạo
payment mới. `PAYMENT_REJECTED` phải kết thúc toàn bộ allocation `HELD` trong cùng
transaction để giải phóng giường.
Sale không xác nhận tiền.
Accountant không duyệt cuối tiền cọc.
Chỉ Manager xác nhận tiền cọc hợp lệ.
Khi Manager xác nhận, allocation chuyển HELD → DEPOSITED.
6. Nhận phòng và bàn giao
Số người cư trú không vượt số giường đã cọc.
Một giường không được gán cho hai người.
Manager duyệt từng thành viên.
Thành viên bị từ chối không được đưa vào hợp đồng.
Hợp đồng giấy phải được xác nhận đã ký.
Accountant phải xác nhận thanh toán ban đầu đầy đủ.

Xác nhận khách đến chỉ chuyển hợp đồng `CHECKIN_DRAFT → ARRIVED`. Sale cập nhật
người cư trú tại `ARRIVED`; gửi duyệt mới chuyển sang `WAITING_ELIGIBILITY`.

Chỉ được bàn giao khi:

Đã duyệt điều kiện cư trú
AND đã ký hợp đồng giấy
AND đã thanh toán ban đầu đầy đủ

Khi bàn giao hoàn tất:

Hợp đồng → ACTIVE
Allocation → OCCUPIED
7. Trả phòng và hoàn cọc

Tỷ lệ hoàn cơ bản:

Đã cọc nhưng chưa ký hợp đồng     → 80%
Trả trước hạn, ở ≤ 6 tháng        → 50%
Trả trước hạn, ở > 6 tháng        → 70%
Hết hạn hợp đồng                  → 100%

Đúng 6 tháng áp dụng 50%.

Công thức:

Tiền hoàn cơ bản = Tiền cọc × Tỷ lệ hoàn

Số dư cuối =
Tiền hoàn cơ bản
- tiền thuê còn nợ
- điện nước và dịch vụ còn nợ
- hư hỏng hoặc mất mát
- tiền phạt
Số dư dương: hoàn cho khách.
Số dư bằng 0: không thu, không hoàn.
Số dư âm: khách phải trả thêm.
Khi khách khiếu nại, quy trình phải tạm dừng.
Accountant ghi nhận thu thêm hoặc hoàn tiền.
Manager xác nhận khách đồng ý và hoàn tất trả phòng.

Khách đã cọc nhưng chưa ký hợp đồng không cần kiểm tra phòng và được tạo đối soát
trực tiếp với tỷ lệ 80%. Số dư bằng 0 phải được Accountant xác nhận bằng hành động
`confirm-no-balance` trước khi hoàn tất.

Chỉ giải phóng giường khi:

Khách đã đồng ý đối soát
AND đã hoàn tất khoản thu hoặc hoàn
AND đã thanh lý hợp đồng
AND đã thu hồi khóa/thẻ
AND khách đã rời phòng
AND Manager xác nhận hoàn tất

Khi đó allocation mới chuyển sang ENDED.
