# HomeStay Dorm — Seed Scenarios

Seed chạy qua `apps/api/prisma/seed.ts`, đọc `SEED_PROFILE`, `SEED_PASSWORD` và
`ALLOW_DEMO_RESET`. Profile mặc định là `demo`; chỉ cho phép reset dữ liệu demo
khi `ALLOW_DEMO_RESET=true` và không dùng cho production.

| Profile | Mục đích |
| --- | --- |
| `small` | Dữ liệu tối thiểu cho kiểm tra nhanh. |
| `demo` | Dữ liệu phát triển hằng ngày, là profile mặc định. |
| `large` | Dữ liệu đa dạng để demo đầy đủ workflow và báo cáo. |

Các mã scenario được tạo trong `apps/api/prisma/seed/scenarios.ts` và được kiểm
tra bởi `apps/api/prisma/seed/verify.ts`:

| Mã | Hồ sơ | Chi nhánh | Tài khoản có quyền thao tác (large) | Trạng thái demo |
| --- | --- | --- | --- | --- |
| `DEMO-RR-NEW` | `RR001` Rental Request | CN001 | `sale00102` | `ACTIVE` |
| `DEMO-RR-WHOLE-ROOM` | `RR002` Rental Request | CN002 | `sale00201` | `ACTIVE`, thuê nguyên phòng |
| `DEMO-RR-SHARED-BEDS` | `RR003` Rental Request | CN003 | `sale00302` | `ACTIVE`, ở ghép |
| `DEMO-VIEWING-TODAY` | `V001` Viewing | CN001 | `sale01` | `CONFIRMED` |
| `DEMO-DEPOSIT-WAITING` | `D001` Deposit | CN003 | `accountant00301` | `WAITING_PAYMENT` |
| `DEMO-DEPOSIT-EXPIRING` | `D002` Deposit | CN004 | `accountant00402` | `WAITING_PAYMENT` gần hết hạn |
| `DEMO-PAYMENT-RECHECK` | `D005` Deposit/Payment | CN003 | `accountant00301` | `PAYMENT_RECHECK` |
| `DEMO-DEPOSIT-APPROVAL` | `D004` Deposit | CN002 | `manager00201` | `WAITING_MANAGER_CONFIRMATION` |
| `DEMO-CHECKIN` | `C001` Contract | CN004 | `sale00401` | `ARRIVED` |
| `DEMO-HANDOVER` | `H001` Handover | CN001 | `manager01` | `DRAFT` |
| `DEMO-CHECKOUT-NO-CONTRACT` | `CO001` Checkout | CN004 | `accountant00401` | `WAITING_SETTLEMENT` |
| `DEMO-SETTLEMENT-6-MONTHS` | `S002` Settlement | CN004 | `accountant00402` | hoàn 50% đúng sáu tháng |
| `DEMO-SETTLEMENT-REFUND` | `S003` Settlement | CN001 | `accountant01` | chờ ghi nhận hoàn tiền |
| `DEMO-SETTLEMENT-EXTRA` | `S004` Settlement | CN002 | `accountant00202` | chờ ghi nhận thu thêm |
| `DEMO-SETTLEMENT-ZERO` | `S005` Settlement | CN003 | `accountant00301` | chờ xác nhận số dư bằng 0 |

Lệnh thực tế và danh sách tài khoản demo được duy trì trong `README.md` và
`docs/demo-scenarios.md`. Seed có thể chạy lại: không bật reset thì upsert theo
khóa cố định; bật reset thì xóa/tạo lại bộ dữ liệu demo của profile đã chọn.
