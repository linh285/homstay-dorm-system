import { apiClient } from '../../lib/api-client';

export type Role = 'SALE' | 'ACCOUNTANT' | 'MANAGER' | 'ADMIN';

export type CurrentEmployee = {
  id: string;
  fullName: string;
  role: Role;
  branchId: string | null;
};

export function login(input: { username: string; password: string }) {
  return apiClient<{ employee: CurrentEmployee }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function logout() {
  return apiClient<null>('/auth/logout', { method: 'POST' });
}

export function getCurrentEmployee() {
  return apiClient<{ employee: CurrentEmployee }>('/auth/me');
}
