import { apiClient } from '../../lib/api-client';

export type DashboardData = {
  counters: Record<string, number>;
  tasks: unknown[];
  todaySchedules: unknown[];
};
export function getDashboard() {
  return apiClient<DashboardData>('/dashboard');
}
