## I. Nhóm hệ thống và cơ sở vật chất

## 1. `CHI_NHANH`

```
MaChiNhanh          VARCHAR(20) PK
TenChiNhanh         VARCHAR(100) NOT NULL
DiaChi              TEXT NOT NULL
SoDienThoai         VARCHAR(20)
Email               VARCHAR(255)
TenChuTaiKhoan      VARCHAR(100)
SoTaiKhoan          VARCHAR(50)
NganHang            VARCHAR(100)
HuongDanChuyenKhoan TEXT
TrangThai           VARCHAR(20) NOT NULL
```

---

## 2. `NHAN_VIEN`

```
MaNhanVien          VARCHAR(20) PK
HoTen               VARCHAR(100) NOT NULL
SoDienThoai         VARCHAR(20)
Email               VARCHAR(255)
ChucVu              VARCHAR(20) NOT NULL
MaChiNhanh          VARCHAR(20) FK → CHI_NHANH, NULL với ADMIN
TrangThai           VARCHAR(20) NOT NULL
```

`ChucVu`:

```
SALE
ACCOUNTANT
MANAGER
ADMIN
```

---

## 3. `TAI_KHOAN`

```
TenDangNhap         VARCHAR(50) PK
MaNhanVien          VARCHAR(20) UNIQUE FK → NHAN_VIEN
MatKhauHash         VARCHAR(255) NOT NULL
TrangThaiTaiKhoan   VARCHAR(20) NOT NULL
LanDangNhapCuoi     TIMESTAMPTZ
```

Bỏ:

```
MaKhachHang
LoaiTaiKhoan CUSTOMER
```

---

## 4. `PHONG`

```
MaPhong             VARCHAR(20) PK
MaChiNhanh          VARCHAR(20) FK → CHI_NHANH
TenPhong            VARCHAR(50) NOT NULL
KhuVuc              VARCHAR(100)
Tang                INTEGER
LoaiPhong           VARCHAR(50)
SucChuaToiDa        INTEGER NOT NULL
GioiTinhApDung      VARCHAR(20)
CoDieuHoa           BOOLEAN NOT NULL DEFAULT FALSE
ChoGuiXe            BOOLEAN NOT NULL DEFAULT FALSE
GioGioiNghiem       VARCHAR(100)
MucDoYenTinh        VARCHAR(50)
NoiQuy              TEXT
TrangThaiVanHanh    VARCHAR(20) NOT NULL
GhiChu              TEXT
```

`TrangThaiVanHanh` chỉ gồm:

```
ACTIVE
MAINTENANCE
OUT_OF_SERVICE
```

---

## 5. `GIUONG`

```
MaGiuong            VARCHAR(20) PK
MaPhong             VARCHAR(20) FK → PHONG
TenGiuong           VARCHAR(50) NOT NULL
GiaThueThang        NUMERIC(18,2) NOT NULL
TrangThaiVanHanh    VARCHAR(20) NOT NULL
GhiChu              TEXT
```

Thêm unique:

```
UNIQUE (MaPhong, TenGiuong)
```

Không lưu `Trống/Đã cọc/Đang ở` trực tiếp tại đây.

---

## 6. `DICH_VU`

```
MaDichVu            VARCHAR(20) PK
TenDichVu           VARCHAR(100) NOT NULL
DonViTinh           VARCHAR(50)
DonGia              NUMERIC(18,2) NOT NULL
NgayApDung           DATE
TrangThai            VARCHAR(20)
```

---

## 7. `PHONG_DICH_VU`

```
MaPhong             VARCHAR(20) PK, FK → PHONG
MaDichVu            VARCHAR(20) PK, FK → DICH_VU
DonGiaRieng         NUMERIC(18,2) NULL
GhiChu              TEXT
```

---

## 8. `LOAI_TAI_SAN`

```
MaLoaiTaiSan        VARCHAR(20) PK
TenLoaiTaiSan       VARCHAR(100) NOT NULL
DonViTinh           VARCHAR(50)
MoTa                TEXT
```

Ví dụ:

```
Nệm
Tủ
Chìa khóa
Thẻ từ
Điều hòa
```

---

## 9. `PHONG_TAI_SAN`

```
MaPhongTaiSan       VARCHAR(20) PK
MaPhong             VARCHAR(20) FK → PHONG
MaLoaiTaiSan        VARCHAR(20) FK → LOAI_TAI_SAN
SoLuong             INTEGER NOT NULL
TinhTrangHienTai    VARCHAR(100)
GhiChu              TEXT
```

---

# II. Khách hàng, yêu cầu thuê và xem phòng

## 10. `KHACH_HANG`

```
MaKhachHang         VARCHAR(20) PK
LoaiKhachHang       VARCHAR(20) NOT NULL
HoTen               VARCHAR(100) NULL
TenToChuc           VARCHAR(200) NULL
NgaySinh            DATE NULL
GioiTinh            VARCHAR(20) NULL
QuocTich            VARCHAR(100) NULL
LoaiGiayTo          VARCHAR(50) NULL
SoGiayTo            VARCHAR(50) NULL
MaSoThue            VARCHAR(50) NULL
NguoiDaiDien        VARCHAR(100) NULL
SoDienThoai         VARCHAR(20)
Email               VARCHAR(255)
DiaChi              TEXT
```

`LoaiKhachHang`:

```
INDIVIDUAL
ORGANIZATION
```

Quy tắc:

- Cá nhân: `HoTen` bắt buộc.
- Tổ chức: `TenToChuc`, `NguoiDaiDien` bắt buộc.
- Người thực tế cư trú phải là loại `INDIVIDUAL`.

---

## 11. `YEU_CAU_THUE`

```
MaYeuCau            VARCHAR(20) PK
MaKhachHangDaiDien  VARCHAR(20) FK → KHACH_HANG
MaChiNhanh          VARCHAR(20) FK → CHI_NHANH
MaNhanVienSale      VARCHAR(20) FK → NHAN_VIEN
NgayDangKy          TIMESTAMPTZ NOT NULL
SoNguoiDuKien       INTEGER NOT NULL
HinhThucThue        VARCHAR(20) NOT NULL
LoaiPhongMongMuon   VARCHAR(50)
MucGiaToiDa         NUMERIC(18,2)
NgayDuKienVao       DATE NOT NULL
ThoiHanThueThang    INTEGER NOT NULL
GioiTinhYeuCau      VARCHAR(20)
CanDieuHoa          BOOLEAN
CanGuiXe            BOOLEAN
UuTienYenTinh       BOOLEAN
ChapNhanOGhep       BOOLEAN
GioGiacSinhHoat     TEXT
GhiChu              TEXT
TrangThai           VARCHAR(30) NOT NULL
```

`HinhThucThue`:

```
WHOLE_ROOM
SHARED_BEDS
```

---

## 12. `THANH_VIEN_YEU_CAU`

Thay cho `NHOM_THUE` và `THANHVIEN_NHOM`.

```
MaYeuCau            VARCHAR(20) PK, FK → YEU_CAU_THUE
MaKhachHang         VARCHAR(20) PK, FK → KHACH_HANG
LaNguoiDaiDien      BOOLEAN NOT NULL DEFAULT FALSE
MaGiuongDuKien      VARCHAR(20) NULL FK → GIUONG
DaDoiChieuGiayTo    BOOLEAN NOT NULL DEFAULT FALSE
KetQuaDieuKien      VARCHAR(30) NULL
LyDoTuChoi          TEXT NULL
MaQuanLyDuyet       VARCHAR(20) NULL FK → NHAN_VIEN
ThoiDiemDuyet       TIMESTAMPTZ NULL
TrangThaiThamGia    VARCHAR(30) NOT NULL
```

Giá trị khởi tạo khi Sale thêm thành viên dự kiến là `PLANNED`.

`KetQuaDieuKien`:

```
NOT_REVIEWED
ELIGIBLE
INELIGIBLE
```

---

## 13. `LICH_XEM_PHONG`

```
MaLichHen           VARCHAR(20) PK
MaYeuCau            VARCHAR(20) FK → YEU_CAU_THUE
MaNhanVienSale      VARCHAR(20) FK → NHAN_VIEN
ThoiGianBatDau      TIMESTAMPTZ NOT NULL
ThoiGianKetThuc     TIMESTAMPTZ
TrangThai           VARCHAR(30) NOT NULL
DaThongBao          BOOLEAN NOT NULL DEFAULT FALSE
KenhThongBao        VARCHAR(20)
DaXacNhanKhachXem   BOOLEAN NOT NULL DEFAULT FALSE
KetQuaCuoi          VARCHAR(30)
NgayLienHeLai       DATE NULL
GhiChu              TEXT
```

---

## 14. `CHI_TIET_LICH_XEM`

```
MaLichHen           VARCHAR(20) PK, FK → LICH_XEM_PHONG
MaPhong             VARCHAR(20) PK, FK → PHONG
DaXemThucTe         BOOLEAN NOT NULL DEFAULT FALSE
KhachQuanTam        BOOLEAN NOT NULL DEFAULT FALSE
GhiChu              TEXT
```

Một lịch có thể chứa nhiều phòng.

---

# III. Đặt cọc và thanh toán

## 15. `DAT_COC`

```
MaPhieuCoc              VARCHAR(20) PK
MaYeuCau                VARCHAR(20) FK → YEU_CAU_THUE
MaNhanVienSale          VARCHAR(20) FK → NHAN_VIEN
NgayTao                 TIMESTAMPTZ NOT NULL
HinhThucThueSnapshot    VARCHAR(20) NOT NULL
KhachDongYNoiQuy        BOOLEAN NOT NULL DEFAULT FALSE
ThoiDiemDongYNoiQuy     TIMESTAMPTZ NULL
MaQuanLyXacNhanPhong    VARCHAR(20) NULL FK → NHAN_VIEN
ThoiDiemXacNhanPhong    TIMESTAMPTZ NULL
LyDoTuChoiPhong         TEXT NULL
TongTienCoc             NUMERIC(18,2) NOT NULL
NgayHenNhanPhong        TIMESTAMPTZ NULL
TrangThai               VARCHAR(40) NOT NULL
GhiChu                  TEXT
```

Trạng thái tối thiểu:

```
DRAFT
WAITING_ROOM_CHECK
ROOM_APPROVED
ROOM_REJECTED
WAITING_PAYMENT
WAITING_MANAGER_CONFIRMATION
PAYMENT_RECHECK
PAYMENT_REJECTED
DEPOSITED
EXPIRED
CANCELLED
```

---

## 16. `CHI_TIET_DAT_COC`

```
MaPhieuCoc          VARCHAR(20) PK, FK → DAT_COC
MaGiuong            VARCHAR(20) PK, FK → GIUONG
GiaThueSnapshot     NUMERIC(18,2) NOT NULL
SoThangCoc          INTEGER NOT NULL DEFAULT 2
ThanhTienCoc        NUMERIC(18,2) NOT NULL
```

Thuê nguyên phòng thì thêm tất cả giường của phòng vào bảng này.

---

## 17. `PHAN_BO_GIUONG`

```
MaPhanBo            VARCHAR(20) PK
MaGiuong            VARCHAR(20) FK → GIUONG
MaPhieuCoc          VARCHAR(20) NULL FK → DAT_COC
MaHopDong           VARCHAR(20) NULL FK → HOP_DONG_THUE
LoaiPhanBo          VARCHAR(20) NOT NULL
TrangThai           VARCHAR(20) NOT NULL
BatDauLuc           TIMESTAMPTZ NOT NULL
HetHanLuc           TIMESTAMPTZ NULL
KetThucLuc          TIMESTAMPTZ NULL
```

`LoaiPhanBo`:

```
HELD
DEPOSITED
OCCUPIED
```

Ràng buộc bắt buộc:

```
Mỗi giường chỉ có tối đa một PHAN_BO_GIUONG
đang ACTIVE tại cùng một thời điểm.
```

Luồng:

```
Kế toán phát hành yêu cầu thanh toán → HELD
Quản lý xác nhận tiền cọc            → DEPOSITED
Quản lý bàn giao                     → OCCUPIED
Hoàn tất trả phòng                   → ENDED
```

---

## 18. `THANH_TOAN`

Một bảng dùng chung cho thu cọc, tiền kỳ đầu, thu thêm và hoàn cọc.

Báo cáo tài chính cộng `SoTienThucTe` khác `NULL`, trừ payment có trạng thái
`CANCELLED`, `EXPIRED` hoặc `PAYMENT_REJECTED`.

```
MaThanhToan         VARCHAR(20) PK
LoaiThanhToan       VARCHAR(30) NOT NULL
HuongGiaoDich       VARCHAR(10) NOT NULL
SoTienPhaiThanhToan NUMERIC(18,2) NOT NULL
SoTienThucTe        NUMERIC(18,2) NULL
ThoiDiemPhatHanh    TIMESTAMPTZ NOT NULL
HanThanhToan        TIMESTAMPTZ NULL
ThoiDiemThanhToan   TIMESTAMPTZ NULL
PhuongThuc          VARCHAR(20) NULL
MaGiaoDich          VARCHAR(100) NULL
SoPhieuThuChi       VARCHAR(50) NULL
DaKiemTraChungTu    BOOLEAN NOT NULL DEFAULT FALSE
MaKeToanGhiNhan     VARCHAR(20) FK → NHAN_VIEN
MaQuanLyXacNhan     VARCHAR(20) NULL FK → NHAN_VIEN
ThoiDiemXacNhan     TIMESTAMPTZ NULL
LyDoTraLai          TEXT NULL
TrangThai           VARCHAR(30) NOT NULL
MaPhieuCoc          VARCHAR(20) NULL FK → DAT_COC
MaHopDong           VARCHAR(20) NULL FK → HOP_DONG_THUE
MaDoiSoat           VARCHAR(20) NULL FK → DOI_SOAT_TRA_PHONG
GhiChu              TEXT
```

`LoaiThanhToan`:

```
DEPOSIT
INITIAL_PAYMENT
CHECKOUT_ADDITIONAL_PAYMENT
DEPOSIT_REFUND
```

`HuongGiaoDich`:

```
INBOUND
OUTBOUND
```

`PhuongThuc`:

```
CASH
BANK_TRANSFER
```

Đối với `DEPOSIT`, chỉ chuyển sang `CONFIRMED` khi có `MaQuanLyXacNhan`.

---

## 19. `CHI_TIET_THANH_TOAN`

```
MaChiTiet           VARCHAR(20) PK
MaThanhToan         VARCHAR(20) FK → THANH_TOAN
LoaiKhoan           VARCHAR(50) NOT NULL
MoTa                TEXT
SoLuong             NUMERIC(12,2) NOT NULL DEFAULT 1
DonGia              NUMERIC(18,2) NOT NULL
ThanhTien           NUMERIC(18,2) NOT NULL
```

Dùng cho thanh toán ban đầu:

- Tiền thuê kỳ đầu.
- Wifi.
- Gửi xe.
- Điện/nước.
- Phí khác.

---

# IV. Hợp đồng, nhận phòng và bàn giao

## 20. `HOP_DONG_THUE`

```
MaHopDong           VARCHAR(20) PK
MaPhieuCoc          VARCHAR(20) UNIQUE FK → DAT_COC
MaNhanVienSale      VARCHAR(20) FK → NHAN_VIEN
SoHopDongGiay       VARCHAR(50) UNIQUE
KhachDaDen          BOOLEAN NOT NULL DEFAULT FALSE
ThoiDiemKhachDen    TIMESTAMPTZ NULL
NgayKy              DATE NULL
NgayBatDau          DATE NOT NULL
NgayKetThuc         DATE NOT NULL
KyThanhToan         VARCHAR(50)
TongGiaThueThang    NUMERIC(18,2) NOT NULL
DaKyHopDongGiay     BOOLEAN NOT NULL DEFAULT FALSE
ThoiDiemXacNhanKy   TIMESTAMPTZ NULL
TrangThai           VARCHAR(30) NOT NULL
DieuKhoanDacBiet    TEXT
```

Trạng thái:

```
CHECKIN_DRAFT
ARRIVED
WAITING_ELIGIBILITY
ELIGIBILITY_APPROVED
CHECKIN_STOPPED
PAPER_SIGNED
WAITING_INITIAL_PAYMENT
READY_FOR_HANDOVER
ACTIVE
LIQUIDATED
```

---

## 21. `HOP_DONG_CHO_O`

Một dòng tương ứng một giường được thuê.

```
MaHopDong           VARCHAR(20) PK, FK → HOP_DONG_THUE
MaGiuong            VARCHAR(20) PK, FK → GIUONG
MaKhachHangO        VARCHAR(20) NULL FK → KHACH_HANG
GiaThueSnapshot     NUMERIC(18,2) NOT NULL
TrangThai           VARCHAR(20) NOT NULL
```

Thuê nguyên phòng nhưng chỉ ba người ở phòng bốn giường:

```
B01 → người A
B02 → người B
B03 → người C
B04 → NULL, nhưng vẫn thuộc hợp đồng
```

Như vậy B04 không được cho người khác thuê.

---

## 22. `HOP_DONG_DICH_VU`

```
MaHopDong           VARCHAR(20) PK, FK → HOP_DONG_THUE
MaDichVu            VARCHAR(20) PK, FK → DICH_VU
DonGiaSnapshot      NUMERIC(18,2) NOT NULL
CachTinh            VARCHAR(100)
GhiChu              TEXT
```

---

## 23. `BAN_GIAO`

```
MaBanGiao           VARCHAR(20) PK
MaHopDong           VARCHAR(20) UNIQUE FK → HOP_DONG_THUE
MaQuanLy            VARCHAR(20) FK → NHAN_VIEN
ThoiDiemBanGiao     TIMESTAMPTZ
TinhTrangKhuVuc     TEXT
DaHuongDanTienIch   BOOLEAN NOT NULL DEFAULT FALSE
DaHuongDanAnToan    BOOLEAN NOT NULL DEFAULT FALSE
DaXacNhanBienBanGiay BOOLEAN NOT NULL DEFAULT FALSE
TrangThai           VARCHAR(20) NOT NULL
GhiChu              TEXT
```

---

## 24. `BAN_GIAO_TAI_SAN`

```
MaBanGiao           VARCHAR(20) PK, FK → BAN_GIAO
MaPhongTaiSan       VARCHAR(20) PK, FK → PHONG_TAI_SAN
SoLuongBanGiao      INTEGER NOT NULL
TinhTrangLucGiao    VARCHAR(100)
GhiChu              TEXT
```

---

# V. Trả phòng, kiểm tra và đối soát

## 25. `YEU_CAU_TRA_PHONG`

Phải xử lý được cả:

- Đã ký hợp đồng.
- Đã cọc nhưng chưa ký hợp đồng và cần hoàn 80%.

```
MaYeuCauTra         VARCHAR(20) PK
MaPhieuCoc          VARCHAR(20) FK → DAT_COC
MaHopDong           VARCHAR(20) NULL FK → HOP_DONG_THUE
MaNhanVienSale      VARCHAR(20) FK → NHAN_VIEN
NgayYeuCau          TIMESTAMPTZ NOT NULL
NgayTraDuKien       TIMESTAMPTZ
NgayTraThucTe       TIMESTAMPTZ NULL
LyDoTraPhong        TEXT
TrangThai           VARCHAR(30) NOT NULL
GhiChu              TEXT
```

Không đặt `TyLeHoanCoc` ở đây.

---

## 26. `BIEN_BAN_KIEM_TRA_TRA`

Có thể không tồn tại nếu khách chỉ cọc nhưng chưa nhận phòng.

```
MaBienBanTra        VARCHAR(20) PK
MaYeuCauTra         VARCHAR(20) UNIQUE FK → YEU_CAU_TRA_PHONG
MaQuanLy            VARCHAR(20) FK → NHAN_VIEN
NgayKiemTra         TIMESTAMPTZ
TinhTrangVeSinh     TEXT
TinhTrangKhuVuc     TEXT
TrangThai           VARCHAR(20)
GhiChu              TEXT
```

---

## 27. `CHI_TIET_KIEM_TRA_TRA`

```
MaChiTietKiemTra    VARCHAR(20) PK
MaBienBanTra        VARCHAR(20) FK → BIEN_BAN_KIEM_TRA_TRA
MaPhongTaiSan       VARCHAR(20) NULL FK → PHONG_TAI_SAN
LoaiKetQua          VARCHAR(30) NOT NULL
SoLuong             INTEGER
MoTa                TEXT
ChiPhiDuKien        NUMERIC(18,2)
GhiChu              TEXT
```

`LoaiKetQua`:

```
NORMAL
DAMAGED
MISSING
CLEANING_REQUIRED
OTHER_VIOLATION
```

---

## 28. `DOI_SOAT_TRA_PHONG`

```
MaDoiSoat               VARCHAR(20) PK
MaYeuCauTra             VARCHAR(20) UNIQUE FK → YEU_CAU_TRA_PHONG
MaKeToan                 VARCHAR(20) FK → NHAN_VIEN
TienCocGoc               NUMERIC(18,2) NOT NULL
TyLeHoan                 INTEGER NOT NULL
TienHoanCoBan            NUMERIC(18,2) NOT NULL
TongKhauTru              NUMERIC(18,2) NOT NULL
SoDuCuoi                 NUMERIC(18,2) NOT NULL
KetQua                   VARCHAR(30) NOT NULL
MaQuanLyXacNhanKhach     VARCHAR(20) NULL FK → NHAN_VIEN
ThoiDiemKhachDongY       TIMESTAMPTZ NULL
NoiDungKhieuNai          TEXT NULL
DaKyBienBanTraPhong      BOOLEAN NOT NULL DEFAULT FALSE
DaThanhLyHopDong         BOOLEAN NOT NULL DEFAULT FALSE
DaThuHoiKhoaThe          BOOLEAN NOT NULL DEFAULT FALSE
DaKhachRoiPhong          BOOLEAN NOT NULL DEFAULT FALSE
TrangThai                VARCHAR(30) NOT NULL
GhiChu                   TEXT
```

`TyLeHoan`:

```
80   // đã cọc nhưng chưa ký
50   // trả trước hạn và ở <= 6 tháng
70   // trả trước hạn và ở > 6 tháng
100  // hết hạn hợp đồng
```

`KetQua`:

```
REFUND_TO_CUSTOMER
CUSTOMER_PAYS_ADDITIONAL
NO_BALANCE
```

---

## 29. `CHI_TIET_KHAU_TRU`

```
MaChiTietKhauTru    VARCHAR(20) PK
MaDoiSoat           VARCHAR(20) FK → DOI_SOAT_TRA_PHONG
LoaiPhi             VARCHAR(50) NOT NULL
MoTa                TEXT
SoTien              NUMERIC(18,2) NOT NULL
NguonDuLieu         VARCHAR(30)
```

`NguonDuLieu`:

```
DEBT
INSPECTION
VIOLATION
MANUAL
```

---

# 3. Quan hệ chính của ERD

```
CHI_NHANH 1 ─── N PHONG
CHI_NHANH 1 ─── N NHAN_VIEN
NHAN_VIEN 1 ─── 1 TAI_KHOAN

PHONG 1 ─── N GIUONG
PHONG N ─── N DICH_VU
PHONG 1 ─── N PHONG_TAI_SAN

KHACH_HANG 1 ─── N YEU_CAU_THUE
YEU_CAU_THUE 1 ─── N THANH_VIEN_YEU_CAU
YEU_CAU_THUE 1 ─── N LICH_XEM_PHONG
LICH_XEM_PHONG 1 ─── N CHI_TIET_LICH_XEM

YEU_CAU_THUE 1 ─── N DAT_COC
DAT_COC 1 ─── N CHI_TIET_DAT_COC
GIUONG 1 ─── N CHI_TIET_DAT_COC

GIUONG 1 ─── N PHAN_BO_GIUONG
DAT_COC 1 ─── N PHAN_BO_GIUONG

DAT_COC 1 ─── N THANH_TOAN
DAT_COC 0 ─── 1 HOP_DONG_THUE

HOP_DONG_THUE 1 ─── N HOP_DONG_CHO_O
HOP_DONG_THUE 1 ─── N HOP_DONG_DICH_VU
HOP_DONG_THUE 1 ─── 1 BAN_GIAO
BAN_GIAO 1 ─── N BAN_GIAO_TAI_SAN

DAT_COC 1 ─── N YEU_CAU_TRA_PHONG
HOP_DONG_THUE 0 ─── N YEU_CAU_TRA_PHONG

YEU_CAU_TRA_PHONG 0 ─── 1 BIEN_BAN_KIEM_TRA_TRA
BIEN_BAN_KIEM_TRA_TRA 1 ─── N CHI_TIET_KIEM_TRA_TRA

YEU_CAU_TRA_PHONG 1 ─── 1 DOI_SOAT_TRA_PHONG
DOI_SOAT_TRA_PHONG 1 ─── N CHI_TIET_KHAU_TRU
DOI_SOAT_TRA_PHONG 1 ─── N THANH_TOAN
```

---

# 4. Những ràng buộc database bắt buộc

## Ràng buộc 1 — Không đặt trùng giường

Trong PostgreSQL cần partial unique index tương đương:

```
CREATE UNIQUE INDEX uq_active_bed_allocation
ON phan_bo_giuong (ma_giuong)
WHERE trang_thai = 'ACTIVE';
```

---

## Ràng buộc 2 — Giá trị tiền không âm

```
GiaThueThang >= 0
SoTienPhaiThanhToan >= 0
ThanhTienCoc >= 0
SoTien khấu trừ >= 0
```

`SoDuCuoi` được phép âm vì âm nghĩa là khách phải trả thêm.

---

## Ràng buộc 3 — Nhân viên và chi nhánh

```
ADMIN:
    MaChiNhanh IS NULL

SALE / ACCOUNTANT / MANAGER:
    MaChiNhanh IS NOT NULL
```

---

## Ràng buộc 4 — Thành viên phải là cá nhân

`THANH_VIEN_YEU_CAU.MaKhachHang` chỉ được tham chiếu khách có:

```
LoaiKhachHang = INDIVIDUAL
```

Ràng buộc này kiểm tra ở service vì CHECK constraint không tham chiếu bảng khác thuận tiện.

---

## Ràng buộc 5 — Thanh toán thuộc đúng nghiệp vụ

Mỗi `THANH_TOAN` phải có đúng một quan hệ chính:

```
DEPOSIT                     → MaPhieuCoc
INITIAL_PAYMENT             → MaHopDong
CHECKOUT_ADDITIONAL_PAYMENT → MaDoiSoat
DEPOSIT_REFUND              → MaDoiSoat
```

---

## Ràng buộc 6 — Không bàn giao nếu chưa đủ điều kiện

Service chỉ tạo/xác nhận `BAN_GIAO` khi:

```
Tất cả thành viên hợp lệ đã được duyệt
AND hợp đồng giấy đã ký
AND thanh toán ban đầu đã đủ
```

---

## Ràng buộc 7 — Không giải phóng giường sớm

Chỉ kết thúc `PHAN_BO_GIUONG` khi:

```
Khách đã đồng ý đối soát
AND đã thanh toán phần thiếu nếu có
AND đã thanh lý hợp đồng
AND đã thu hồi khóa/thẻ
AND đã hoàn cọc nếu có
AND quản lý xác nhận hoàn tất
```

Đây là thứ tự mà đề yêu cầu trước khi phòng/giường trở lại trạng thái trống.
