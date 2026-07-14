# HomeStay Dorm — Các luồng nghiệp vụ trên web

Tài liệu mô tả các luồng chính của hệ thống theo đúng code hiện tại: role thực hiện,
màn hình, endpoint API và chuyển trạng thái. Dùng kèm
[call-map-3-layer.md](call-map-3-layer.md) để vẽ sequence diagram.

## Kiến trúc 3 lớp

```
React (GUI)  →  Route → Validator → Controller (Presentation)
             →  Service (nghiệp vụ, transaction, kiểm tra role/branch/state)
             →  Repository → Prisma → PostgreSQL (Data)
```

Quy tắc: Controller không gọi Prisma; React không tính tiền; Repository không quyết
định nghiệp vụ; cập nhật nhiều bảng chạy trong transaction; mỗi chuyển trạng thái là
một endpoint nghiệp vụ riêng (không có API đổi trạng thái chung).

## Vai trò

| Role | Phạm vi chính |
|---|---|
| SALE | Yêu cầu thuê, lịch xem, tạo cọc, nhận phòng (bước Sale), tạo yêu cầu trả phòng |
| ACCOUNTANT | Phát hành/ghi nhận thanh toán, tạo & tính đối soát, thu thêm/hoàn tiền |
| MANAGER | Duyệt phòng/cọc, duyệt cư trú, bàn giao, kiểm tra trả phòng, thanh lý & hoàn tất |
| ADMIN | Xem nhân viên/chi nhánh, cập nhật chi nhánh, báo cáo toàn hệ thống |

Mọi thao tác đều bị giới hạn theo **chi nhánh** của nhân viên (Admin xem toàn hệ thống).

---

## 1. Đăng nhập & phân quyền

- **Màn hình:** `LoginPage`.
- **Luồng:** nhập username/password → `POST /auth/login` → nhận cookie HTTP-only (JWT).
  Mọi request sau đính kèm cookie; middleware `authenticate` giải mã, `requireRoles`
  chặn theo role, service kiểm tra chi nhánh.
- `GET /auth/me` khôi phục phiên; `POST /auth/logout` xóa cookie.

---

## 2. Yêu cầu thuê (SALE)

- **Màn hình:** `RentalRequestsPage`, `RentalRequestDetailPage`.
- **Trạng thái:** `ACTIVE → VIEWING → DEPOSIT_PROCESS → CLOSED`.
- **Luồng:**
  1. Sale tạo khách đại diện + yêu cầu thuê → `POST /rental-requests` (tạo thẳng `ACTIVE`).
  2. Thêm/sửa/xóa thành viên dự kiến → `POST/PATCH/DELETE /rental-requests/:id/members`.
  3. Sửa nhu cầu → `PATCH /rental-requests/:id`; đóng hồ sơ → `POST /rental-requests/:id/close`.

---

## 3. Phòng & giường (MANAGER sửa, SALE/ADMIN xem)

- **Màn hình:** `RoomsPage` (danh sách + drawer chi tiết).
- **Luồng:**
  - Xem danh sách/chi tiết → `GET /rooms`, `GET /rooms/:id`, `GET /rooms/:id/availability`.
  - Manager: tạo/sửa phòng (`POST /rooms`, `PATCH /rooms/:id`), thêm/sửa giường
    (`POST /rooms/:id/beds`, `PATCH /beds/:id`), cập nhật dịch vụ/tài sản
    (`PUT /rooms/:id/services`, `PUT /rooms/:id/assets`).
- **Quy tắc:** trạng thái kinh doanh của giường tính từ `BedAllocation` (AVAILABLE/HELD/
  DEPOSITED/OCCUPIED); không cho chuyển phòng/giường sang MAINTENANCE/OUT_OF_SERVICE khi
  còn allocation DEPOSITED/OCCUPIED.

---

## 4. Lịch xem phòng (SALE)

- **Màn hình:** `ViewingsPage`.
- **Trạng thái lịch:** `SCHEDULED → CONFIRMED → VISITED → RESULT_RECORDED`
  (nhánh phụ: `CANCELLED`, `NO_SHOW`; reschedule đưa về `SCHEDULED`).
- **Luồng:**
  1. Tạo lịch (nhiều phòng) → `POST /viewings` (yêu cầu thuê `ACTIVE`→`VIEWING`).
  2. `POST /viewings/:id/confirm` → CONFIRMED; `.../reschedule`, `.../cancel`, `.../no-show`.
  3. `POST /viewings/:id/confirm-visited` → VISITED.
  4. `POST /viewings/:id/result` → RESULT_RECORDED; cập nhật yêu cầu thuê theo kết quả
     (`CUSTOMER_WANTS_DEPOSIT`→DEPOSIT_PROCESS; `NOT_INTERESTED`→CLOSED; …).
  5. Nếu khách muốn cọc: `POST /viewings/:id/create-deposit` (gửi `selectedBedIds`).

---

## 5. Đặt cọc (7 bước) + job hết hạn 24 giờ

- **Màn hình:** `DepositsPage` (stepper).
- **Trạng thái phiếu cọc:** `DRAFT → WAITING_ROOM_CHECK → ROOM_APPROVED → WAITING_PAYMENT
  → WAITING_MANAGER_CONFIRMATION → DEPOSITED` (nhánh: `ROOM_REJECTED`, `PAYMENT_RECHECK`,
  `PAYMENT_REJECTED`, `EXPIRED`, `CANCELLED`).
- **Allocation:** `HELD → DEPOSITED → OCCUPIED → ENDED`.
- **Luồng:**
  1. (SALE) Tạo phiếu từ lịch xem → `POST /viewings/:id/create-deposit` (DRAFT).
  2. (SALE) Xác nhận nội quy → `POST /deposits/:id/confirm-customer-rules`; gửi kiểm tra
     phòng → `POST /deposits/:id/submit-room-check` (→ WAITING_ROOM_CHECK).
  3. (MANAGER) `POST /deposits/:id/approve-room` (→ ROOM_APPROVED) hoặc `.../reject-room`.
  4. (ACCOUNTANT) `POST /deposits/:id/issue-payment-request`: **1 transaction** tạo
     Payment (DEPOSIT), tạo allocation `HELD` cho từng giường, hạn = phát hành + 24h
     (→ WAITING_PAYMENT).
  5. (ACCOUNTANT) `POST /deposits/:id/record-payment`: đúng hạn, đủ tiền, đã kiểm chứng từ
     (→ WAITING_MANAGER_CONFIRMATION).
  6. (MANAGER) `POST /deposits/:id/approve-payment`: **1 transaction** Payment→CONFIRMED,
     phiếu→DEPOSITED, allocation `HELD → DEPOSITED`. (Hoặc `request-payment-recheck` /
     `reject-payment` — reject kết thúc allocation HELD.)
  7. (SALE) `POST /deposits/:id/schedule-check-in` hẹn ngày nhận phòng.
- **Job:** `expire-deposit-holds.job` chạy mỗi 5 phút → `DepositExpirationService.run()`:
  phiếu còn `WAITING_PAYMENT` quá hạn → EXPIRED, Payment→EXPIRED, allocation HELD→ENDED
  (idempotent). Hủy ở WAITING_PAYMENT (`.../cancel`) cũng kết thúc allocation.

---

## 6. Nhận phòng & hợp đồng (SALE, MANAGER, ACCOUNTANT)

- **Màn hình:** `CheckInPage` (stepper).
- **Trạng thái hợp đồng:** `CHECKIN_DRAFT → ARRIVED → WAITING_ELIGIBILITY →
  ELIGIBILITY_APPROVED → PAPER_SIGNED → WAITING_INITIAL_PAYMENT → READY_FOR_HANDOVER →
  ACTIVE` (nhánh dừng: `CHECKIN_STOPPED`).
- **Luồng:**
  1. (SALE) Tạo hồ sơ từ phiếu cọc DEPOSITED → `POST /contracts/from-deposit/:depositId`.
  2. (SALE) `POST /contracts/:id/confirm-arrival` (→ ARRIVED); cập nhật người cư trú
     `PUT /contracts/:id/residents`; gửi duyệt `POST /contracts/:id/submit-eligibility-review`
     (→ WAITING_ELIGIBILITY).
  3. (MANAGER) duyệt/từ chối từng người
     `POST /contracts/:id/residents/:customerId/approve|reject`; `.../approve-eligibility`
     (→ ELIGIBILITY_APPROVED) hoặc `.../stop-check-in`.
  4. (SALE) `POST /contracts/:id/record-paper-contract` (tạo `ContractBed`/`ContractService`);
     `.../confirm-paper-signing` (→ PAPER_SIGNED).
  5. (ACCOUNTANT) `POST /contracts/:id/create-initial-payment` (→ WAITING_INITIAL_PAYMENT);
     `.../record-initial-payment`; `.../confirm-initial-payment`; `.../submit-handover`
     (kiểm tra đủ 3 điều kiện → READY_FOR_HANDOVER).

---

## 7. Bàn giao phòng & tài sản (MANAGER)

- **Màn hình:** `HandoverDrawer` (mở từ `CheckInPage`).
- **Trạng thái bàn giao:** `DRAFT → COMPLETED`.
- **Luồng:**
  1. `POST /contracts/:contractId/handovers` tạo biên bản DRAFT.
  2. `PATCH /handovers/:id` (hiện trạng, checklist), `PUT /handovers/:id/assets` (tài sản giao).
  3. `POST /handovers/:id/complete`: **1 transaction** hợp đồng → ACTIVE, allocation
     `DEPOSITED → OCCUPIED`.

---

## 8. Trả phòng, đối soát & hoàn cọc (SALE, MANAGER, ACCOUNTANT)

- **Màn hình:** `CheckOutPage` (yêu cầu + drawer kiểm tra); `SettlementDrawer` (đối soát).
- **Trạng thái (dùng cho cả CheckoutRequest và Settlement):**
  `DRAFT → WAITING_INSPECTION → INSPECTED → WAITING_SETTLEMENT →
  WAITING_CUSTOMER_CONFIRMATION → WAITING_FINANCIAL_COMPLETION → READY_TO_COMPLETE →
  COMPLETED` (nhánh: `DISPUTED → WAITING_SETTLEMENT`; `CANCELLED`).
- **Luồng:**
  1. (SALE) `POST /checkout-requests` (contractId hoặc depositId); `.../submit`
     (→ WAITING_INSPECTION, chỉ khi có hợp đồng); `.../cancel`.
  2. (MANAGER) `POST /checkout-requests/:id/inspection` tạo biên bản; `PATCH /checkout-inspections/:id`,
     `PUT /checkout-inspections/:id/items`; `POST /checkout-inspections/:id/complete`
     (→ INSPECTED).
  3. (ACCOUNTANT) `POST /checkout-requests/:id/settlement`: tạo đối soát, tính tỷ lệ hoàn
     (80% chưa ký HĐ / 50% ≤6 tháng / 70% >6 tháng / 100% hết hạn) và tiền hoàn cơ bản
     (→ WAITING_SETTLEMENT). Hồ sơ chỉ-cọc-chưa-ký tạo đối soát trực tiếp từ DRAFT.
  4. (ACCOUNTANT) `PUT /settlements/:id/deductions` (nhập khấu trừ, tự tính số dư),
     `.../calculate`, `.../finalize` (→ WAITING_CUSTOMER_CONFIRMATION).
  5. (MANAGER) `.../customer-agreed` (→ WAITING_FINANCIAL_COMPLETION) hoặc `.../disputed`
     → `.../return-to-accountant` (→ WAITING_SETTLEMENT).
  6. (ACCOUNTANT) tùy số dư: `.../record-refund` / `.../record-additional-payment` /
     `.../confirm-no-balance` (→ READY_TO_COMPLETE).
  7. (MANAGER) `.../confirm-liquidation` (ký biên bản, thanh lý, thu khóa, khách rời phòng);
     `.../complete-checkout`: **1 transaction** checkout→COMPLETED, hợp đồng→LIQUIDATED,
     allocation OCCUPIED/DEPOSITED→ENDED (giường trở lại AVAILABLE).

---

## 9. Dashboard & báo cáo

- **Dashboard** (`DashboardPage`): `GET /dashboard` trả counter theo role + chi nhánh.
- **Báo cáo** (`ReportsPage`): `GET /reports/branch-summary` (Manager) hoặc
  `.../system-summary` (Admin), `.../occupancy`, `.../rental-funnel`.
- **Nhân viên & chi nhánh** (`AdministrationPage`, ADMIN): `GET /employees`, `GET /branches`,
  `GET /branches/:id`, `PATCH /branches/:id`.
