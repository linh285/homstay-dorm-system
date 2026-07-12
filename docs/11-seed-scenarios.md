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

| Mã | Hồ sơ | Trạng thái demo |
| --- | --- | --- |
| `DEMO-RR-NEW` | Rental Request | `ACTIVE` |
| `DEMO-RR-WHOLE-ROOM` | Rental Request | `ACTIVE`, thuê nguyên phòng |
| `DEMO-RR-SHARED-BEDS` | Rental Request | `ACTIVE`, ở ghép |
| `DEMO-VIEWING-TODAY` | Viewing | `CONFIRMED` |
| `DEMO-DEPOSIT-WAITING` | Deposit | `WAITING_PAYMENT` |
| `DEMO-DEPOSIT-EXPIRING` | Deposit | `WAITING_PAYMENT` gần hết hạn |
| `DEMO-PAYMENT-RECHECK` | Deposit/Payment | `PAYMENT_RECHECK` |
| `DEMO-DEPOSIT-APPROVAL` | Deposit | `WAITING_MANAGER_CONFIRMATION` |
| `DEMO-CHECKIN` | Contract | `ARRIVED` |
| `DEMO-HANDOVER` | Handover | `DRAFT` |
| `DEMO-CHECKOUT-NO-CONTRACT` | Checkout | `WAITING_SETTLEMENT` |
| `DEMO-SETTLEMENT-6-MONTHS` | Settlement | hoàn 50% đúng sáu tháng |
| `DEMO-SETTLEMENT-REFUND` | Settlement | chờ ghi nhận hoàn tiền |
| `DEMO-SETTLEMENT-EXTRA` | Settlement | chờ ghi nhận thu thêm |
| `DEMO-SETTLEMENT-ZERO` | Settlement | chờ xác nhận số dư bằng 0 |

Lệnh thực tế và danh sách tài khoản demo được duy trì trong `README.md` và
`docs/demo-scenarios.md`. Seed có thể chạy lại: không bật reset thì upsert theo
khóa cố định; bật reset thì xóa/tạo lại bộ dữ liệu demo của profile đã chọn.
