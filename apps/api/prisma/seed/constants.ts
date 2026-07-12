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
    branches: 2,
    employeesPerRolePerBranch: 2,
    admins: 2,
    roomsPerBranch: 8,
    customers: 90,
    rentalRequests: 45,
    viewings: 28,
    deposits: 20,
    contracts: 12,
    handovers: 8,
    checkouts: 8,
    inspections: 5,
    settlements: 5,
  },
  large: {
    branches: 4,
    employeesPerRolePerBranch: 2,
    admins: 2,
    roomsPerBranch: 15,
    customers: 300,
    rentalRequests: 180,
    viewings: 100,
    deposits: 70,
    contracts: 40,
    handovers: 25,
    checkouts: 30,
    inspections: 20,
    settlements: 20,
  },
};

export const rolePrefixes: Record<Exclude<Role, 'ADMIN'>, string> = {
  SALE: 'sale',
  ACCOUNTANT: 'accountant',
  MANAGER: 'manager',
};

export const vietnameseNames = [
  'Nguyen Minh Anh',
  'Tran Hoang Nam',
  'Le Thanh Binh',
  'Pham Gia Han',
  'Hoang Bao Ngoc',
  'Vo Duc Huy',
  'Dang Phuong Linh',
  'Bui Quoc Viet',
  'Do Nhat Minh',
  'Huynh Khanh Ly',
  'Phan Ngoc Mai',
  'Vu Tuan Kiet',
];

export const organizationNames = [
  'Cong ty TNHH Sao Mai',
  'Cong ty Co phan An Phu',
  'Trung tam Dao tao Viet Tri',
  'Cong ty TNHH Mekong Xanh',
  'Hop tac xa Dich vu Thanh Dat',
  'Cong ty Co phan Gia Bao',
];

export const streets = [
  '12 Nguyen Van Linh, Quan 7, TP. Ho Chi Minh',
  '45 Le Duan, Quan 1, TP. Ho Chi Minh',
  '88 Tran Phu, Quan 5, TP. Ho Chi Minh',
  '21 Pham Van Dong, TP. Thu Duc, TP. Ho Chi Minh',
  '34 Nguyen Trai, Quan 1, TP. Ho Chi Minh',
  '16 Cach Mang Thang Tam, Quan 3, TP. Ho Chi Minh',
];

export const roomTypes = ['STANDARD', 'DELUXE', 'QUIET', 'BUDGET'];
export const genderPolicies = ['MALE', 'FEMALE', 'ANY'];
export const quietLevels = ['LOW', 'MEDIUM', 'HIGH'];

export const serviceCatalog = [
  { id: 'SV001', name: 'Wifi', unit: 'thang', unitPrice: 100000 },
  { id: 'SV002', name: 'Giu xe may', unit: 'thang', unitPrice: 150000 },
  { id: 'SV003', name: 'Ve sinh khu chung', unit: 'thang', unitPrice: 80000 },
  { id: 'SV004', name: 'Dien nuoc tam tinh', unit: 'thang', unitPrice: 250000 },
];

export const assetTypes = [
  { id: 'AT001', name: 'Niem', unit: 'cai' },
  { id: 'AT002', name: 'Tu do', unit: 'cai' },
  { id: 'AT003', name: 'Chia khoa', unit: 'bo' },
  { id: 'AT004', name: 'Dieu hoa', unit: 'cai' },
  { id: 'AT005', name: 'Ban hoc', unit: 'cai' },
];

export const demoScenarios = [
  {
    code: 'DEMO-RR-NEW',
    actor: 'sale01',
    screen: 'UI-05 Danh sach yeu cau thue',
    record: 'RR001',
    status: 'ACTIVE',
    nextAction: 'Cap nhat thong tin hoac them thanh vien du kien.',
  },
  {
    code: 'DEMO-RR-WHOLE-ROOM',
    actor: 'sale01',
    screen: 'UI-06 Chi tiet yeu cau thue',
    record: 'RR002',
    status: 'ACTIVE',
    nextAction: 'Dung cho demo thue nguyen phong va tim phong phu hop.',
  },
  {
    code: 'DEMO-RR-SHARED-BEDS',
    actor: 'sale01',
    screen: 'UI-06 Chi tiet yeu cau thue',
    record: 'RR003',
    status: 'ACTIVE',
    nextAction: 'Dung cho demo thue ghep nhieu giuong.',
  },
  {
    code: 'DEMO-VIEWING-TODAY',
    actor: 'sale01',
    screen: 'UI lich xem phong',
    record: 'V001',
    status: 'CONFIRMED',
    nextAction: 'Xac nhan khach da xem phong.',
  },
  {
    code: 'DEMO-DEPOSIT-WAITING',
    actor: 'accountant01',
    screen: 'UI dat coc',
    record: 'D001',
    status: 'WAITING_PAYMENT',
    nextAction: 'Ghi nhan khach thanh toan trong han.',
  },
  {
    code: 'DEMO-DEPOSIT-EXPIRING',
    actor: 'accountant01',
    screen: 'UI dat coc',
    record: 'D002',
    status: 'WAITING_PAYMENT',
    nextAction: 'Demo phieu sap het han thanh toan 24 gio.',
  },
  {
    code: 'DEMO-PAYMENT-RECHECK',
    actor: 'accountant01',
    screen: 'UI dat coc',
    record: 'D005',
    status: 'PAYMENT_RECHECK',
    nextAction: 'Sua thong tin kiem tra giao dich cu va gui lai Manager.',
  },
  {
    code: 'DEMO-DEPOSIT-APPROVAL',
    actor: 'manager01',
    screen: 'UI dat coc',
    record: 'D004',
    status: 'WAITING_MANAGER_CONFIRMATION',
    nextAction: 'Manager xac nhan tien coc hop le.',
  },
  {
    code: 'DEMO-CHECKIN',
    actor: 'sale01',
    screen: 'UI nhan phong',
    record: 'C001',
    status: 'ARRIVED',
    nextAction: 'Cap nhat thong tin cu tru va gui duyet dieu kien.',
  },
  {
    code: 'DEMO-HANDOVER',
    actor: 'manager01',
    screen: 'UI ban giao',
    record: 'H001',
    status: 'DRAFT',
    nextAction: 'Hoan tat checklist ban giao.',
  },
  {
    code: 'DEMO-CHECKOUT-NO-CONTRACT',
    actor: 'accountant01',
    screen: 'UI doi soat tra phong',
    record: 'CO001',
    status: 'WAITING_SETTLEMENT',
    nextAction: 'Demo hoan coc 80% cho khach chi moi dat coc.',
  },
  {
    code: 'DEMO-SETTLEMENT-6-MONTHS',
    actor: 'accountant01',
    screen: 'UI doi soat tra phong',
    record: 'S002',
    status: 'WAITING_CUSTOMER_CONFIRMATION',
    nextAction: 'Kiem tra ty le hoan 50% khi o dung 6 thang.',
  },
  {
    code: 'DEMO-SETTLEMENT-REFUND',
    actor: 'accountant01',
    screen: 'UI doi soat tra phong',
    record: 'S003',
    status: 'WAITING_FINANCIAL_COMPLETION',
    nextAction: 'Ghi nhan hoan tien coc cho khach.',
  },
  {
    code: 'DEMO-SETTLEMENT-EXTRA',
    actor: 'accountant01',
    screen: 'UI doi soat tra phong',
    record: 'S004',
    status: 'WAITING_FINANCIAL_COMPLETION',
    nextAction: 'Ghi nhan khach thanh toan them.',
  },
  {
    code: 'DEMO-SETTLEMENT-ZERO',
    actor: 'accountant01',
    screen: 'UI doi soat tra phong',
    record: 'S005',
    status: 'WAITING_FINANCIAL_COMPLETION',
    nextAction: 'Dung confirm-no-balance de chot so du bang 0.',
  },
];
