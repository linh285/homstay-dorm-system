# Demo scenarios

File này mô tả các hồ sơ cố định được tạo bởi Prisma seed để nhóm demo nhanh theo
từng màn hình. Dữ liệu chỉ dùng cho development/demo, không dùng cho production.

Mật khẩu mặc định của tài khoản demo là `Password123!`, có thể đổi bằng
`SEED_PASSWORD`.

| Mã scenario | Chi nhánh | Tài khoản nên dùng (large) | Màn hình | Mã hồ sơ | Trạng thái hiện tại | Hành động có thể demo tiếp theo |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-RR-NEW | CN001 | sale00102 | UI-05 Danh sách yêu cầu thuê | RR001 | ACTIVE | Cập nhật thông tin hoặc thêm thành viên dự kiến. |
| DEMO-RR-WHOLE-ROOM | CN002 | sale00201 | UI-06 Chi tiết yêu cầu thuê | RR002 | ACTIVE | Demo nhu cầu thuê nguyên phòng. |
| DEMO-RR-SHARED-BEDS | CN003 | sale00302 | UI-06 Chi tiết yêu cầu thuê | RR003 | ACTIVE | Demo nhu cầu thuê ghép nhiều giường. |
| DEMO-VIEWING-TODAY | CN001 | sale01 | Lịch xem phòng | V001 | CONFIRMED | Xác nhận khách đã xem phòng. |
| DEMO-DEPOSIT-WAITING | CN003 | accountant00301 | Đặt cọc | D001 | WAITING_PAYMENT | Ghi nhận khách thanh toán trong hạn. |
| DEMO-DEPOSIT-EXPIRING | CN004 | accountant00402 | Đặt cọc | D002 | WAITING_PAYMENT | Demo phiếu sắp hết hạn thanh toán 24 giờ. |
| DEMO-PAYMENT-RECHECK | CN003 | accountant00301 | Đặt cọc | D005 | PAYMENT_RECHECK | Sửa thông tin kiểm tra giao dịch cũ rồi gửi lại Manager. |
| DEMO-DEPOSIT-APPROVAL | CN002 | manager00201 | Đặt cọc | D004 | WAITING_MANAGER_CONFIRMATION | Manager xác nhận tiền cọc hợp lệ. |
| DEMO-CHECKIN | CN004 | sale00401 | Nhận phòng | C001 | ARRIVED | Cập nhật thông tin cư trú và gửi duyệt điều kiện. |
| DEMO-HANDOVER | CN001 | manager01 | Bàn giao | H001 | DRAFT | Hoàn tất checklist bàn giao. |
| DEMO-CHECKOUT-NO-CONTRACT | CN004 | accountant00401 | Đối soát trả phòng | CO001 | WAITING_SETTLEMENT | Demo hoàn cọc 80% cho khách chỉ mới đặt cọc. |
| DEMO-SETTLEMENT-6-MONTHS | CN004 | accountant00402 | Đối soát trả phòng | S002 | WAITING_CUSTOMER_CONFIRMATION | Kiểm tra tỷ lệ hoàn 50% khi ở đúng 6 tháng. |
| DEMO-SETTLEMENT-REFUND | CN001 | accountant01 | Đối soát trả phòng | S003 | WAITING_FINANCIAL_COMPLETION | Ghi nhận hoàn tiền cọc cho khách. |
| DEMO-SETTLEMENT-EXTRA | CN002 | accountant00202 | Đối soát trả phòng | S004 | WAITING_FINANCIAL_COMPLETION | Ghi nhận khách thanh toán thêm. |
| DEMO-SETTLEMENT-ZERO | CN003 | accountant00301 | Đối soát trả phòng | S005 | WAITING_FINANCIAL_COMPLETION | Dùng confirm-no-balance để chốt số dư bằng 0. |

## Lệnh seed demo lớn

```bash
docker compose exec -e ALLOW_DEMO_RESET=true -e SEED_PROFILE=large api npm run prisma:seed --workspace @homestay/api
```

Chạy verify độc lập:

```bash
docker compose exec -e SEED_PROFILE=large api npm run prisma:seed:verify --workspace @homestay/api
```
