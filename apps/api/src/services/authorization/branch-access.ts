import type { Role } from '../../generated/prisma/client.js';
import { AppError } from '../../shared/app-error.js';

export type BranchScopedUser = {
  id: string;
  role: Role;
  branchId: string | null;
};

export function canAccessBranch(
  user: BranchScopedUser,
  branchId: string,
): boolean {
  return user.role === 'ADMIN' || user.branchId === branchId;
}

export function assertBranchAccess(
  user: BranchScopedUser,
  branchId: string,
): void {
  if (!canAccessBranch(user, branchId)) {
    throw new AppError(
      403,
      'BRANCH_ACCESS_DENIED',
      'Bạn không có quyền truy cập dữ liệu của chi nhánh này.',
    );
  }
}
