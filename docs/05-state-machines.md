# HomeStay Dorm — State Machines

## 1. Quy tắc chung

- Không tạo API cập nhật trạng thái tùy ý.
- Mỗi trạng thái chỉ thay đổi qua một hành động nghiệp vụ cụ thể.
- Service kiểm tra role, chi nhánh và trạng thái hiện tại trước khi cập nhật.
- Cập nhật nhiều bảng phải chạy trong transaction.
- Giá trị enum dùng tiếng Anh ở mọi lớp; tiếng Việt chỉ là nhãn UI.

## 2. Yêu cầu thuê

```text
ACTIVE → VIEWING → DEPOSIT_PROCESS → CLOSED
```

| Trạng thái hiện tại | Hành động | Trạng thái mới | Role |
|---|---|---|---|
| Không có | Tạo yêu cầu thuê | ACTIVE | Sale |
| ACTIVE | Tạo lịch xem | VIEWING | Sale |
| VIEWING | Khách chọn đặt cọc | DEPOSIT_PROCESS | Sale |
| ACTIVE, VIEWING | Đóng yêu cầu | CLOSED | Sale |

Không dùng trạng thái `DRAFT` cho yêu cầu thuê.

## 3. Lịch xem phòng

```text
SCHEDULED → CONFIRMED → VISITED → RESULT_RECORDED
```

| Trạng thái hiện tại | Hành động | Trạng thái mới | Role |
|---|---|---|---|
| SCHEDULED | Xác nhận lịch | CONFIRMED | Sale |
| SCHEDULED, CONFIRMED | Đổi lịch | SCHEDULED | Sale |
| SCHEDULED, CONFIRMED | Hủy lịch | CANCELLED | Sale |
| CONFIRMED | Khách không đến | NO_SHOW | Sale |
| CONFIRMED | Xác nhận khách đã xem | VISITED | Sale |
| VISITED | Lưu kết quả | RESULT_RECORDED | Sale |

`reschedule` cập nhật thời gian và đưa lịch về `SCHEDULED`. Chỉ
`RESULT_RECORDED` với kết quả
`CUSTOMER_WANTS_DEPOSIT` mới được tạo phiếu cọc.

## 4. Phiếu đặt cọc

```text
DRAFT
→ WAITING_ROOM_CHECK
→ ROOM_APPROVED
→ WAITING_PAYMENT
→ WAITING_MANAGER_CONFIRMATION
→ DEPOSITED
```

| Trạng thái hiện tại | Hành động | Trạng thái mới | Role |
|---|---|---|---|
| DRAFT | Xác nhận khách đồng ý nội quy | DRAFT | Sale |
| DRAFT | Gửi kiểm tra phòng sau khi đã xác nhận nội quy | WAITING_ROOM_CHECK | Sale |
| WAITING_ROOM_CHECK | Xác nhận phòng khả dụng | ROOM_APPROVED | Manager |
| WAITING_ROOM_CHECK | Từ chối phòng | ROOM_REJECTED | Manager |
| ROOM_APPROVED | Phát hành yêu cầu thanh toán | WAITING_PAYMENT | Accountant |
| WAITING_PAYMENT | Ghi nhận tiền trong hạn | WAITING_MANAGER_CONFIRMATION | Accountant |
| WAITING_PAYMENT | Hết 24 giờ | EXPIRED | System job |
| WAITING_MANAGER_CONFIRMATION | Yêu cầu kiểm tra lại | PAYMENT_RECHECK | Manager |
| PAYMENT_RECHECK | Sửa thông tin kiểm tra của payment cũ và gửi lại | WAITING_MANAGER_CONFIRMATION | Accountant |
| WAITING_MANAGER_CONFIRMATION | Từ chối tiền và giải phóng giữ chỗ | PAYMENT_REJECTED | Manager |
| WAITING_MANAGER_CONFIRMATION | Xác nhận tiền hợp lệ | DEPOSITED | Manager |
| DRAFT, ROOM_APPROVED | Hủy phiếu | CANCELLED | Sale |
| WAITING_PAYMENT | Hủy phiếu và giải phóng giữ chỗ | CANCELLED | Sale |

`record-payment` vừa ghi payment vừa chuyển trạng thái; không có API gửi xác nhận
riêng. Manager có thể xác nhận sau `expiresAt` nếu payment
đã được Accountant ghi nhận trong hạn và `paidAt <= expiresAt`.

`PAYMENT_RECHECK` được xử lý sau hạn nếu payment cũ đã được ghi nhận đúng hạn;
Accountant không được tạo payment mới. Khi `PAYMENT_REJECTED`, payment và deposit
cùng chuyển `PAYMENT_REJECTED`, toàn bộ allocation `HELD` chuyển `ENDED` trong một
transaction và giường được giải phóng ngay.

Hủy tại `WAITING_PAYMENT` phải đồng thời chuyển payment sang `CANCELLED` và kết
thúc toàn bộ allocation `HELD` trong một transaction.

## 5. Phân bổ giường

```text
HELD → DEPOSITED → OCCUPIED → ENDED
```

| Trạng thái hiện tại | Hành động | Trạng thái mới |
|---|---|---|
| Không có allocation | Phát hành yêu cầu thanh toán | HELD |
| HELD | Manager xác nhận tiền cọc | DEPOSITED |
| HELD | Phiếu cọc hết hạn hoặc bị hủy | ENDED |
| DEPOSITED | Manager hoàn tất bàn giao | OCCUPIED |
| DEPOSITED | Hoàn tất hồ sơ hoàn cọc chưa ký hợp đồng | ENDED |
| OCCUPIED | Manager hoàn tất trả phòng | ENDED |

Một giường chỉ có tối đa một allocation chưa `ENDED`.

## 6. Hợp đồng và nhận phòng

```text
CHECKIN_DRAFT
→ ARRIVED
→ WAITING_ELIGIBILITY
→ ELIGIBILITY_APPROVED
→ PAPER_SIGNED
→ WAITING_INITIAL_PAYMENT
→ READY_FOR_HANDOVER
→ ACTIVE
→ LIQUIDATED
```

| Trạng thái hiện tại | Hành động | Trạng thái mới | Role |
|---|---|---|---|
| CHECKIN_DRAFT | Xác nhận khách đến | ARRIVED | Sale |
| ARRIVED | Cập nhật người cư trú | ARRIVED | Sale |
| ARRIVED | Gửi duyệt điều kiện | WAITING_ELIGIBILITY | Sale |
| WAITING_ELIGIBILITY | Duyệt danh sách cư trú | ELIGIBILITY_APPROVED | Manager |
| WAITING_ELIGIBILITY | Dừng thủ tục | CHECKIN_STOPPED | Manager |
| ELIGIBILITY_APPROVED | Xác nhận hợp đồng giấy đã ký | PAPER_SIGNED | Sale |
| PAPER_SIGNED | Tạo thanh toán ban đầu | WAITING_INITIAL_PAYMENT | Accountant |
| WAITING_INITIAL_PAYMENT | Ghi nhận và xác nhận đã thu đủ | WAITING_INITIAL_PAYMENT | Accountant |
| WAITING_INITIAL_PAYMENT | Chuyển bàn giao sau khi đủ điều kiện | READY_FOR_HANDOVER | Accountant hoặc hệ thống |
| READY_FOR_HANDOVER | Hoàn tất bàn giao | ACTIVE | Manager |
| ACTIVE | Hoàn tất trả phòng | LIQUIDATED | Manager |

`confirm-arrival` chỉ ghi nhận khách đã đến. `submit-eligibility-review` mới gửi
Manager duyệt. `submit-handover` kiểm tra duyệt cư trú, hợp đồng giấy và thanh toán
ban đầu rồi mới chuyển sang `READY_FOR_HANDOVER`.

## 7. Bàn giao

| Trạng thái hiện tại | Hành động | Trạng thái mới | Role |
|---|---|---|---|
| Không có biên bản | Tạo bàn giao | DRAFT | Manager |
| DRAFT | Xác nhận tài sản, hướng dẫn và biên bản giấy | COMPLETED | Manager |

Khi `COMPLETED`, hợp đồng chuyển `ACTIVE` và allocation chuyển `OCCUPIED` trong
cùng transaction.

## 8. Yêu cầu trả phòng và đối soát

Luồng đã nhận phòng:

```text
DRAFT → WAITING_INSPECTION → INSPECTED → WAITING_SETTLEMENT
→ WAITING_CUSTOMER_CONFIRMATION
```

Luồng đã cọc nhưng chưa ký hợp đồng:

```text
DRAFT → WAITING_SETTLEMENT
```

Sau khi khách xác nhận:

```text
WAITING_CUSTOMER_CONFIRMATION
→ WAITING_FINANCIAL_COMPLETION
→ READY_TO_COMPLETE
→ COMPLETED
```

Nhánh khiếu nại:

```text
WAITING_CUSTOMER_CONFIRMATION → DISPUTED → WAITING_SETTLEMENT
```

| Trạng thái hiện tại | Hành động | Trạng thái mới | Role |
|---|---|---|---|
| DRAFT, có hợp đồng | Gửi kiểm tra | WAITING_INSPECTION | Sale |
| DRAFT | Hủy yêu cầu | CANCELLED | Sale |
| WAITING_INSPECTION | Hoàn tất kiểm tra | INSPECTED | Manager |
| INSPECTED | Tạo đối soát | WAITING_SETTLEMENT | Accountant |
| DRAFT, chưa ký hợp đồng | Tạo đối soát trực tiếp 80% | WAITING_SETTLEMENT | Accountant |
| WAITING_SETTLEMENT | Chốt số liệu | WAITING_CUSTOMER_CONFIRMATION | Accountant |
| WAITING_CUSTOMER_CONFIRMATION | Khách khiếu nại | DISPUTED | Manager |
| DISPUTED | Gửi lại Kế toán điều chỉnh | WAITING_SETTLEMENT | Manager |
| WAITING_CUSTOMER_CONFIRMATION | Khách đồng ý | WAITING_FINANCIAL_COMPLETION | Manager |
| WAITING_FINANCIAL_COMPLETION | Đã thu thêm | READY_TO_COMPLETE | Accountant |
| WAITING_FINANCIAL_COMPLETION | Đã hoàn tiền | READY_TO_COMPLETE | Accountant |
| WAITING_FINANCIAL_COMPLETION | Xác nhận không chênh lệch | READY_TO_COMPLETE | Accountant |
| READY_TO_COMPLETE | Thanh lý, thu khóa và hoàn tất | COMPLETED | Manager |

Khi `COMPLETED`, hợp đồng nếu có chuyển `LIQUIDATED`; allocation `DEPOSITED` hoặc
`OCCUPIED` chuyển `ENDED`; giường mới khả dụng.

## 9. Điều cấm

Không được dùng API đổi trạng thái chung, bỏ qua bước trung gian, cho Sale hoặc
Accountant xác nhận cuối tiền cọc, kích hoạt hợp đồng trước bàn giao hoặc giải
phóng giường trước khi checkout `COMPLETED`.
