import { apiClient } from '../../lib/api-client';

export type DashboardTask = {
  id: string;
  type: string;
  entityId: string;
  title: string;
  status: string;
  occurredAt: string;
  dueAt: string | null;
};

export type DashboardSchedule = {
  id: string;
  type: string;
  entityId: string;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
};

export type DashboardData = {
  counters: Record<string, number>;
  tasks: DashboardTask[];
  todaySchedules: DashboardSchedule[];
};

export function getDashboard() {
  return apiClient<DashboardData>('/dashboard');
}
