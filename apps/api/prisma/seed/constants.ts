import type { Role } from '../../src/generated/prisma/client.js';

export const DEFAULT_PASSWORD = 'Password123!';
export const DEFAULT_PROFILE = 'demo';
export const PLANNED_PARTICIPATION_STATUS = 'PLANNED';

export type SeedProfile = 'small' | 'demo' | 'large';

export type ProfileConfig = {
  branches: number;
  employeesPerRolePerBranch: number;
  admins: number;
  roomsPerBranch: number;
  customers: number;
  rentalRequests: number;
  viewings: number;
  deposits: number;
  contracts: number;
  handovers: number;
  checkouts: number;
  inspections: number;
  settlements: number;
};

export const profileConfigs: Record<SeedProfile, ProfileConfig> = {
  small: {
    branches: 1,
    employeesPerRolePerBranch: 1,
    admins: 1,
    roomsPerBranch: 6,
    customers: 30,
    rentalRequests: 12,
    viewings: 6,
    deposits: 9,
    contracts: 2,
    handovers: 1,
    checkouts: 2,
    inspections: 1,
    settlements: 1,
  },
  demo: {
    branches: 3,
    employeesPerRolePerBranch: 2,
    admins: 2,
    roomsPerBranch: 16,
    customers: 240,
    rentalRequests: 120,
    viewings: 72,
    deposits: 54,
    contracts: 32,
    handovers: 20,
    checkouts: 26,
    inspections: 16,
    settlements: 16,
  },
  large: {
    branches: 4,
    employeesPerRolePerBranch: 3,
    admins: 2,
    roomsPerBranch: 18,
    customers: 360,
    rentalRequests: 200,
    viewings: 120,
    deposits: 85,
    contracts: 48,
    handovers: 30,
    checkouts: 36,
    inspections: 24,
    settlements: 24,
  },
};

export const rolePrefixes: Record<Exclude<Role, 'ADMIN'>, string> = {
  SALE: 'sale',
  ACCOUNTANT: 'accountant',
  MANAGER: 'manager',
};

export const vietnameseNames = [
  'Nguyễn Minh Anh',
  'Trần Hoàng Nam',
  'Lê Thanh Bình',
  'Phạm Gia Hân',
  'Hoàng Bảo Ngọc',
  'Võ Đức Huy',
  'Đặng Phương Linh',
  'Bùi Quốc Việt',
  'Đỗ Nhật Minh',
  'Huỳnh Khánh Ly',
  'Phan Ngọc Mai',
  'Vũ Tuấn Kiệt',
  'Ngô Thảo Vy',
  'Dương Hải Đăng',
  'Đinh Thùy Dương',
  'Lý Gia Bảo',
  'Trương Mỹ Duyên',
  'Cao Minh Quân',
  'Mai Kiều Trang',
  'Tạ Anh Khoa',
  'Lương Bích Ngọc',
  'Hồ Tấn Phát',
  'Chu Diễm Quỳnh',
  'Kiều Đăng Khôi',
];

// Pools to compose diverse, natural Vietnamese full names (no numeric suffix).
export const familyNames = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Tô', 'Trương', 'Mai',
];
export const middleNames = [
  'Minh', 'Thị', 'Hoàng', 'Gia', 'Bảo', 'Đức', 'Phương', 'Quốc', 'Nhật',
  'Khánh', 'Ngọc', 'Tuấn', 'Hải', 'Thanh', 'Anh', 'Thùy',
];
export const givenNames = [
  'Anh', 'Bình', 'Châu', 'Dũng', 'Hà', 'Hân', 'Hùng', 'Khoa', 'Lan', 'Linh',
  'Mai', 'Nam', 'Ngọc', 'Phát', 'Quân', 'Trang', 'Vy', 'Yến', 'Khôi', 'Duyên',
  'Kiệt', 'Đăng', 'Huy', 'Ly', 'Trâm', 'Sơn',
];

export const organizationNames = [
  'Công ty TNHH Sao Mai',
  'Công ty Cổ phần An Phú',
  'Trung tâm Đào tạo Việt Trí',
  'Công ty TNHH Mekong Xanh',
  'Hợp tác xã Dịch vụ Thành Đạt',
  'Công ty Cổ phần Gia Bảo',
  'Công ty TNHH Đại Dương',
  'Công ty Cổ phần Tân Tiến',
  'Trung tâm Ngoại ngữ Bình Minh',
  'Công ty TNHH Phúc Khang',
];

export const streets = [
  '12 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
  '45 Lê Duẩn, Quận 1, TP. Hồ Chí Minh',
  '88 Trần Phú, Quận 5, TP. Hồ Chí Minh',
  '21 Phạm Văn Đồng, TP. Thủ Đức, TP. Hồ Chí Minh',
  '34 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
  '16 Cách Mạng Tháng Tám, Quận 3, TP. Hồ Chí Minh',
  '77 Điện Biên Phủ, Quận Bình Thạnh, TP. Hồ Chí Minh',
  '109 Sư Vạn Hạnh, Quận 10, TP. Hồ Chí Minh',
  '58 Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
  '3 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
];

export const roomTypes = ['STANDARD', 'DELUXE', 'QUIET', 'BUDGET'];
export const genderPolicies = ['MALE', 'FEMALE', 'ANY'];
export const quietLevels = ['LOW', 'MEDIUM', 'HIGH'];

export const serviceCatalog = [
  { id: 'SV001', name: 'Wifi', unit: 'tháng', unitPrice: 100000 },
  { id: 'SV002', name: 'Giữ xe máy', unit: 'tháng', unitPrice: 150000 },
  { id: 'SV003', name: 'Vệ sinh khu chung', unit: 'tháng', unitPrice: 80000 },
  { id: 'SV004', name: 'Điện nước tạm tính', unit: 'tháng', unitPrice: 250000 },
];

export const assetTypes = [
  { id: 'AT001', name: 'Nệm', unit: 'cái' },
  { id: 'AT002', name: 'Tủ đồ', unit: 'cái' },
  { id: 'AT003', name: 'Chìa khóa', unit: 'bộ' },
  { id: 'AT004', name: 'Điều hòa', unit: 'cái' },
  { id: 'AT005', name: 'Bàn học', unit: 'cái' },
];

export const demoScenarios = [
  {
    code: 'DEMO-RR-NEW',
    actor: 'sale01',
    screen: 'UI-05 Danh sách yêu cầu thuê',
    record: 'RR001',
    status: 'ACTIVE',
    nextAction: 'Cập nhật thông tin hoặc thêm thành viên dự kiến.',
  },
  {
    code: 'DEMO-RR-WHOLE-ROOM',
    actor: 'sale01',
    screen: 'UI-06 Chi tiết yêu cầu thuê',
    record: 'RR002',
    status: 'ACTIVE',
    nextAction: 'Dùng cho demo thuê nguyên phòng và tìm phòng phù hợp.',
  },
  {
    code: 'DEMO-RR-SHARED-BEDS',
    actor: 'sale01',
    screen: 'UI-06 Chi tiết yêu cầu thuê',
    record: 'RR003',
    status: 'ACTIVE',
    nextAction: 'Dùng cho demo thuê ghép nhiều giường.',
  },
  {
    code: 'DEMO-VIEWING-TODAY',
    actor: 'sale01',
    screen: 'UI lịch xem phòng',
    record: 'V001',
    status: 'CONFIRMED',
    nextAction: 'Xác nhận khách đã xem phòng.',
  },
  {
    code: 'DEMO-DEPOSIT-WAITING',
    actor: 'accountant01',
    screen: 'UI đặt cọc',
    record: 'D001',
    status: 'WAITING_PAYMENT',
    nextAction: 'Ghi nhận khách thanh toán trong hạn.',
  },
  {
    code: 'DEMO-DEPOSIT-EXPIRING',
    actor: 'accountant01',
    screen: 'UI đặt cọc',
    record: 'D002',
    status: 'WAITING_PAYMENT',
    nextAction: 'Demo phiếu sắp hết hạn thanh toán 24 giờ.',
  },
  {
    code: 'DEMO-PAYMENT-RECHECK',
    actor: 'accountant01',
    screen: 'UI đặt cọc',
    record: 'D005',
    status: 'PAYMENT_RECHECK',
    nextAction: 'Sửa thông tin kiểm tra giao dịch cũ và gửi lại Manager.',
  },
  {
    code: 'DEMO-DEPOSIT-APPROVAL',
    actor: 'manager01',
    screen: 'UI đặt cọc',
    record: 'D004',
    status: 'WAITING_MANAGER_CONFIRMATION',
    nextAction: 'Manager xác nhận tiền cọc hợp lệ.',
  },
  {
    code: 'DEMO-CHECKIN',
    actor: 'sale01',
    screen: 'UI nhận phòng',
    record: 'C001',
    status: 'ARRIVED',
    nextAction: 'Cập nhật thông tin cư trú và gửi duyệt điều kiện.',
  },
  {
    code: 'DEMO-HANDOVER',
    actor: 'manager01',
    screen: 'UI bàn giao',
    record: 'H001',
    status: 'DRAFT',
    nextAction: 'Hoàn tất checklist bàn giao.',
  },
  {
    code: 'DEMO-CHECKOUT-NO-CONTRACT',
    actor: 'accountant01',
    screen: 'UI đối soát trả phòng',
    record: 'CO001',
    status: 'WAITING_SETTLEMENT',
    nextAction: 'Demo hoàn cọc 80% cho khách chỉ mới đặt cọc.',
  },
  {
    code: 'DEMO-SETTLEMENT-6-MONTHS',
    actor: 'accountant01',
    screen: 'UI đối soát trả phòng',
    record: 'S002',
    status: 'WAITING_CUSTOMER_CONFIRMATION',
    nextAction: 'Kiểm tra tỷ lệ hoàn 50% khi ở đúng 6 tháng.',
  },
  {
    code: 'DEMO-SETTLEMENT-REFUND',
    actor: 'accountant01',
    screen: 'UI đối soát trả phòng',
    record: 'S003',
    status: 'WAITING_FINANCIAL_COMPLETION',
    nextAction: 'Ghi nhận hoàn tiền cọc cho khách.',
  },
  {
    code: 'DEMO-SETTLEMENT-EXTRA',
    actor: 'accountant01',
    screen: 'UI đối soát trả phòng',
    record: 'S004',
    status: 'WAITING_FINANCIAL_COMPLETION',
    nextAction: 'Ghi nhận khách thanh toán thêm.',
  },
  {
    code: 'DEMO-SETTLEMENT-ZERO',
    actor: 'accountant01',
    screen: 'UI đối soát trả phòng',
    record: 'S005',
    status: 'WAITING_FINANCIAL_COMPLETION',
    nextAction: 'Dùng confirm-no-balance để chốt số dư bằng 0.',
  },
];
