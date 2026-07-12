import bcrypt from 'bcrypt';

import { prisma } from '../src/data/prisma/client.js';

const password = process.env.SEED_PASSWORD ?? 'Password123!';

const employees = [
  { id: 'NV001', username: 'sale01', fullName: 'Nhân viên Sale', role: 'SALE' as const, branchId: 'CN001' },
  { id: 'NV002', username: 'accountant01', fullName: 'Nhân viên Kế toán', role: 'ACCOUNTANT' as const, branchId: 'CN001' },
  { id: 'NV003', username: 'manager01', fullName: 'Quản lý Chi nhánh', role: 'MANAGER' as const, branchId: 'CN001' },
  { id: 'NV004', username: 'admin01', fullName: 'Quản trị viên', role: 'ADMIN' as const, branchId: null },
];

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.branch.upsert({
    where: { id: 'CN001' },
    update: { name: 'Chi nhánh Trung tâm', address: 'TP. Hồ Chí Minh', status: 'ACTIVE' },
    create: { id: 'CN001', name: 'Chi nhánh Trung tâm', address: 'TP. Hồ Chí Minh', status: 'ACTIVE' },
  });

  for (const employee of employees) {
    const { username, ...employeeData } = employee;
    await prisma.employee.upsert({
      where: { id: employee.id },
      update: {
        fullName: employee.fullName,
        role: employee.role,
        branchId: employee.branchId,
        status: 'ACTIVE',
      },
      create: { ...employeeData, status: 'ACTIVE' },
    });
    await prisma.account.upsert({
      where: { username },
      update: { employeeId: employee.id, passwordHash, status: 'ACTIVE' },
      create: { username, employeeId: employee.id, passwordHash, status: 'ACTIVE' },
    });
  }
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
