
- Sale không được xác nhận tiền cọc.
- Hai hồ sơ không được giữ cùng một giường.
- Phiếu cọc hết 24 giờ phải giải phóng giường.
- Job không được hết hạn hồ sơ đã sang `WAITING_MANAGER_CONFIRMATION`.
- Manager được xác nhận sau hạn khi payment đã được ghi nhận đúng hạn.
- Recheck sau hạn chỉ sửa payment cũ, không tạo payment mới.
- Từ chối payment phải chuyển payment/deposit sang `PAYMENT_REJECTED` và kết thúc
  toàn bộ allocation `HELD` trong một transaction.
- Hủy cọc ở `WAITING_PAYMENT` phải hủy payment và kết thúc allocation `HELD`.
- Chưa thu đủ tiền ban đầu thì không được bàn giao.
- `confirm-arrival` chỉ chuyển sang `ARRIVED`; gửi duyệt mới chuyển sang
  `WAITING_ELIGIBILITY`.
- Đúng 6 tháng phải áp dụng tỷ lệ 50%.
- Đã cọc nhưng chưa ký hợp đồng được đối soát 80% mà không có inspection.
- Số dư bằng 0 phải gọi `confirm-no-balance`.
- Chưa thu hồi khóa thì không được hoàn tất trả phòng.
- Admin không được tạo/sửa nhân viên, quản lý tài khoản hoặc thực hiện nghiệp vụ.
- Reschedule lịch xem phải đưa lịch về `SCHEDULED`.
- Kết quả xem không lưu giường; `create-deposit` mới nhận `selectedBedIds`.
- Danh mục dịch vụ và loại tài sản không có API tạo/sửa.
