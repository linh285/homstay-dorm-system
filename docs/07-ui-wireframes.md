ID	Màn hình	Role
UI-01	Đăng nhập	Tất cả
UI-02	Dashboard công việc	Tất cả
UI-03	Nhân viên và chi nhánh	Admin
UI-04	Phòng và giường	Sale xem, Quản lý sửa, Admin xem
UI-05	Danh sách yêu cầu thuê	Sale
UI-06	Hồ sơ yêu cầu thuê và tìm phòng	Sale
UI-07	Lịch xem và kết quả xem phòng	Sale
UI-08	Hồ sơ đặt cọc dạng stepper	Sale, Kế toán, Quản lý
UI-09	Hồ sơ nhận phòng dạng stepper	Sale, Kế toán, Quản lý
UI-10	Bàn giao phòng và tài sản	Quản lý
UI-11	Yêu cầu trả phòng	Sale, Kế toán, Quản lý
UI-12	Kiểm tra trả phòng	Quản lý
UI-13	Đối soát và hoàn cọc	Kế toán, Quản lý
UI-14	Báo cáo	Admin, Quản lý



UI-01 — Đăng nhập
Role

Tất cả nhân viên.

Nội dung UI
Tên đăng nhập.
Mật khẩu.
Nút hiện/ẩn mật khẩu.
Nút Đăng nhập.
Thông báo sai tài khoản/mật khẩu.
Thông báo tài khoản bị khóa.
API
POST /api/v1/auth/login

Request:

{
  "username": "sale01",
  "password": "123456"
}

Response:

{
  "success": true,
  "data": {
    "employee": {
      "id": "NV001",
      "fullName": "Nguyễn Văn A",
      "role": "SALE",
      "branchId": "CN01"
    }
  }
}
GET /api/v1/auth/me

Lấy người đang đăng nhập.

POST /api/v1/auth/logout

Kết thúc phiên.

Bảng ERD
Bảng 3 — TAI_KHOAN

Đọc:

TenDangNhap
MatKhauHash
TrangThaiTaiKhoan
MaNhanVien
Bảng 2 — NHAN_VIEN

Đọc:

MaNhanVien
HoTen
ChucVu
MaChiNhanh
TrangThai
Bảng 1 — CHI_NHANH

Đọc tên chi nhánh để hiển thị trên header.

Code frontend
features/auth/
├── pages/LoginPage.tsx
├── api/auth-api.ts
├── schemas/login.schema.ts
└── hooks/use-auth.ts
Code backend
presentation/controllers/auth.controller.ts
presentation/routes/auth.routes.ts
presentation/validators/auth.validator.ts
services/auth/auth.service.ts
data/repositories/account.repository.ts
data/repositories/employee.repository.ts
UI-02 — Dashboard công việc
Role

Sale, Kế toán, Quản lý, Admin.

Nội dung thay đổi theo role
Sale
Yêu cầu thuê mới.
Lịch xem hôm nay.
Hồ sơ cọc đang xử lý.
Khách sắp nhận phòng.
Yêu cầu trả phòng mới.
Kế toán
Hồ sơ chờ tính tiền cọc.
Hồ sơ chờ ghi nhận thanh toán.
Yêu cầu sắp hết 24 giờ.
Thanh toán ban đầu.
Đối soát/hoàn cọc.
Quản lý
Chờ xác nhận tình trạng phòng.
Chờ xác nhận tiền cọc.
Chờ duyệt điều kiện cư trú.
Chờ bàn giao.
Chờ kiểm tra trả phòng.
Chờ khách xác nhận đối soát.
Admin
Tổng chi nhánh.
Tổng nhân viên.
Tổng phòng/giường.
Giường trống/đã cọc/đang ở.
API
GET /api/v1/dashboard

Response tùy role:

{
  "success": true,
  "data": {
    "counters": {},
    "tasks": [],
    "todaySchedules": []
  }
}
Bảng ERD

Dashboard chỉ đọc dữ liệu tổng hợp:

Bảng 11 YEU_CAU_THUE
Bảng 13 LICH_XEM_PHONG
Bảng 15 DAT_COC
Bảng 18 THANH_TOAN
Bảng 20 HOP_DONG_THUE
Bảng 23 BAN_GIAO
Bảng 25 YEU_CAU_TRA_PHONG
Bảng 28 DOI_SOAT_TRA_PHONG
Code
web/features/dashboard/
api/services/reporting/dashboard.service.ts
api/presentation/controllers/dashboard.controller.ts
UI-03 — Nhân viên và chi nhánh
Role

Admin.

Tab 1 — Nhân viên

Thông tin:

Mã nhân viên.
Họ tên.
Username.
Role.
Chi nhánh.
Số điện thoại.
Email.
Trạng thái.

Admin chỉ xem danh sách nhân viên; không có nút tạo, sửa, đổi role, khóa/mở tài
khoản hoặc đặt lại mật khẩu.
Tab 2 — Chi nhánh

Thông tin:

Mã chi nhánh.
Tên.
Địa chỉ.
Điện thoại.
Email.
Tên chủ tài khoản.
Số tài khoản.
Ngân hàng.
Hướng dẫn chuyển khoản.
Trạng thái.

Nút:

Sửa chi nhánh.
API nhân viên
GET    /employees
API chi nhánh
GET    /branches
GET    /branches/:id
PATCH  /branches/:id
Bảng ERD
Bảng 1 CHI_NHANH
Bảng 2 NHAN_VIEN
Bảng 3 TAI_KHOAN
UI-04 — Phòng và giường
Role
Sale: chỉ xem.
Quản lý: thêm/sửa trong chi nhánh mình.
Admin: xem toàn hệ thống.
Danh sách phòng

Bộ lọc:

Chi nhánh.
Tòa/tầng/khu vực.
Loại phòng.
Giới tính áp dụng.
Có điều hòa.
Có gửi xe.
Khoảng giá.
Còn chỗ.
Trạng thái vận hành.

Bảng:

Mã phòng.
Tên phòng.
Chi nhánh.
Sức chứa.
Số giường khả dụng.
Giá thuê.
Giới tính.
Trạng thái.
Chi tiết phòng

Thông tin:

Mã phòng.
Chi nhánh.
Tầng/khu vực.
Loại phòng.
Sức chứa.
Giới tính áp dụng.
Điều hòa.
Gửi xe.
Giờ giấc.
Mức độ yên tĩnh.
Nội quy.
Dịch vụ.
Danh sách giường.
Tài sản phòng.

Nút của Quản lý:

Thêm phòng.
Sửa phòng.
Thêm giường.
Sửa giường.
Cập nhật dịch vụ.
Cập nhật tài sản.
API
GET    /rooms
POST   /rooms
GET    /rooms/:id
PATCH  /rooms/:id
GET    /rooms/:id/availability

POST   /rooms/:id/beds
PATCH  /beds/:id

GET    /services
GET    /asset-types
PUT    /rooms/:id/services

GET    /rooms/:id/assets
PUT    /rooms/:id/assets
Bảng ERD và thuộc tính
Bảng 4 — PHONG
MaPhong
MaChiNhanh
TenPhong
KhuVuc
Tang
LoaiPhong
SucChuaToiDa
GioiTinhApDung
CoDieuHoa
ChoGuiXe
GioGioiNghiem
MucDoYenTinh
NoiQuy
TrangThaiVanHanh
Bảng 5 — GIUONG
MaGiuong
MaPhong
TenGiuong
GiaThueThang
TrangThaiVanHanh
Bảng 6–7

Dịch vụ và dịch vụ phòng.

Bảng 8–9

Loại tài sản và tài sản của phòng.

Bảng 17 — PHAN_BO_GIUONG

Đọc để xác định:

Trống.
Đang giữ.
Đã đặt cọc.
Đang có người ở.

Không lấy trạng thái kinh doanh trực tiếp từ bảng GIUONG.

UI-05 — Danh sách yêu cầu thuê
Role

Sale.

Nội dung

Bộ lọc:

Mã yêu cầu.
Tên khách.
Số điện thoại.
Chi nhánh.
Hình thức thuê.
Trạng thái.
Ngày dự kiến vào.

Bảng:

Mã yêu cầu.
Khách/người đại diện.
Số người.
Hình thức thuê.
Khu vực mong muốn.
Chi nhánh.
Ngày dự kiến vào.
Trạng thái.
Sale phụ trách.

Nút:

Tạo yêu cầu thuê.
Xem.
Tiếp tục xử lý.
API
GET  /rental-requests
POST /rental-requests
GET  /rental-requests/:id

Request tạo:

{
  "customer": {
    "customerType": "INDIVIDUAL",
    "fullName": "Nguyễn Văn A",
    "dateOfBirth": "2003-01-01",
    "gender": "MALE",
    "nationality": "Việt Nam",
    "phone": "0900000000",
    "email": "a@example.com",
    "address": "TP.HCM"
  },
  "rentalRequest": {
    "branchId": "CN01",
    "expectedResidents": 2,
    "rentalMode": "SHARED_BEDS",
    "preferredArea": "Khu A",
    "maximumBudget": "4000000.00",
    "expectedCheckInDate": "2026-08-01",
    "rentalDurationMonths": 12
  }
}
Bảng ERD
Bảng 10 KHACH_HANG
Bảng 11 YEU_CAU_THUE
Bảng 12 THANH_VIEN_YEU_CAU
Bảng 1 CHI_NHANH
Bảng 2 NHAN_VIEN
UI-06 — Hồ sơ yêu cầu thuê và tìm phòng
Role

Sale.

Tab 1 — Thông tin khách
Cá nhân hoặc tổ chức.
Họ tên/tên tổ chức.
Người đại diện.
Ngày sinh.
Giới tính.
Quốc tịch.
Loại và số giấy tờ.
Điện thoại.
Email.
Địa chỉ.
Thành viên dự kiến ở.

Nút:

Sửa thông tin.
Thêm thành viên.
Sửa thành viên.
Xóa thành viên.
Tab 2 — Nhu cầu thuê
Chi nhánh.
Số người.
Nguyên phòng/ở ghép.
Loại phòng.
Khu vực mong muốn.
Ngân sách tối đa.
Ngày dự kiến vào.
Thời hạn thuê.
Giới tính yêu cầu.
Điều hòa.
Gửi xe.
Yên tĩnh.
Giờ sinh hoạt.
Chấp nhận ở ghép.
Ghi chú.

Nút:

Tìm phòng phù hợp.
Đóng yêu cầu.
Tab 3 — Phòng phù hợp

Mỗi kết quả có:

Phòng.
Giá.
Sức chứa.
Số giường trống.
Giới tính.
Điều hòa.
Gửi xe.
Dịch vụ.
Lý do phù hợp/chưa phù hợp.

Nút:

Xem chi tiết.
Chọn để hẹn xem.
API
PATCH  /rental-requests/:id
POST   /rental-requests/:id/members
PATCH  /rental-requests/:id/members/:memberId
DELETE /rental-requests/:id/members/:memberId
POST   /rental-requests/:id/search-rooms
POST   /rental-requests/:id/close

Request tìm phòng:

{
  "branchId": "CN01",
  "expectedResidents": 2,
  "rentalMode": "SHARED_BEDS",
  "preferredArea": "Khu A",
  "maximumBudget": "4000000.00",
  "genderRequirement": "MALE",
  "requiresAirConditioner": true,
  "requiresParking": true,
  "quietPreference": true
}
Bảng ERD

Ghi:

Bảng 10–12.

Đọc để tìm phòng:

Bảng 4 PHONG
Bảng 5 GIUONG
Bảng 6–7 DICH_VU, PHONG_DICH_VU
Bảng 17 PHAN_BO_GIUONG

Đề yêu cầu sale đối chiếu khu vực, giới tính, sức chứa, giá và các tiêu chí đi kèm trước khi sắp xếp lịch xem. Khi triển khai `search-rooms`, hệ thống có thể so sánh `preferredArea` của yêu cầu thuê với `Room.area`.

UI-07 — Lịch xem và kết quả xem phòng
Role

Sale.

Nội dung
Danh sách/lịch
Khách hàng.
Thời gian.
Chi nhánh.
Các phòng sẽ xem.
Trạng thái.
Sale phụ trách.
Form tạo lịch
Yêu cầu thuê.
Ngày giờ bắt đầu/kết thúc.
Danh sách phòng.
Ghi chú.
Đã thông báo khách chưa.
Kênh thông báo.
Form kết quả
Khách đã đến hay không.
Phòng nào đã xem.
Phòng/giường khách quan tâm.
Nguyên phòng hay ở ghép.
Kết quả:
Đồng ý đặt cọc.
Muốn xem thêm.
Điều chỉnh tiêu chí.
Chưa quyết định.
Không thuê.

Nút:

Tạo lịch xem.
Xác nhận lịch.
Đổi lịch.
Hủy lịch.
Khách không đến.
Xác nhận khách đã xem.
Lưu kết quả.
Tạo hồ sơ đặt cọc.
API
GET   /viewings
POST  /viewings
GET   /viewings/:id
PATCH /viewings/:id

POST /viewings/:id/confirm
POST /viewings/:id/reschedule
POST /viewings/:id/cancel
POST /viewings/:id/no-show
POST /viewings/:id/confirm-visited
POST /viewings/:id/result
POST /viewings/:id/create-deposit

Request lưu kết quả:

{
  "result": "CUSTOMER_WANTS_DEPOSIT",
  "selectedRoomId": "P01",
  "note": "Khách đồng ý thuê hai giường."
}

Request tạo hồ sơ đặt cọc:

{
  "selectedBedIds": ["B01", "B02"]
}
Bảng ERD
Bảng 13 LICH_XEM_PHONG
Bảng 14 CHI_TIET_LICH_XEM
Đọc bảng 11 YEU_CAU_THUE
Đọc bảng 4–5 PHONG, GIUONG
Khi tạo cọc nháp: ghi bảng 15–16

Một buổi xem có thể gồm nhiều phòng; sau khi xem, khách có thể cọc một hoặc nhiều giường/phòng hoặc tiếp tục xem thêm.

UI-08 — Hồ sơ đặt cọc dạng stepper
Role

Sale, Kế toán, Quản lý.

Các bước
Bước 1 — Sale rà soát khách

Hiển thị:

Khách/đại diện.
Thành viên.
Phòng/giường.
Giá.
Hình thức thuê.

Nút:

Chỉnh sửa thông tin.
Bước 2 — Sale xác nhận khách đồng ý nội quy

Checkbox:

Khách đã đồng ý điều kiện thuê.
Khách đã đồng ý nội quy bằng giấy bên ngoài.

Nút:

Xác nhận khách đã đồng ý.
Bước 3 — Quản lý xác nhận tình trạng phòng

Hiển thị:

Trạng thái từng giường.
Phân bổ đang hoạt động.
Khách và yêu cầu thuê.

Nút Quản lý:

Cho phép nhận cọc.
Không còn khả dụng.
Bước 4 — Kế toán phát hành yêu cầu thanh toán

Hiển thị:

Giá từng giường.
Số giường.
Công thức.
Tổng tiền.
Số tài khoản chi nhánh.
Hạn 24 giờ.

Nút:

Phát hành yêu cầu thanh toán.
Bước 5 — Kế toán ghi nhận thanh toán

Trường:

Số tiền.
Tiền mặt/chuyển khoản.
Thời điểm.
Mã giao dịch/số phiếu thu.
Đã kiểm tra chứng từ bên ngoài.
Ghi chú.

Nút:

Ghi nhận thanh toán và gửi Quản lý xác nhận.
Bước 6 — Quản lý xác nhận tiền cọc

Nút:

Xác nhận khoản tiền hợp lệ.
Yêu cầu kiểm tra lại.
Từ chối.
Bước 7 — Sale hẹn nhận phòng
Ngày giờ nhận phòng.
API
GET  /deposits
GET  /deposits/:id

POST /deposits/:id/confirm-customer-rules
POST /deposits/:id/submit-room-check
POST /deposits/:id/approve-room
POST /deposits/:id/reject-room

POST /deposits/:id/issue-payment-request
POST /deposits/:id/record-payment

POST /deposits/:id/approve-payment
POST /deposits/:id/request-payment-recheck
POST /deposits/:id/reject-payment

POST /deposits/:id/schedule-check-in
POST /deposits/:id/cancel

Request ghi nhận tiền:

{
  "amount": "6000000.00",
  "method": "BANK_TRANSFER",
  "paidAt": "2026-07-11T10:00:00+07:00",
  "transactionReference": "FT260711001",
  "externalEvidenceChecked": true,
  "note": ""
}
Bảng ERD
Bảng 15 DAT_COC

Ghi:

Đồng ý nội quy.
Quản lý xác nhận phòng.
Tổng tiền.
Trạng thái.
Ngày hẹn nhận phòng.
Bảng 16 CHI_TIET_DAT_COC
Danh sách giường.
Giá snapshot.
Số tháng cọc.
Thành tiền.
Bảng 17 PHAN_BO_GIUONG
HELD khi Kế toán phát hành yêu cầu.
DEPOSITED khi Quản lý xác nhận tiền.
Bảng 18 THANH_TOAN
Số tiền phải thu.
Số tiền thực tế.
Hạn thanh toán.
Phương thức.
Mã giao dịch.
Kế toán ghi nhận.
Quản lý xác nhận.

Hạn 24 giờ bắt đầu từ lúc phát hành yêu cầu thanh toán. `record-payment` vừa ghi
nhận tiền vừa chuyển sang `WAITING_MANAGER_CONFIRMATION`. Manager có thể xác nhận
sau hạn nếu payment đã được ghi nhận đúng hạn. Thuê nguyên phòng tính toàn bộ
giường và chỉ Manager xác nhận khoản tiền cọc hợp lệ.

UI-09 — Hồ sơ nhận phòng dạng stepper
Role

Sale, Quản lý, Kế toán.

Bước 1 — Sale xác nhận khách đến
Ngày hẹn.
Khách/nhóm.
Phòng/giường.

Nút:

Khách đã đến.
Bước 2 — Sale cập nhật thông tin cư trú

Mỗi người:

Họ tên.
Ngày sinh.
Giới tính.
Quốc tịch.
Giấy tờ.
Số điện thoại.
Địa chỉ.
Giường dự kiến.
Đã đối chiếu giấy tờ thật.

Nút:

Cập nhật.
Gửi Quản lý duyệt.
Bước 3 — Quản lý duyệt từng thành viên

Mỗi người:

Đủ điều kiện.
Không đủ điều kiện.
Lý do.

Đối với nhóm:

Tiếp tục với thành viên đủ điều kiện.
Dừng thủ tục thuê.
Bước 4 — Sale ghi nhận hợp đồng giấy
Số hợp đồng.
Ngày ký.
Ngày bắt đầu/kết thúc.
Giá thuê.
Kỳ thanh toán.
Dịch vụ.
Danh sách người và giường.
Đã ký hợp đồng giấy.
Bước 5 — Kế toán thanh toán ban đầu

Các khoản:

Tiền thuê kỳ đầu.
Wifi.
Gửi xe.
Điện/nước.
Phí khác.

Nút:

Tạo yêu cầu thanh toán.
Ghi nhận thanh toán.
Xác nhận đã thu đủ.
Bước 6

Nút:

Chuyển Quản lý bàn giao.
API
POST /contracts/from-deposit/:depositId
GET  /contracts
GET  /contracts/:id

POST /contracts/:id/confirm-arrival
PUT  /contracts/:id/residents
POST /contracts/:id/submit-eligibility-review

POST /contracts/:id/residents/:customerId/approve
POST /contracts/:id/residents/:customerId/reject
POST /contracts/:id/approve-eligibility
POST /contracts/:id/stop-check-in

POST /contracts/:id/record-paper-contract
POST /contracts/:id/confirm-paper-signing

POST /contracts/:id/create-initial-payment
POST /contracts/:id/record-initial-payment
POST /contracts/:id/confirm-initial-payment
POST /contracts/:id/submit-handover
Bảng ERD
Bảng 10 KHACH_HANG
Bảng 12 THANH_VIEN_YEU_CAU
Bảng 15–16 thông tin cọc
Bảng 18–19 thanh toán ban đầu
Bảng 20 HOP_DONG_THUE
Bảng 21 HOP_DONG_CHO_O
Bảng 22 HOP_DONG_DICH_VU
UI-10 — Bàn giao phòng và tài sản
Role

Quản lý.

Nội dung
Thông tin hợp đồng
Khách.
Thành viên.
Phòng/giường.
Ngày bắt đầu.
Hợp đồng đã ký.
Thanh toán ban đầu đã đủ.
Hiện trạng khu vực
Vệ sinh.
Tường/sàn.
Điện/nước.
Cửa/khóa.
Ghi chú.
Tài sản
Giường.
Nệm.
Tủ.
Chìa khóa.
Thẻ từ.
Số lượng.
Tình trạng.
Ghi chú.

Checkbox:

Đã hướng dẫn tiện ích.
Đã hướng dẫn an toàn.
Hai bên đã ký biên bản giấy.

Nút:

Lưu nháp.
Xác nhận bàn giao.
API
POST  /contracts/:contractId/handovers
GET   /handovers/:id
PATCH /handovers/:id
PUT   /handovers/:id/assets
POST  /handovers/:id/complete
Bảng ERD
Bảng 20 HOP_DONG_THUE
Bảng 21 HOP_DONG_CHO_O
Bảng 23 BAN_GIAO
Bảng 24 BAN_GIAO_TAI_SAN
Bảng 9 PHONG_TAI_SAN
Bảng 17 PHAN_BO_GIUONG

Khi hoàn tất:

Hợp đồng → ACTIVE
Phân bổ giường → OCCUPIED
UI-11 — Yêu cầu trả phòng
Role

Sale tạo và cập nhật yêu cầu; Kế toán và Quản lý được xem hồ sơ cùng chi nhánh.

Nội dung

Bộ lọc:

Mã yêu cầu.
Mã hợp đồng.
Khách.
Phòng.
Ngày trả.
Trạng thái.

Form tạo:

Hợp đồng/phiếu cọc.
Khách.
Phòng/giường.
Ngày trả dự kiến.
Lý do.
Người liên hệ.
Số điện thoại.
Ghi chú.

Thông tin liên hệ chỉ đọc từ khách hoặc người đại diện, không gửi trong request tạo.

Nút:

Tạo yêu cầu.
Lưu nháp.
Gửi Quản lý kiểm tra.
Hủy yêu cầu.
API
GET   /checkout-requests
POST  /checkout-requests
GET   /checkout-requests/:id
PATCH /checkout-requests/:id
POST  /checkout-requests/:id/submit
POST  /checkout-requests/:id/cancel
Bảng ERD
Bảng 25 YEU_CAU_TRA_PHONG
Đọc bảng 15 DAT_COC
Đọc bảng 20 HOP_DONG_THUE
Đọc bảng 21 HOP_DONG_CHO_O
Đọc bảng 10 KHACH_HANG
UI-12 — Quản lý kiểm tra trả phòng
Role

Quản lý.

Nội dung
Thông tin hợp đồng
Khách và thành viên.
Phòng/giường.
Ngày vào.
Ngày hết hạn.
Ngày trả thực tế.
Tiền cọc.
So sánh tài sản
Tài sản	Lúc giao	Lúc trả	Kết quả	Chi phí dự kiến

Kết quả enum: `NORMAL`, `DAMAGED`, `MISSING`, `CLEANING_REQUIRED`,
`OTHER_VIOLATION`; UI hiển thị nhãn tiếng Việt tương ứng.

Thông tin thêm:

Tình trạng vệ sinh.
Tường/sàn.
Điện/nước.
Khóa/thẻ.
Ghi chú.

Nút:

Lưu nháp.
Hoàn tất kiểm tra và chuyển Kế toán.
API
POST  /checkout-requests/:id/inspection
GET   /checkout-inspections/:id
PATCH /checkout-inspections/:id
PUT   /checkout-inspections/:id/items
POST  /checkout-inspections/:id/complete
Bảng ERD
Bảng 26 BIEN_BAN_KIEM_TRA_TRA
Bảng 27 CHI_TIET_KIEM_TRA_TRA
Đọc bảng 23–24 biên bản bàn giao cũ
Đọc bảng 9 tài sản phòng
Đọc bảng 20–21 hợp đồng và người ở
UI-13 — Đối soát, hoàn cọc và hoàn tất trả phòng
Role

Kế toán và Quản lý.

Bước 1 — Kế toán tính tỷ lệ hoàn

Quy tắc:

Đã cọc, chưa ký hợp đồng             → 80%
Trả trước hạn, ở ≤ 6 tháng           → 50%
Trả trước hạn, ở > 6 tháng           → 70%
Hết hạn hợp đồng                     → 100%

Đề quy định các mức 80%, 50%, 70% và 100%; nhóm đã chốt đúng sáu tháng dùng mức 50%.

Bước 2 — Kế toán nhập khấu trừ
Tiền thuê còn nợ.
Điện nước.
Dịch vụ.
Hư hỏng.
Mất mát.
Phạt vi phạm.
Bước 3 — Kết quả
Tiền hoàn cơ bản = Tiền cọc × Tỷ lệ hoàn
Số dư cuối = Tiền hoàn cơ bản - Tổng khấu trừ
Bước 4 — Quản lý xác nhận với khách
Khách đồng ý.
Khách chưa đồng ý.
Khiếu nại.
Bước 5 — Kế toán
Thu thêm nếu số dư âm.
Hoàn cọc nếu số dư dương.
Không chênh lệch nếu bằng 0.
Bước 6 — Quản lý

Checkbox:

Đã ký biên bản trả phòng.
Đã thanh lý hợp đồng.
Đã thu hồi khóa/thẻ.
Khách đã rời phòng.
Bước 7

Nút:

Hoàn tất trả phòng và giải phóng giường.
API
POST /checkout-requests/:id/settlement
GET  /settlements/:id

PUT  /settlements/:id/deductions
POST /settlements/:id/calculate
POST /settlements/:id/finalize

POST /settlements/:id/customer-agreed
POST /settlements/:id/disputed
POST /settlements/:id/return-to-accountant

POST /settlements/:id/record-additional-payment
POST /settlements/:id/confirm-no-balance
POST /settlements/:id/confirm-liquidation
POST /settlements/:id/record-refund
POST /settlements/:id/complete-checkout

Với hồ sơ đã cọc nhưng chưa ký hợp đồng, API tạo settlement được gọi trực tiếp từ
checkout `DRAFT`, không tạo inspection và áp dụng tỷ lệ hoàn 80%.
Bảng ERD
Bảng 28 DOI_SOAT_TRA_PHONG
Bảng 29 CHI_TIET_KHAU_TRU
Bảng 18 THANH_TOAN
Bảng 19 CHI_TIET_THANH_TOAN
Đọc bảng 25–27
Cập nhật bảng 20 HOP_DONG_THUE
Kết thúc bảng 17 PHAN_BO_GIUONG

complete-checkout chỉ được chạy khi tài chính, thanh lý, khóa/thẻ và hoàn tiền đều hoàn tất.

UI-14 — Báo cáo
Role
Quản lý: chi nhánh mình.
Admin: toàn hệ thống.
Báo cáo Quản lý
Tổng phòng/giường.
Trống.
Giữ chỗ.
Đã đặt cọc.
Đang có người ở.
Tỷ lệ lấp đầy.
Sắp nhận phòng.
Sắp trả phòng.
Tiền cọc.
Tiền hoàn.
Báo cáo Admin
So sánh chi nhánh.
Yêu cầu thuê.
Xem phòng.
Đặt cọc.
Nhận phòng.
Trả phòng.
Tổng tiền cọc.
Tổng hoàn cọc.
Tổng thu thêm.
API
GET /reports/branch-summary
GET /reports/system-summary
GET /reports/occupancy
GET /reports/rental-funnel
GET /reports/deposits
GET /reports/check-ins-checkouts
GET /reports/financial-summary
Bảng ERD

Đọc tổng hợp từ:

Bảng 1, 4, 5
Bảng 11, 13
Bảng 15, 17, 18
Bảng 20, 25, 28
