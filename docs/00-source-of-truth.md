# HomeStay Dorm — Source of Truth

## 1. Mục đích

File này quy định các quyết định chính thức của project HomeStay Dorm.

thành viên phải đọc file này trước khi:

- sửa nghiệp vụ;
- sửa quyền của role;
- sửa ERD hoặc Prisma schema;
- thêm hoặc đổi API;
- thêm hoặc đổi UI;
- thay đổi trạng thái xử lý;
- thay đổi công thức tính tiền.

Không được tự suy diễn khi tài liệu chưa rõ.

---

## 2. Thứ tự ưu tiên tài liệu

Khi tài liệu mâu thuẫn, xử lý theo thứ tự:

1. Đề gốc FIT.
2. `docs/00-source-of-truth.md`.
3. `docs/04-business-rules.md`.
4. `docs/03-business-workflows.md`.
5. `docs/05-state-machines.md`.
6. `docs/06-erd.md`.
7. `docs/08-api-contract.md`.
8. `docs/07-ui-wireframes.md`.
9. Code hiện tại.
10. Báo cáo cũ của nhóm.

Báo cáo cũ chỉ dùng tham khảo vì có một số use case và ERD chưa chính xác.

Nếu phát hiện mâu thuẫn với đề gốc, phải dừng phần liên quan và báo trưởng nhóm. Không tự chọn cách xử lý.

---

## 3. Loại hệ thống

HomeStay Dorm là web nội bộ.

Khách hàng không có tài khoản và không đăng nhập.

Các role sử dụng hệ thống:

- `SALE`: Nhân viên sale.
- `ACCOUNTANT`: Nhân viên kế toán.
- `MANAGER`: Quản lý chi nhánh.
- `ADMIN`: Quản trị viên.

Quy tắc chi nhánh:

- Sale thuộc một chi nhánh.
- Kế toán thuộc một chi nhánh.
- Quản lý thuộc một chi nhánh.
- Admin xem toàn hệ thống.
- Nhân viên không được xử lý dữ liệu của chi nhánh khác.

---

## 4. Công nghệ đã chốt

### Frontend

- React.
- TypeScript.
- Vite.
- Ant Design.
- React Router.
- TanStack Query.
- React Hook Form.
- Zod.

### Backend

- Node.js.
- Express.
- TypeScript.
- Zod.
- Prisma ORM.
- JWT.
- bcrypt.

### Database và môi trường

- PostgreSQL 16.
- Docker Compose.
- npm workspaces.
- Vitest.
- Supertest.

Không tự thay công nghệ khác nếu chưa được trưởng nhóm đồng ý.

---

## 5. Kiến trúc đã chốt

Hệ thống dùng modular monolith và kiến trúc ba lớp:

```text
Frontend React
    ↓
Route → Validator → Controller
    ↓
Service
    ↓
Repository → Prisma
    ↓
PostgreSQL
```

Quy tắc:

Controller không gọi Prisma trực tiếp.
React không truy cập database.
React không tự tính tiền cọc hoặc hoàn cọc.
Repository không quyết định nghiệp vụ.
Service kiểm tra quyền, trạng thái và công thức.
Thao tác cập nhật nhiều bảng phải dùng transaction.
6. Quyết định nghiệp vụ bắt buộc
6.1. Đặt cọc

Luồng chính:

Sale xác nhận khách muốn đặt cọc
→ Sale xác nhận khách đồng ý nội quy
→ Manager xác nhận phòng/giường còn khả dụng
→ Accountant phát hành yêu cầu thanh toán
→ Hệ thống giữ giường trong 24 giờ
→ Accountant ghi nhận thanh toán
→ Manager xác nhận khoản tiền cọc hợp lệ
→ Giường chuyển sang đã đặt cọc
→ Sale hẹn ngày nhận phòng

Quyền:

Sale không xác nhận đã nhận tiền.
Kế toán ghi nhận thanh toán nhưng không duyệt cuối.
Chỉ Manager xác nhận khoản tiền cọc hợp lệ.
Admin không được phê duyệt giao dịch nghiệp vụ.

Hạn thanh toán:

Thời điểm hết hạn = thời điểm Accountant phát hành yêu cầu + 24 giờ

Khách chỉ cần thanh toán và được Accountant ghi nhận trước thời điểm hết hạn.
Manager được xác nhận khoản tiền sau thời điểm hết hạn nếu `paidAt <= expiresAt`
và hồ sơ đã chuyển sang `WAITING_MANAGER_CONFIRMATION` trước khi hết hạn.
Job hết hạn chỉ xử lý hồ sơ còn ở `WAITING_PAYMENT`.

Nếu Manager yêu cầu `PAYMENT_RECHECK` sau hạn, Accountant chỉ được sửa thông tin
kiểm tra của payment đã ghi nhận đúng hạn rồi gửi lại; không tạo payment mới.
Nếu Manager từ chối payment, payment và phiếu cọc chuyển `PAYMENT_REJECTED`, toàn
bộ allocation `HELD` chuyển `ENDED` trong một transaction.

Quá hạn:

phiếu cọc chuyển hết hạn;
yêu cầu thanh toán chuyển hết hạn;
giường đang giữ được giải phóng.

Công thức:

Tiền cọc = 2 × tổng giá thuê tháng của các giường được thuê

Thuê nguyên phòng phải tính toàn bộ giường của phòng.

6.2. Phân bổ giường

Một giường chỉ được có tối đa một phân bổ đang hoạt động.

Các loại phân bổ:

HELD: giữ tạm thời chờ thanh toán;
DEPOSITED: đã đặt cọc;
OCCUPIED: đang có người thuê.

Luồng:

Phát hành yêu cầu thanh toán → HELD
Manager xác nhận tiền cọc    → DEPOSITED
Manager hoàn tất bàn giao    → OCCUPIED
Hoàn tất trả phòng           → kết thúc phân bổ

6.3. Nhận phòng

Luồng bắt đầu nhận phòng:

Khách đến → `CHECKIN_DRAFT` → Sale xác nhận khách đến → `ARRIVED`
→ Sale cập nhật người cư trú → gửi Manager duyệt → `WAITING_ELIGIBILITY`.

Chỉ được bàn giao khi đủ:

Manager đã duyệt điều kiện lưu trú
AND hợp đồng giấy đã ký
AND Accountant đã xác nhận thanh toán ban đầu đầy đủ

Đối với nhóm:

Manager duyệt từng thành viên.
Thành viên không đủ điều kiện không được vào hợp đồng.
Thành viên không đủ điều kiện không được bố trí vào ở.
Nhóm có thể tiếp tục với thành viên hợp lệ nếu vẫn phù hợp số giường.

6.4. Trả phòng và hoàn cọc

Tỷ lệ hoàn cơ bản:

Đã cọc nhưng chưa ký hợp đồng          → 80%
Trả trước hạn, ở không quá 6 tháng     → 50%
Trả trước hạn, ở trên 6 tháng          → 70%
Trả khi hết hạn hợp đồng               → 100%

Đúng 6 tháng áp dụng 50%.

Công thức:

Tiền hoàn cơ bản = Tiền cọc × Tỷ lệ hoàn

Số dư cuối =
    Tiền hoàn cơ bản
    - tiền thuê còn nợ
    - điện nước còn nợ
    - dịch vụ còn nợ
    - hư hỏng hoặc mất mát
    - tiền phạt

Kết quả:

Số dư dương: hoàn cho khách.
Số dư bằng 0: không thu, không hoàn.
Số dư âm: khách trả thêm.

Chỉ giải phóng giường khi:

khách đã đồng ý đối soát;
đã thu thêm nếu có;
đã hoàn tiền nếu có;
hợp đồng đã thanh lý;
đã thu hồi khóa hoặc thẻ;
khách đã rời phòng;
Manager xác nhận hoàn tất trả phòng.

7. Xử lý giấy tờ và thanh toán ngoài hệ thống

Các nội dung thực hiện ngoài hệ thống:

khách cung cấp giấy tờ;
nhân viên đối chiếu giấy tờ gốc;
ký hợp đồng giấy;
ký biên bản bàn giao;
ký biên bản trả phòng;
kiểm tra giao dịch ngân hàng;
giao hoặc nhận tiền mặt;
trao đổi với khách.

Hệ thống chỉ lưu thông tin và trạng thái xác nhận.

Không triển khai:

upload CCCD;
upload hợp đồng;
upload chứng từ;
ký điện tử;
tạo hợp đồng PDF;
thanh toán online;
kết nối ngân hàng;
email hoặc SMS thật.

8. Quyền Admin

Admin được:

xem danh sách nhân viên;
xem tất cả chi nhánh;
cập nhật thông tin cơ bản của chi nhánh;
xem phòng và giường toàn hệ thống;
xem báo cáo toàn hệ thống.

Admin không được:

tạo hoặc sửa nhân viên;
thay đổi role;
quản lý tài khoản đăng nhập;
khóa hoặc mở tài khoản;
đổi hoặc đặt lại mật khẩu;
xác nhận phòng nhận cọc;
xác nhận tiền cọc;
duyệt điều kiện lưu trú;
bàn giao phòng;
xác nhận khách đồng ý đối soát;
hoàn tất trả phòng.

10. Quy ước enum

Mọi giá trị enum trong tài liệu, Prisma, database, API và frontend dùng tiếng Anh.
Tên tiếng Việt chỉ dùng làm nhãn hiển thị tại UI. Không duy trì song song bộ enum
tiếng Việt trong ERD hoặc request/response API.
9. Quy tắc thay đổi

Không được tự ý thay đổi:

tên hoặc số UI;
tên bảng;
quan hệ ERD;
enum trạng thái;
API endpoint;
request hoặc response;
quyền của role;
công thức tính tiền;
Docker;
kiến trúc ba lớp.

Khi cần thay đổi:

Báo rõ vấn đề.
Nêu file hoặc phần bị ảnh hưởng.
Đề xuất cách sửa.
Chờ trưởng nhóm xác nhận.
Sửa tài liệu trước.
Sau đó mới sửa code.

Codex không được tự thêm bảng, endpoint, trạng thái hoặc role.
