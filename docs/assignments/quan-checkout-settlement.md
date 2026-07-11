# Chia việc Quân

# Phân công Hoàng Hùng Quân — Trả phòng, đối soát và hoàn cọc

## 1. Phạm vi phụ trách

Quân làm trọn luồng:

```text
Sale tạo yêu cầu trả phòng
→ Manager kiểm tra phòng và tài sản
→ Accountant tính hoàn cọc và khấu trừ
→ Manager ghi nhận khách đồng ý hoặc khiếu nại
→ Accountant thu thêm hoặc hoàn tiền
→ Manager thanh lý và giải phóng giường
```

UI phụ trách:

- `UI-11`: Danh sách và tạo yêu cầu trả phòng.
- `UI-12`: Kiểm tra trả phòng.
- `UI-13`: Đối soát, hoàn cọc và hoàn tất trả phòng.

Không làm:

- yêu cầu thuê;
- lịch xem;
- đặt cọc;
- nhận phòng;
- bàn giao ban đầu;
- báo cáo;
- tự sửa ERD, Prisma schema hoặc API chung.

---

# 2. UI-11 — Yêu cầu trả phòng

## Role

`SALE` cùng chi nhánh.

## Nội dung

Danh sách hiển thị:

- mã yêu cầu trả;
- khách hàng;
- hợp đồng hoặc phiếu cọc;
- phòng và giường;
- ngày trả dự kiến;
- trạng thái.

Form tạo gồm:

- `contractId` hoặc `depositId`;
- ngày trả dự kiến;
- lý do trả;
- ghi chú.

Thông tin liên hệ đọc từ khách hoặc người đại diện.

## API

```
GET  /api/v1/checkout-requests
POST /api/v1/checkout-requests
GET  /api/v1/checkout-requests/:checkoutId
PATCH /api/v1/checkout-requests/:checkoutId
POST /api/v1/checkout-requests/:checkoutId/submit
POST /api/v1/checkout-requests/:checkoutId/cancel
```

Request tạo:

```
{
  "contractId":"HD001",
  "depositId":"DC001",
  "expectedCheckoutAt":"2026-12-20T08:00:00+07:00",
  "reason":"Khách chuyển nơi ở.",
  "note":""
}
```

Quy tắc:

- đã ký hợp đồng: dùng `contractId`;
- đã cọc nhưng chưa ký: có thể chỉ dùng `depositId`;
- một hợp đồng chỉ có một yêu cầu trả phòng đang hoạt động;
- chỉ yêu cầu `DRAFT` mới được sửa hoặc hủy.

## Bảng 25 — `YEU_CAU_TRA_PHONG`

Ghi:

```
MaYeuCauTra
MaPhieuCoc
MaHopDong
MaNhanVienSale
NgayYeuCau
NgayTraDuKien
NgayTraThucTe
LyDoTraPhong
TrangThai
GhiChu
```

Chuyển trạng thái:

```
DRAFT
→ WAITING_INSPECTION
```

---

# 3. UI-12 — Kiểm tra trả phòng

## Role

`MANAGER` cùng chi nhánh.

## Nội dung

Hiển thị:

- khách và người cư trú;
- phòng, giường;
- ngày nhận phòng;
- ngày hết hạn hợp đồng;
- ngày trả thực tế;
- tiền cọc;
- tài sản lúc bàn giao.

Manager nhập:

- tình trạng vệ sinh;
- tình trạng khu vực;
- tình trạng điện, nước, cửa, khóa;
- tài sản hư hỏng hoặc mất;
- số lượng;
- chi phí dự kiến;
- ghi chú.

Kết quả tài sản:

```
NORMAL
DAMAGED
MISSING
CLEANING_REQUIRED
OTHER_VIOLATION
```

## API

```
POST  /api/v1/checkout-requests/:checkoutId/inspection
GET   /api/v1/checkout-inspections/:inspectionId
PATCH /api/v1/checkout-inspections/:inspectionId
PUT   /api/v1/checkout-inspections/:inspectionId/items
POST  /api/v1/checkout-inspections/:inspectionId/complete
```

Request cập nhật tài sản:

```
{
  "items": [
    {
      "roomAssetId":"PTS001",
      "result":"DAMAGED",
      "quantity":1,
      "description":"Nệm bị rách.",
      "estimatedCost":"300000.00"
    }
  ]
}
```

## Bảng sử dụng

### Bảng 26 — `BIEN_BAN_KIEM_TRA_TRA`

```
MaBienBanTra
MaYeuCauTra
MaQuanLy
NgayKiemTra
TinhTrangVeSinh
TinhTrangKhuVuc
TrangThai
GhiChu
```

### Bảng 27 — `CHI_TIET_KIEM_TRA_TRA`

```
MaChiTietKiemTra
MaBienBanTra
MaPhongTaiSan
LoaiKetQua
SoLuong
MoTa
ChiPhiDuKien
GhiChu
```

Chỉ đọc:

- bảng 9 `PHONG_TAI_SAN`;
- bảng 20 `HOP_DONG_THUE`;
- bảng 21 `HOP_DONG_CHO_O`;
- bảng 23–24 `BAN_GIAO`, `BAN_GIAO_TAI_SAN`.

Chuyển trạng thái:

```
WAITING_INSPECTION
→ INSPECTED
```

---

# 4. UI-13 — Đối soát và hoàn cọc

## Role

- `ACCOUNTANT`: tính toán, khấu trừ, thu thêm, hoàn tiền.
- `MANAGER`: xác nhận với khách, thanh lý và hoàn tất.
- Chỉ xử lý hồ sơ cùng chi nhánh.

---

## Bước 1 — Accountant tính tỷ lệ hoàn

Quy tắc:

```
Đã cọc nhưng chưa ký hợp đồng → 80%

Đã ký, trả trước hạn,
thời gian ở ≤ 6 tháng          → 50%

Đã ký, trả trước hạn,
thời gian ở > 6 tháng          → 70%

Trả khi hết hạn hợp đồng       → 100%
```

Đúng 6 tháng áp dụng `50%`.

Công thức:

```
Tiền hoàn cơ bản = Tiền cọc gốc × Tỷ lệ hoàn
```

API:

```
POST /api/v1/checkout-requests/:checkoutId/settlement
POST /api/v1/settlements/:settlementId/calculate
```

Nếu khách đã cọc nhưng chưa ký hợp đồng, Accountant được tạo settlement trực tiếp
từ checkout `DRAFT`, không cần inspection và áp dụng tỷ lệ 80%.

---

## Bước 2 — Accountant nhập khấu trừ

Các loại khấu trừ:

- tiền thuê còn nợ;
- điện nước;
- dịch vụ;
- hư hỏng;
- mất tài sản;
- vệ sinh;
- tiền phạt khác.

API:

```
PUT /api/v1/settlements/:settlementId/deductions
```

Request:

```
{
  "deductions": [
    {
      "type":"DAMAGE",
      "description":"Nệm bị rách.",
      "amount":"300000.00",
      "source":"INSPECTION"
    }
  ]
}
```

Công thức:

```
Số dư cuối = Tiền hoàn cơ bản - Tổng khấu trừ
```

Kết quả:

```
Số dư > 0 → hoàn cho khách
Số dư = 0 → không thu, không hoàn
Số dư < 0 → khách phải trả thêm
```

---

## Bước 3 — Accountant chốt đối soát

```
POST /api/v1/settlements/:settlementId/finalize
```

Chuyển trạng thái:

```
WAITING_SETTLEMENT
→ WAITING_CUSTOMER_CONFIRMATION
```

---

## Bước 4 — Manager ghi nhận phản hồi khách

API khách đồng ý:

```
POST /api/v1/settlements/:settlementId/customer-agreed
```

API khiếu nại:

```
POST /api/v1/settlements/:settlementId/disputed
```

Request khiếu nại:

```
{
  "content":"Khách không đồng ý khoản khấu trừ tài sản."
}
```

Khi khiếu nại:

```
Quy trình tạm dừng
→ trả lại Accountant điều chỉnh
```

API trả lại:

```
POST /api/v1/settlements/:settlementId/return-to-accountant
```

---

## Bước 5 — Accountant xử lý tiền

### Khách phải trả thêm

```
POST /api/v1/settlements/:settlementId/record-additional-payment
```

Request:

```
{
  "amount":"200000.00",
  "method":"CASH",
  "paidAt":"2026-12-20T10:00:00+07:00",
  "receiptNumber":"PT001",
  "externalEvidenceChecked":true
}
```

### Khách được hoàn tiền

Chỉ ghi nhận hoàn tiền sau khi Manager xác nhận thanh lý:

```
POST /api/v1/settlements/:settlementId/record-refund
```

Request:

```
{
  "amount":"2700000.00",
  "method":"BANK_TRANSFER",
  "paidAt":"2026-12-20T11:00:00+07:00",
  "transactionReference":"RF001"
}
```

Dữ liệu tài chính ghi vào bảng 18 `THANH_TOAN`.

### Không chênh lệch

```
POST /api/v1/settlements/:settlementId/confirm-no-balance
```

Role `ACCOUNTANT`. Chỉ dùng khi số dư bằng 0 để chuyển hồ sơ sang
`READY_TO_COMPLETE`.

---

## Bước 6 — Manager xác nhận thanh lý

Manager xác nhận:

- biên bản trả phòng giấy đã ký;
- hợp đồng đã thanh lý;
- đã thu hồi khóa hoặc thẻ;
- tài sản đã cập nhật;
- khách đã rời phòng.

API:

```
POST /api/v1/settlements/:settlementId/confirm-liquidation
```

Request:

```
{
  "paperCheckoutSigned":true,
  "contractLiquidated":true,
  "keysRecovered":true,
  "customerLeft":true
}
```

---

## Bước 7 — Manager hoàn tất trả phòng

```
POST /api/v1/settlements/:settlementId/complete-checkout
```

Chỉ được hoàn tất khi:

```
Khách đã đồng ý đối soát
AND đã thu thêm nếu số dư âm
AND đã hoàn tiền nếu số dư dương
AND đã thanh lý hợp đồng
AND đã thu hồi khóa/thẻ
AND khách đã rời phòng
```

Trong một transaction:

```
Yêu cầu trả phòng → COMPLETED
Hợp đồng → LIQUIDATED
Allocation OCCUPIED hoặc DEPOSITED → ENDED
```

Sau đó giường mới trở lại `AVAILABLE`.

---

# 5. Các bảng Quân phụ trách

## Ghi trực tiếp

### Bảng 25 — `YEU_CAU_TRA_PHONG`

### Bảng 26 — `BIEN_BAN_KIEM_TRA_TRA`

### Bảng 27 — `CHI_TIET_KIEM_TRA_TRA`

### Bảng 28 — `DOI_SOAT_TRA_PHONG`

Các cột chính:

```
MaDoiSoat
MaYeuCauTra
MaKeToan
TienCocGoc
TyLeHoan
TienHoanCoBan
TongKhauTru
SoDuCuoi
KetQua
MaQuanLyXacNhanKhach
ThoiDiemKhachDongY
NoiDungKhieuNai
DaKyBienBanTraPhong
DaThanhLyHopDong
DaThuHoiKhoaThe
DaKhachRoiPhong
TrangThai
GhiChu
```

### Bảng 29 — `CHI_TIET_KHAU_TRU`

```
MaChiTietKhauTru
MaDoiSoat
LoaiPhi
MoTa
SoTien
NguonDuLieu
```

## Cập nhật theo nghiệp vụ

- bảng 17 `PHAN_BO_GIUONG`;
- bảng 18 `THANH_TOAN`;
- bảng 20 `HOP_DONG_THUE`.

## Chỉ đọc

- bảng 9 `PHONG_TAI_SAN`;
- bảng 10 `KHACH_HANG`;
- bảng 15–16 thông tin cọc;
- bảng 21 `HOP_DONG_CHO_O`;
- bảng 23–24 thông tin bàn giao.

Quân không tự sửa `schema.prisma`. Thiếu field phải báo Linh.

---

# 6. State transition

```
DRAFT
→ WAITING_INSPECTION
→ INSPECTED
→ WAITING_SETTLEMENT
→ WAITING_CUSTOMER_CONFIRMATION
```

Nhánh đồng ý:

```
WAITING_CUSTOMER_CONFIRMATION
→ WAITING_FINANCIAL_COMPLETION
→ READY_TO_COMPLETE
→ COMPLETED
```

Nhánh khiếu nại:

```
WAITING_CUSTOMER_CONFIRMATION
→ DISPUTED
→ WAITING_SETTLEMENT
```

Không được:

- tính đối soát trước khi kiểm tra hoàn tất;
- hoàn tiền trước khi khách đồng ý;
- giải phóng giường trước khi `COMPLETED`.

---

# 7. Cấu trúc code

## Frontend

```
apps/web/src/features/checkout/
├── api/checkout-api.ts
├── pages/CheckoutRequestListPage.tsx
├── pages/CheckoutInspectionPage.tsx
├── components/CheckoutRequestForm.tsx
└── components/InspectionAssetTable.tsx

apps/web/src/features/settlements/
├── api/settlement-api.ts
├── pages/SettlementDetailPage.tsx
├── components/RefundCalculation.tsx
├── components/DeductionTable.tsx
├── components/CustomerConfirmation.tsx
└── components/LiquidationChecklist.tsx
```

## Backend

```
presentation/routes/
├── checkout.routes.ts
└── settlement.routes.ts

presentation/controllers/
├── checkout.controller.ts
└── settlement.controller.ts

presentation/validators/
├── checkout.validator.ts
└── settlement.validator.ts

services/checkout/
├── checkout.service.ts
└── inspection.service.ts

services/settlement/
├── settlement.service.ts
├── refund-calculator.ts
└── settlement-state-machine.ts

data/repositories/
├── checkout.repository.ts
├── inspection.repository.ts
├── settlement.repository.ts
├── payment.repository.ts
├── contract.repository.ts
└── bed-allocation.repository.ts
```

---

# 8. Test bắt buộc

1. Sale khác chi nhánh không được tạo yêu cầu trả phòng.
2. Một hợp đồng không có hai yêu cầu trả phòng đang hoạt động.
3. Chỉ Manager được hoàn tất kiểm tra.
4. Chưa kiểm tra xong không được tạo đối soát.
5. Đúng 6 tháng áp dụng tỷ lệ `50%`.
6. Đã cọc nhưng chưa ký hợp đồng áp dụng `80%`.
7. Khấu trừ lớn hơn tiền hoàn tạo khoản khách phải trả thêm.
8. Khách khiếu nại thì không được hoàn tất.
9. Chưa thu hồi khóa thì không được hoàn tất trả phòng.
10. Chưa hoàn tiền hoặc thu thêm thì không được hoàn tất.
11. Hoàn tất phải chuyển hợp đồng sang `LIQUIDATED`.
12. Hoàn tất phải chuyển allocation `OCCUPIED → ENDED`.
13. Hồ sơ chưa ký hợp đồng không tạo inspection và kết thúc allocation
    `DEPOSITED → ENDED`.
14. Số dư bằng 0 chỉ sẵn sàng hoàn tất sau `confirm-no-balance`.

---

# 9. Điều kiện hoàn thành

Phần của Quân hoàn thành khi:

- UI-11, UI-12 và UI-13 chạy được;
- mỗi role chỉ thấy đúng hành động;
- tính đúng tỷ lệ và số dư;
- xử lý được hoàn tiền, thu thêm và khiếu nại;
- chưa hoàn tất đủ điều kiện thì không giải phóng giường;
- hoàn tất cập nhật hợp đồng và allocation trong một transaction;
- các test bắt buộc chạy thành công.
