# Quy trình nghiệp vụ (bản đơn giản)

## 1. Đăng ký và xem phòng

```jsx
Sale tiếp nhận yêu cầu
→ Sale nhập thông tin khách và tiêu chí
→ Hệ thống tìm phòng/giường AVAILABLE
→ Sale chọn phòng để giới thiệu
→ Sale tạo lịch xem
→ Sale xác nhận khách đã xem
→ Sale ghi kết quả
    ├─ Xem thêm
    ├─ Điều chỉnh tiêu chí
    ├─ Không thuê
    └─ Khách đồng ý đặt cọc
```

## 2. Đặt cọc

```jsx
Khách đồng ý đặt cọc
→ Sale rà soát/cập nhật thông tin
→ Sale xác nhận khách đã đồng ý nội quy
→ Sale gửi yêu cầu kiểm tra phòng
→ Quản lý xác nhận khả năng nhận cọc
→ Sale tạo yêu cầu đặt cọc
→ Kế toán tính tiền
→ Kế toán phát hành yêu cầu thanh toán
→ Hệ thống giữ phòng/giường trong 24 giờ
→ Khách thanh toán bên ngoài
→ Kế toán ghi nhận thông tin thanh toán trong 24 giờ
→ Hồ sơ chuyển thẳng sang WAITING_MANAGER_CONFIRMATION
→ Quản lý đối chiếu và xác nhận
→ Hệ thống chuyển sang DEPOSITED
→ Sale thông báo và hẹn nhận phòng
```

nếu quá hạn

```jsx
Quá 24 giờ mà hồ sơ vẫn còn WAITING_PAYMENT
→ Hệ thống hủy đơn
→ Giải phóng phòng/giường
```

## 3. Nhận phòng

```jsx
Khách đến nhận phòng
→ Sale xác nhận khách đã đến, hồ sơ chuyển ARRIVED
→ Sale đối chiếu giấy tờ ngoài hệ thống
→ Sale cập nhật thông tin cư trú
→ Sale gửi Quản lý duyệt, hồ sơ chuyển WAITING_ELIGIBILITY
→ Quản lý duyệt từng người
→ Sale lập thông tin hợp đồng
→ Khách ký hợp đồng giấy
→ Sale xác nhận hợp đồng đã ký
→ Chuyển Kế toán
→ Kế toán tính và thu thanh toán ban đầu
→ Kế toán xác nhận đã thu đủ
→ Chuyển Quản lý
→ Quản lý bàn giao phòng và tài sản
→ Quản lý xác nhận biên bản giấy
→ Hệ thống chuyển phòng/giường sang OCCUPIED
```

## 4. Trả phòng
Sale tạo yêu cầu trả phòng
→ Quản lý kiểm tra phòng/tài sản
→ Quản lý ghi hư hỏng và hoàn tất kiểm tra
→ Chuyển Kế toán
→ Kế toán tính tỷ lệ hoàn
→ Kế toán nhập các khoản khấu trừ
→ Hệ thống tính số dư
→ Kế toán lập bảng đối soát
→ Chuyển Quản lý
→ Quản lý làm việc với khách bên ngoài
→ Quản lý xác nhận khách đồng ý
→ Nếu khách thiếu: Kế toán xác nhận đã thu thêm
→ Quản lý xác nhận biên bản trả phòng đã ký
→ Quản lý xác nhận hợp đồng đã thanh lý và đã thu khóa
→ Nếu khách được hoàn: Kế toán xác nhận đã hoàn tiền
→ Hệ thống kết thúc cư trú
→ Phòng/giường chuyển về AVAILABLE

Nhánh khách đã cọc nhưng chưa ký hợp đồng:

Sale tạo yêu cầu trả phòng ở DRAFT
→ Không tạo biên bản kiểm tra
→ Accountant tạo đối soát trực tiếp với tỷ lệ hoàn 80%
→ Manager xác nhận với khách
→ Accountant hoàn tiền hoặc xác nhận số dư bằng 0
→ Manager hoàn tất hồ sơ và kết thúc allocation DEPOSITED.



# Quy trình nghiệp vụ (bản chi tiết)

1. Quy trình đăng ký thuê phòng
1.1. nhân viên sale tiếp nhận thông tin và yêu cầu cơ bản, bao
gồm( thông tin cá nhân, số lượng người dự kiến ở, giới tính, khu vực mong muốn, loại phòng, mức giá, thời gian dự kiến vào ở, thời hạn thuê và một số tiêu chí ưu tiên khác (giờgiấc sinh hoạt, yêu cầu yên tĩnh, gửi xe, trang bị điều hòa,…)
1.2. nhân viên sale kiểm tra tình trạng giường phòng lúc tìm kiếm (vì phòng có thể đã được đặt cọc lúc tìm) 
1.3. tìm được rồi thì sắp xếp lịch xem phòng và thông báo lại qua sđt hoặc email cho khách
1.3.1 phòng phải có thông tin liên quan để cho khách xem hoặc nhân viên sale /… xem 
( bao gồm: giá thuê, số người ở tối đa, nội quy ký túc xá, chi phí điện nước và các dịch vụ đi kèm, quy định đặt cọc – giữ phòng, cũng như các quy định về lưu trú. Đối với trường hợp thuê theo nhóm, nhân viên sale sẽ trao đổi rõ hai hình thức phổ biến: thuê nguyên phòng (số người không vượt quá sức chứa tối đa của phòng) hoặc đăng ký ở ghép (nhóm có số lượng ít hơn sức chứa và chấp nhận ở cùng người khác theo các
tiêu chí ghép phòng).
1.4. Sau khi xem phòng, sale ghi nhận rằng khách đồng ý bắt đầu thủ tục đặt cọc.
1.4.1 tức là chỗ xem lịch phòng thì phải có nút xác nhận là khách đã đi xem phòng để đặt cọc
2. Quy trình đặt cọc & xác nhận thuê
2.1. khách muốn thuê, sale rà soát thông tin khách (nghiệp vụ ở ngoài thôi, kiểu khách đưa thông tin giấy)
2.2 sale chuyển thông tin cho quản lí để quản lí xác nhận 
2.3 có chức năng đặt cọc để nhân viên sale tiến hành, 
lưu ý “ Khi khách thuê (hoặc đại diện nhóm thuê) xác nhận đồng ý tuân thủ các điều kiện thuê và nội quy ký túc xá, nhân viên sale thực hiện các bước tiếp theo để tiến hành đặt cọc.” phải có nút khách đã xác nhận đồng ý điều kiện thuê và nội quy ký túc xá, 
và ngoài đời sẽ có giấy cho khách ký xác nhận
2.3.1 có chức năng chỉnh sửa thông tin khách cho sale
2.4 Sale tạo yêu cầu đặt cọc → chuyển sang Kế toán
2.5 kế toán cung cấp thông tin chuyển khoản của chi nhánh hoặc nhận tiền mặt; hệ
thống không sinh QR động và không xử lý thanh toán online
2.5.1 thời hạn thanh toán là 24 giờ, quá hạn thì hủy đơn đặt cọc
2.5.2 đơn đặt cọc sẽ hiển thị sẵn công thức “Tiền cọc = (Tiền thuê 2 tháng) × (Số giường thuê). “ và ràng buộc, 
→ Kế toán ghi nhận khách đã thanh toán trong hạn và chuyển hồ sơ thẳng sang `WAITING_MANAGER_CONFIRMATION` → Quản lý xác nhận khoản tiền hợp lệ, kể cả sau hạn nếu khoản tiền đã được ghi nhận đúng hạn
2.6 quản lí nhận được tiền hoặc thông tin sẽ xác nhận phòng thành “đã đặt cọc”
( Khi quản lý xác nhận đã nhận được khoản tiền cọc hợp lệ, nhân viên sale thông báo lại cho khách hàng rằng việc đặt cọc đã hoàn tất và thống nhất thời gian thực hiện thủ tục nhận phòng theo thỏa thuận.)
2.7 thông tin cọc được ghi nhận trong  hệ thống (bao gồm: thông tin khách cọc, phòng/giường đã cọc, thời điểm đặt cọc và chi nhánh.  Kể từ thời điểm này, phòng/giường đã cọc sẽ không được tiếp nhận đặt cọc từ khách hàng khác và không được nhân viên sale giới thiệu như một lựa chọn còn trống.)
3. Quy trình nhận phòng, ký thỏa thuận thuê và bàn giao phòng
3.1 khách đến nhận phòng theo lịch hẹn, sale kiểm tra thông tin đặt cọc, đối chiếu tùy thân … (bước này là bước ở ngoài, không tin học hóa) tức  là sale tìm các thông tin trên ở web và tự so sánh với giấy tờ khách đưa
3.2 khi đã có phòng được cọc ở 2.7, Sale xác nhận khách đến để hồ sơ chuyển sang `ARRIVED`; Sale cập nhật danh sách cư trú rồi mới gửi hồ sơ qua cho Manager kiểm tra
3.2.1 kí hợp đồng này là hợp đồng giấy 
- Sale bấm: 
Khách đã đến làm thủ tục nhận phòng Hệ thống chuyển hồ sơ sang quản lý. 
- Quản lý kiểm tra từng người: Đủ điều kiện Không đủ điều kiện 
- Đối với nhóm: Thành viên không đạt bị loại khỏi danh sách ký. Các thành viên còn lại có thể tiếp tục nếu phù hợp với số giường/phòng. Nhóm cũng có thể dừng thuê. 
- Tuy nhiên, sau bước này chưa được cập nhật giường là đang có người ở
3.3 ký hợp đồng thuê này là hợp đồng giấy 
- Nhân viên sale chính là nhân viên phụ trách lập và hướng dẫn ký hợp đồng.
- Sale nhập vào hệ thống: (Số hợp đồng. Ngày ký. Ngày bắt đầu. Ngày kết thúc. Phòng/giường. Số giường. Giá thuê. Kỳ thanh toán. Các phí dịch vụ. Quy định cọc. Nội quy. Danh sách người ký.)
- Sau đó sale bấm: Xác nhận hợp đồng giấy đã được ký
→ chuyển lại cho kế toán 
(Hợp đồng đã ký → Kế toán tính thanh toán ban đầu → Khách thanh toán → Kế toán xác nhận đã thu đủ → Quản lý bàn giao)
3.4 quản lí thực hiện chức năng bàn giao khi thõa mãn (Quản lý đã duyệt điều kiện lưu trú AND hợp đồng đã được ký AND Kế toán đã xác nhận thanh toán ban đầu đầy đủ)
- hệ thống hiển thị các thông tin 
”hiện trạng khu vực ở, ghi nhận các vật dụng được cấp (giường, nệm, tủ, chìa khóa/thẻ từ), hướng dẫn quy định sử dụng tiện ích chung và các lưu ý an toàn.”
→ quản lí ấn nút xác nhận nhân viên và khách hàng đã xác nhận vào biên bản bàn giao (cái này nhân viên thông báo riêng qua sms, ko có trong hệ thống, nên quản lí chỉ ấn là đã xác nhận)
→ quản lí ấn nút xác nhận và phòng đã được thuê → lưu vô db
4. Quy trình trả phòng và hoàn cọc
4.1 nhân viên sale có chức năng đăng ký thời gian trả phòng
→ chuyển đơn sang cho quản lí 
4.2 quản lí ấn xác nhận Kiểm tra trả phòng 
→ đơn được chuyển tiếp sang cho kế toán
4.3 hệ thống bên kế toán có danh sách / thông tin của phòng cần hoàn cọc, bên trong có các khoản khấu trừ phát sinh 
- Kiểm tra trả phòngKế toán xem: Tiền cọc ban đầu. Ngày vào ở. Ngày trả phòng. Ngày hết hạn hợp đồng. Công nợ tiền thuê. Điện/nước còn thiếu. Dịch vụ còn thiếu. Hư hỏng. Mất mát. Phạt vi phạm.
→ hệ thống hiển thị các chỗ khoản khấu trừ để kế toán ấn vô
”Sau khi tính toán xong, kế toán sẽ lập bảng đối soát/phiếu thanh toán và báo lại cho quản lý để quản lý làm việc với khách thuê. Quản lý sẽ thông báo chi tiết các khoản khấu trừ và số tiền hoàn cọc (hoặc số tiền cần thanh toán thêm), đồng thời xác nhận lại với khách về việc đồng ý trả phòng theo kết quả đối soát. Nếu khách cần thanh toán thêm, khách thực hiện thanh toán theo hướng dẫn của kế toán; nếu khách được hoàn cọc, hai bên thống nhất phương thức hoàn (tiền mặt hoặc chuyển khoản theo quy định).” 
→ Để web đơn giản, không cần ghi từng cuộc trao đổi. Chỉ cần màn hình quản lý có hai nút: Khách đã đồng ý kết quả đối soát Khách chưa đồng ý / Có khiếu nại 
→ kế toán ấn nút “xác nhận khách đã chuyển / đã chuyển cho khách” 
→ hệ thống cập nhật phòng / giường trống khi đã thõa mãn 
”Phòng/giường chỉ chuyển về AVAILABLE khi đủ: Khách đã đồng ý đối soát AND đã thanh toán phần thiếu nếu có AND biên bản trả phòng đã ký AND hợp đồng đã thanh lý AND chìa khóa/thẻ đã thu hồi AND tiền hoàn đã thực hiện nếu có AND quản lý xác nhận hoàn tất trả phòng”
