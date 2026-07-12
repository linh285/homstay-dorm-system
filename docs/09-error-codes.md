# HomeStay Dorm — Error Codes

API lỗi dùng envelope thống nhất:

```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} }
}
```

| HTTP | Code | Khi xảy ra |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Body, query hoặc path parameter không hợp lệ. |
| 401 | `UNAUTHENTICATED` | Thiếu, hết hạn hoặc không hợp lệ cookie JWT. |
| 401 | `INVALID_CREDENTIALS` | Sai tên đăng nhập hoặc mật khẩu. |
| 403 | `FORBIDDEN` | Role không có quyền thực hiện hành động. |
| 403 | `BRANCH_ACCESS_DENIED` | Truy cập hoặc thay đổi dữ liệu khác chi nhánh. |
| 404 | `NOT_FOUND` | Không tìm thấy tài nguyên. |
| 409 | `INVALID_STATE_TRANSITION` | Hành động không hợp lệ với trạng thái hiện tại. |
| 409 | `ACTIVE_DEPOSIT_EXISTS` | Hồ sơ thuê đã có phiếu cọc đang xử lý. |
| 409 | `ACTIVE_CHECKOUT_EXISTS` | Hợp đồng/phiếu cọc đã có yêu cầu trả phòng đang xử lý. |
| 409 | `CONTRACT_ALREADY_EXISTS` | Phiếu cọc đã có hợp đồng. |
| 409 | `HANDOVER_ALREADY_EXISTS` | Hợp đồng đã có biên bản bàn giao. |
| 409 | `INSPECTION_ALREADY_EXISTS` | Yêu cầu trả phòng đã có biên bản kiểm tra. |
| 409 | `SETTLEMENT_ALREADY_EXISTS` | Yêu cầu trả phòng đã có đối soát. |
| 409 | `BED_NAME_TAKEN` | Tên giường trùng trong cùng phòng. |
| 409 | `BED_ALREADY_ALLOCATED` | Giường đã có allocation đang hoạt động. |
| 422 | `MEMBER_COUNT_EXCEEDS_EXPECTED_RESIDENTS` | Số thành viên vượt số người dự kiến. |
| 422 | `MEMBER_COUNT_INCOMPLETE` | Chưa đủ thành viên trước khi tìm phòng. |
| 422 | `WHOLE_ROOM_REQUIRES_ALL_BEDS` | Thuê nguyên phòng nhưng chưa chọn toàn bộ giường. |
| 422 | `BED_NOT_AVAILABLE` | Giường không còn khả dụng. |
| 422 | `BED_NOT_DEPOSITED` | Giường không thuộc allocation đã đặt cọc. |
| 422 | `BED_NOT_IN_SELECTED_ROOM` | Giường không thuộc phòng đã chọn. |
| 422 | `BED_NOT_IN_BRANCH` | Giường không thuộc chi nhánh của hồ sơ. |
| 422 | `ROOM_NOT_IN_BRANCH` | Phòng không thuộc chi nhánh của hồ sơ. |
| 422 | `ROOM_NOT_IN_VIEWING` | Phòng không nằm trong lịch xem. |
| 422 | `CUSTOMER_RULES_NOT_CONFIRMED` | Sale chưa xác nhận khách đồng ý nội quy. |
| 422 | `DEPOSIT_PAYMENT_EXPIRED` | Ghi nhận payment sau hạn 24 giờ. |
| 422 | `PAYMENT_AFTER_DEADLINE` | `paidAt` sau `expiresAt`. |
| 422 | `PAYMENT_AMOUNT_MISMATCH` | Số tiền ghi nhận khác số tiền phải thu. |
| 422 | `PAYMENT_NOT_RECORDED` | Manager xác nhận khi Accountant chưa ghi nhận payment. |
| 422 | `PAYMENT_NOT_FULLY_PAID` | Thanh toán ban đầu chưa đủ. |
| 422 | `INITIAL_PAYMENT_NOT_CONFIRMED` | Chưa có thanh toán ban đầu hợp lệ để bàn giao. |
| 422 | `RESIDENTS_NOT_REVIEWED` | Cư dân chưa được Manager duyệt xong. |
| 422 | `NO_ELIGIBLE_RESIDENT` | Không còn cư dân hợp lệ để tạo hợp đồng. |
| 422 | `TOO_MANY_RESIDENTS` | Số cư dân vượt số giường cọc. |
| 422 | `TOO_MANY_ELIGIBLE_RESIDENTS` | Số cư dân đủ điều kiện vượt số giường cọc. |
| 422 | `PAPER_CONTRACT_NOT_RECORDED` | Chưa ghi nhận hợp đồng giấy. |
| 422 | `PAPER_CONTRACT_NOT_SIGNED` | Hợp đồng giấy chưa được xác nhận đã ký. |
| 422 | `HANDOVER_CHECKLIST_INCOMPLETE` | Checklist bàn giao chưa hoàn tất. |
| 422 | `INSPECTION_NOT_COMPLETE` | Kiểm tra hiện trạng chưa hoàn tất. |
| 422 | `BALANCE_NOT_ZERO` | Chỉ được `confirm-no-balance` khi số dư bằng 0. |
| 422 | `NO_REFUND_DUE` | Không có khoản hoàn để ghi nhận. |
| 422 | `NO_ADDITIONAL_PAYMENT_DUE` | Không có khoản thu thêm để ghi nhận. |
| 422 | `FINANCIAL_NOT_COMPLETE` | Đối soát chưa hoàn tất nghiệp vụ tài chính. |
| 422 | `LIQUIDATION_INCOMPLETE` | Thiếu xác nhận thanh lý/thu hồi khóa/khách rời phòng. |
| 422 | `ROOM_HAS_ACTIVE_ALLOCATION` | Không thể ngừng phòng/giường đang đặt cọc hoặc sử dụng. |
| 422 | `ROOM_ASSET_IN_USE` | Tài sản phòng đã được dùng trong bàn giao/kiểm tra. |
| 422 | `DUPLICATE_SERVICE` | Dịch vụ lặp trong cùng request. |
| 422 | `DUPLICATE_ASSET_TYPE` | Loại tài sản lặp trong cùng request. |
| 422 | `SERVICE_NOT_FOUND` | Có dịch vụ không tồn tại. |
| 422 | `ASSET_TYPE_NOT_FOUND` | Có loại tài sản không tồn tại. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi ngoài dự kiến; không lộ chi tiết nội bộ cho client. |

Các mã còn lại mang tính ngữ cảnh (`CONTRACT_NOT_ACTIVE`,
`DEPOSIT_NOT_CONFIRMED`, `VIEWING_NOT_READY_FOR_DEPOSIT`,
`NO_CONTRACT_TO_INSPECT`, `RESIDENT_NOT_MEMBER`, `RESIDENT_NOT_FOUND`,
`CUSTOMER_NOT_AGREED`, `EVIDENCE_NOT_CHECKED`) được trả khi điều kiện nghiệp vụ
tương ứng chưa đạt. Backend là nguồn quyết định mã lỗi; frontend chỉ hiển thị
`message` và không suy diễn trạng thái từ mã lỗi.
