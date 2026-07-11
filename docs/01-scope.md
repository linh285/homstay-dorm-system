# HomeStay Dorm — Project Scope

## 1. Mục tiêu

Xây dựng web nội bộ hỗ trợ quản lý toàn bộ quá trình thuê chỗ ở tại HomeStay Dorm:

```text
Đăng ký thuê
→ tìm và xem phòng
→ đặt cọc
→ nhận phòng
→ bàn giao
→ trả phòng
→ đối soát và hoàn cọc
```

Hệ thống ưu tiên:

đúng nghiệp vụ;
đúng quyền;
đúng trạng thái;
lưu dữ liệu chính xác;
giao diện đơn giản và dễ sử dụng.

## 2. Người sử dụng
Role	Phạm vi
SALE	Tiếp nhận khách, yêu cầu thuê, lịch xem, tạo cọc, nhận và trả phòng
ACCOUNTANT	Tính tiền, ghi nhận thanh toán, đối soát, hoàn tiền hoặc thu thêm
MANAGER	Xác nhận phòng, xác nhận cọc, duyệt khách, bàn giao và kiểm tra trả phòng
ADMIN	Xem nhân viên/chi nhánh, cập nhật chi nhánh và xem báo cáo toàn hệ thống

Khách hàng không sử dụng hệ thống.

3. Phạm vi chức năng
3.1. Đăng nhập và tài khoản

Thực hiện:

đăng nhập;
đăng xuất;
lấy thông tin người đang đăng nhập;
phân quyền theo role;
giới hạn dữ liệu theo chi nhánh;
Admin chỉ xem danh sách nhân viên;
Admin xem tất cả chi nhánh và cập nhật thông tin cơ bản của chi nhánh.

Không thực hiện:

đăng ký tài khoản công khai;
đăng nhập Google hoặc Facebook;
quên mật khẩu qua email;
tài khoản khách hàng.

UI liên quan:

UI-01: Đăng nhập.
UI-03: Nhân viên và chi nhánh.
3.2. Chi nhánh, phòng, giường, dịch vụ và tài sản

Thực hiện:

tạo và sửa phòng;
tạo và sửa giường;
cập nhật giá thuê;
cập nhật trạng thái vận hành;
gắn danh mục dịch vụ toàn hệ thống vào phòng;
gắn danh mục loại tài sản toàn hệ thống vào phòng;
xem trạng thái khả dụng của từng giường.

Không thực hiện:

quy trình bảo trì chi tiết;
quản lý kho tài sản;
nhập xuất vật tư;
khấu hao tài sản.

UI liên quan:

UI-03: Nhân viên và chi nhánh.
UI-04: Phòng và giường.
3.3. Đăng ký thuê phòng

Sale được:

tạo khách hàng;
tạo yêu cầu thuê;
nhập thông tin người đại diện;
nhập thành viên dự kiến ở;
nhập nhu cầu thuê;
chỉnh sửa;
đóng yêu cầu.

Yêu cầu thuê được tạo trực tiếp ở trạng thái `ACTIVE`; không dùng trạng thái nháp.

Thông tin nhu cầu gồm:

chi nhánh;
số người;
thuê nguyên phòng hoặc ở ghép;
loại phòng;
mức giá;
ngày dự kiến vào;
thời hạn thuê;
giới tính;
điều hòa;
gửi xe;
yêu cầu yên tĩnh;
giờ giấc sinh hoạt;
chấp nhận ở ghép;
ghi chú.

UI liên quan:

UI-05: Danh sách yêu cầu thuê.
UI-06: Hồ sơ yêu cầu thuê và tìm phòng.
3.4. Tìm phòng và xem phòng

Thực hiện:

tìm phòng theo yêu cầu;
chỉ hiển thị giường còn khả dụng;
hiển thị thông tin giá, sức chứa, nội quy và dịch vụ;
tạo lịch xem;
một lịch có thể xem nhiều phòng;
đổi hoặc hủy lịch;
xác nhận khách đã xem;
ghi nhận kết quả xem;
tạo phiếu cọc nháp khi khách đồng ý.

Việc tìm phòng hoặc tạo lịch xem không giữ giường.

UI liên quan:

UI-06: Tìm phòng.
UI-07: Lịch xem và kết quả xem.
3.5. Đặt cọc

Thực hiện:

Sale rà soát thông tin;
Sale xác nhận khách đồng ý nội quy;
Manager xác nhận phòng còn khả dụng;
Accountant tính tiền cọc;
Accountant phát hành yêu cầu thanh toán;
hệ thống giữ giường 24 giờ;
Accountant ghi nhận tiền mặt hoặc chuyển khoản;
Manager xác nhận khoản tiền hợp lệ;
chuyển giường sang đã đặt cọc;
Sale hẹn ngày nhận phòng;
tự động hết hạn và giải phóng giường.

Khách chỉ cần thanh toán và được Accountant ghi nhận trong 24 giờ. Việc ghi nhận
thanh toán chuyển hồ sơ thẳng sang `WAITING_MANAGER_CONFIRMATION`; Manager có thể
xác nhận sau hạn. Job chỉ hết hạn hồ sơ còn `WAITING_PAYMENT`.

Không thực hiện:

thanh toán online;
VNPay;
kết nối ngân hàng;
upload chứng từ;
sinh QR động.

UI liên quan:

UI-08: Hồ sơ đặt cọc.
3.6. Nhận phòng và hợp đồng

Thực hiện:

Sale xác nhận khách đã đến;
Sale cập nhật thông tin cư trú;
Sale xác nhận đã đối chiếu giấy tờ;
Manager duyệt từng thành viên;
loại thành viên không đủ điều kiện;
Sale ghi nhận thông tin hợp đồng giấy;
Sale xác nhận hợp đồng đã ký;
Accountant tạo và ghi nhận thanh toán ban đầu;
Accountant xác nhận đã thu đủ;
chuyển hồ sơ sang bàn giao.

Trình tự bắt đầu là `CHECKIN_DRAFT → ARRIVED → WAITING_ELIGIBILITY`. Xác nhận
khách đến chỉ ghi nhận khách đã đến; Sale cập nhật danh sách cư trú trước khi gửi
Manager duyệt.

Không thực hiện:

OCR giấy tờ;
upload CCCD;
tạo hợp đồng PDF;
ký điện tử;
lưu file hợp đồng.

UI liên quan:

UI-09: Hồ sơ nhận phòng.
3.7. Bàn giao phòng

Thực hiện:

ghi nhận hiện trạng khu vực ở;
ghi nhận tài sản và số lượng;
ghi nhận tình trạng tài sản;
xác nhận đã hướng dẫn tiện ích;
xác nhận đã hướng dẫn an toàn;
xác nhận biên bản giấy đã ký;
chuyển hợp đồng sang có hiệu lực;
chuyển giường sang đang sử dụng.

Không thực hiện:

upload ảnh hiện trạng;
xuất biên bản PDF;
ký biên bản điện tử.

UI liên quan:

UI-10: Bàn giao phòng và tài sản.
3.8. Trả phòng

Thực hiện:

Sale tạo yêu cầu trả phòng;
nhập ngày trả dự kiến;
nhập lý do;
gửi Manager kiểm tra;
Manager kiểm tra hiện trạng;
so sánh tài sản lúc giao và lúc trả;
ghi hư hỏng, mất mát, vệ sinh và vi phạm;
chuyển kết quả cho Accountant.

UI liên quan:

UI-11: Yêu cầu trả phòng.
UI-12: Kiểm tra trả phòng.
3.9. Đối soát và hoàn cọc

Thực hiện:

Accountant xác định tỷ lệ hoàn;
tính tiền hoàn cơ bản;
nhập từng khoản khấu trừ;
tính số dư cuối;
Manager xác nhận kết quả với khách;
ghi nhận khách đồng ý hoặc khiếu nại;
Accountant thu thêm nếu khách thiếu;
Accountant hoàn tiền nếu khách được nhận;
Manager xác nhận thanh lý;
Manager xác nhận thu hồi khóa hoặc thẻ;
Manager hoàn tất trả phòng;
giải phóng giường.

Nếu khách đã cọc nhưng chưa ký hợp đồng thì không cần kiểm tra phòng; Accountant
tạo đối soát trực tiếp với tỷ lệ hoàn 80%. Nếu số dư bằng 0, Accountant xác nhận
không thu thêm và không hoàn tiền trước khi hồ sơ sẵn sàng hoàn tất.

Không thực hiện:

xử lý khiếu nại thành module riêng;
chuyển khoản tự động;
upload biên bản trả phòng.

UI liên quan:

UI-13: Đối soát, hoàn cọc và hoàn tất trả phòng.
3.10. Dashboard và báo cáo

Thực hiện:

dashboard theo từng role;
công việc đang chờ xử lý;
lịch hôm nay;
số phòng và giường;
trạng thái giường;
số yêu cầu thuê;
số đặt cọc;
số nhận phòng;
số trả phòng;
tiền cọc;
tiền hoàn;
tiền thu thêm;
báo cáo chi nhánh cho Manager;
báo cáo toàn hệ thống cho Admin.

Không thực hiện:

BI nâng cao;
dự báo;
machine learning;
kho dữ liệu;
báo cáo kế toán đầy đủ.

UI liên quan:

UI-02: Dashboard.
UI-14: Báo cáo.
4. Danh sách UI chính
UI	Tên
UI-01	Đăng nhập
UI-02	Dashboard công việc
UI-03	Nhân viên và chi nhánh
UI-04	Phòng và giường
UI-05	Danh sách yêu cầu thuê
UI-06	Hồ sơ yêu cầu thuê và tìm phòng
UI-07	Lịch xem và kết quả xem
UI-08	Hồ sơ đặt cọc
UI-09	Hồ sơ nhận phòng
UI-10	Bàn giao phòng và tài sản
UI-11	Yêu cầu trả phòng
UI-12	Kiểm tra trả phòng
UI-13	Đối soát và hoàn cọc
UI-14	Báo cáo

Chi tiết từng UI nằm trong docs/07-ui-wireframes.md.

5. Ngoài phạm vi toàn hệ thống

Không triển khai:

website công khai cho khách;
ứng dụng mobile;
tài khoản khách hàng;
thanh toán online;
kết nối ngân hàng;
email hoặc SMS thật;
upload file;
chữ ký số;
tạo PDF;
permission động;
audit log trên giao diện;
quản lý job trên giao diện;
microservice;
Redis;
Kafka;
websocket;
quản lý lương hoặc chấm công;
quản lý điện nước định kỳ hoàn chỉnh;
hệ thống bảo trì hoàn chỉnh.
6. Phần có thể đơn giản hóa nếu thiếu thời gian

Có thể đơn giản hóa:

dashboard;
biểu đồ;
bộ lọc nâng cao;
giao diện calendar;
dữ liệu khách tổ chức;
dịch vụ và tài sản nâng cao;
giao diện Admin.

Không được bỏ:

giới hạn chi nhánh;
xác nhận phòng của Manager;
hạn 24 giờ;
phân bổ giường;
xác nhận tiền cọc của Manager;
duyệt thành viên;
thanh toán ban đầu;
bàn giao;
công thức hoàn cọc;
đối soát;
thanh lý;
thu hồi khóa;
điều kiện giải phóng giường.
