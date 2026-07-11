# Chia việc Như

# Phân công Nguyễn Khả Như — Nhận phòng, hợp đồng và bàn giao

## 1. Phạm vi phụ trách

Như làm trọn luồng:

```text
Sale xác nhận khách đến
→ Sale cập nhật người cư trú
→ Manager duyệt từng thành viên
→ Sale ghi nhận hợp đồng giấy
→ Accountant ghi nhận thanh toán ban đầu
→ Manager bàn giao phòng và tài sản
→ Hợp đồng có hiệu lực, giường chuyển sang đang sử dụng
```

Như phụ trách:

- `UI-09`: Hồ sơ nhận phòng dạng stepper.
- `UI-10`: Bàn giao phòng và tài sản.

Như không làm:

- đăng ký thuê;
- tìm và xem phòng;
- đặt cọc;
- trả phòng;
- báo cáo;
- thay đổi ERD, enum hoặc API chung.

---

# 2. UI-09 — Hồ sơ nhận phòng

## Role sử dụng

- `SALE`: bước 1, 2 và 4.
- `MANAGER`: bước 3.
- `ACCOUNTANT`: bước 5.
- Tất cả chỉ xử lý hồ sơ cùng chi nhánh.

## Header chung

Hiển thị:

- mã hợp đồng;
- mã phiếu cọc;
- khách hoặc người đại diện;
- chi nhánh;
- phòng và giường đã cọc;
- ngày hẹn nhận phòng;
- trạng thái hồ sơ.

---

## Bước 1 — Sale xác nhận khách đến

Hiển thị:

- thông tin khách;
- ngày hẹn nhận phòng;
- phòng và giường đã cọc;
- danh sách thành viên dự kiến.

Nút:

```
Xác nhận khách đã đến
```

API:

```
POST /api/v1/contracts/:contractId/confirm-arrival
```

Request:

```
{
  "arrivedAt":"2026-07-16T08:30:00+07:00"
}
```

API cập nhật bảng 20 `HOP_DONG_THUE`:

```
KhachDaDen = true
ThoiDiemKhachDen = arrivedAt
TrangThai = ARRIVED
```

Điều kiện:

- phiếu cọc phải ở trạng thái `DEPOSITED`;
- hợp đồng phải thuộc cùng chi nhánh;
- chưa được xác nhận khách đến trước đó.

---

## Bước 2 — Sale cập nhật người cư trú

Mỗi thành viên hiển thị:

- họ tên;
- ngày sinh;
- giới tính;
- quốc tịch;
- loại giấy tờ;
- số giấy tờ;
- số điện thoại;
- địa chỉ;
- giường dự kiến;
- checkbox đã đối chiếu giấy tờ thật.

Nút:

```
Lưu danh sách
Gửi Manager duyệt
```

API lưu danh sách:

```
PUT /api/v1/contracts/:contractId/residents
```

Request:

```
{
  "residents": [
    {
      "customerId":"KH001",
      "bedId":"A101-B01",
      "identityChecked":true
    },
    {
      "customerId":"KH002",
      "bedId":"A101-B02",
      "identityChecked":true
    }
  ]
}
```

API gửi duyệt:

```
POST /api/v1/contracts/:contractId/submit-eligibility-review
```

API này mới chuyển hợp đồng `ARRIVED → WAITING_ELIGIBILITY`.

Bảng sử dụng:

### Bảng 10 — `KHACH_HANG`

Đọc và cập nhật:

```
HoTen
NgaySinh
GioiTinh
QuocTich
LoaiGiayTo
SoGiayTo
SoDienThoai
DiaChi
```

### Bảng 12 — `THANH_VIEN_YEU_CAU`

Cập nhật:

```
MaGiuongDuKien
DaDoiChieuGiayTo
KetQuaDieuKien
LyDoTuChoi
MaQuanLyDuyet
ThoiDiemDuyet
TrangThaiThamGia
```

Quy tắc:

- số thành viên không vượt số giường đã cọc;
- giường phải nằm trong bảng 16 `CHI_TIET_DAT_COC`;
- một giường không được gán cho hai người;
- người cư trú phải là khách cá nhân;
- chỉ gửi duyệt khi mọi thành viên đã được đối chiếu giấy tờ.

---

## Bước 3 — Manager duyệt thành viên

Mỗi thành viên hiển thị:

- thông tin cá nhân;
- giấy tờ;
- giường dự kiến;
- đã đối chiếu giấy tờ hay chưa;
- kết quả duyệt;
- lý do từ chối.

Nút trên từng thành viên:

```
Đủ điều kiện
Không đủ điều kiện
```

API duyệt:

```
POST /api/v1/contracts/:contractId/residents/:customerId/approve
```

Request:

```
{
  "note":""
}
```

API từ chối:

```
POST /api/v1/contracts/:contractId/residents/:customerId/reject
```

Request:

```
{
  "reason":"Không đáp ứng điều kiện lưu trú."
}
```

Sau khi duyệt từng người, Manager chọn:

```
Tiếp tục với thành viên hợp lệ
Dừng thủ tục nhận phòng
```

API tiếp tục:

```
POST /api/v1/contracts/:contractId/approve-eligibility
```

API dừng:

```
POST /api/v1/contracts/:contractId/stop-check-in
```

Cập nhật bảng 12:

```
KetQuaDieuKien = ELIGIBLE / INELIGIBLE
LyDoTuChoi
MaQuanLyDuyet
ThoiDiemDuyet
TrangThaiThamGia
```

Cập nhật bảng 20:

```
WAITING_ELIGIBILITY
→ ELIGIBILITY_APPROVED

hoặc

WAITING_ELIGIBILITY
→ CHECKIN_STOPPED
```

Quy tắc:

- chỉ `MANAGER` cùng chi nhánh được duyệt;
- thành viên bị từ chối không được đưa vào hợp đồng;
- phải còn ít nhất một thành viên hợp lệ;
- số thành viên hợp lệ không vượt số giường đã cọc.

---

## Bước 4 — Sale ghi nhận hợp đồng giấy

Hiển thị và nhập:

- số hợp đồng giấy;
- ngày ký;
- ngày bắt đầu;
- ngày kết thúc;
- kỳ thanh toán;
- tổng giá thuê tháng;
- danh sách thành viên hợp lệ;
- giường của từng thành viên;
- dịch vụ áp dụng;
- điều khoản đặc biệt;
- checkbox hợp đồng giấy đã ký.

API lưu hợp đồng:

```
POST /api/v1/contracts/:contractId/record-paper-contract
```

Request:

```
{
  "paperContractNumber":"HD-2026-001",
  "signedDate":"2026-07-16",
  "startDate":"2026-07-16",
  "endDate":"2027-07-15",
  "paymentCycle":"MONTHLY",
  "specialTerms":"",
  "services": [
    {
      "serviceId":"DV01",
      "price":"100000.00",
      "calculationMethod":"MONTHLY"
    }
  ]
}
```

API xác nhận đã ký:

```
POST /api/v1/contracts/:contractId/confirm-paper-signing
```

Request:

```
{
  "paperContractSigned":true
}
```

### Bảng 20 — `HOP_DONG_THUE`

Ghi:

```
SoHopDongGiay
NgayKy
NgayBatDau
NgayKetThuc
KyThanhToan
TongGiaThueThang
DaKyHopDongGiay
ThoiDiemXacNhanKy
DieuKhoanDacBiet
TrangThai
```

### Bảng 21 — `HOP_DONG_CHO_O`

Mỗi dòng là một giường thuộc hợp đồng:

```
MaHopDong
MaGiuong
MaKhachHangO
GiaThueSnapshot
TrangThai
```

Ví dụ thuê nguyên phòng bốn giường nhưng chỉ ba người:

```
B01 → KH001
B02 → KH002
B03 → KH003
B04 → NULL
```

B04 vẫn thuộc hợp đồng và không được cho người khác thuê.

### Bảng 22 — `HOP_DONG_DICH_VU`

```
MaHopDong
MaDichVu
DonGiaSnapshot
CachTinh
GhiChu
```

Quy tắc:

- chỉ thành viên đã được Manager duyệt mới được ghi vào hợp đồng;
- chỉ dùng các giường đã đặt cọc;
- giá thuê phải lấy snapshot từ chi tiết đặt cọc;
- không cho xác nhận ký khi chưa duyệt điều kiện cư trú.

Chuyển trạng thái:

```
ELIGIBILITY_APPROVED
→ PAPER_SIGNED
```

---

## Bước 5 — Accountant ghi nhận thanh toán ban đầu

Các khoản thanh toán:

- tiền thuê kỳ đầu;
- wifi;
- gửi xe;
- điện hoặc nước tạm tính;
- phí dịch vụ;
- khoản khác.

Nút:

```
Tạo yêu cầu thanh toán
Ghi nhận thanh toán
Xác nhận đã thu đủ
Chuyển Manager bàn giao
```

API tạo yêu cầu:

```
POST /api/v1/contracts/:contractId/create-initial-payment
```

Request:

```
{
  "items": [
    {
      "type":"FIRST_RENT",
      "description":"Tiền thuê kỳ đầu",
      "quantity":1,
      "unitPrice":"3000000.00"
    },
    {
      "type":"SERVICE_FEE",
      "description":"Wifi tháng đầu",
      "quantity":1,
      "unitPrice":"100000.00"
    }
  ]
}
```

API ghi nhận thanh toán:

```
POST /api/v1/contracts/:contractId/record-initial-payment
```

Request:

```
{
  "amount":"3100000.00",
  "method":"BANK_TRANSFER",
  "paidAt":"2026-07-16T10:00:00+07:00",
  "transactionReference":"FT260716001",
  "externalEvidenceChecked":true,
  "note":""
}
```

API xác nhận đã thu đủ:

```
POST /api/v1/contracts/:contractId/confirm-initial-payment
```

API chuyển bàn giao:

```
POST /api/v1/contracts/:contractId/submit-handover
```

### Bảng 18 — `THANH_TOAN`

Ghi:

```
LoaiThanhToan = INITIAL_PAYMENT
HuongGiaoDich = INBOUND
SoTienPhaiThanhToan
SoTienThucTe
ThoiDiemPhatHanh
ThoiDiemThanhToan
PhuongThuc
MaGiaoDich
SoPhieuThuChi
DaKiemTraChungTu
MaKeToanGhiNhan
TrangThai
MaHopDong
GhiChu
```

### Bảng 19 — `CHI_TIET_THANH_TOAN`

Ghi từng khoản:

```
MaChiTiet
MaThanhToan
LoaiKhoan
MoTa
SoLuong
DonGia
ThanhTien
```

Quy tắc:

- chỉ tạo thanh toán khi hợp đồng giấy đã ký;
- `SoTienPhaiThanhToan` bằng tổng chi tiết;
- chỉ xác nhận thu đủ khi tổng tiền thực tế bằng hoặc lớn hơn số phải thu;
- `confirm-initial-payment` xác nhận đã thu đủ nhưng hợp đồng vẫn ở
  `WAITING_INITIAL_PAYMENT`;
- chỉ `submit-handover` sau khi kiểm tra đủ ba điều kiện mới chuyển sang
  `READY_FOR_HANDOVER`.

Chuyển trạng thái:

```
PAPER_SIGNED
→ WAITING_INITIAL_PAYMENT
→ READY_FOR_HANDOVER qua submit-handover
```

---

# 3. UI-10 — Bàn giao phòng và tài sản

## Role

Chỉ `MANAGER` cùng chi nhánh được tạo và hoàn tất bàn giao.

## Nội dung màn hình

### Thông tin hồ sơ

Hiển thị:

- khách hàng;
- thành viên cư trú;
- phòng và giường;
- ngày bắt đầu;
- hợp đồng giấy đã ký;
- thanh toán ban đầu đã đủ;
- trạng thái hợp đồng.

### Hiện trạng khu vực

Nhập:

- tình trạng vệ sinh;
- tường và sàn;
- điện và nước;
- cửa và khóa;
- ghi chú chung.

### Danh sách tài sản

Mỗi dòng:

- loại tài sản;
- số lượng tiêu chuẩn;
- số lượng bàn giao;
- tình trạng khi giao;
- ghi chú.

Ví dụ:

```
Giường
Nệm
Tủ
Chìa khóa
Thẻ từ
Điều hòa
```

Checkbox:

```
Đã hướng dẫn sử dụng tiện ích
Đã hướng dẫn an toàn
Biên bản bàn giao giấy đã được ký
```

Nút:

```
Lưu nháp
Xác nhận bàn giao
```

---

## API bàn giao

### Tạo biên bản

```
POST /api/v1/contracts/:contractId/handovers
```

Request:

```
{
  "areaCondition":"Phòng sạch, điện nước hoạt động bình thường.",
  "note":""
}
```

### Xem biên bản

```
GET /api/v1/handovers/:handoverId
```

### Cập nhật biên bản

```
PATCH /api/v1/handovers/:handoverId
```

Request:

```
{
  "areaCondition":"Phòng sạch, khóa hoạt động tốt.",
  "utilitiesGuided":true,
  "safetyGuided":true,
  "paperHandoverSigned":true,
  "note":""
}
```

### Cập nhật tài sản

```
PUT /api/v1/handovers/:handoverId/assets
```

Request:

```
{
  "assets": [
    {
      "roomAssetId":"PTS001",
      "deliveredQuantity":4,
      "conditionAtHandover":"Tốt",
      "note":""
    },
    {
      "roomAssetId":"PTS002",
      "deliveredQuantity":2,
      "conditionAtHandover":"Tốt",
      "note":""
    }
  ]
}
```

### Hoàn tất bàn giao

```
POST /api/v1/handovers/:handoverId/complete
```

---

## Bảng bàn giao

### Bảng 23 — `BAN_GIAO`

Ghi:

```
MaBanGiao
MaHopDong
MaQuanLy
ThoiDiemBanGiao
TinhTrangKhuVuc
DaHuongDanTienIch
DaHuongDanAnToan
DaXacNhanBienBanGiay
TrangThai
GhiChu
```

### Bảng 24 — `BAN_GIAO_TAI_SAN`

Ghi:

```
MaBanGiao
MaPhongTaiSan
SoLuongBanGiao
TinhTrangLucGiao
GhiChu
```

### Bảng 9 — `PHONG_TAI_SAN`

Chỉ đọc:

```
MaPhongTaiSan
MaPhong
MaLoaiTaiSan
SoLuong
TinhTrangHienTai
```

### Bảng 17 — `PHAN_BO_GIUONG`

Khi hoàn tất bàn giao:

```
DEPOSITED
→ OCCUPIED
```

### Bảng 20 — `HOP_DONG_THUE`

Khi hoàn tất bàn giao:

```
READY_FOR_HANDOVER
→ ACTIVE
```

Hai cập nhật trên phải nằm trong cùng một transaction.

---

# 4. Các bảng Như phụ trách

## Như được ghi trực tiếp qua Service

```
Bảng 20 — HOP_DONG_THUE
Bảng 21 — HOP_DONG_CHO_O
Bảng 22 — HOP_DONG_DICH_VU
Bảng 23 — BAN_GIAO
Bảng 24 — BAN_GIAO_TAI_SAN
```

## Như được cập nhật theo nghiệp vụ

```
Bảng 10 — KHACH_HANG
Bảng 12 — THANH_VIEN_YEU_CAU
Bảng 17 — PHAN_BO_GIUONG
Bảng 18 — THANH_TOAN
Bảng 19 — CHI_TIET_THANH_TOAN
```

## Như chỉ đọc

```
Bảng 1  — CHI_NHANH
Bảng 2  — NHAN_VIEN
Bảng 9  — PHONG_TAI_SAN
Bảng 15 — DAT_COC
Bảng 16 — CHI_TIET_DAT_COC
```

Như không sửa schema Prisma. Khi thiếu field hoặc quan hệ phải báo Linh.

---

# 5. State transition

## Hợp đồng

```
CHECKIN_DRAFT
→ ARRIVED
→ WAITING_ELIGIBILITY
→ ELIGIBILITY_APPROVED
→ PAPER_SIGNED
→ WAITING_INITIAL_PAYMENT
→ READY_FOR_HANDOVER
→ ACTIVE
```

Nhánh dừng:

```
WAITING_ELIGIBILITY
→ CHECKIN_STOPPED
```

## Bàn giao

```
DRAFT
→ COMPLETED
```

## Phân bổ giường

```
DEPOSITED
→ OCCUPIED
```

Không được:

- bỏ qua bước duyệt thành viên;
- ký hợp đồng trước khi duyệt;
- tạo thanh toán ban đầu trước khi ký;
- bàn giao trước khi thu đủ tiền;
- chuyển hợp đồng sang `ACTIVE` bằng API cập nhật trạng thái chung.

---

# 6. Cấu trúc code

## Frontend

```
apps/web/src/features/checkin/
├── api/checkin-api.ts
├── pages/CheckinListPage.tsx
├── pages/CheckinDetailPage.tsx
├── components/CheckinStepper.tsx
├── components/ResidentForm.tsx
├── components/EligibilityReview.tsx
├── components/PaperContractForm.tsx
├── components/InitialPaymentForm.tsx
└── schemas/checkin.schema.ts

apps/web/src/features/handover/
├── api/handover-api.ts
├── pages/HandoverDetailPage.tsx
├── components/HandoverForm.tsx
├── components/HandoverAssetTable.tsx
└── schemas/handover.schema.ts
```

## Backend

```
apps/api/src/presentation/routes/
├── contract.routes.ts
└── handover.routes.ts

apps/api/src/presentation/controllers/
├── contract.controller.ts
└── handover.controller.ts

apps/api/src/presentation/validators/
├── contract.validator.ts
└── handover.validator.ts

apps/api/src/services/contract/
├── contract.service.ts
├── eligibility.service.ts
└── contract-state-machine.ts

apps/api/src/services/payment/
└── initial-payment.service.ts

apps/api/src/services/handover/
└── handover.service.ts

apps/api/src/data/repositories/
├── contract.repository.ts
├── contract-resident.repository.ts
├── contract-service.repository.ts
├── payment.repository.ts
├── handover.repository.ts
├── room-asset.repository.ts
└── bed-allocation.repository.ts
```

Controller không được gọi Prisma trực tiếp.

---

# 7. Test bắt buộc

Như phải kiểm tra tối thiểu:

1. Sale không được duyệt thành viên.
2. Manager khác chi nhánh không được duyệt hồ sơ.
3. Số thành viên không được vượt số giường đã cọc.
4. Hai thành viên không được dùng cùng một giường.
5. Thành viên bị từ chối không được thêm vào hợp đồng.
6. Chưa duyệt điều kiện thì không được ghi nhận ký hợp đồng.
7. Chưa ký hợp đồng thì không được tạo thanh toán ban đầu.
8. Chưa thu đủ tiền thì không được chuyển bàn giao.
9. Sale và Accountant không được hoàn tất bàn giao.
10. Hoàn tất bàn giao phải đồng thời:
    - chuyển hợp đồng sang `ACTIVE`;
    - chuyển tất cả allocation sang `OCCUPIED`.

---

# 8. Điều kiện hoàn thành

Phần của Như hoàn thành khi:

- UI-09 chạy đủ các bước;
- UI-10 chạy được;
- mỗi nút gọi đúng API;
- dữ liệu lưu đúng PostgreSQL;
- kiểm tra đúng role và chi nhánh;
- thành viên bị từ chối không vào hợp đồng;
- thanh toán ban đầu tính đúng;
- không bàn giao khi thiếu điều kiện;
- hoàn tất bàn giao cập nhật hợp đồng và allocation trong một transaction;
- các test bắt buộc chạy thành công.
