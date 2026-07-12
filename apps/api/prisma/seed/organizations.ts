import type { Role } from '../../src/generated/prisma/client.js';
import { rolePrefixes } from './constants.js';
import { type DbClient, type EmployeeSeed, type SeedContext, pad } from './helpers.js';

const branchNames = ['Trung tâm', 'Bình Thạnh', 'Thủ Đức', 'Tân Bình'];
const roleNames: Record<Role, string> = {
  SALE: 'Nhân viên Sale',
  ACCOUNTANT: 'Nhân viên Kế toán',
  MANAGER: 'Quản lý Chi nhánh',
  ADMIN: 'Quản trị viên',
};

export async function seedOrganizations(db: DbClient, ctx: SeedContext): Promise<void> {
  for (let index = 1; index <= ctx.config.branches; index += 1) {
    const branchId = `CN${pad(index)}`;
    ctx.branches.push({
      id: branchId,
      name: `Chi nhánh ${branchNames[index - 1] ?? `Số ${index}`}`,
    });
  }

  await db.branch.createMany({
    data: ctx.branches.map((branch, index) => ({
      id: branch.id,
      name: branch.name,
      address: `${20 + index} Nguyễn Văn Linh, TP. Hồ Chí Minh`,
      phone: `0283900${pad(index + 1, 4)}`,
      email: `${branch.id.toLowerCase()}@homestay.local`,
      accountHolderName: `CÔNG TY HOMESTAY ${branch.id}`,
      bankAccountNumber: `970400${pad(index + 1, 6)}`,
      bankName: 'Vietcombank',
      bankTransferInstruction: `Chuyển khoản nội dung: ${branch.id} - Mã hồ sơ`,
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });

  const employees = buildEmployees(ctx);
  ctx.employees.push(...employees);
  ctx.admins.push(...employees.filter((employee) => employee.role === 'ADMIN'));

  for (const branch of ctx.branches) {
    ctx.salesByBranch.set(
      branch.id,
      employees.filter((employee) => employee.branchId === branch.id && employee.role === 'SALE'),
    );
    ctx.accountantsByBranch.set(
      branch.id,
      employees.filter((employee) => employee.branchId === branch.id && employee.role === 'ACCOUNTANT'),
    );
    ctx.managersByBranch.set(
      branch.id,
      employees.filter((employee) => employee.branchId === branch.id && employee.role === 'MANAGER'),
    );
  }

  for (const employee of employees) {
    await db.employee.upsert({
      where: { id: employee.id },
      update: {
        fullName: employee.fullName,
        phone: employee.branchId ? `090${employee.id.replace('NV', '')}` : null,
        email: `${employee.username}@homestay.local`,
        role: employee.role,
        branchId: employee.branchId,
        status: 'ACTIVE',
      },
      create: {
        id: employee.id,
        fullName: employee.fullName,
        phone: employee.branchId ? `090${employee.id.replace('NV', '')}` : null,
        email: `${employee.username}@homestay.local`,
        role: employee.role,
        branchId: employee.branchId,
        status: 'ACTIVE',
      },
    });

    await db.account.upsert({
      where: { username: employee.username },
      update: {
        employeeId: employee.id,
        passwordHash: ctx.passwordHash,
        status: 'ACTIVE',
      },
      create: {
        username: employee.username,
        employeeId: employee.id,
        passwordHash: ctx.passwordHash,
        status: 'ACTIVE',
      },
    });
  }
}

function buildEmployees(ctx: SeedContext): EmployeeSeed[] {
  const employees: EmployeeSeed[] = [];
  let nextEmployeeNumber = 1;

  function employeeId(): string {
    const id = `NV${pad(nextEmployeeNumber)}`;
    nextEmployeeNumber += 1;
    return id;
  }

  for (const branch of ctx.branches) {
    for (const role of ['SALE', 'ACCOUNTANT', 'MANAGER'] as const) {
      for (let index = 1; index <= ctx.config.employeesPerRolePerBranch; index += 1) {
        const isPrimary = branch.id === 'CN001' && index === 1;
        const username = isPrimary
          ? `${rolePrefixes[role]}01`
          : `${rolePrefixes[role]}${branch.id.replace('CN', '')}${pad(index, 2)}`;
        employees.push({
          id: employeeId(),
          username,
          fullName: `${roleNames[role]} ${branch.id}-${index}`,
          role,
          branchId: branch.id,
        });
      }
    }
  }

  for (let index = 1; index <= ctx.config.admins; index += 1) {
    const username = index === 1 ? 'admin01' : `admin${pad(index, 2)}`;

    employees.push({
      id: employeeId(),
      username,
      fullName: `${roleNames.ADMIN} ${index}`,
      role: 'ADMIN',
      branchId: null,
    });
  }

  return employees;
}
