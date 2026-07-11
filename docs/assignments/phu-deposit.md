# Chia việc Phú

# Phân công Lê Mạnh Phú — Đặt cọc và xác nhận thanh toán

## 1. Phạm vi phụ trách

Phú làm trọn luồng:

```text
Tạo hồ sơ cọc từ kết quả xem phòng
→ Sale xác nhận khách đồng ý nội quy
→ Manager kiểm tra phòng/giường
→ Accountant phát hành yêu cầu thanh toán
→ Hệ thống giữ giường 24 giờ
→ Accountant ghi nhận thanh toán
→ Manager xác nhận tiền cọc
→ Giường chuyển sang đã đặt cọc
→ Sale hẹn ngày nhận phòng
```

Phú phụ trách:

- `UI-08`: Hồ sơ đặt cọc dạng stepper.
- Job tự động hết hạn yêu cầu thanh toán sau 24 giờ.
- Logic chống hai hồ sơ giữ cùng một giường.

Phú không làm:

- yêu cầu thuê;
- lịch xem;
- nhận phòng;
- hợp đồng;
- trả phòng;
- báo cáo;
- tự sửa ERD, enum hoặc API chung.

---

# 2. UI-08 — Hồ sơ đặt cọc

## Role sử dụng

- `SALE`: bước 1, 2 và 7.
- `MANAGER`: bước 3 và 6.
- `ACCOUNTANT`: bước 4 và 5.
- Mỗi nhân viên chỉ xử lý hồ sơ thuộc chi nhánh mình.

## Header chung

Luôn hiển thị:

- mã phiếu cọc;
- khách hàng;
- yêu cầu thuê;
- chi nhánh;
- phòng và các giường;
- hình thức thuê;
- tổng tiền cọc;
- trạng thái;
- hạn thanh toán;
- thời gian còn lại.

---

## Bước 1 — Tạo hồ sơ cọc

Hồ sơ được tạo từ lịch xem đã có kết quả:

```
CUSTOMER_WANTS_DEPOSIT
```

API:

```
POST /api/v1/viewings/:viewingId/create-deposit
```

Request:

```
{
  "selectedBedIds": ["A101-B01", "A101-B02"]
}
```

API đọc:

- bảng 13 `LICH_XEM_PHONG`;
- bảng 14 `CHI_TIET_LICH_XEM`;
- bảng 11 `YEU_CAU_THUE`;
- bảng 4 `PHONG`;
- bảng 5 `GIUONG`.

API ghi:

- bảng 15 `DAT_COC`;
- bảng 16 `CHI_TIET_DAT_COC`.

Điều kiện:

- lịch xem đã ở trạng thái `RESULT_RECORDED`;
- kết quả là `CUSTOMER_WANTS_DEPOSIT`;
- đã chọn phòng;
- đã chọn ít nhất một giường;
- chưa có phiếu cọc đang hoạt động từ lịch xem này.

Kết quả:

```
DAT_COC.TrangThai = DRAFT
```

---

## Bước 2 — Sale xác nhận khách đồng ý nội quy

Hiển thị:

- thông tin khách;
- phòng và giường đã chọn;
- giá thuê;
- nội quy;
- điều kiện đặt cọc.

Checkbox:

```
Khách đã đồng ý điều kiện thuê
Khách đã đồng ý nội quy bằng giấy bên ngoài
```

API:

```
POST /api/v1/deposits/:depositId/confirm-customer-rules
```

Request:

```
{
  "customerAgreed":true,
  "confirmedAt":"2026-07-15T09:00:00+07:00",
  "note":""
}
```

Sau đó Sale gửi Manager kiểm tra phòng:

```
POST /api/v1/deposits/:depositId/submit-room-check
```

Cập nhật bảng 15 `DAT_COC`:

```
KhachDongYNoiQuy = true
ThoiDiemDongYNoiQuy
TrangThai = WAITING_ROOM_CHECK
```

---

## Bước 3 — Manager kiểm tra phòng và giường

Hiển thị từng giường:

- mã giường;
- phòng;
- giá thuê;
- trạng thái vận hành;
- trạng thái kinh doanh;
- allocation đang hoạt động nếu có.

Nút:

```
Cho phép nhận cọc
Không còn khả dụng
```

API xác nhận:

```
POST /api/v1/deposits/:depositId/approve-room
```

API từ chối:

```
POST /api/v1/deposits/:depositId/reject-room
```

Request từ chối:

```
{
  "reason":"Một trong các giường không còn khả dụng."
}
```

API đọc:

- bảng 4 `PHONG`;
- bảng 5 `GIUONG`;
- bảng 17 `PHAN_BO_GIUONG`.

API cập nhật bảng 15:

```
MaQuanLyXacNhanPhong
ThoiDiemXacNhanPhong
LyDoTuChoiPhong
TrangThai
```

Chuyển trạng thái:

```
WAITING_ROOM_CHECK → ROOM_APPROVED
WAITING_ROOM_CHECK → ROOM_REJECTED
```

Quy tắc:

- chỉ `MANAGER` cùng chi nhánh;
- tất cả giường phải đang hoạt động;
- tất cả giường phải chưa có allocation đang hoạt động;
- thuê nguyên phòng phải kiểm tra toàn bộ giường của phòng.

Bước này mới chỉ xác nhận khả dụng, chưa giữ giường.

---

## Bước 4 — Accountant phát hành yêu cầu thanh toán

Hiển thị:

- từng giường;
- giá thuê tháng của từng giường;
- số tháng cọc là 2;
- thành tiền từng giường;
- tổng tiền cọc;
- thông tin chuyển khoản của chi nhánh.

Công thức:

```
Thành tiền từng giường = Giá thuê tháng × 2

Tổng tiền cọc =
Tổng thành tiền của tất cả giường được thuê
```

Thuê nguyên phòng phải tính toàn bộ giường.

API:

```
POST /api/v1/deposits/:depositId/issue-payment-request
```

API phải chạy trong một transaction:

```
1. Kiểm tra lại tất cả giường còn khả dụng.
2. Tính tổng tiền cọc.
3. Tạo bản ghi THANH_TOAN.
4. Tạo allocation HELD cho từng giường.
5. Đặt hạn thanh toán = thời điểm phát hành + 24 giờ.
6. Chuyển phiếu cọc sang WAITING_PAYMENT.
```

API ghi:

### Bảng 15 — `DAT_COC`

```
TongTienCoc
TrangThai = WAITING_PAYMENT
```

### Bảng 16 — `CHI_TIET_DAT_COC`

```
MaPhieuCoc
MaGiuong
GiaThueSnapshot
SoThangCoc = 2
ThanhTienCoc
```

### Bảng 17 — `PHAN_BO_GIUONG`

```
MaGiuong
MaPhieuCoc
LoaiPhanBo = HELD
TrangThai = ACTIVE
BatDauLuc
HetHanLuc
```

### Bảng 18 — `THANH_TOAN`

```
LoaiThanhToan = DEPOSIT
HuongGiaoDich = INBOUND
SoTienPhaiThanhToan
ThoiDiemPhatHanh
HanThanhToan
MaKeToanGhiNhan
MaPhieuCoc
TrangThai = WAITING_PAYMENT
```

---

## Bước 5 — Accountant ghi nhận thanh toán

Trường nhập:

- số tiền thực tế;
- phương thức;
- thời điểm thanh toán;
- mã giao dịch hoặc số phiếu thu;
- checkbox đã kiểm tra chứng từ bên ngoài;
- ghi chú.

Phương thức:

```
CASH
BANK_TRANSFER
```

API ghi nhận:

```
POST /api/v1/deposits/:depositId/record-payment
```

Request:

```
{
  "amount":"6000000.00",
  "method":"BANK_TRANSFER",
  "paidAt":"2026-07-15T10:00:00+07:00",
  "transactionReference":"FT260715001",
  "receiptNumber":null,
  "externalEvidenceChecked":true,
  "note":""
}
```

Cập nhật bảng 18 `THANH_TOAN`:

```
SoTienThucTe
ThoiDiemThanhToan
PhuongThuc
MaGiaoDich
SoPhieuThuChi
DaKiemTraChungTu
MaKeToanGhiNhan
TrangThai
GhiChu
```

Chuyển trạng thái phiếu cọc:

```
WAITING_PAYMENT
→ WAITING_MANAGER_CONFIRMATION
```

Điều kiện:

- chưa quá hạn;
- đã kiểm tra chứng từ;
- số tiền thực tế phải bằng số tiền phải thu;
- chỉ `ACCOUNTANT` cùng chi nhánh được ghi nhận.

`record-payment` vừa ghi dữ liệu vừa chuyển phiếu sang
`WAITING_MANAGER_CONFIRMATION`; không có API gửi xác nhận riêng.

---

## Bước 6 — Manager xác nhận tiền cọc

Hiển thị so sánh:

| Nội dung | Yêu cầu | Thực tế |
| --- | --- | --- |
| Số tiền | Tổng tiền cọc | Số tiền đã ghi nhận |
| Phương thức | Tiền mặt/chuyển khoản | Phương thức thực tế |
| Thời gian | Trong hạn | Thời gian thực tế |
| Chứng từ | Bắt buộc kiểm tra | Đã/Chưa kiểm tra |

Nút:

```
Xác nhận khoản tiền hợp lệ
Yêu cầu Accountant kiểm tra lại
Từ chối khoản thanh toán
```

API xác nhận:

```
POST /api/v1/deposits/:depositId/approve-payment
```

API yêu cầu kiểm tra lại:

```
POST /api/v1/deposits/:depositId/request-payment-recheck
```

Request:

```
{
  "reason":"Mã giao dịch chưa khớp."
}
```

API từ chối:

```
POST /api/v1/deposits/:depositId/reject-payment
```

Request:

```
{
  "reason":"Không xác minh được khoản tiền."
}
```

Nếu recheck diễn ra sau hạn, Accountant chỉ sửa thông tin kiểm tra của payment đã
ghi nhận đúng hạn và gửi lại, không tạo payment mới. Khi từ chối, payment và
deposit chuyển `PAYMENT_REJECTED`, toàn bộ allocation `HELD` chuyển `ENDED` trong
cùng transaction và giường được giải phóng ngay.

Manager có thể xác nhận sau hạn nếu payment đã được Accountant ghi nhận trước hạn
và `paidAt <= expiresAt`. Khi Manager xác nhận, phải chạy trong một transaction:

```
1. Kiểm tra thanh toán đúng số tiền và chưa quá hạn.
2. Cập nhật THANH_TOAN thành CONFIRMED.
3. Cập nhật DAT_COC thành DEPOSITED.
4. Chuyển toàn bộ allocation HELD thành DEPOSITED.
5. Lưu Manager và thời điểm xác nhận.
```

Bảng 18 `THANH_TOAN` cập nhật:

```
MaQuanLyXacNhan
ThoiDiemXacNhan
TrangThai
LyDoTraLai
```

Bảng 15 `DAT_COC`:

```
TrangThai = DEPOSITED
```

Bảng 17 `PHAN_BO_GIUONG`:

```
LoaiPhanBo: HELD → DEPOSITED
```

Quy tắc:

- Sale không được xác nhận tiền;
- Accountant không được xác nhận cuối;
- Admin không được xác nhận;
- chỉ `MANAGER` cùng chi nhánh.

---

## Bước 7 — Sale hẹn ngày nhận phòng

Chỉ xuất hiện khi phiếu cọc đã là:

```
DEPOSITED
```

Nhập:

- ngày giờ nhận phòng;
- ghi chú.

API:

```
POST /api/v1/deposits/:depositId/schedule-check-in
```

Request:

```
{
  "checkInAt":"2026-07-20T08:00:00+07:00",
  "note":""
}
```

Cập nhật bảng 15 `DAT_COC`:

```
NgayHenNhanPhong
GhiChu
```

---

# 3. Job tự động hết hạn sau 24 giờ

File:

```
apps/api/src/jobs/expire-deposit-holds.job.ts
```

Job chạy định kỳ, ví dụ mỗi 5 phút.

Điều kiện xử lý:

```
DAT_COC.TrangThai = WAITING_PAYMENT
AND THANH_TOAN.HanThanhToan <= thời điểm hiện tại
```

Trong một transaction:

```
DAT_COC → EXPIRED
THANH_TOAN → EXPIRED
PHAN_BO_GIUONG HELD → ENDED
KetThucLuc = thời điểm hiện tại
```

Job phải idempotent:

```
Chạy lại nhiều lần không tạo thêm dữ liệu
và không kết thúc allocation hai lần.
```

Job không được làm hết hạn hồ sơ đã chuyển sang:

```
WAITING_MANAGER_CONFIRMATION
DEPOSITED
CANCELLED
```

Sale được hủy hồ sơ ở `WAITING_PAYMENT`. Hành động hủy chạy transaction, chuyển
payment sang `CANCELLED` và allocation `HELD` sang `ENDED`.

---

# 4. API danh sách và chi tiết

## Danh sách hồ sơ cọc

```
GET /api/v1/deposits
```

Query:

```
status
customerName
depositCode
fromDate
toDate
page
pageSize
```

Quyền:

- Sale, Accountant, Manager cùng chi nhánh.
- Admin không xử lý nghiệp vụ cọc.

## Chi tiết hồ sơ cọc

```
GET /api/v1/deposits/:depositId
```

Response gồm:

- thông tin khách;
- yêu cầu thuê;
- phòng và giường;
- giá snapshot;
- tổng tiền cọc;
- trạng thái;
- thanh toán;
- hạn thanh toán;
- allocation;
- lịch sử xác nhận;
- các hành động hiện tại role được phép thực hiện.

---

# 5. Các bảng Phú sử dụng

## Phú ghi trực tiếp qua Service

### Bảng 15 — `DAT_COC`

```
MaPhieuCoc
MaYeuCau
MaNhanVienSale
NgayTao
HinhThucThueSnapshot
KhachDongYNoiQuy
ThoiDiemDongYNoiQuy
MaQuanLyXacNhanPhong
ThoiDiemXacNhanPhong
LyDoTuChoiPhong
TongTienCoc
NgayHenNhanPhong
TrangThai
GhiChu
```

### Bảng 16 — `CHI_TIET_DAT_COC`

```
MaPhieuCoc
MaGiuong
GiaThueSnapshot
SoThangCoc
ThanhTienCoc
```

### Bảng 17 — `PHAN_BO_GIUONG`

```
MaPhanBo
MaGiuong
MaPhieuCoc
LoaiPhanBo
TrangThai
BatDauLuc
HetHanLuc
KetThucLuc
```

### Bảng 18 — `THANH_TOAN`

```
MaThanhToan
LoaiThanhToan
HuongGiaoDich
SoTienPhaiThanhToan
SoTienThucTe
ThoiDiemPhatHanh
HanThanhToan
ThoiDiemThanhToan
PhuongThuc
MaGiaoDich
SoPhieuThuChi
DaKiemTraChungTu
MaKeToanGhiNhan
MaQuanLyXacNhan
ThoiDiemXacNhan
LyDoTraLai
TrangThai
MaPhieuCoc
GhiChu
```

## Phú chỉ đọc

```
Bảng 1  — CHI_NHANH
Bảng 2  — NHAN_VIEN
Bảng 4  — PHONG
Bảng 5  — GIUONG
Bảng 10 — KHACH_HANG
Bảng 11 — YEU_CAU_THUE
Bảng 13 — LICH_XEM_PHONG
Bảng 14 — CHI_TIET_LICH_XEM
```

Phú không tự sửa `schema.prisma`. Thiếu field hoặc quan hệ phải báo Linh.

---

# 6. State transition

## Phiếu cọc

```
DRAFT
→ WAITING_ROOM_CHECK
→ ROOM_APPROVED
→ WAITING_PAYMENT
→ WAITING_MANAGER_CONFIRMATION
→ DEPOSITED
```

Nhánh khác:

```
WAITING_ROOM_CHECK → ROOM_REJECTED
WAITING_PAYMENT → EXPIRED
WAITING_MANAGER_CONFIRMATION → PAYMENT_RECHECK
PAYMENT_RECHECK → WAITING_MANAGER_CONFIRMATION
WAITING_MANAGER_CONFIRMATION → PAYMENT_REJECTED
WAITING_PAYMENT → CANCELLED
```

## Allocation

```
Không có allocation
→ HELD
→ DEPOSITED
```

Nếu quá hạn hoặc hủy:

```
HELD → ENDED
```

Không tạo API chung kiểu:

```
PATCH /deposits/:id/status
```

---

# 7. Cấu trúc code

## Frontend

```
apps/web/src/features/deposits/
├── api/deposit-api.ts
├── pages/DepositListPage.tsx
├── pages/DepositDetailPage.tsx
├── components/DepositStepper.tsx
├── components/DepositSummary.tsx
├── components/RoomCheckStep.tsx
├── components/PaymentRequestStep.tsx
├── components/PaymentRecordForm.tsx
├── components/PaymentVerificationStep.tsx
├── components/CheckInScheduleForm.tsx
└── schemas/deposit.schema.ts
```

## Backend

```
apps/api/src/presentation/routes/
└── deposit.routes.ts

apps/api/src/presentation/controllers/
└── deposit.controller.ts

apps/api/src/presentation/validators/
└── deposit.validator.ts

apps/api/src/services/deposit/
├── deposit.service.ts
├── deposit-calculator.ts
├── deposit-state-machine.ts
└── deposit-expiration.service.ts

apps/api/src/services/payment/
└── deposit-payment.service.ts

apps/api/src/data/repositories/
├── deposit.repository.ts
├── payment.repository.ts
├── bed.repository.ts
├── bed-allocation.repository.ts
└── viewing.repository.ts

apps/api/src/jobs/
└── expire-deposit-holds.job.ts
```

Controller không được gọi Prisma trực tiếp.

---

# 8. Test bắt buộc

Phú phải kiểm tra tối thiểu:

1. Không tạo cọc nếu lịch xem chưa có kết quả muốn đặt cọc.
2. Sale không được xác nhận phòng.
3. Accountant không được xác nhận tiền cọc cuối cùng.
4. Sale không được xác nhận tiền cọc.
5. Manager khác chi nhánh không được xử lý hồ sơ.
6. Thuê nguyên phòng phải tính cọc cho toàn bộ giường.
7. Hai hồ sơ không được tạo `HELD` cho cùng một giường.
8. Phát hành yêu cầu phải tạo payment và allocation trong cùng transaction.
9. Hết 24 giờ phải chuyển phiếu và payment còn `WAITING_PAYMENT` sang `EXPIRED`.
10. Hết hạn phải kết thúc allocation `HELD`.
11. Không ghi nhận thanh toán sau khi hết hạn.
12. Manager xác nhận tiền phải chuyển tất cả allocation `HELD → DEPOSITED`.
13. Job chạy nhiều lần không gây lỗi hoặc cập nhật trùng.
14. Manager xác nhận được sau hạn nếu payment đã được ghi nhận đúng hạn.
15. Hủy ở `WAITING_PAYMENT` phải kết thúc payment và allocation trong transaction.
16. Recheck sau hạn không được tạo payment mới.
17. Từ chối payment phải giải phóng toàn bộ allocation `HELD` trong transaction.

---

# 9. Điều kiện hoàn thành

Phần của Phú hoàn thành khi:

- UI-08 chạy đủ bảy bước;
- mỗi role chỉ thấy đúng nút của mình;
- dữ liệu lưu đúng PostgreSQL;
- công thức tiền cọc đúng;
- thuê nguyên phòng tính đủ toàn bộ giường;
- không thể giữ trùng giường;
- hạn 24 giờ hoạt động;
- job hết hạn giải phóng giường đúng;
- chỉ Manager xác nhận được tiền cọc;
- các transaction không để dữ liệu dở dang;
- các test bắt buộc chạy thành công.
