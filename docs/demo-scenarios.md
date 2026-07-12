# Demo scenarios

File này mô tả các hồ sơ cố định được tạo bởi Prisma seed để nhóm demo nhanh theo
từng màn hình. Dữ liệu chỉ dùng cho development/demo, không dùng cho production.

Mật khẩu mặc định của tài khoản demo là `Password123!`, có thể đổi bằng
`SEED_PASSWORD`.

| Mã scenario | Tài khoản nên dùng | Màn hình | Mã hồ sơ | Trạng thái hiện tại | Hành động có thể demo tiếp theo |
| --- | --- | --- | --- | --- | --- |
| DEMO-RR-NEW | sale01 | UI-05 Danh sách yêu cầu thuê | RR001 | ACTIVE | Cập nhật thông tin hoặc thêm thành viên dự kiến. |
| DEMO-RR-WHOLE-ROOM | sale01 | UI-06 Chi tiết yêu cầu thuê | RR002 | ACTIVE | Demo nhu cầu thuê nguyên phòng. |
| DEMO-RR-SHARED-BEDS | sale01 | UI-06 Chi tiết yêu cầu thuê | RR003 | ACTIVE | Demo nhu cầu thuê ghép nhiều giường. |
| DEMO-VIEWING-TODAY | sale01 | Lịch xem phòng | V001 | CONFIRMED | Xác nhận khách đã xem phòng. |
| DEMO-DEPOSIT-WAITING | accountant01 | Đặt cọc | D001 | WAITING_PAYMENT | Ghi nhận khách thanh toán trong hạn. |
| DEMO-DEPOSIT-EXPIRING | accountant01 | Đặt cọc | D002 | WAITING_PAYMENT | Demo phiếu sắp hết hạn thanh toán 24 giờ. |
| DEMO-PAYMENT-RECHECK | accountant01 | Đặt cọc | D005 | PAYMENT_RECHECK | Sửa thông tin kiểm tra giao dịch cũ rồi gửi lại Manager. |
| DEMO-DEPOSIT-APPROVAL | manager01 | Đặt cọc | D004 | WAITING_MANAGER_CONFIRMATION | Manager xác nhận tiền cọc hợp lệ. |
| DEMO-CHECKIN | sale01 | Nhận phòng | C001 | ARRIVED | Cập nhật thông tin cư trú và gửi duyệt điều kiện. |
| DEMO-HANDOVER | manager01 | Bàn giao | H001 | DRAFT | Hoàn tất checklist bàn giao. |
| DEMO-CHECKOUT-NO-CONTRACT | accountant01 | Đối soát trả phòng | CO001 | WAITING_SETTLEMENT | Demo hoàn cọc 80% cho khách chỉ mới đặt cọc. |
| DEMO-SETTLEMENT-6-MONTHS | accountant01 | Đối soát trả phòng | S002 | WAITING_CUSTOMER_CONFIRMATION | Kiểm tra tỷ lệ hoàn 50% khi ở đúng 6 tháng. |
| DEMO-SETTLEMENT-REFUND | accountant01 | Đối soát trả phòng | S003 | WAITING_FINANCIAL_COMPLETION | Ghi nhận hoàn tiền cọc cho khách. |
| DEMO-SETTLEMENT-EXTRA | accountant01 | Đối soát trả phòng | S004 | WAITING_FINANCIAL_COMPLETION | Ghi nhận khách thanh toán thêm. |
| DEMO-SETTLEMENT-ZERO | accountant01 | Đối soát trả phòng | S005 | WAITING_FINANCIAL_COMPLETION | Dùng confirm-no-balance để chốt số dư bằng 0. |

## Lệnh seed demo lớn

```bash
docker compose exec -e ALLOW_DEMO_RESET=true -e SEED_PROFILE=large api npm run prisma:seed --workspace @homestay/api
```

Chạy verify độc lập:

```bash
docker compose exec -e SEED_PROFILE=large api npm run prisma:seed:verify --workspace @homestay/api
```
