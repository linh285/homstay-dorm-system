# HomeStay Dorm — Bản đồ gọi hàm 3 lớp (GUI · Service · Data)

Tài liệu liệt kê **các lớp/hàm gọi nhau qua 3 tầng** để vẽ *sơ đồ lớp 3 tầng* và
*sequence diagram*. Xem luồng nghiệp vụ ở [web-flows.md](web-flows.md).

Chuỗi gọi chuẩn của mọi request:

```
GUI (page) → feature-api fn → HTTP → Route
   → authenticate → requireRoles(...) → validate*/validateParams* (Zod)
   → Controller fn → Service.method → Repository.method(s) → Prisma → PostgreSQL
   ← (đi ngược lại; lỗi ném AppError → error.middleware → JSON {success:false})
```

---

## 0. Thành phần dùng chung (cross-cutting)

| Lớp | Thành phần | Vai trò |
|---|---|---|
| Presentation | `authenticate`, `requireRoles(...roles)` | giải mã cookie JWT → `request.currentUser`; chặn role |
| Presentation | `validate(schema)`, `validateParams(schema)` | Zod kiểm tra body/query/param → `validatedBody/Query/Params` |
| Presentation | `error.middleware`, `not-found.middleware` | chuyển `AppError`→JSON; 404 |
| Service | `assertBranchAccess(user, branchId)` / `canAccessBranch` | giới hạn chi nhánh |
| Service | `withTransaction(cb)` | bọc thao tác nhiều bảng trong 1 transaction Prisma |
| Service/Data | `nextId(tx, model, prefix)`, `nextIdSeries(...)` | sinh mã tuần tự (P049, B193, D055…) |
| Shared | `AppError(status, code, message, details?)` | lỗi nghiệp vụ có mã |
| Data | `prisma` (PrismaClient), `Prisma.TransactionClient` | truy cập PostgreSQL |

`currentUser: { id, role, branchId }` là thuộc tính xuyên suốt, service dùng để kiểm
tra role/branch.

---

## 1. Catalog lớp theo tầng (cho sơ đồ lớp 3 tầng)

Ký hiệu: **GUI** = React; **P** = Presentation (route/validator/controller);
**S** = Service; **D** = Data (repository + Prisma model).

### 1.1 Auth
- GUI: `LoginPage`, `AuthProvider` → `auth-api` (`login`, `logout`, `getCurrentEmployee`).
- P: `auth.routes` → `auth.controller` → `auth.validator`.
- S: `AuthService` { `login`, `getCurrentEmployee`, `signToken`, `verifyToken` }.
- D: `AccountRepository` → models `Account`, `Employee`.

### 1.2 Rooms & Beds
- GUI: `RoomsPage` → `rooms-api` (`listRooms`, `getRoom`, `getRoomAvailability`,
  `createRoom`, `updateRoom`, `addBed`, `updateBed`, `listServices`, `listAssetTypes`,
  `getRoomAssets`, `putRoomServices`, `putRoomAssets`).
- P: `room.routes` (`roomRouter`, `bedRouter`, `catalogRouter`) → `room.controller` →
  `room.validator`.
- S: **`RoomService`** { `list, get, availability, create, update, addBed, updateBed,
  listServices, listAssetTypes, getAssets, replaceServices, replaceAssets` }; helper
  `bedBusinessStatus`, `assertNoProtectedAllocation`, `readBranchScope`, `getManagerBranchId`.
- D: **`RoomRepository`** { `findMany, findById, findBranchOfRoom, createRoom, updateRoom,
  findBedById, findBedByName, createBed, updateBed, activeAllocationsForRoom, listServices,
  listAssetTypes, findServicesByIds, findAssetTypesByIds, replaceRoomServices,
  listRoomServices, listRoomAssets, hasProtectedRoomAssets, replaceRoomAssets` } → models
  `Room, Bed, Service, AssetType, RoomService, RoomAsset, BedAllocation`.

### 1.3 Viewings
- GUI: `ViewingsPage` → `viewings-api` (`listViewings, getViewing, createViewing,
  confirmViewing, rescheduleViewing, cancelViewing, noShowViewing, confirmVisited,
  recordResult`) + `createDepositFromViewing`.
- P: `viewing.routes` → `viewing.controller` → `viewing.validator`.
- S: **`ViewingService`** { `list, get, create, update, confirm, reschedule, cancel,
  noShow, confirmVisited, recordResult` }; helper `transition, assertRoomsInBranch,
  getAccessibleViewing, getSaleBranchId`.
- D: **`ViewingRepository`** { `findMany, findById, findRentalRequest, findRoomsInBranch,
  createViewing, updateViewing, replaceDetails, markDetailInterested,
  updateRentalRequestStatus` } → models `Viewing, ViewingDetail, RentalRequest, Room`.

### 1.4 Deposits (+ job)
- GUI: `DepositsPage` → `deposits-api` (`listDeposits, getDeposit,
  createDepositFromViewing, confirmCustomerRules, submitRoomCheck, approveRoom, rejectRoom,
  issuePaymentRequest, recordPayment, approvePayment, requestPaymentRecheck, rejectPayment,
  scheduleCheckIn, cancelDeposit`).
- P: `deposit.routes` → `deposit.controller` → `deposit.validator`.
- S: **`DepositService`** { `list, get, createFromViewing, confirmCustomerRules,
  submitRoomCheck, approveRoom, rejectRoom, issuePaymentRequest, recordPayment,
  approvePayment, requestPaymentRecheck, rejectPayment, scheduleCheckIn, cancel` }; helper
  `mutate, assertBedsAvailable, serialize, availableActions, getBranchId, requireRole`.
  **`DepositExpirationService`** { `run(now)` } ← gọi bởi `startExpireDepositHoldsJob`.
- D: **`DepositRepository`** { `findMany, findById, countActiveForRequest,
  findViewingForDeposit, findRoomBedIds, findBedsWithAllocations, createDeposit,
  updateDeposit, createPayment, updatePayment, findDepositPayment, createAllocation,
  endActiveAllocationsByDeposit, promoteHeldAllocations, findExpiredWaitingPayments` } →
  models `Deposit, DepositDetail, Payment, BedAllocation, Bed, Viewing, RentalRequest`.

### 1.5 Contracts / Nhận phòng
- GUI: `CheckInPage` → `checkin-api` (`listContracts, getContract,
  createContractFromDeposit, confirmArrival, updateResidents, submitEligibilityReview,
  approveResident, rejectResident, approveEligibility, stopCheckIn, recordPaperContract,
  confirmPaperSigning, createInitialPayment, recordInitialPayment, confirmInitialPayment,
  submitHandover`).
- P: `contract.routes` → `contract.controller` → `contract.validator`.
- S: **`ContractService`** { các method cùng tên use case }; helper `reviewResident, mutate,
  serialize, availableActions, getBranchId, requireRole`.
- D: **`ContractRepository`** { `findMany, findById, findByDepositId, findDepositForContract,
  createContract, updateContract, updateCustomer, findMember, updateMember,
  createContractBeds, deleteContractBeds, replaceContractServices, findServicesByIds,
  createPayment, createPaymentDetails, findInitialPayment, updatePayment` } → models
  `Contract, ContractBed, ContractService, RequestMember, Customer, Payment, PaymentDetail,
  Deposit`.

### 1.6 Handover / Bàn giao
- GUI: `HandoverDrawer` → `checkin-api` (`createHandover, getHandover, updateHandover,
  putHandoverAssets, completeHandover`).
- P: `handover.routes` (+ `POST /contracts/:contractId/handovers` khai báo trong
  `contract.routes`) → `handover.controller` → `handover.validator`.
- S: **`HandoverService`** { `get, createForContract, update, replaceAssets, complete` };
  helper `mutate, requireManager, serialize`.
- D: **`HandoverRepository`** { `findById, findByContractId, findContract, create, update,
  findRoomAssetsByIds, replaceAssets, updateContractStatus, occupyAllocations` } → models
  `Handover, HandoverAsset, Contract, BedAllocation, RoomAsset`.

### 1.7 Checkout & Inspection
- GUI: `CheckOutPage` → `checkout-api` (`listCheckouts, getCheckout, createCheckout,
  submitCheckout, cancelCheckout, createInspection, getInspection, updateInspection,
  putInspectionItems, completeInspection`).
- P: `checkout.routes` (`checkoutRouter`, `inspectionRouter`) → `checkout.controller` →
  `checkout.validator`.
- S: **`CheckoutService`** { `list, get, create, update, submit, cancel, createInspection,
  getInspection, updateInspection, replaceInspectionItems, completeInspection` }; helper
  `mutate, mutateInspection, serialize, serializeInspection, availableActions`.
- D: **`CheckoutRepository`** { `findMany, findById, findBySettlementId, findByInspectionId,
  findContract, findDeposit, countActiveForDeposit, createCheckout, updateCheckout,
  createInspection, findInspection, updateInspection, replaceInspectionItems,
  findRoomAssetsByIds` } → models `CheckoutRequest, CheckoutInspection,
  CheckoutInspectionItem, Contract, Deposit, RoomAsset`.

### 1.8 Settlement / Đối soát
- GUI: `SettlementDrawer` → `settlements-api` (`createSettlement, getSettlement,
  putDeductions, calculateSettlement, finalizeSettlement, customerAgreed,
  settlementDisputed, returnToAccountant, recordAdditionalPayment, recordRefund,
  confirmNoBalance, confirmLiquidation, completeCheckout`).
- P: `settlement.routes` (+ `POST /checkout-requests/:id/settlement` trong `checkout.routes`)
  → `settlement.controller` → `settlement.validator`.
- S: **`SettlementService`** { `get, createForCheckout, replaceDeductions, calculate,
  finalize, customerAgreed, disputed, returnToAccountant, recordAdditionalPayment,
  recordRefund, confirmNoBalance, confirmLiquidation, completeCheckout` }; hàm thuần
  `computeRefundRate(...)`; helper `recalculate, setStatus, isFinancialComplete, mutate,
  serialize, availableActions`. Dùng thêm `CheckoutRepository`.
- D: **`SettlementRepository`** { `findById, create, update, replaceDeductions, sumDeductions,
  updateCheckoutStatus, updateContractStatus, endAllocations, createPayment` } → models
  `Settlement, Deduction, Payment, CheckoutRequest, Contract, BedAllocation`.

### 1.9 Dashboard / Reporting / Administration / Rental requests
- `DashboardPage`→`dashboard-api`→`dashboard.controller`→**`DashboardService`**.get→`AdminRepository`.
- `ReportsPage`→`reporting-api`→`reporting.controller`→**`ReportingService`**
  { `branchSummary, systemSummary, occupancy, rentalFunnel` }→**`ReportingRepository`**
  { `getBedCounts, getRentalFunnel, getFinancialTotals, getOperationalCounts` }.
- `AdministrationPage`→`administration-api`→`administration.controller`→**`AdministrationService`**→**`AdministrationRepository`**.
- `RentalRequestsPage`/`RentalRequestDetailPage`→`rental-request-api`→`rental-request.controller`→**`RentalRequestService`**→**`RentalRequestRepository`**.

---

## 2. Chuỗi gọi theo use case (cho sequence diagram)

Mỗi mục: **Actor → GUI.fn → Route(middleware) → Controller → Service.method →
Repository.method → Model**; kèm *thuộc tính đọc/ghi chính*.

### UC-D4. Phát hành yêu cầu thanh toán cọc (ACCOUNTANT)
```
ACCOUNTANT
 └ DepositsPage: run(issuePaymentRequest(id))            [GUI]
   └ POST /deposits/:id/issue-payment-request
     └ authenticate → requireRoles('ACCOUNTANT') → validateDepositId
       └ deposit.controller.issuePaymentRequest         [P]
         └ DepositService.issuePaymentRequest(user,id)   [S]
            ├ requireRole(user,'ACCOUNTANT')
            └ mutate(user,id,['ROOM_APPROVED'], async tx):
               ├ DepositRepository.findById(id,tx)        → Deposit(+details,+allocations)
               ├ assertBedsAvailable(deposit,tx)
               │   └ DepositRepository.findBedsWithAllocations(bedIds,tx) → Bed,BedAllocation
               ├ DepositRepository.createPayment({type:DEPOSIT,amountDue,expiresAt=+24h,...},tx) → Payment
               ├ for bed: DepositRepository.createAllocation({type:HELD,status:ACTIVE},tx) → BedAllocation
               └ DepositRepository.updateDeposit(id,{status:'WAITING_PAYMENT'},tx) → Deposit
   ← serialize(deposit) {status, payment, allocations, availableActions}
```
*Thuộc tính:* `Deposit.totalDepositAmount`, `DepositDetail.bedId`, `Payment.amountDue/
expiresAt/status`, `BedAllocation.allocationType/status/expiresAt`.

### UC-D6. Manager xác nhận tiền cọc (MANAGER)
```
MANAGER → DepositsPage.run(approvePayment(id))
 → POST /deposits/:id/approve-payment (authenticate, requireRoles('MANAGER'))
 → deposit.controller.approvePayment → DepositService.approvePayment
    └ mutate(['WAITING_MANAGER_CONFIRMATION'], tx):
       ├ DepositRepository.findDepositPayment(id,tx)                  → Payment
       ├ (kiểm tra paidAt ≤ expiresAt, amountPaid == amountDue)
       ├ DepositRepository.updatePayment(pid,{status:'CONFIRMED',confirmedById,confirmedAt},tx)
       ├ DepositRepository.promoteHeldAllocations(id,tx)              → BedAllocation HELD→DEPOSITED
       └ DepositRepository.updateDeposit(id,{status:'DEPOSITED'},tx)  → Deposit
```

### UC-JOB. Hết hạn giữ giường 24h (System)
```
startExpireDepositHoldsJob (setInterval 5') → DepositExpirationService.run(now)
 ├ DepositRepository.findExpiredWaitingPayments(now) → Deposit[]
 └ for each: withTransaction(tx):
     ├ findById / findDepositPayment (còn WAITING_PAYMENT & quá hạn?)
     ├ updatePayment(status:'EXPIRED')
     ├ endActiveAllocationsByDeposit(id,now,tx)   → BedAllocation ACTIVE→ENDED
     └ updateDeposit(id,{status:'EXPIRED'})
```

### UC-V. Ghi nhận kết quả xem → tạo cọc (SALE)
```
SALE → ViewingsPage.recordResult / createDepositFromViewing
 ① POST /viewings/:id/result → viewing.controller.recordResult
    → ViewingService.recordResult → getAccessibleViewing → markDetailInterested
      → updateViewing(status:RESULT_RECORDED) → updateRentalRequestStatus(DEPOSIT_PROCESS)
      [Viewing, ViewingDetail, RentalRequest]
 ② POST /viewings/:id/create-deposit → deposit.controller.createDepositFromViewing
    → DepositService.createFromViewing(user,viewingId,{selectedBedIds})
       ├ findViewingForDeposit, countActiveForRequest, findBedsWithAllocations, findRoomBedIds
       └ createDeposit({status:DRAFT}, details[]) [Deposit, DepositDetail]
```

### UC-C. Nhận phòng: từ cọc → sẵn sàng bàn giao
```
SALE createFromDeposit → POST /contracts/from-deposit/:depositId
  → ContractService.createFromDeposit → findDepositForContract → createContract(CHECKIN_DRAFT)
SALE confirmArrival → PUT residents (updateMember) → submitEligibilityReview(WAITING_ELIGIBILITY)
MANAGER approve/reject-resident (updateMember: eligibilityResult) → approveEligibility(ELIGIBILITY_APPROVED)
SALE record-paper-contract (createContractBeds, replaceContractServices) → confirm-paper-signing(PAPER_SIGNED)
ACCOUNTANT create-initial-payment (createPayment+createPaymentDetails, WAITING_INITIAL_PAYMENT)
          → record/confirm-initial-payment (updatePayment) → submit-handover(READY_FOR_HANDOVER)
 [Contract, ContractBed, ContractService, RequestMember, Payment, PaymentDetail]
```

### UC-H. Hoàn tất bàn giao (MANAGER)
```
MANAGER → HandoverDrawer.completeHandover → POST /handovers/:id/complete
 → handover.controller.completeHandover → HandoverService.complete
    └ mutate(tx):
       ├ (checklist utilitiesGuided/safetyGuided/paperRecordSigned = true?)
       ├ HandoverRepository.updateContractStatus(contractId,'ACTIVE')      → Contract
       ├ HandoverRepository.occupyAllocations(depositId,contractId,tx)     → BedAllocation DEPOSITED→OCCUPIED
       └ HandoverRepository.update(id,{status:'COMPLETED',handedOverAt})   → Handover
```

### UC-CO. Trả phòng: yêu cầu → kiểm tra → tạo đối soát
```
SALE  POST /checkout-requests            → CheckoutService.create   (findContract/findDeposit, createCheckout DRAFT)
SALE  POST /checkout-requests/:id/submit → CheckoutService.submit   (updateCheckout WAITING_INSPECTION)
MANAGER POST .../:id/inspection          → CheckoutService.createInspection (createInspection DRAFT)
MANAGER PATCH/PUT /checkout-inspections/:id[/items] → updateInspection / replaceInspectionItems
MANAGER POST /checkout-inspections/:id/complete → completeInspection
        (updateInspection COMPLETED + updateCheckout INSPECTED)
ACCOUNTANT POST /checkout-requests/:id/settlement → SettlementService.createForCheckout
        ├ CheckoutRepository.findById(checkoutId,tx)
        ├ computeRefundRate({hasContract, startsOn, endsOn, checkoutDate})
        └ SettlementRepository.create({refundRate, baseRefundAmount, status:WAITING_SETTLEMENT})
          + updateCheckoutStatus(WAITING_SETTLEMENT)
 [CheckoutRequest, CheckoutInspection, CheckoutInspectionItem, Settlement]
```

### UC-S. Đối soát → hoàn tất trả phòng
```
ACCOUNTANT PUT /settlements/:id/deductions → replaceDeductions + recalculate
        (SettlementRepository.replaceDeductions → Deduction; sumDeductions;
         update{totalDeductions, finalBalance, result})
ACCOUNTANT POST .../finalize → setStatus(WAITING_CUSTOMER_CONFIRMATION) [Settlement+CheckoutRequest]
MANAGER   POST .../customer-agreed → setStatus(WAITING_FINANCIAL_COMPLETION)
          | POST .../disputed → DISPUTED → .../return-to-accountant → WAITING_SETTLEMENT
ACCOUNTANT POST .../record-refund | record-additional-payment | confirm-no-balance
          (createPayment → Payment; setStatus(READY_TO_COMPLETE))
MANAGER   POST .../confirm-liquidation (update cờ paperCheckoutSigned/contractLiquidated/keysRecovered/customerLeft)
MANAGER   POST .../complete-checkout → SettlementService.completeCheckout
          └ mutate(['READY_TO_COMPLETE'], tx):
             ├ isFinancialComplete(settlement,tx)
             ├ SettlementRepository.updateCheckoutStatus(COMPLETED, actualCheckoutAt)
             ├ SettlementRepository.updateContractStatus(LIQUIDATED)        → Contract
             ├ SettlementRepository.endAllocations(depositId,now)           → BedAllocation OCCUPIED/DEPOSITED→ENDED
             └ setStatus(COMPLETED)
```
*Công thức (Service, không ở GUI):*
`baseRefund = originalDeposit × refundRate/100`; `finalBalance = baseRefund − Σdeductions`;
`result = >0 REFUND_TO_CUSTOMER | <0 CUSTOMER_PAYS_ADDITIONAL | =0 NO_BALANCE`.

### UC-R. Phòng & giường (đại diện cho CRUD + tính trạng thái)
```
SALE/MANAGER/ADMIN GET /rooms → RoomService.list
   └ RoomRepository.findMany(where, page, size) → Room(+beds+allocations)
      → map: availableBeds, minRent/maxRent, businessStatus(bedBusinessStatus từ BedAllocation)
MANAGER POST /rooms → RoomService.create → nextId(tx,'room','P') → RoomRepository.createRoom
MANAGER POST /rooms/:id/beds → RoomService.addBed → findBranchOfRoom, findBedByName,
        nextId(tx,'bed','B'), createBed
MANAGER PUT /rooms/:id/assets → RoomService.replaceAssets → nextIdSeries('roomAsset','RA') →
        replaceRoomAssets
```

---

## 3. Ma trận tầng ↔ bảng (cho sơ đồ lớp)

| Service | Repository | Prisma models / bảng |
|---|---|---|
| RoomService | RoomRepository | phong, giuong, dich_vu, loai_tai_san, phong_dich_vu, phong_tai_san, phan_bo_giuong |
| ViewingService | ViewingRepository | lich_xem_phong, chi_tiet_lich_xem, yeu_cau_thue, phong |
| DepositService, DepositExpirationService | DepositRepository | dat_coc, chi_tiet_dat_coc, thanh_toan, phan_bo_giuong, giuong, lich_xem_phong |
| ContractService | ContractRepository | hop_dong_thue, hop_dong_cho_o, hop_dong_dich_vu, thanh_vien_yeu_cau, khach_hang, thanh_toan, chi_tiet_thanh_toan |
| HandoverService | HandoverRepository | ban_giao, ban_giao_tai_san, hop_dong_thue, phan_bo_giuong, phong_tai_san |
| CheckoutService | CheckoutRepository | yeu_cau_tra_phong, bien_ban_kiem_tra_tra, chi_tiet_kiem_tra_tra, hop_dong_thue, dat_coc |
| SettlementService | SettlementRepository (+CheckoutRepository) | doi_soat_tra_phong, chi_tiet_khau_tru, thanh_toan, yeu_cau_tra_phong, hop_dong_thue, phan_bo_giuong |
| DashboardService / ReportingService | AdminRepository / ReportingRepository | tổng hợp nhiều bảng (đọc) |
| AdministrationService | AdministrationRepository | nhan_vien, chi_nhanh |
| RentalRequestService | RentalRequestRepository | yeu_cau_thue, thanh_vien_yeu_cau, khach_hang |

> Gợi ý vẽ: **3 cột** (Presentation · Service · Data). Mũi tên đơn hướng trái→phải cho
> lời gọi; mỗi Controller nối tới đúng 1 Service; mỗi Service nối tới 1 Repository chính
> (Settlement có thêm CheckoutRepository); mỗi Repository nối tới các Model ở cột Data.
> Sequence diagram: dùng các khối ở **mục 2**, mỗi dòng là một message.
