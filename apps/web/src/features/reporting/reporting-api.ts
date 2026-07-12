import { apiClient } from '../../lib/api-client';

export type ReportData = Record<string, unknown>;
function query(branchId?: string) {
  return branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
}
export function getBranchSummary() {
  return apiClient<ReportData>('/reports/branch-summary');
}
export function getSystemSummary() {
  return apiClient<ReportData>('/reports/system-summary');
}
export function getOccupancy(branchId?: string) {
  return apiClient<ReportData>(`/reports/occupancy${query(branchId)}`);
}
export function getRentalFunnel(branchId?: string) {
  return apiClient<ReportData>(`/reports/rental-funnel${query(branchId)}`);
}
export function getDepositReport(branchId?: string) {
  return apiClient<ReportData>(`/reports/deposits${query(branchId)}`);
}
export function getCheckInsCheckoutsReport(branchId?: string) {
  return apiClient<ReportData>(
    `/reports/check-ins-checkouts${query(branchId)}`,
  );
}
export function getFinancialSummary(branchId?: string) {
  return apiClient<ReportData>(`/reports/financial-summary${query(branchId)}`);
}
