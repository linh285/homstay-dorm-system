# Chia việc Khải

# Phân công Trần Quang Khải — Phòng, tìm phòng và lịch xem

## 1. Phạm vi phụ trách

Khải làm trọn phần:

```text
Quản lý phòng/giường
→ Sale tìm phòng phù hợp
→ Sale tạo lịch xem
→ Sale xác nhận khách đã xem
→ Sale ghi nhận kết quả xem
```

Khải không làm:

- yêu cầu thuê và thông tin khách;
- đặt cọc;
- thanh toán;
- nhận phòng;
- trả phòng;
- báo cáo.

---

## 2. UI phụ trách

### UI-04 — Phòng và giường

#### Role

- `MANAGER`: xem, tạo và cập nhật dữ liệu thuộc chi nhánh mình.
- `SALE`: chỉ xem dữ liệu thuộc chi nhánh mình.
- `ADMIN`: chỉ xem toàn hệ thống.

#### Danh sách phòng

Bộ lọc:

- khu vực;
- tầng;
- loại phòng;
- giới tính;
- khoảng giá;
- có điều hòa;
- có gửi xe;
- trạng thái vận hành;
- còn giường khả dụng.

Bảng hiển thị:

- mã phòng;
- tên phòng;
- khu vực;
- tầng;
- sức chứa;
- số giường khả dụng;
- giá thấp nhất;
- giới tính áp dụng;
- trạng thái vận hành.

#### Chi tiết phòng

Hiển thị:

- thông tin phòng;
- nội quy;
- dịch vụ;
- danh sách giường;
- trạng thái từng giường;
- tài sản của phòng.

Nút của Manager:

- `Thêm phòng`;
- `Sửa phòng`;
- `Thêm giường`;
- `Sửa giường`;
- `Cập nhật dịch vụ`;
- `Cập nhật tài sản`.

Trạng thái kinh doanh của giường phải lấy từ `PHAN_BO_GIUONG`, không lấy trực tiếp từ `GIUONG`.

---

### UI-06 — Tab Phòng phù hợp

Khải chỉ làm phần:

```
Tìm phòng phù hợp
+
Hiển thị kết quả tìm kiếm
```

Các tab thông tin khách và nhu cầu thuê do Linh làm.

Mỗi kết quả hiển thị:

- mã và tên phòng;
- sức chứa;
- số giường khả dụng;
- các giường khả dụng;
- giá dự kiến;
- giới tính áp dụng;
- điều hòa;
- gửi xe;
- dịch vụ;
- lý do phù hợp;
- lý do không phù hợp.

Nút:

- `Xem chi tiết`;
- `Chọn để hẹn xem`.

Việc tìm phòng không được tạo giữ chỗ.

---

### UI-07 — Lịch xem và kết quả xem phòng

#### Role

Chỉ `SALE` được tạo và cập nhật lịch xem của chi nhánh mình.

#### Danh sách lịch xem

Hiển thị:

- mã lịch;
- khách hàng;
- ngày giờ;
- các phòng sẽ xem;
- trạng thái;
- Sale phụ trách.

#### Form tạo lịch

Nhập:

- yêu cầu thuê;
- thời gian bắt đầu;
- thời gian kết thúc;
- một hoặc nhiều phòng;
- ghi chú;
- kênh thông báo mô phỏng.

#### Các hành động

- xác nhận lịch;
- đổi lịch;
- hủy lịch;
- ghi nhận khách không đến;
- xác nhận khách đã xem;
- lưu kết quả xem.

#### Kết quả xem

Các kết quả:

```
CUSTOMER_WANTS_DEPOSIT
WANTS_MORE_VIEWINGS
WANTS_TO_CHANGE_CRITERIA
UNDECIDED
NOT_INTERESTED
```

Nếu khách muốn đặt cọc, phải lưu:

- phòng được chọn;
- ghi chú.

Khải không lưu giường được chọn trong kết quả xem và không tạo dữ liệu đặt cọc.
Module đặt cọc nhận `selectedBedIds` khi gọi `create-deposit` và lưu chúng vào
`CHI_TIET_DAT_COC`.

---

## 3. Bảng ERD sử dụng

### Ghi dữ liệu

#### Bảng 4 — `PHONG`

Các thuộc tính chính:

```
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
GhiChu
```

#### Bảng 5 — `GIUONG`

```
MaGiuong
MaPhong
TenGiuong
GiaThueThang
TrangThaiVanHanh
GhiChu
```

#### Bảng 7 — `PHONG_DICH_VU`

```
MaPhong
MaDichVu
DonGiaRieng
GhiChu
```

#### Bảng 9 — `PHONG_TAI_SAN`

```
MaPhongTaiSan
MaPhong
MaLoaiTaiSan
SoLuong
TinhTrangHienTai
GhiChu
```

#### Bảng 13 — `LICH_XEM_PHONG`

```
MaLichHen
MaYeuCau
MaNhanVienSale
ThoiGianBatDau
ThoiGianKetThuc
TrangThai
DaThongBao
KenhThongBao
DaXacNhanKhachXem
KetQuaCuoi
NgayLienHeLai
GhiChu
```

#### Bảng 14 — `CHI_TIET_LICH_XEM`

```
MaLichHen
MaPhong
DaXemThucTe
KhachQuanTam
GhiChu
```

### Chỉ đọc dữ liệu

- Bảng 1 `CHI_NHANH`.
- Bảng 6 `DICH_VU`.
- Bảng 8 `LOAI_TAI_SAN`.
- Bảng 10 `KHACH_HANG`.
- Bảng 11 `YEU_CAU_THUE`.
- Bảng 17 `PHAN_BO_GIUONG`.

Khải không sửa:

- `DAT_COC`;
- `CHI_TIET_DAT_COC`;
- `THANH_TOAN`;
- `HOP_DONG_THUE`.

---

## 4. API phụ trách

### 4.1. Danh sách phòng

```
GET /api/v1/rooms
```

Query có thể gồm:

```
area
floor
roomType
gender
minimumPrice
maximumPrice
hasAirConditioner
hasParking
operationalStatus
availableOnly
page
pageSize
```

Backend tự lấy chi nhánh từ người đăng nhập, trừ Admin.

---

### 4.2. Tạo phòng

```
POST /api/v1/rooms
```

Role: `MANAGER`.

Request:

```
{
  "roomCode":"A101",
  "roomName":"Phòng A101",
  "area":"Khu A",
  "floor":1,
  "roomType":"4_BEDS",
  "maximumCapacity":4,
  "genderPolicy":"MALE",
  "hasAirConditioner":true,
  "hasParking":true,
  "curfew":"23:00",
  "quietLevel":"MEDIUM",
  "rules":"Không gây ồn sau 22 giờ.",
  "operationalStatus":"ACTIVE"
}
```

`branchId` phải lấy từ tài khoản Manager, không nhận từ frontend.

---

### 4.3. Xem và sửa phòng

```
GET   /api/v1/rooms/:roomId
PATCH /api/v1/rooms/:roomId
```

Request sửa chỉ nhận các field được phép thay đổi của bảng `PHONG`.

Không được chuyển phòng sang `MAINTENANCE` nếu còn allocation `DEPOSITED` hoặc `OCCUPIED`.

---

### 4.4. Thêm và sửa giường

```
POST  /api/v1/rooms/:roomId/beds
PATCH /api/v1/beds/:bedId
```

Request:

```
{
  "bedCode":"A101-B01",
  "bedName":"Giường 01",
  "monthlyRent":"1500000.00",
  "operationalStatus":"ACTIVE",
  "note":""
}
```

Không cho ngừng sử dụng giường nếu có allocation đang hoạt động.

---

### 4.5. Tình trạng khả dụng

```
GET /api/v1/rooms/:roomId/availability
```

Response cần có:

```
{
  "roomId":"A101",
  "totalBeds":4,
  "availableBeds":2,
  "beds": [
    {
      "bedId":"A101-B01",
      "monthlyRent":"1500000.00",
      "businessStatus":"AVAILABLE"
    }
  ]
}
```

`businessStatus` được tính từ `PHAN_BO_GIUONG`:

```
không có allocation active → AVAILABLE
HELD                       → HELD
DEPOSITED                  → DEPOSITED
OCCUPIED                   → OCCUPIED
```

---

### 4.6. Dịch vụ và tài sản phòng

Danh mục dịch vụ và loại tài sản được Linh tạo sẵn trong seed.

Khải làm:

```
GET /api/v1/services
GET /api/v1/asset-types

PUT /api/v1/rooms/:roomId/services
GET /api/v1/rooms/:roomId/assets
PUT /api/v1/rooms/:roomId/assets
```

Request cập nhật dịch vụ:

```
{
  "services": [
    {
      "serviceId":"DV01",
      "customPrice":"100000.00",
      "note":""
    }
  ]
}
```

Request cập nhật tài sản:

```
{
  "assets": [
    {
      "assetTypeId":"TS01",
      "quantity":4,
      "currentCondition":"Tốt",
      "note":""
    }
  ]
}
```

---

### 4.7. Tìm phòng phù hợp

```
POST /api/v1/rental-requests/:requestId/search-rooms
```

Không cần gửi lại toàn bộ yêu cầu thuê. Backend đọc thông tin từ `YEU_CAU_THUE`.

Response mỗi phòng:

```
{
  "roomId":"A101",
  "roomName":"Phòng A101",
  "capacity":4,
  "availableBedIds": ["A101-B01","A101-B02"],
  "estimatedMonthlyPrice":"3000000.00",
  "matched":true,
  "matchReasons": ["Đúng chi nhánh","Đủ hai giường","Phù hợp giới tính","Trong ngân sách"
  ]
}
```

---

### 4.8. Lịch xem

```
GET  /api/v1/viewings
POST /api/v1/viewings
GET  /api/v1/viewings/:viewingId
PATCH /api/v1/viewings/:viewingId
```

Request tạo lịch:

```
{
  "rentalRequestId":"YC001",
  "startAt":"2026-07-15T09:00:00+07:00",
  "endAt":"2026-07-15T10:00:00+07:00",
  "roomIds": ["A101","A102"],
  "notificationChannel":"PHONE",
  "notificationRecorded":true,
  "note":""
}
```

Một lịch phải có ít nhất một phòng.

---

### 4.9. Hành động lịch xem

```
POST /api/v1/viewings/:viewingId/confirm
POST /api/v1/viewings/:viewingId/reschedule
POST /api/v1/viewings/:viewingId/cancel
POST /api/v1/viewings/:viewingId/no-show
POST /api/v1/viewings/:viewingId/confirm-visited
POST /api/v1/viewings/:viewingId/result
```

Request đổi lịch:

```
{
  "startAt":"2026-07-16T14:00:00+07:00",
  "endAt":"2026-07-16T15:00:00+07:00",
  "reason":"Khách yêu cầu đổi lịch."
}
```

Request lưu kết quả:

```
{
  "result":"CUSTOMER_WANTS_DEPOSIT",
  "selectedRoomId":"A101",
  "followUpDate":null,
  "note":"Khách đồng ý chọn hai giường."
}
```

Nếu kết quả là `CUSTOMER_WANTS_DEPOSIT`, bắt buộc có `selectedRoomId`.

API tạo cọc do module đặt cọc phụ trách nhận:

```
{
  "selectedBedIds": ["A101-B01", "A101-B02"]
}
```

---

## 5. Quy tắc tìm phòng

### Thuê nguyên phòng

Phòng phù hợp khi:

- cùng chi nhánh;
- phòng đang hoạt động;
- toàn bộ giường đang hoạt động và khả dụng;
- số người không vượt sức chứa;
- tổng giá tất cả giường không vượt ngân sách;
- phù hợp giới tính và các tiện ích yêu cầu.

Giá dự kiến:

```
Tổng giá thuê tháng của toàn bộ giường trong phòng
```

### Ở ghép

Phòng phù hợp khi:

- cùng chi nhánh;
- phòng đang hoạt động;
- số giường khả dụng đủ cho số người;
- khách chấp nhận ở ghép;
- phù hợp giới tính;
- tổng giá các giường được chọn không vượt ngân sách.

Giá dự kiến được tính từ các giường khả dụng có giá thấp nhất, đủ cho số người.

---

## 6. State transition

### Yêu cầu thuê

```
ACTIVE
→ tạo lịch xem
→ VIEWING
```

Kết quả xem:

```
CUSTOMER_WANTS_DEPOSIT      → DEPOSIT_PROCESS
WANTS_TO_CHANGE_CRITERIA    → ACTIVE
NOT_INTERESTED              → CLOSED
WANTS_MORE_VIEWINGS         → VIEWING
UNDECIDED                   → VIEWING
```

### Lịch xem

```
SCHEDULED → CONFIRMED → VISITED → RESULT_RECORDED
```

Nhánh khác:

```
SCHEDULED / CONFIRMED → SCHEDULED
SCHEDULED / CONFIRMED → CANCELLED
CONFIRMED             → NO_SHOW
```

Không được lưu kết quả trước khi lịch ở trạng thái `VISITED`.

---

## 7. Cấu trúc code

### Frontend

```
apps/web/src/features/inventory/
├── api/inventory-api.ts
├── pages/RoomListPage.tsx
├── pages/RoomDetailPage.tsx
├── components/RoomForm.tsx
├── components/BedTable.tsx
├── components/RoomServiceForm.tsx
├── components/RoomAssetForm.tsx
└── schemas/inventory.schema.ts

apps/web/src/features/rental-requests/
└── components/RoomMatchingTab.tsx

apps/web/src/features/viewings/
├── api/viewing-api.ts
├── pages/ViewingListPage.tsx
├── pages/ViewingDetailPage.tsx
├── components/ViewingForm.tsx
├── components/ViewingResultForm.tsx
└── schemas/viewing.schema.ts
```

### Backend

```
apps/api/src/presentation/routes/
├── room.routes.ts
└── viewing.routes.ts

apps/api/src/presentation/controllers/
├── room.controller.ts
└── viewing.controller.ts

apps/api/src/presentation/validators/
├── room.validator.ts
└── viewing.validator.ts

apps/api/src/services/inventory/
├── room.service.ts
├── room-matching.service.ts
└── room-availability.service.ts

apps/api/src/services/viewing/
└── viewing.service.ts

apps/api/src/data/repositories/
├── room.repository.ts
├── bed.repository.ts
├── room-service.repository.ts
├── room-asset.repository.ts
├── viewing.repository.ts
└── bed-allocation.repository.ts
```

Không gọi Prisma trong controller.

---

## 8. Test bắt buộc

Khải phải kiểm tra tối thiểu:

1. Sale không được tạo hoặc sửa phòng.
2. Manager không được sửa phòng khác chi nhánh.
3. Giường có allocation active không được trả về `AVAILABLE`.
4. Tìm phòng không tạo allocation hoặc giữ chỗ.
5. Thuê nguyên phòng chỉ phù hợp khi toàn bộ giường khả dụng.
6. Lịch xem có thể chứa nhiều phòng.
7. Không được xác nhận đã xem khi lịch chưa `CONFIRMED`.
8. Không được lưu kết quả khi lịch chưa `VISITED`.
9. Kết quả muốn đặt cọc phải có phòng; giường chỉ được gửi khi tạo cọc.
10. Khải không tạo hoặc cập nhật bảng đặt cọc.

---

## 9. Điều kiện hoàn thành

Phần của Khải hoàn thành khi:

- UI-04 chạy được;
- tab tìm phòng của UI-06 chạy được;
- UI-07 chạy được;
- dữ liệu lưu đúng PostgreSQL;
- kiểm tra đúng role và chi nhánh;
- trạng thái giường lấy đúng từ allocation;
- tìm phòng không giữ giường;
- state lịch xem hoạt động đúng;
- test bắt buộc chạy thành công.
