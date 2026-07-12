import { apiClient } from '../../lib/api-client';
import type { Role } from '../auth/auth-api';

export type Branch = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  accountHolderName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankTransferInstruction: string | null;
  status: string;
};
export type Employee = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  role: Role;
  status: string;
  branch: { id: string; name: string } | null;
  account: { username: string } | null;
};
export type BranchUpdate = Partial<Omit<Branch, 'id'>>;

export function getEmployees() {
  return apiClient<Employee[]>('/employees');
}
export function getBranches() {
  return apiClient<Branch[]>('/branches');
}
export function getBranch(id: string) {
  return apiClient<Branch>(`/branches/${id}`);
}
export function updateBranch(id: string, data: BranchUpdate) {
  return apiClient<Branch>(`/branches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
