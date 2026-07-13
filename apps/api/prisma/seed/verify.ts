import { pathToFileURL } from 'node:url';

import { prisma } from '../../src/data/prisma/client.js';
import { demoScenarios, profileConfigs, type SeedProfile } from './constants.js';
import { parseSeedProfile, type DbClient } from './helpers.js';

export type SeedStats = {
  branches: number;
  employees: number;
  accounts: number;
  rooms: number;
  beds: number;
  services: number;
  assetTypes: number;
  roomAssets: number;
  customers: number;
  rentalRequests: number;
  requestMembers: number;
  viewings: number;
  viewingDetails: number;
  deposits: number;
  depositDetails: number;
  bedAllocations: number;
  payments: number;
  paymentDetails: number;
  contracts: number;
  contractBeds: number;
  contractServices: number;
  handovers: number;
  handoverAssets: number;
  checkoutRequests: number;
  checkoutInspections: number;
  checkoutInspectionItems: number;
  settlements: number;
  deductions: number;
};

type InvalidRow = {
  id: string;
};

export async function collectSeedStats(db: DbClient): Promise<SeedStats> {
  const [
    branches,
    employees,
    accounts,
    rooms,
    beds,
    services,
    assetTypes,
    roomAssets,
    customers,
    rentalRequests,
    requestMembers,
    viewings,
    viewingDetails,
    deposits,
    depositDetails,
    bedAllocations,
    payments,
    paymentDetails,
    contracts,
    contractBeds,
    contractServices,
    handovers,
    handoverAssets,
    checkoutRequests,
    checkoutInspections,
    checkoutInspectionItems,
    settlements,
    deductions,
  ] = await Promise.all([
    db.branch.count(),
    db.employee.count(),
    db.account.count(),
    db.room.count(),
    db.bed.count(),
    db.service.count(),
    db.assetType.count(),
    db.roomAsset.count(),
    db.customer.count(),
    db.rentalRequest.count(),
    db.requestMember.count(),
    db.viewing.count(),
    db.viewingDetail.count(),
    db.deposit.count(),
    db.depositDetail.count(),
    db.bedAllocation.count(),
    db.payment.count(),
    db.paymentDetail.count(),
    db.contract.count(),
    db.contractBed.count(),
    db.contractService.count(),
    db.handover.count(),
    db.handoverAsset.count(),
    db.checkoutRequest.count(),
    db.checkoutInspection.count(),
    db.checkoutInspectionItem.count(),
    db.settlement.count(),
    db.deduction.count(),
  ]);

  return {
    branches,
    employees,
    accounts,
    rooms,
    beds,
    services,
    assetTypes,
    roomAssets,
    customers,
    rentalRequests,
    requestMembers,
    viewings,
    viewingDetails,
    deposits,
    depositDetails,
    bedAllocations,
    payments,
    paymentDetails,
    contracts,
    contractBeds,
    contractServices,
    handovers,
    handoverAssets,
    checkoutRequests,
    checkoutInspections,
    checkoutInspectionItems,
    settlements,
    deductions,
  };
}

export async function verifySeed(db: DbClient, profile: SeedProfile): Promise<SeedStats> {
  const stats = await collectSeedStats(db);
  const minimum = profileConfigs[profile];
  const expectedEmployees =
    minimum.branches * minimum.employeesPerRolePerBranch * 3 + minimum.admins;

  assertAtLeast(stats.branches, minimum.branches, 'Branch count');
  assertAtLeast(stats.employees, expectedEmployees, 'Employee count');
  assertAtLeast(stats.rooms, minimum.branches * minimum.roomsPerBranch, 'Room count');
  assertAtLeast(stats.beds, minimum.branches * minimum.roomsPerBranch * 4, 'Bed count');
  assertAtLeast(stats.customers, minimum.customers, 'Customer count');
  assertAtLeast(stats.rentalRequests, minimum.rentalRequests, 'Rental request count');
  assertAtLeast(stats.viewings, minimum.viewings, 'Viewing count');
  assertAtLeast(stats.deposits, minimum.deposits, 'Deposit count');
  assertAtLeast(stats.contracts, minimum.contracts, 'Contract count');
  assertAtLeast(stats.handovers, minimum.handovers, 'Handover count');
  assertAtLeast(stats.checkoutRequests, minimum.checkouts, 'Checkout request count');
  assertAtLeast(stats.checkoutInspections, minimum.inspections, 'Checkout inspection count');
  assertAtLeast(stats.settlements, minimum.settlements, 'Settlement count');

  await assertNoRows(
    'duplicate active bed allocations',
    db.$queryRaw<InvalidRow[]>`
      SELECT ma_giuong AS id
      FROM phan_bo_giuong
      WHERE trang_thai = 'ACTIVE'
      GROUP BY ma_giuong
      HAVING COUNT(*) > 1
    `,
  );

  await assertNoRows(
    'duplicate customer emails',
    db.$queryRaw<InvalidRow[]>`
      SELECT email AS id
      FROM khach_hang
      WHERE email IS NOT NULL
      GROUP BY email
      HAVING COUNT(*) > 1
    `,
  );

  await assertNoRows(
    'duplicate customer identity numbers',
    db.$queryRaw<InvalidRow[]>`
      SELECT so_giay_to AS id
      FROM khach_hang
      WHERE so_giay_to IS NOT NULL
      GROUP BY so_giay_to
      HAVING COUNT(*) > 1
    `,
  );

  await assertNoRows(
    'allocation branch mismatch',
    db.$queryRaw<InvalidRow[]>`
      SELECT a.ma_phan_bo AS id
      FROM phan_bo_giuong a
      JOIN giuong b ON b.ma_giuong = a.ma_giuong
      JOIN phong p ON p.ma_phong = b.ma_phong
      JOIN dat_coc d ON d.ma_phieu_coc = a.ma_phieu_coc
      JOIN yeu_cau_thue rr ON rr.ma_yeu_cau = d.ma_yeu_cau
      WHERE p.ma_chi_nhanh <> rr.ma_chi_nhanh
    `,
  );

  await assertNoRows(
    'request member count exceeds expected residents',
    db.$queryRaw<InvalidRow[]>`
      SELECT rr.ma_yeu_cau AS id
      FROM yeu_cau_thue rr
      LEFT JOIN thanh_vien_yeu_cau rm ON rm.ma_yeu_cau = rr.ma_yeu_cau
      GROUP BY rr.ma_yeu_cau, rr.so_nguoi_du_kien
      HAVING COUNT(rm.ma_khach_hang) > rr.so_nguoi_du_kien
    `,
  );

  await assertNoRows(
    'request member references organization customer',
    db.$queryRaw<InvalidRow[]>`
      SELECT rm.ma_yeu_cau || ':' || rm.ma_khach_hang AS id
      FROM thanh_vien_yeu_cau rm
      JOIN khach_hang c ON c.ma_khach_hang = rm.ma_khach_hang
      WHERE c.loai_khach_hang <> 'INDIVIDUAL'
    `,
  );

  await assertNoRows(
    'paid payment after expiry',
    db.$queryRaw<InvalidRow[]>`
      SELECT ma_thanh_toan AS id
      FROM thanh_toan
      WHERE thoi_diem_thanh_toan IS NOT NULL
        AND han_thanh_toan IS NOT NULL
        AND thoi_diem_thanh_toan > han_thanh_toan
    `,
  );

  await assertNoRows(
    'payment recheck without in-deadline payment',
    db.$queryRaw<InvalidRow[]>`
      SELECT ma_thanh_toan AS id
      FROM thanh_toan
      WHERE trang_thai = 'PAYMENT_RECHECK'
        AND (
          thoi_diem_thanh_toan IS NULL
          OR han_thanh_toan IS NULL
          OR thoi_diem_thanh_toan > han_thanh_toan
        )
    `,
  );

  await assertNoRows(
    'payment rejected deposit still has active held allocation',
    db.$queryRaw<InvalidRow[]>`
      SELECT d.ma_phieu_coc AS id
      FROM dat_coc d
      JOIN phan_bo_giuong a ON a.ma_phieu_coc = d.ma_phieu_coc
      WHERE d.trang_thai = 'PAYMENT_REJECTED'
        AND a.loai_phan_bo = 'HELD'
        AND a.trang_thai = 'ACTIVE'
    `,
  );

  await assertNoRows(
    'completed checkout does not liquidate and release its contract',
    db.$queryRaw<InvalidRow[]>`
      SELECT cr.ma_yeu_cau_tra AS id
      FROM yeu_cau_tra_phong cr
      JOIN hop_dong_thue c ON c.ma_hop_dong = cr.ma_hop_dong
      WHERE cr.trang_thai = 'COMPLETED'
        AND (
          c.trang_thai <> 'LIQUIDATED'
          OR EXISTS (
            SELECT 1
            FROM phan_bo_giuong ba
            WHERE ba.ma_hop_dong = c.ma_hop_dong
              AND ba.trang_thai = 'ACTIVE'
          )
        )
    `,
  );

  await assertNoRows(
    'whole-room deposit does not cover all beds in exactly one room',
    db.$queryRaw<InvalidRow[]>`
      WITH whole_room_details AS (
        SELECT d.ma_phieu_coc, b.ma_phong, COUNT(dd.ma_giuong) AS selected_beds
        FROM dat_coc d
        JOIN chi_tiet_dat_coc dd ON dd.ma_phieu_coc = d.ma_phieu_coc
        JOIN giuong b ON b.ma_giuong = dd.ma_giuong
        WHERE d.hinh_thuc_thue_snapshot = 'WHOLE_ROOM'
        GROUP BY d.ma_phieu_coc, b.ma_phong
      ),
      invalid_multi_room AS (
        SELECT ma_phieu_coc
        FROM whole_room_details
        GROUP BY ma_phieu_coc
        HAVING COUNT(*) <> 1
      ),
      invalid_missing_bed AS (
        SELECT wr.ma_phieu_coc
        FROM whole_room_details wr
        JOIN (
          SELECT ma_phong, COUNT(*) AS total_beds
          FROM giuong
          GROUP BY ma_phong
        ) rb ON rb.ma_phong = wr.ma_phong
        WHERE wr.selected_beds <> rb.total_beds
      )
      SELECT ma_phieu_coc AS id FROM invalid_multi_room
      UNION
      SELECT ma_phieu_coc AS id FROM invalid_missing_bed
    `,
  );

  await assertNoRows(
    'settlement amount mismatch',
    db.$queryRaw<InvalidRow[]>`
      SELECT ma_doi_soat AS id
      FROM doi_soat_tra_phong
      WHERE tong_khau_tru < 0
        OR tien_hoan_co_ban < 0
        OR so_du_cuoi <> tien_hoan_co_ban - tong_khau_tru
    `,
  );

  await assertNoRows(
    'negative deduction',
    db.$queryRaw<InvalidRow[]>`
      SELECT ma_chi_tiet_khau_tru AS id
      FROM chi_tiet_khau_tru
      WHERE so_tien < 0
    `,
  );

  await assertNoRows(
    'deduction sum does not match settlement total',
    db.$queryRaw<InvalidRow[]>`
      SELECT s.ma_doi_soat AS id
      FROM doi_soat_tra_phong s
      LEFT JOIN chi_tiet_khau_tru d ON d.ma_doi_soat = s.ma_doi_soat
      GROUP BY s.ma_doi_soat, s.tong_khau_tru
      HAVING COALESCE(SUM(d.so_tien), 0) <> s.tong_khau_tru
    `,
  );

  await assertDashboardData(stats);
  if (profile !== 'small') {
    await assertDemoScenarios(db);
  }

  return stats;
}

function assertAtLeast(actual: number, expected: number, label: string): void {
  if (actual < expected) {
    throw new Error(`${label} expected at least ${expected}, got ${actual}.`);
  }
}

async function assertNoRows(label: string, rowsPromise: Promise<InvalidRow[]>): Promise<void> {
  const rows = await rowsPromise;
  if (rows.length > 0) {
    throw new Error(`Seed verify failed: ${label}. First ids: ${rows.map((row) => row.id).join(', ')}`);
  }
}

async function assertDashboardData(stats: SeedStats): Promise<void> {
  const businessCounts =
    stats.rentalRequests + stats.viewings + stats.deposits + stats.contracts + stats.checkoutRequests;
  if (businessCounts === 0) {
    throw new Error('Seed verify failed: dashboard/reporting source tables are empty.');
  }
}

async function assertDemoScenarios(db: DbClient): Promise<void> {
  const missingCodes: string[] = [];

  for (const scenario of demoScenarios) {
    const code = scenario.code;
    const [
      rentalRequests,
      viewings,
      deposits,
      contracts,
      handovers,
      checkoutRequests,
      settlements,
    ] = await Promise.all([
      db.rentalRequest.count({ where: { note: { contains: code } } }),
      db.viewing.count({ where: { note: { contains: code } } }),
      db.deposit.count({ where: { note: { contains: code } } }),
      db.contract.count({ where: { specialTerms: { contains: code } } }),
      db.handover.count({ where: { note: { contains: code } } }),
      db.checkoutRequest.count({ where: { note: { contains: code } } }),
      db.settlement.count({ where: { note: { contains: code } } }),
    ]);

    if (
      rentalRequests +
        viewings +
        deposits +
        contracts +
        handovers +
        checkoutRequests +
        settlements ===
      0
    ) {
      missingCodes.push(code);
    }
  }

  if (missingCodes.length > 0) {
    throw new Error(`Seed verify failed: missing demo scenarios ${missingCodes.join(', ')}.`);
  }
}

export function printStats(stats: SeedStats): void {
  for (const [name, count] of Object.entries(stats)) {
    console.info(`${name}: ${count}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const profile = parseSeedProfile(process.env.SEED_PROFILE);
  verifySeed(prisma, profile)
    .then((stats) => {
      console.info(`Seed verification passed for profile "${profile}".`);
      printStats(stats);
    })
    .finally(() => prisma.$disconnect())
    .catch((error: unknown) => {
      console.error('Seed verification failed.');
      console.error(error);
      process.exitCode = 1;
    });
}
