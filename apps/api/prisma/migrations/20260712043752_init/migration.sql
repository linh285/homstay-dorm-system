-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SALE', 'ACCOUNTANT', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OperationalStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "RentalMode" AS ENUM ('WHOLE_ROOM', 'SHARED_BEDS');

-- CreateEnum
CREATE TYPE "EligibilityResult" AS ENUM ('NOT_REVIEWED', 'ELIGIBLE', 'INELIGIBLE');

-- CreateEnum
CREATE TYPE "RentalRequestStatus" AS ENUM ('ACTIVE', 'VIEWING', 'DEPOSIT_PROCESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "ViewingStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'VISITED', 'RESULT_RECORDED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ViewingResult" AS ENUM ('CUSTOMER_WANTS_DEPOSIT', 'WANTS_MORE_VIEWINGS', 'WANTS_TO_CHANGE_CRITERIA', 'UNDECIDED', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('DRAFT', 'WAITING_ROOM_CHECK', 'ROOM_APPROVED', 'ROOM_REJECTED', 'WAITING_PAYMENT', 'WAITING_MANAGER_CONFIRMATION', 'PAYMENT_RECHECK', 'PAYMENT_REJECTED', 'DEPOSITED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AllocationType" AS ENUM ('HELD', 'DEPOSITED', 'OCCUPIED');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'INITIAL_PAYMENT', 'CHECKOUT_ADDITIONAL_PAYMENT', 'DEPOSIT_REFUND');

-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('CHECKIN_DRAFT', 'ARRIVED', 'WAITING_ELIGIBILITY', 'ELIGIBILITY_APPROVED', 'CHECKIN_STOPPED', 'PAPER_SIGNED', 'WAITING_INITIAL_PAYMENT', 'READY_FOR_HANDOVER', 'ACTIVE', 'LIQUIDATED');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('DRAFT', 'WAITING_INSPECTION', 'INSPECTED', 'WAITING_SETTLEMENT', 'WAITING_CUSTOMER_CONFIRMATION', 'DISPUTED', 'WAITING_FINANCIAL_COMPLETION', 'READY_TO_COMPLETE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('NORMAL', 'DAMAGED', 'MISSING', 'CLEANING_REQUIRED', 'OTHER_VIOLATION');

-- CreateEnum
CREATE TYPE "SettlementResult" AS ENUM ('REFUND_TO_CUSTOMER', 'CUSTOMER_PAYS_ADDITIONAL', 'NO_BALANCE');

-- CreateEnum
CREATE TYPE "DeductionSource" AS ENUM ('DEBT', 'INSPECTION', 'VIOLATION', 'MANUAL');

-- CreateTable
CREATE TABLE "chi_nhanh" (
    "ma_chi_nhanh" VARCHAR(20) NOT NULL,
    "ten_chi_nhanh" VARCHAR(100) NOT NULL,
    "dia_chi" TEXT NOT NULL,
    "so_dien_thoai" VARCHAR(20),
    "email" VARCHAR(255),
    "ten_chu_tai_khoan" VARCHAR(100),
    "so_tai_khoan" VARCHAR(50),
    "ngan_hang" VARCHAR(100),
    "huong_dan_chuyen_khoan" TEXT,
    "trang_thai" VARCHAR(20) NOT NULL,

    CONSTRAINT "chi_nhanh_pkey" PRIMARY KEY ("ma_chi_nhanh")
);

-- CreateTable
CREATE TABLE "nhan_vien" (
    "ma_nhan_vien" VARCHAR(20) NOT NULL,
    "ho_ten" VARCHAR(100) NOT NULL,
    "so_dien_thoai" VARCHAR(20),
    "email" VARCHAR(255),
    "chuc_vu" "Role" NOT NULL,
    "ma_chi_nhanh" VARCHAR(20),
    "trang_thai" VARCHAR(20) NOT NULL,

    CONSTRAINT "nhan_vien_pkey" PRIMARY KEY ("ma_nhan_vien")
);

-- CreateTable
CREATE TABLE "tai_khoan" (
    "ten_dang_nhap" VARCHAR(50) NOT NULL,
    "ma_nhan_vien" VARCHAR(20) NOT NULL,
    "mat_khau_hash" VARCHAR(255) NOT NULL,
    "trang_thai_tai_khoan" VARCHAR(20) NOT NULL,
    "lan_dang_nhap_cuoi" TIMESTAMPTZ(6),

    CONSTRAINT "tai_khoan_pkey" PRIMARY KEY ("ten_dang_nhap")
);

-- CreateTable
CREATE TABLE "phong" (
    "ma_phong" VARCHAR(20) NOT NULL,
    "ma_chi_nhanh" VARCHAR(20) NOT NULL,
    "ten_phong" VARCHAR(50) NOT NULL,
    "khu_vuc" VARCHAR(100),
    "tang" INTEGER,
    "loai_phong" VARCHAR(50),
    "suc_chua_toi_da" INTEGER NOT NULL,
    "gioi_tinh_ap_dung" VARCHAR(20),
    "co_dieu_hoa" BOOLEAN NOT NULL DEFAULT false,
    "cho_gui_xe" BOOLEAN NOT NULL DEFAULT false,
    "gio_gioi_nghiem" VARCHAR(100),
    "muc_do_yen_tinh" VARCHAR(50),
    "noi_quy" TEXT,
    "trang_thai_van_hanh" "OperationalStatus" NOT NULL,
    "ghi_chu" TEXT,

    CONSTRAINT "phong_pkey" PRIMARY KEY ("ma_phong")
);

-- CreateTable
CREATE TABLE "giuong" (
    "ma_giuong" VARCHAR(20) NOT NULL,
    "ma_phong" VARCHAR(20) NOT NULL,
    "ten_giuong" VARCHAR(50) NOT NULL,
    "gia_thue_thang" DECIMAL(18,2) NOT NULL,
    "trang_thai_van_hanh" "OperationalStatus" NOT NULL,
    "ghi_chu" TEXT,

    CONSTRAINT "giuong_pkey" PRIMARY KEY ("ma_giuong")
);

-- CreateTable
CREATE TABLE "dich_vu" (
    "ma_dich_vu" VARCHAR(20) NOT NULL,
    "ten_dich_vu" VARCHAR(100) NOT NULL,
    "don_vi_tinh" VARCHAR(50),
    "don_gia" DECIMAL(18,2) NOT NULL,
    "ngay_ap_dung" DATE,
    "trang_thai" VARCHAR(20),

    CONSTRAINT "dich_vu_pkey" PRIMARY KEY ("ma_dich_vu")
);

-- CreateTable
CREATE TABLE "phong_dich_vu" (
    "ma_phong" VARCHAR(20) NOT NULL,
    "ma_dich_vu" VARCHAR(20) NOT NULL,
    "don_gia_rieng" DECIMAL(18,2),
    "ghi_chu" TEXT,

    CONSTRAINT "phong_dich_vu_pkey" PRIMARY KEY ("ma_phong","ma_dich_vu")
);

-- CreateTable
CREATE TABLE "loai_tai_san" (
    "ma_loai_tai_san" VARCHAR(20) NOT NULL,
    "ten_loai_tai_san" VARCHAR(100) NOT NULL,
    "don_vi_tinh" VARCHAR(50),
    "mo_ta" TEXT,

    CONSTRAINT "loai_tai_san_pkey" PRIMARY KEY ("ma_loai_tai_san")
);

-- CreateTable
CREATE TABLE "phong_tai_san" (
    "ma_phong_tai_san" VARCHAR(20) NOT NULL,
    "ma_phong" VARCHAR(20) NOT NULL,
    "ma_loai_tai_san" VARCHAR(20) NOT NULL,
    "so_luong" INTEGER NOT NULL,
    "tinh_trang_hien_tai" VARCHAR(100),
    "ghi_chu" TEXT,

    CONSTRAINT "phong_tai_san_pkey" PRIMARY KEY ("ma_phong_tai_san")
);

-- CreateTable
CREATE TABLE "khach_hang" (
    "ma_khach_hang" VARCHAR(20) NOT NULL,
    "loai_khach_hang" "CustomerType" NOT NULL,
    "ho_ten" VARCHAR(100),
    "ten_to_chuc" VARCHAR(200),
    "ngay_sinh" DATE,
    "gioi_tinh" VARCHAR(20),
    "quoc_tich" VARCHAR(100),
    "loai_giay_to" VARCHAR(50),
    "so_giay_to" VARCHAR(50),
    "ma_so_thue" VARCHAR(50),
    "nguoi_dai_dien" VARCHAR(100),
    "so_dien_thoai" VARCHAR(20),
    "email" VARCHAR(255),
    "dia_chi" TEXT,

    CONSTRAINT "khach_hang_pkey" PRIMARY KEY ("ma_khach_hang")
);

-- CreateTable
CREATE TABLE "yeu_cau_thue" (
    "ma_yeu_cau" VARCHAR(20) NOT NULL,
    "ma_khach_hang_dai_dien" VARCHAR(20) NOT NULL,
    "ma_chi_nhanh" VARCHAR(20) NOT NULL,
    "ma_nhan_vien_sale" VARCHAR(20) NOT NULL,
    "ngay_dang_ky" TIMESTAMPTZ(6) NOT NULL,
    "so_nguoi_du_kien" INTEGER NOT NULL,
    "hinh_thuc_thue" "RentalMode" NOT NULL,
    "loai_phong_mong_muon" VARCHAR(50),
    "muc_gia_toi_da" DECIMAL(18,2),
    "ngay_du_kien_vao" DATE NOT NULL,
    "thoi_han_thue_thang" INTEGER NOT NULL,
    "gioi_tinh_yeu_cau" VARCHAR(20),
    "can_dieu_hoa" BOOLEAN,
    "can_gui_xe" BOOLEAN,
    "uu_tien_yen_tinh" BOOLEAN,
    "chap_nhan_o_ghep" BOOLEAN,
    "gio_giac_sinh_hoat" TEXT,
    "ghi_chu" TEXT,
    "trang_thai" "RentalRequestStatus" NOT NULL,

    CONSTRAINT "yeu_cau_thue_pkey" PRIMARY KEY ("ma_yeu_cau")
);

-- CreateTable
CREATE TABLE "thanh_vien_yeu_cau" (
    "ma_yeu_cau" VARCHAR(20) NOT NULL,
    "ma_khach_hang" VARCHAR(20) NOT NULL,
    "la_nguoi_dai_dien" BOOLEAN NOT NULL DEFAULT false,
    "ma_giuong_du_kien" VARCHAR(20),
    "da_doi_chieu_giay_to" BOOLEAN NOT NULL DEFAULT false,
    "ket_qua_dieu_kien" "EligibilityResult",
    "ly_do_tu_choi" TEXT,
    "ma_quan_ly_duyet" VARCHAR(20),
    "thoi_diem_duyet" TIMESTAMPTZ(6),
    "trang_thai_tham_gia" VARCHAR(30) NOT NULL,

    CONSTRAINT "thanh_vien_yeu_cau_pkey" PRIMARY KEY ("ma_yeu_cau","ma_khach_hang")
);

-- CreateTable
CREATE TABLE "lich_xem_phong" (
    "ma_lich_hen" VARCHAR(20) NOT NULL,
    "ma_yeu_cau" VARCHAR(20) NOT NULL,
    "ma_nhan_vien_sale" VARCHAR(20) NOT NULL,
    "thoi_gian_bat_dau" TIMESTAMPTZ(6) NOT NULL,
    "thoi_gian_ket_thuc" TIMESTAMPTZ(6),
    "trang_thai" "ViewingStatus" NOT NULL,
    "da_thong_bao" BOOLEAN NOT NULL DEFAULT false,
    "kenh_thong_bao" VARCHAR(20),
    "da_xac_nhan_khach_xem" BOOLEAN NOT NULL DEFAULT false,
    "ket_qua_cuoi" "ViewingResult",
    "ngay_lien_he_lai" DATE,
    "ghi_chu" TEXT,

    CONSTRAINT "lich_xem_phong_pkey" PRIMARY KEY ("ma_lich_hen")
);

-- CreateTable
CREATE TABLE "chi_tiet_lich_xem" (
    "ma_lich_hen" VARCHAR(20) NOT NULL,
    "ma_phong" VARCHAR(20) NOT NULL,
    "da_xem_thuc_te" BOOLEAN NOT NULL DEFAULT false,
    "khach_quan_tam" BOOLEAN NOT NULL DEFAULT false,
    "ghi_chu" TEXT,

    CONSTRAINT "chi_tiet_lich_xem_pkey" PRIMARY KEY ("ma_lich_hen","ma_phong")
);

-- CreateTable
CREATE TABLE "dat_coc" (
    "ma_phieu_coc" VARCHAR(20) NOT NULL,
    "ma_yeu_cau" VARCHAR(20) NOT NULL,
    "ma_nhan_vien_sale" VARCHAR(20) NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL,
    "hinh_thuc_thue_snapshot" "RentalMode" NOT NULL,
    "khach_dong_y_noi_quy" BOOLEAN NOT NULL DEFAULT false,
    "thoi_diem_dong_y_noi_quy" TIMESTAMPTZ(6),
    "ma_quan_ly_xac_nhan_phong" VARCHAR(20),
    "thoi_diem_xac_nhan_phong" TIMESTAMPTZ(6),
    "ly_do_tu_choi_phong" TEXT,
    "tong_tien_coc" DECIMAL(18,2) NOT NULL,
    "ngay_hen_nhan_phong" TIMESTAMPTZ(6),
    "trang_thai" "DepositStatus" NOT NULL,
    "ghi_chu" TEXT,

    CONSTRAINT "dat_coc_pkey" PRIMARY KEY ("ma_phieu_coc")
);

-- CreateTable
CREATE TABLE "chi_tiet_dat_coc" (
    "ma_phieu_coc" VARCHAR(20) NOT NULL,
    "ma_giuong" VARCHAR(20) NOT NULL,
    "gia_thue_snapshot" DECIMAL(18,2) NOT NULL,
    "so_thang_coc" INTEGER NOT NULL DEFAULT 2,
    "thanh_tien_coc" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "chi_tiet_dat_coc_pkey" PRIMARY KEY ("ma_phieu_coc","ma_giuong")
);

-- CreateTable
CREATE TABLE "phan_bo_giuong" (
    "ma_phan_bo" VARCHAR(20) NOT NULL,
    "ma_giuong" VARCHAR(20) NOT NULL,
    "ma_phieu_coc" VARCHAR(20),
    "ma_hop_dong" VARCHAR(20),
    "loai_phan_bo" "AllocationType" NOT NULL,
    "trang_thai" "AllocationStatus" NOT NULL,
    "bat_dau_luc" TIMESTAMPTZ(6) NOT NULL,
    "het_han_luc" TIMESTAMPTZ(6),
    "ket_thuc_luc" TIMESTAMPTZ(6),

    CONSTRAINT "phan_bo_giuong_pkey" PRIMARY KEY ("ma_phan_bo")
);

-- CreateTable
CREATE TABLE "thanh_toan" (
    "ma_thanh_toan" VARCHAR(20) NOT NULL,
    "loai_thanh_toan" "PaymentType" NOT NULL,
    "huong_giao_dich" "TransactionDirection" NOT NULL,
    "so_tien_phai_thanh_toan" DECIMAL(18,2) NOT NULL,
    "so_tien_thuc_te" DECIMAL(18,2),
    "thoi_diem_phat_hanh" TIMESTAMPTZ(6) NOT NULL,
    "han_thanh_toan" TIMESTAMPTZ(6),
    "thoi_diem_thanh_toan" TIMESTAMPTZ(6),
    "phuong_thuc" "PaymentMethod",
    "ma_giao_dich" VARCHAR(100),
    "so_phieu_thu_chi" VARCHAR(50),
    "da_kiem_tra_chung_tu" BOOLEAN NOT NULL DEFAULT false,
    "ma_ke_toan_ghi_nhan" VARCHAR(20) NOT NULL,
    "ma_quan_ly_xac_nhan" VARCHAR(20),
    "thoi_diem_xac_nhan" TIMESTAMPTZ(6),
    "ly_do_tra_lai" TEXT,
    "trang_thai" VARCHAR(30) NOT NULL,
    "ma_phieu_coc" VARCHAR(20),
    "ma_hop_dong" VARCHAR(20),
    "ma_doi_soat" VARCHAR(20),
    "ghi_chu" TEXT,

    CONSTRAINT "thanh_toan_pkey" PRIMARY KEY ("ma_thanh_toan")
);

-- CreateTable
CREATE TABLE "chi_tiet_thanh_toan" (
    "ma_chi_tiet" VARCHAR(20) NOT NULL,
    "ma_thanh_toan" VARCHAR(20) NOT NULL,
    "loai_khoan" VARCHAR(50) NOT NULL,
    "mo_ta" TEXT,
    "so_luong" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "don_gia" DECIMAL(18,2) NOT NULL,
    "thanh_tien" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "chi_tiet_thanh_toan_pkey" PRIMARY KEY ("ma_chi_tiet")
);

-- CreateTable
CREATE TABLE "hop_dong_thue" (
    "ma_hop_dong" VARCHAR(20) NOT NULL,
    "ma_phieu_coc" VARCHAR(20) NOT NULL,
    "ma_nhan_vien_sale" VARCHAR(20) NOT NULL,
    "so_hop_dong_giay" VARCHAR(50),
    "khach_da_den" BOOLEAN NOT NULL DEFAULT false,
    "thoi_diem_khach_den" TIMESTAMPTZ(6),
    "ngay_ky" DATE,
    "ngay_bat_dau" DATE NOT NULL,
    "ngay_ket_thuc" DATE NOT NULL,
    "ky_thanh_toan" VARCHAR(50),
    "tong_gia_thue_thang" DECIMAL(18,2) NOT NULL,
    "da_ky_hop_dong_giay" BOOLEAN NOT NULL DEFAULT false,
    "thoi_diem_xac_nhan_ky" TIMESTAMPTZ(6),
    "trang_thai" "ContractStatus" NOT NULL,
    "dieu_khoan_dac_biet" TEXT,

    CONSTRAINT "hop_dong_thue_pkey" PRIMARY KEY ("ma_hop_dong")
);

-- CreateTable
CREATE TABLE "hop_dong_cho_o" (
    "ma_hop_dong" VARCHAR(20) NOT NULL,
    "ma_giuong" VARCHAR(20) NOT NULL,
    "ma_khach_hang_o" VARCHAR(20),
    "gia_thue_snapshot" DECIMAL(18,2) NOT NULL,
    "trang_thai" VARCHAR(20) NOT NULL,

    CONSTRAINT "hop_dong_cho_o_pkey" PRIMARY KEY ("ma_hop_dong","ma_giuong")
);

-- CreateTable
CREATE TABLE "hop_dong_dich_vu" (
    "ma_hop_dong" VARCHAR(20) NOT NULL,
    "ma_dich_vu" VARCHAR(20) NOT NULL,
    "don_gia_snapshot" DECIMAL(18,2) NOT NULL,
    "cach_tinh" VARCHAR(100),
    "ghi_chu" TEXT,

    CONSTRAINT "hop_dong_dich_vu_pkey" PRIMARY KEY ("ma_hop_dong","ma_dich_vu")
);

-- CreateTable
CREATE TABLE "ban_giao" (
    "ma_ban_giao" VARCHAR(20) NOT NULL,
    "ma_hop_dong" VARCHAR(20) NOT NULL,
    "ma_quan_ly" VARCHAR(20) NOT NULL,
    "thoi_diem_ban_giao" TIMESTAMPTZ(6),
    "tinh_trang_khu_vuc" TEXT,
    "da_huong_dan_tien_ich" BOOLEAN NOT NULL DEFAULT false,
    "da_huong_dan_an_toan" BOOLEAN NOT NULL DEFAULT false,
    "da_xac_nhan_bien_ban_giay" BOOLEAN NOT NULL DEFAULT false,
    "trang_thai" "HandoverStatus" NOT NULL,
    "ghi_chu" TEXT,

    CONSTRAINT "ban_giao_pkey" PRIMARY KEY ("ma_ban_giao")
);

-- CreateTable
CREATE TABLE "ban_giao_tai_san" (
    "ma_ban_giao" VARCHAR(20) NOT NULL,
    "ma_phong_tai_san" VARCHAR(20) NOT NULL,
    "so_luong_ban_giao" INTEGER NOT NULL,
    "tinh_trang_luc_giao" VARCHAR(100),
    "ghi_chu" TEXT,

    CONSTRAINT "ban_giao_tai_san_pkey" PRIMARY KEY ("ma_ban_giao","ma_phong_tai_san")
);

-- CreateTable
CREATE TABLE "yeu_cau_tra_phong" (
    "ma_yeu_cau_tra" VARCHAR(20) NOT NULL,
    "ma_phieu_coc" VARCHAR(20) NOT NULL,
    "ma_hop_dong" VARCHAR(20),
    "ma_nhan_vien_sale" VARCHAR(20) NOT NULL,
    "ngay_yeu_cau" TIMESTAMPTZ(6) NOT NULL,
    "ngay_tra_du_kien" TIMESTAMPTZ(6),
    "ngay_tra_thuc_te" TIMESTAMPTZ(6),
    "ly_do_tra_phong" TEXT,
    "trang_thai" "CheckoutStatus" NOT NULL,
    "ghi_chu" TEXT,

    CONSTRAINT "yeu_cau_tra_phong_pkey" PRIMARY KEY ("ma_yeu_cau_tra")
);

-- CreateTable
CREATE TABLE "bien_ban_kiem_tra_tra" (
    "ma_bien_ban_tra" VARCHAR(20) NOT NULL,
    "ma_yeu_cau_tra" VARCHAR(20) NOT NULL,
    "ma_quan_ly" VARCHAR(20) NOT NULL,
    "ngay_kiem_tra" TIMESTAMPTZ(6),
    "tinh_trang_ve_sinh" TEXT,
    "tinh_trang_khu_vuc" TEXT,
    "trang_thai" VARCHAR(20),
    "ghi_chu" TEXT,

    CONSTRAINT "bien_ban_kiem_tra_tra_pkey" PRIMARY KEY ("ma_bien_ban_tra")
);

-- CreateTable
CREATE TABLE "chi_tiet_kiem_tra_tra" (
    "ma_chi_tiet_kiem_tra" VARCHAR(20) NOT NULL,
    "ma_bien_ban_tra" VARCHAR(20) NOT NULL,
    "ma_phong_tai_san" VARCHAR(20),
    "loai_ket_qua" "InspectionResult" NOT NULL,
    "so_luong" INTEGER,
    "mo_ta" TEXT,
    "chi_phi_du_kien" DECIMAL(18,2),
    "ghi_chu" TEXT,

    CONSTRAINT "chi_tiet_kiem_tra_tra_pkey" PRIMARY KEY ("ma_chi_tiet_kiem_tra")
);

-- CreateTable
CREATE TABLE "doi_soat_tra_phong" (
    "ma_doi_soat" VARCHAR(20) NOT NULL,
    "ma_yeu_cau_tra" VARCHAR(20) NOT NULL,
    "ma_ke_toan" VARCHAR(20) NOT NULL,
    "tien_coc_goc" DECIMAL(18,2) NOT NULL,
    "ty_le_hoan" INTEGER NOT NULL,
    "tien_hoan_co_ban" DECIMAL(18,2) NOT NULL,
    "tong_khau_tru" DECIMAL(18,2) NOT NULL,
    "so_du_cuoi" DECIMAL(18,2) NOT NULL,
    "ket_qua" "SettlementResult" NOT NULL,
    "ma_quan_ly_xac_nhan_khach" VARCHAR(20),
    "thoi_diem_khach_dong_y" TIMESTAMPTZ(6),
    "noi_dung_khieu_nai" TEXT,
    "da_ky_bien_ban_tra_phong" BOOLEAN NOT NULL DEFAULT false,
    "da_thanh_ly_hop_dong" BOOLEAN NOT NULL DEFAULT false,
    "da_thu_hoi_khoa_the" BOOLEAN NOT NULL DEFAULT false,
    "da_khach_roi_phong" BOOLEAN NOT NULL DEFAULT false,
    "trang_thai" "CheckoutStatus" NOT NULL,
    "ghi_chu" TEXT,

    CONSTRAINT "doi_soat_tra_phong_pkey" PRIMARY KEY ("ma_doi_soat")
);

-- CreateTable
CREATE TABLE "chi_tiet_khau_tru" (
    "ma_chi_tiet_khau_tru" VARCHAR(20) NOT NULL,
    "ma_doi_soat" VARCHAR(20) NOT NULL,
    "loai_phi" VARCHAR(50) NOT NULL,
    "mo_ta" TEXT,
    "so_tien" DECIMAL(18,2) NOT NULL,
    "nguon_du_lieu" "DeductionSource",

    CONSTRAINT "chi_tiet_khau_tru_pkey" PRIMARY KEY ("ma_chi_tiet_khau_tru")
);

-- CreateIndex
CREATE INDEX "nhan_vien_ma_chi_nhanh_idx" ON "nhan_vien"("ma_chi_nhanh");

-- CreateIndex
CREATE UNIQUE INDEX "tai_khoan_ma_nhan_vien_key" ON "tai_khoan"("ma_nhan_vien");

-- CreateIndex
CREATE INDEX "phong_ma_chi_nhanh_idx" ON "phong"("ma_chi_nhanh");

-- CreateIndex
CREATE INDEX "giuong_ma_phong_idx" ON "giuong"("ma_phong");

-- CreateIndex
CREATE UNIQUE INDEX "giuong_ma_phong_ten_giuong_key" ON "giuong"("ma_phong", "ten_giuong");

-- CreateIndex
CREATE INDEX "phong_dich_vu_ma_dich_vu_idx" ON "phong_dich_vu"("ma_dich_vu");

-- CreateIndex
CREATE INDEX "phong_tai_san_ma_phong_idx" ON "phong_tai_san"("ma_phong");

-- CreateIndex
CREATE INDEX "phong_tai_san_ma_loai_tai_san_idx" ON "phong_tai_san"("ma_loai_tai_san");

-- CreateIndex
CREATE INDEX "yeu_cau_thue_ma_chi_nhanh_idx" ON "yeu_cau_thue"("ma_chi_nhanh");

-- CreateIndex
CREATE INDEX "yeu_cau_thue_ma_nhan_vien_sale_idx" ON "yeu_cau_thue"("ma_nhan_vien_sale");

-- CreateIndex
CREATE INDEX "yeu_cau_thue_ma_khach_hang_dai_dien_idx" ON "yeu_cau_thue"("ma_khach_hang_dai_dien");

-- CreateIndex
CREATE INDEX "thanh_vien_yeu_cau_ma_giuong_du_kien_idx" ON "thanh_vien_yeu_cau"("ma_giuong_du_kien");

-- CreateIndex
CREATE INDEX "thanh_vien_yeu_cau_ma_quan_ly_duyet_idx" ON "thanh_vien_yeu_cau"("ma_quan_ly_duyet");

-- CreateIndex
CREATE INDEX "lich_xem_phong_ma_yeu_cau_idx" ON "lich_xem_phong"("ma_yeu_cau");

-- CreateIndex
CREATE INDEX "lich_xem_phong_ma_nhan_vien_sale_idx" ON "lich_xem_phong"("ma_nhan_vien_sale");

-- CreateIndex
CREATE INDEX "chi_tiet_lich_xem_ma_phong_idx" ON "chi_tiet_lich_xem"("ma_phong");

-- CreateIndex
CREATE INDEX "dat_coc_ma_yeu_cau_idx" ON "dat_coc"("ma_yeu_cau");

-- CreateIndex
CREATE INDEX "dat_coc_ma_nhan_vien_sale_idx" ON "dat_coc"("ma_nhan_vien_sale");

-- CreateIndex
CREATE INDEX "dat_coc_ma_quan_ly_xac_nhan_phong_idx" ON "dat_coc"("ma_quan_ly_xac_nhan_phong");

-- CreateIndex
CREATE INDEX "chi_tiet_dat_coc_ma_giuong_idx" ON "chi_tiet_dat_coc"("ma_giuong");

-- CreateIndex
CREATE INDEX "phan_bo_giuong_ma_giuong_idx" ON "phan_bo_giuong"("ma_giuong");

-- CreateIndex
CREATE INDEX "phan_bo_giuong_ma_phieu_coc_idx" ON "phan_bo_giuong"("ma_phieu_coc");

-- CreateIndex
CREATE INDEX "phan_bo_giuong_ma_hop_dong_idx" ON "phan_bo_giuong"("ma_hop_dong");

-- CreateIndex
CREATE INDEX "thanh_toan_ma_ke_toan_ghi_nhan_idx" ON "thanh_toan"("ma_ke_toan_ghi_nhan");

-- CreateIndex
CREATE INDEX "thanh_toan_ma_quan_ly_xac_nhan_idx" ON "thanh_toan"("ma_quan_ly_xac_nhan");

-- CreateIndex
CREATE INDEX "thanh_toan_ma_phieu_coc_idx" ON "thanh_toan"("ma_phieu_coc");

-- CreateIndex
CREATE INDEX "thanh_toan_ma_hop_dong_idx" ON "thanh_toan"("ma_hop_dong");

-- CreateIndex
CREATE INDEX "thanh_toan_ma_doi_soat_idx" ON "thanh_toan"("ma_doi_soat");

-- CreateIndex
CREATE INDEX "chi_tiet_thanh_toan_ma_thanh_toan_idx" ON "chi_tiet_thanh_toan"("ma_thanh_toan");

-- CreateIndex
CREATE UNIQUE INDEX "hop_dong_thue_ma_phieu_coc_key" ON "hop_dong_thue"("ma_phieu_coc");

-- CreateIndex
CREATE UNIQUE INDEX "hop_dong_thue_so_hop_dong_giay_key" ON "hop_dong_thue"("so_hop_dong_giay");

-- CreateIndex
CREATE INDEX "hop_dong_thue_ma_nhan_vien_sale_idx" ON "hop_dong_thue"("ma_nhan_vien_sale");

-- CreateIndex
CREATE INDEX "hop_dong_cho_o_ma_giuong_idx" ON "hop_dong_cho_o"("ma_giuong");

-- CreateIndex
CREATE INDEX "hop_dong_cho_o_ma_khach_hang_o_idx" ON "hop_dong_cho_o"("ma_khach_hang_o");

-- CreateIndex
CREATE INDEX "hop_dong_dich_vu_ma_dich_vu_idx" ON "hop_dong_dich_vu"("ma_dich_vu");

-- CreateIndex
CREATE UNIQUE INDEX "ban_giao_ma_hop_dong_key" ON "ban_giao"("ma_hop_dong");

-- CreateIndex
CREATE INDEX "ban_giao_ma_quan_ly_idx" ON "ban_giao"("ma_quan_ly");

-- CreateIndex
CREATE INDEX "ban_giao_tai_san_ma_phong_tai_san_idx" ON "ban_giao_tai_san"("ma_phong_tai_san");

-- CreateIndex
CREATE INDEX "yeu_cau_tra_phong_ma_phieu_coc_idx" ON "yeu_cau_tra_phong"("ma_phieu_coc");

-- CreateIndex
CREATE INDEX "yeu_cau_tra_phong_ma_hop_dong_idx" ON "yeu_cau_tra_phong"("ma_hop_dong");

-- CreateIndex
CREATE INDEX "yeu_cau_tra_phong_ma_nhan_vien_sale_idx" ON "yeu_cau_tra_phong"("ma_nhan_vien_sale");

-- CreateIndex
CREATE UNIQUE INDEX "bien_ban_kiem_tra_tra_ma_yeu_cau_tra_key" ON "bien_ban_kiem_tra_tra"("ma_yeu_cau_tra");

-- CreateIndex
CREATE INDEX "bien_ban_kiem_tra_tra_ma_quan_ly_idx" ON "bien_ban_kiem_tra_tra"("ma_quan_ly");

-- CreateIndex
CREATE INDEX "chi_tiet_kiem_tra_tra_ma_bien_ban_tra_idx" ON "chi_tiet_kiem_tra_tra"("ma_bien_ban_tra");

-- CreateIndex
CREATE INDEX "chi_tiet_kiem_tra_tra_ma_phong_tai_san_idx" ON "chi_tiet_kiem_tra_tra"("ma_phong_tai_san");

-- CreateIndex
CREATE UNIQUE INDEX "doi_soat_tra_phong_ma_yeu_cau_tra_key" ON "doi_soat_tra_phong"("ma_yeu_cau_tra");

-- CreateIndex
CREATE INDEX "doi_soat_tra_phong_ma_ke_toan_idx" ON "doi_soat_tra_phong"("ma_ke_toan");

-- CreateIndex
CREATE INDEX "doi_soat_tra_phong_ma_quan_ly_xac_nhan_khach_idx" ON "doi_soat_tra_phong"("ma_quan_ly_xac_nhan_khach");

-- CreateIndex
CREATE INDEX "chi_tiet_khau_tru_ma_doi_soat_idx" ON "chi_tiet_khau_tru"("ma_doi_soat");

-- AddForeignKey
ALTER TABLE "nhan_vien" ADD CONSTRAINT "nhan_vien_ma_chi_nhanh_fkey" FOREIGN KEY ("ma_chi_nhanh") REFERENCES "chi_nhanh"("ma_chi_nhanh") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tai_khoan" ADD CONSTRAINT "tai_khoan_ma_nhan_vien_fkey" FOREIGN KEY ("ma_nhan_vien") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phong" ADD CONSTRAINT "phong_ma_chi_nhanh_fkey" FOREIGN KEY ("ma_chi_nhanh") REFERENCES "chi_nhanh"("ma_chi_nhanh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giuong" ADD CONSTRAINT "giuong_ma_phong_fkey" FOREIGN KEY ("ma_phong") REFERENCES "phong"("ma_phong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phong_dich_vu" ADD CONSTRAINT "phong_dich_vu_ma_phong_fkey" FOREIGN KEY ("ma_phong") REFERENCES "phong"("ma_phong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phong_dich_vu" ADD CONSTRAINT "phong_dich_vu_ma_dich_vu_fkey" FOREIGN KEY ("ma_dich_vu") REFERENCES "dich_vu"("ma_dich_vu") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phong_tai_san" ADD CONSTRAINT "phong_tai_san_ma_phong_fkey" FOREIGN KEY ("ma_phong") REFERENCES "phong"("ma_phong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phong_tai_san" ADD CONSTRAINT "phong_tai_san_ma_loai_tai_san_fkey" FOREIGN KEY ("ma_loai_tai_san") REFERENCES "loai_tai_san"("ma_loai_tai_san") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_thue" ADD CONSTRAINT "yeu_cau_thue_ma_khach_hang_dai_dien_fkey" FOREIGN KEY ("ma_khach_hang_dai_dien") REFERENCES "khach_hang"("ma_khach_hang") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_thue" ADD CONSTRAINT "yeu_cau_thue_ma_chi_nhanh_fkey" FOREIGN KEY ("ma_chi_nhanh") REFERENCES "chi_nhanh"("ma_chi_nhanh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_thue" ADD CONSTRAINT "yeu_cau_thue_ma_nhan_vien_sale_fkey" FOREIGN KEY ("ma_nhan_vien_sale") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_vien_yeu_cau" ADD CONSTRAINT "thanh_vien_yeu_cau_ma_yeu_cau_fkey" FOREIGN KEY ("ma_yeu_cau") REFERENCES "yeu_cau_thue"("ma_yeu_cau") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_vien_yeu_cau" ADD CONSTRAINT "thanh_vien_yeu_cau_ma_khach_hang_fkey" FOREIGN KEY ("ma_khach_hang") REFERENCES "khach_hang"("ma_khach_hang") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_vien_yeu_cau" ADD CONSTRAINT "thanh_vien_yeu_cau_ma_giuong_du_kien_fkey" FOREIGN KEY ("ma_giuong_du_kien") REFERENCES "giuong"("ma_giuong") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_vien_yeu_cau" ADD CONSTRAINT "thanh_vien_yeu_cau_ma_quan_ly_duyet_fkey" FOREIGN KEY ("ma_quan_ly_duyet") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_xem_phong" ADD CONSTRAINT "lich_xem_phong_ma_yeu_cau_fkey" FOREIGN KEY ("ma_yeu_cau") REFERENCES "yeu_cau_thue"("ma_yeu_cau") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_xem_phong" ADD CONSTRAINT "lich_xem_phong_ma_nhan_vien_sale_fkey" FOREIGN KEY ("ma_nhan_vien_sale") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_lich_xem" ADD CONSTRAINT "chi_tiet_lich_xem_ma_lich_hen_fkey" FOREIGN KEY ("ma_lich_hen") REFERENCES "lich_xem_phong"("ma_lich_hen") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_lich_xem" ADD CONSTRAINT "chi_tiet_lich_xem_ma_phong_fkey" FOREIGN KEY ("ma_phong") REFERENCES "phong"("ma_phong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dat_coc" ADD CONSTRAINT "dat_coc_ma_yeu_cau_fkey" FOREIGN KEY ("ma_yeu_cau") REFERENCES "yeu_cau_thue"("ma_yeu_cau") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dat_coc" ADD CONSTRAINT "dat_coc_ma_nhan_vien_sale_fkey" FOREIGN KEY ("ma_nhan_vien_sale") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dat_coc" ADD CONSTRAINT "dat_coc_ma_quan_ly_xac_nhan_phong_fkey" FOREIGN KEY ("ma_quan_ly_xac_nhan_phong") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_dat_coc" ADD CONSTRAINT "chi_tiet_dat_coc_ma_phieu_coc_fkey" FOREIGN KEY ("ma_phieu_coc") REFERENCES "dat_coc"("ma_phieu_coc") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_dat_coc" ADD CONSTRAINT "chi_tiet_dat_coc_ma_giuong_fkey" FOREIGN KEY ("ma_giuong") REFERENCES "giuong"("ma_giuong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_bo_giuong" ADD CONSTRAINT "phan_bo_giuong_ma_giuong_fkey" FOREIGN KEY ("ma_giuong") REFERENCES "giuong"("ma_giuong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_bo_giuong" ADD CONSTRAINT "phan_bo_giuong_ma_phieu_coc_fkey" FOREIGN KEY ("ma_phieu_coc") REFERENCES "dat_coc"("ma_phieu_coc") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_bo_giuong" ADD CONSTRAINT "phan_bo_giuong_ma_hop_dong_fkey" FOREIGN KEY ("ma_hop_dong") REFERENCES "hop_dong_thue"("ma_hop_dong") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_toan" ADD CONSTRAINT "thanh_toan_ma_ke_toan_ghi_nhan_fkey" FOREIGN KEY ("ma_ke_toan_ghi_nhan") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_toan" ADD CONSTRAINT "thanh_toan_ma_quan_ly_xac_nhan_fkey" FOREIGN KEY ("ma_quan_ly_xac_nhan") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_toan" ADD CONSTRAINT "thanh_toan_ma_phieu_coc_fkey" FOREIGN KEY ("ma_phieu_coc") REFERENCES "dat_coc"("ma_phieu_coc") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_toan" ADD CONSTRAINT "thanh_toan_ma_hop_dong_fkey" FOREIGN KEY ("ma_hop_dong") REFERENCES "hop_dong_thue"("ma_hop_dong") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_toan" ADD CONSTRAINT "thanh_toan_ma_doi_soat_fkey" FOREIGN KEY ("ma_doi_soat") REFERENCES "doi_soat_tra_phong"("ma_doi_soat") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_thanh_toan" ADD CONSTRAINT "chi_tiet_thanh_toan_ma_thanh_toan_fkey" FOREIGN KEY ("ma_thanh_toan") REFERENCES "thanh_toan"("ma_thanh_toan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hop_dong_thue" ADD CONSTRAINT "hop_dong_thue_ma_phieu_coc_fkey" FOREIGN KEY ("ma_phieu_coc") REFERENCES "dat_coc"("ma_phieu_coc") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hop_dong_thue" ADD CONSTRAINT "hop_dong_thue_ma_nhan_vien_sale_fkey" FOREIGN KEY ("ma_nhan_vien_sale") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hop_dong_cho_o" ADD CONSTRAINT "hop_dong_cho_o_ma_hop_dong_fkey" FOREIGN KEY ("ma_hop_dong") REFERENCES "hop_dong_thue"("ma_hop_dong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hop_dong_cho_o" ADD CONSTRAINT "hop_dong_cho_o_ma_giuong_fkey" FOREIGN KEY ("ma_giuong") REFERENCES "giuong"("ma_giuong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hop_dong_cho_o" ADD CONSTRAINT "hop_dong_cho_o_ma_khach_hang_o_fkey" FOREIGN KEY ("ma_khach_hang_o") REFERENCES "khach_hang"("ma_khach_hang") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hop_dong_dich_vu" ADD CONSTRAINT "hop_dong_dich_vu_ma_hop_dong_fkey" FOREIGN KEY ("ma_hop_dong") REFERENCES "hop_dong_thue"("ma_hop_dong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hop_dong_dich_vu" ADD CONSTRAINT "hop_dong_dich_vu_ma_dich_vu_fkey" FOREIGN KEY ("ma_dich_vu") REFERENCES "dich_vu"("ma_dich_vu") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ban_giao" ADD CONSTRAINT "ban_giao_ma_hop_dong_fkey" FOREIGN KEY ("ma_hop_dong") REFERENCES "hop_dong_thue"("ma_hop_dong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ban_giao" ADD CONSTRAINT "ban_giao_ma_quan_ly_fkey" FOREIGN KEY ("ma_quan_ly") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ban_giao_tai_san" ADD CONSTRAINT "ban_giao_tai_san_ma_ban_giao_fkey" FOREIGN KEY ("ma_ban_giao") REFERENCES "ban_giao"("ma_ban_giao") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ban_giao_tai_san" ADD CONSTRAINT "ban_giao_tai_san_ma_phong_tai_san_fkey" FOREIGN KEY ("ma_phong_tai_san") REFERENCES "phong_tai_san"("ma_phong_tai_san") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_tra_phong" ADD CONSTRAINT "yeu_cau_tra_phong_ma_phieu_coc_fkey" FOREIGN KEY ("ma_phieu_coc") REFERENCES "dat_coc"("ma_phieu_coc") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_tra_phong" ADD CONSTRAINT "yeu_cau_tra_phong_ma_hop_dong_fkey" FOREIGN KEY ("ma_hop_dong") REFERENCES "hop_dong_thue"("ma_hop_dong") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_tra_phong" ADD CONSTRAINT "yeu_cau_tra_phong_ma_nhan_vien_sale_fkey" FOREIGN KEY ("ma_nhan_vien_sale") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bien_ban_kiem_tra_tra" ADD CONSTRAINT "bien_ban_kiem_tra_tra_ma_yeu_cau_tra_fkey" FOREIGN KEY ("ma_yeu_cau_tra") REFERENCES "yeu_cau_tra_phong"("ma_yeu_cau_tra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bien_ban_kiem_tra_tra" ADD CONSTRAINT "bien_ban_kiem_tra_tra_ma_quan_ly_fkey" FOREIGN KEY ("ma_quan_ly") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_kiem_tra_tra" ADD CONSTRAINT "chi_tiet_kiem_tra_tra_ma_bien_ban_tra_fkey" FOREIGN KEY ("ma_bien_ban_tra") REFERENCES "bien_ban_kiem_tra_tra"("ma_bien_ban_tra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_kiem_tra_tra" ADD CONSTRAINT "chi_tiet_kiem_tra_tra_ma_phong_tai_san_fkey" FOREIGN KEY ("ma_phong_tai_san") REFERENCES "phong_tai_san"("ma_phong_tai_san") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doi_soat_tra_phong" ADD CONSTRAINT "doi_soat_tra_phong_ma_yeu_cau_tra_fkey" FOREIGN KEY ("ma_yeu_cau_tra") REFERENCES "yeu_cau_tra_phong"("ma_yeu_cau_tra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doi_soat_tra_phong" ADD CONSTRAINT "doi_soat_tra_phong_ma_ke_toan_fkey" FOREIGN KEY ("ma_ke_toan") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doi_soat_tra_phong" ADD CONSTRAINT "doi_soat_tra_phong_ma_quan_ly_xac_nhan_khach_fkey" FOREIGN KEY ("ma_quan_ly_xac_nhan_khach") REFERENCES "nhan_vien"("ma_nhan_vien") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_khau_tru" ADD CONSTRAINT "chi_tiet_khau_tru_ma_doi_soat_fkey" FOREIGN KEY ("ma_doi_soat") REFERENCES "doi_soat_tra_phong"("ma_doi_soat") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ERD-required partial unique index: a bed has at most one active allocation.
CREATE UNIQUE INDEX "uq_active_bed_allocation"
ON "phan_bo_giuong" ("ma_giuong")
WHERE "trang_thai" = 'ACTIVE'::"AllocationStatus";

-- ERD-required integrity constraints.
ALTER TABLE "nhan_vien"
ADD CONSTRAINT "ck_nhan_vien_role_branch"
CHECK (
  ("chuc_vu" = 'ADMIN'::"Role" AND "ma_chi_nhanh" IS NULL)
  OR (
    "chuc_vu" IN ('SALE'::"Role", 'ACCOUNTANT'::"Role", 'MANAGER'::"Role")
    AND "ma_chi_nhanh" IS NOT NULL
  )
);

ALTER TABLE "giuong"
ADD CONSTRAINT "ck_giuong_gia_thue_khong_am"
CHECK ("gia_thue_thang" >= 0);

ALTER TABLE "dich_vu"
ADD CONSTRAINT "ck_dich_vu_don_gia_khong_am"
CHECK ("don_gia" >= 0);

ALTER TABLE "dat_coc"
ADD CONSTRAINT "ck_dat_coc_tong_tien_khong_am"
CHECK ("tong_tien_coc" >= 0);

ALTER TABLE "chi_tiet_dat_coc"
ADD CONSTRAINT "ck_chi_tiet_dat_coc_thanh_tien_khong_am"
CHECK ("thanh_tien_coc" >= 0);

ALTER TABLE "thanh_toan"
ADD CONSTRAINT "ck_thanh_toan_so_tien_phai_thanh_toan_khong_am"
CHECK ("so_tien_phai_thanh_toan" >= 0),
ADD CONSTRAINT "ck_thanh_toan_dung_nghiep_vu"
CHECK (
  ("loai_thanh_toan" = 'DEPOSIT'::"PaymentType" AND "ma_phieu_coc" IS NOT NULL AND "ma_hop_dong" IS NULL AND "ma_doi_soat" IS NULL)
  OR ("loai_thanh_toan" = 'INITIAL_PAYMENT'::"PaymentType" AND "ma_phieu_coc" IS NULL AND "ma_hop_dong" IS NOT NULL AND "ma_doi_soat" IS NULL)
  OR ("loai_thanh_toan" = 'CHECKOUT_ADDITIONAL_PAYMENT'::"PaymentType" AND "ma_phieu_coc" IS NULL AND "ma_hop_dong" IS NULL AND "ma_doi_soat" IS NOT NULL)
  OR ("loai_thanh_toan" = 'DEPOSIT_REFUND'::"PaymentType" AND "ma_phieu_coc" IS NULL AND "ma_hop_dong" IS NULL AND "ma_doi_soat" IS NOT NULL)
);

ALTER TABLE "chi_tiet_thanh_toan"
ADD CONSTRAINT "ck_chi_tiet_thanh_toan_don_gia_khong_am"
CHECK ("don_gia" >= 0),
ADD CONSTRAINT "ck_chi_tiet_thanh_toan_thanh_tien_khong_am"
CHECK ("thanh_tien" >= 0);

ALTER TABLE "chi_tiet_khau_tru"
ADD CONSTRAINT "ck_chi_tiet_khau_tru_so_tien_khong_am"
CHECK ("so_tien" >= 0);
