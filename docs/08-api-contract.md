## Base URL

```jsx
/api/v1
```

## Định dạng response thành công

```jsx
{
  "success": true,
  "data": {},
  "meta": null
}
```

## Danh sách phân trang

```jsx
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 42,
    "totalPages": 3
  }
}
```

## Định dạng lỗi

```jsx
{
  "success": false,
  "error": {
    "code": "DEPOSIT_PAYMENT_EXPIRED",
    "message": "Yêu cầu thanh toán tiền cọc đã hết hạn.",
    "details": null
  }
}
```

## HTTP status

```jsx
200  Đọc hoặc cập nhật thành công
201  Tạo mới thành công
204  Xóa/hủy thành công không trả body
400  Dữ liệu không hợp lệ
401  Chưa đăng nhập
403  Không có quyền
404  Không tìm thấy
409  Xung đột trạng thái hoặc đặt trùng
422  Vi phạm quy tắc nghiệp vụ
500  Lỗi hệ thống
```

## Phân trang

```jsx
?page=1&pageSize=20
```

## Sắp xếp

```jsx
?sortBy=createdAt&sortOrder=desc
```

## Thời gian

```jsx
API dùng ISO 8601:

2026-07-11T09:30:00+07:00

Database dùng TIMESTAMPTZ.
```

## Tiền

API trả số dạng chuỗi để tránh sai số JavaScript:

```jsx
{
  "depositAmount": "6000000.00"
}
```

## Không dùng API cập nhật trạng thái chung

```jsx
Không tạo endpoint kiểu:

PATCH /deposits/:id/status

với body:

{
  "status": "DEPOSITED"
}

Cách này cho phép frontend tùy ý chuyển trạng thái.

Phải dùng endpoint có ý nghĩa nghiệp vụ:

POST /deposits/:id/submit-room-check
POST /deposits/:id/approve-room
POST /deposits/:id/issue-payment-request
POST /deposits/:id/record-payment
POST /deposits/:id/approve-payment

Mỗi endpoint:

Có role riêng.
Có trạng thái đầu vào riêng.
Có validation riêng.
Có transaction riêng.
```

# Kế hoạch API theo module

## 0. Health

| Method | Endpoint | Role | Chức năng |
| --- | --- | --- | --- |
| GET | `/health` | Công khai | Kiểm tra tiến trình API |

Response:

```json
{
  "success": true,
  "data": { "status": "ok" },
  "meta": null
}
```

## 1. Authentication

| Method | Endpoint | Role | Chức năng |
| --- | --- | --- | --- |
| POST | `/auth/login` | Công khai | Đăng nhập |
| POST | `/auth/logout` | Đã đăng nhập | Đăng xuất |
| GET | `/auth/me` | Đã đăng nhập | Thông tin người dùng hiện tại |

JWT nên đặt trong HTTP-only cookie.

---

## 2. Admin — chi nhánh và nhân viên

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/branches` | Admin; nhân viên xem chi nhánh mình |
| GET | `/branches/:id` | Admin |
| PATCH | `/branches/:id` | Admin |
| GET | `/employees` | Admin |

Admin chỉ xem danh sách nhân viên. Không có endpoint tạo/sửa nhân viên, chỉnh role,
quản lý tài khoản, khóa/mở tài khoản hoặc reset mật khẩu.

---

## 3. Phòng, giường, dịch vụ, tài sản

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/rooms` | Sale, Quản lý, Admin |
| POST | `/rooms` | Quản lý |
| GET | `/rooms/:id` | Sale, Quản lý, Admin |
| PATCH | `/rooms/:id` | Quản lý |
| POST | `/rooms/:id/beds` | Quản lý |
| PATCH | `/beds/:id` | Quản lý |
| GET | `/rooms/:id/availability` | Sale, Quản lý, Admin |
| GET | `/rooms/:id/assets` | Sale, Quản lý, Admin |
| PUT | `/rooms/:id/assets` | Quản lý |
| GET | `/services` | Sale, Kế toán, Quản lý, Admin |
| GET | `/asset-types` | Sale, Quản lý, Admin |
| PUT | `/rooms/:id/services` | Quản lý |

`DICH_VU` và `LOAI_TAI_SAN` là danh mục toàn hệ thống chỉ đọc, được tạo bằng seed.
Manager chỉ gắn danh mục vào phòng thuộc chi nhánh mình.

Mọi truy vấn phải giới hạn theo chi nhánh của nhân viên, trừ Admin.

---

## 4. Yêu cầu thuê

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/rental-requests` | Sale |
| POST | `/rental-requests` | Sale |
| GET | `/rental-requests/:id` | Sale |
| PATCH | `/rental-requests/:id` | Sale |
| POST | `/rental-requests/:id/members` | Sale |
| PATCH | `/rental-requests/:id/members/:memberId` | Sale |
| DELETE | `/rental-requests/:id/members/:memberId` | Sale, trước khi đặt cọc |
| POST | `/rental-requests/:id/search-rooms` | Sale |
| POST | `/rental-requests/:id/close` | Sale |

`search-rooms` không thay đổi trạng thái phòng.
`search-rooms` triển khai sau có thể so sánh `preferredArea` của yêu cầu thuê với `Room.area`.
`POST /rental-requests` tạo yêu cầu trực tiếp ở `ACTIVE`; không có trạng thái nháp.

`GET /rental-requests` hỗ trợ phân trang server-side:

```
page >= 1
pageSize default 20, max 100
sortBy: registeredAt | expectedCheckInDate | expectedResidents | status | id
sortOrder: asc | desc
```

Response:

```
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

`POST` và `PATCH /rental-requests/:id` nhận thêm `rentalRequest.preferredArea` dạng `string | null`, lưu vào `YEU_CAU_THUE.KhuVucMongMuon`.

---

## 5. Lịch xem phòng

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/viewings` | Sale |
| POST | `/viewings` | Sale |
| GET | `/viewings/:id` | Sale |
| PATCH | `/viewings/:id` | Sale |
| POST | `/viewings/:id/confirm` | Sale |
| POST | `/viewings/:id/reschedule` | Sale |
| POST | `/viewings/:id/cancel` | Sale |
| POST | `/viewings/:id/no-show` | Sale |
| POST | `/viewings/:id/confirm-visited` | Sale |
| POST | `/viewings/:id/result` | Sale |
| POST | `/viewings/:id/create-deposit` | Sale |

`create-deposit` chỉ được gọi khi:

```
Lịch đã hoàn tất
AND khách đã xem
AND kết quả = Đồng ý đặt cọc
```

`result` chỉ lưu kết quả và phòng khách quan tâm. `create-deposit` nhận
`selectedBedIds` và ghi các giường vào `CHI_TIET_DAT_COC`.

---

## 6. Đặt cọc

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/deposits` | Sale, Kế toán, Quản lý |
| GET | `/deposits/:id` | Sale, Kế toán, Quản lý |
| POST | `/deposits/:id/confirm-customer-rules` | Sale |
| POST | `/deposits/:id/submit-room-check` | Sale |
| POST | `/deposits/:id/approve-room` | Quản lý |
| POST | `/deposits/:id/reject-room` | Quản lý |
| POST | `/deposits/:id/issue-payment-request` | Kế toán |
| POST | `/deposits/:id/record-payment` | Kế toán |
| POST | `/deposits/:id/approve-payment` | Quản lý |
| POST | `/deposits/:id/request-payment-recheck` | Quản lý |
| POST | `/deposits/:id/reject-payment` | Quản lý |
| POST | `/deposits/:id/schedule-check-in` | Sale |
| POST | `/deposits/:id/cancel` | Sale, nếu chưa xác nhận tiền |

`record-payment` ghi payment và chuyển phiếu sang
`WAITING_MANAGER_CONFIRMATION` trong cùng transaction. API chỉ thành công khi
được gọi trước `expiresAt` và `paidAt <= expiresAt`.

Manager có thể xác nhận sau `expiresAt` nếu phiếu đã ở
`WAITING_MANAGER_CONFIRMATION`. Hủy tại `WAITING_PAYMENT` chuyển payment sang
`CANCELLED` và kết thúc allocation `HELD` trong cùng transaction.

`request-payment-recheck` sau hạn vẫn dùng payment cũ đã ghi nhận đúng hạn;
Accountant chỉ sửa thông tin kiểm tra rồi gọi lại `record-payment`, không tạo
payment mới. `reject-payment` chuyển payment và deposit sang `PAYMENT_REJECTED`,
kết thúc mọi allocation `HELD` và giải phóng giường trong một transaction.

## Transaction quan trọng

### Phát hành yêu cầu thanh toán

```
issue-payment-request
```

Trong một transaction:

1. Kiểm tra tất cả giường còn khả dụng.
2. Tạo thanh toán.
3. Tạo `HELD` allocation.
4. Ghi thời điểm phát hành.
5. Ghi hạn sau 24 giờ.
6. Cập nhật trạng thái phiếu cọc.

### Quản lý xác nhận tiền

```
approve-payment
```

Trong một transaction:

1. Xác nhận payment.
2. Cập nhật phiếu cọc thành `DEPOSITED`.
3. Chuyển allocation `HELD` thành `DEPOSITED`.
4. Lưu thời điểm và quản lý xác nhận.

---

## 7. Job hết hạn đặt cọc

Không có API cho người dùng.

Job backend chạy cố định:

```
Mỗi 5 phút
```

Điều kiện:

```
Trạng thái = WAITING_PAYMENT
AND HanThanhToan <= hiện tại
```

Trong transaction:

- Chuyển phiếu cọc thành `EXPIRED`.
- Chuyển thanh toán thành `EXPIRED`.
- Kết thúc allocation `HELD`.

Job phải idempotent:

```
Chạy lại nhiều lần không gây lỗi và không giải phóng trùng.
```

---

## 8. Hợp đồng và nhận phòng

| Method | Endpoint | Role |
| --- | --- | --- |
| POST | `/contracts/from-deposit/:depositId` | Sale |
| GET | `/contracts` | Sale, Kế toán, Quản lý |
| GET | `/contracts/:id` | Sale, Kế toán, Quản lý |
| POST | `/contracts/:id/confirm-arrival` | Sale |
| PUT | `/contracts/:id/residents` | Sale |
| POST | `/contracts/:id/submit-eligibility-review` | Sale |
| POST | `/contracts/:id/residents/:customerId/approve` | Quản lý |
| POST | `/contracts/:id/residents/:customerId/reject` | Quản lý |
| POST | `/contracts/:id/approve-eligibility` | Quản lý |
| POST | `/contracts/:id/stop-check-in` | Quản lý |
| POST | `/contracts/:id/record-paper-contract` | Sale |
| POST | `/contracts/:id/confirm-paper-signing` | Sale |
| POST | `/contracts/:id/create-initial-payment` | Kế toán |
| POST | `/contracts/:id/record-initial-payment` | Kế toán |
| POST | `/contracts/:id/confirm-initial-payment` | Kế toán |
| POST | `/contracts/:id/submit-handover` | Kế toán hoặc hệ thống sau xác nhận |

`confirm-arrival` chỉ chuyển `CHECKIN_DRAFT → ARRIVED`. Sale cập nhật residents tại
`ARRIVED`; `submit-eligibility-review` mới chuyển sang `WAITING_ELIGIBILITY`.

`submit-handover` kiểm tra duyệt cư trú, hợp đồng giấy và thanh toán ban đầu đã đủ,
sau đó chuyển hợp đồng sang `READY_FOR_HANDOVER`.

Không cho tạo bàn giao nếu chưa đủ ba điều kiện:

```
Điều kiện lưu trú đã duyệt
Hợp đồng giấy đã ký
Thanh toán ban đầu đã đủ
```

---

## 9. Bàn giao

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/handovers/:id` | Quản lý |
| POST | `/contracts/:contractId/handovers` | Quản lý |
| PATCH | `/handovers/:id` | Quản lý, khi còn nháp |
| PUT | `/handovers/:id/assets` | Quản lý |
| POST | `/handovers/:id/complete` | Quản lý |

`complete` thực hiện trong transaction:

1. Xác nhận checklist.
2. Cập nhật biên bản bàn giao.
3. Cập nhật hợp đồng `ACTIVE`.
4. Chuyển allocation `DEPOSITED` thành `OCCUPIED`.

---

## 10. Yêu cầu trả phòng

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/checkout-requests` | Sale, Kế toán, Quản lý |
| POST | `/checkout-requests` | Sale |
| GET | `/checkout-requests/:id` | Sale, Kế toán, Quản lý |
| PATCH | `/checkout-requests/:id` | Sale, khi còn nháp |
| POST | `/checkout-requests/:id/submit` | Sale |
| POST | `/checkout-requests/:id/cancel` | Sale, trước kiểm tra |

---

## 11. Kiểm tra trả phòng

| Method | Endpoint | Role |
| --- | --- | --- |
| POST | `/checkout-requests/:id/inspection` | Quản lý |
| GET | `/checkout-inspections/:id` | Quản lý, Kế toán |
| PATCH | `/checkout-inspections/:id` | Quản lý, khi còn nháp |
| PUT | `/checkout-inspections/:id/items` | Quản lý |
| POST | `/checkout-inspections/:id/complete` | Quản lý |

---

## 12. Đối soát và hoàn cọc

| Method | Endpoint | Role |
| --- | --- | --- |
| POST | `/checkout-requests/:id/settlement` | Kế toán |
| GET | `/settlements/:id` | Kế toán, Quản lý |
| PUT | `/settlements/:id/deductions` | Kế toán |
| POST | `/settlements/:id/calculate` | Kế toán |
| POST | `/settlements/:id/finalize` | Kế toán |
| POST | `/settlements/:id/customer-agreed` | Quản lý |
| POST | `/settlements/:id/disputed` | Quản lý |
| POST | `/settlements/:id/return-to-accountant` | Quản lý |
| POST | `/settlements/:id/record-additional-payment` | Kế toán |
| POST | `/settlements/:id/confirm-no-balance` | Kế toán |
| POST | `/settlements/:id/confirm-liquidation` | Quản lý |
| POST | `/settlements/:id/record-refund` | Kế toán |
| POST | `/settlements/:id/complete-checkout` | Quản lý |

`complete-checkout` chỉ thành công khi toàn bộ điều kiện kết thúc đã đủ.

Nếu khách đã cọc nhưng chưa ký hợp đồng, `POST /checkout-requests/:id/settlement`
được gọi trực tiếp khi checkout còn `DRAFT`, không cần inspection và áp dụng tỷ lệ
80%. Khi hoàn tất, allocation `DEPOSITED` chuyển `ENDED`.

`confirm-no-balance` dùng khi số dư bằng 0 và chuyển hồ sơ từ
`WAITING_FINANCIAL_COMPLETION` sang `READY_TO_COMPLETE`.

---

## 13. Dashboard và báo cáo

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/dashboard` | Tất cả |
| GET | `/reports/branch-summary` | Quản lý |
| GET | `/reports/system-summary` | Admin |
| GET | `/reports/occupancy` | Quản lý, Admin |
| GET | `/reports/rental-funnel` | Quản lý, Admin |
| GET | `/reports/deposits` | Quản lý, Admin |
| GET | `/reports/check-ins-checkouts` | Quản lý, Admin |
| GET | `/reports/financial-summary` | Quản lý, Admin |

Quản lý chỉ nhận dữ liệu chi nhánh của mình. Admin được dùng filter `branchId`.

Các báo cáo bổ sung:

- `GET /reports/deposits` trả `scope`, `total`, `totalDepositAmount`, `expiringWithin24Hours`, `countsByStatus`.
- `GET /reports/check-ins-checkouts` trả `scope`, `contractsByStatus`, `checkoutsByStatus`, `upcomingCheckIns`, `upcomingCheckouts`.
- `GET /reports/financial-summary` trả `scope`, `depositReceived`, `refundPaid`, `additionalPaymentReceived`, `netCashFlow`.

Số tiền trả về dạng chuỗi decimal. Báo cáo tài chính chỉ tính payment `CONFIRMED`, có `amountPaid`; loại trừ `CANCELLED`, `EXPIRED`, `PAYMENT_REJECTED`.

---

# 11. Ràng buộc bảo mật và chi nhánh

Mỗi request sau đăng nhập phải có:

```
currentUser.id
currentUser.role
currentUser.branchId
```

Service phải kiểm tra:

```
ADMIN:
    xem toàn hệ thống

SALE / ACCOUNTANT / MANAGER:
    chỉ đọc và xử lý hồ sơ cùng branchId
```

Không chỉ ẩn nút ở frontend. Backend vẫn phải trả `403`.

ví dụ: 
Quản lý chi nhánh A
→ gọi approve-payment cho phiếu cọc chi nhánh B
→ 403 BRANCH_ACCESS_DENIED
