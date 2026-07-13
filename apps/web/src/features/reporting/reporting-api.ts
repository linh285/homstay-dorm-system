import { apiClient } from '../../lib/api-client';

export type Occupancy = {
  totalBeds: number;
  availableBeds: number;
  heldBeds: number;
  depositedBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
};

export type OperationalCounts = {
  rentalRequests: number;
  todayViewings: number;
  deposits: number;
  contracts: number;
  checkoutRequests: number;
};

export type Finances = {
  deposit: number;
  refund: number;
  additionalPayment: number;
};

export type BranchSummary = {
  scope: string;
  occupancy: Occupancy;
  counts: OperationalCounts;
  finances: Finances;
};

export type SystemBranchSummary = {
  branch: { id: string; name: string };
  occupancy: Occupancy;
  counts: OperationalCounts;
  finances: Finances;
};

export type SystemSummary = {
  scope: string;
  branches: SystemBranchSummary[];
};

export type OccupancyReport = { scope: string } & Occupancy;

export type RentalFunnel = {
  scope: string;
  counts: Record<string, number>;
};

function query(branchId?: string) {
  return branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
}
export function getBranchSummary() {
  return apiClient<BranchSummary>('/reports/branch-summary');
}
export function getSystemSummary() {
  return apiClient<SystemSummary>('/reports/system-summary');
}
export function getOccupancy(branchId?: string) {
  return apiClient<OccupancyReport>(`/reports/occupancy${query(branchId)}`);
}
export function getRentalFunnel(branchId?: string) {
  return apiClient<RentalFunnel>(`/reports/rental-funnel${query(branchId)}`);
}
