import { apiClient } from '../../lib/api-client';

export type DepositStatus =
  | 'DRAFT'
  | 'WAITING_ROOM_CHECK'
  | 'ROOM_APPROVED'
  | 'ROOM_REJECTED'
  | 'WAITING_PAYMENT'
  | 'WAITING_MANAGER_CONFIRMATION'
  | 'PAYMENT_RECHECK'
  | 'PAYMENT_REJECTED'
  | 'DEPOSITED'
  | 'EXPIRED'
  | 'CANCELLED';

export type DepositDetail = {
  bedId: string;
  bedName: string;
  roomId: string;
  roomName: string;
  monthlyRentSnapshot: string;
  depositMonths: number;
  depositAmount: string;
};

export type DepositPayment = {
  id: string;
  amountDue: string;
  amountPaid: string | null;
  issuedAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  method: string | null;
  transactionReference: string | null;
  receiptNumber: string | null;
  externalEvidenceChecked: boolean;
  status: string;
  rejectionReason: string | null;
};

export type Deposit = {
  id: string;
  status: DepositStatus;
  rentalRequestId: string;
  rentalModeSnapshot: string;
  branch: { id: string; name: string };
  customer: { id: string; fullName: string | null; organizationName: string | null };
  saleEmployee: { id: string; fullName: string } | null;
  roomConfirmedBy: { id: string; fullName: string } | null;
  customerAgreedToRules: boolean;
  customerAgreedAt: string | null;
  roomRejectionReason: string | null;
  totalDepositAmount: string;
  scheduledCheckInAt: string | null;
  note: string | null;
  createdAt: string;
  details: DepositDetail[];
  payment: DepositPayment | null;
  allocations: {
    id: string;
    bedId: string;
    allocationType: string;
    status: string;
    expiresAt: string | null;
  }[];
  availableActions: string[];
};

export function listDeposits(filters: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return apiClient<Deposit[]>(
    `/deposits${query.size ? `?${query.toString()}` : ''}`,
  );
}

export function getDeposit(id: string) {
  return apiClient<Deposit>(`/deposits/${id}`);
}

export function createDepositFromViewing(
  viewingId: string,
  selectedBedIds: string[],
) {
  return apiClient<Deposit>(`/viewings/${viewingId}/create-deposit`, {
    method: 'POST',
    body: JSON.stringify({ selectedBedIds }),
  });
}

function action<T>(id: string, path: string, body?: T) {
  return apiClient<Deposit>(`/deposits/${id}/${path}`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export const confirmCustomerRules = (
  id: string,
  body: { customerAgreed: true; confirmedAt?: string | null; note?: string | null },
) => action(id, 'confirm-customer-rules', body);
export const submitRoomCheck = (id: string) => action(id, 'submit-room-check');
export const approveRoom = (id: string) => action(id, 'approve-room');
export const rejectRoom = (id: string, reason: string) =>
  action(id, 'reject-room', { reason });
export const issuePaymentRequest = (id: string) =>
  action(id, 'issue-payment-request');
export const recordPayment = (
  id: string,
  body: {
    amount: string;
    method: 'CASH' | 'BANK_TRANSFER';
    paidAt: string;
    transactionReference?: string | null;
    receiptNumber?: string | null;
    externalEvidenceChecked: boolean;
    note?: string | null;
  },
) => action(id, 'record-payment', body);
export const approvePayment = (id: string) => action(id, 'approve-payment');
export const requestPaymentRecheck = (id: string, reason: string) =>
  action(id, 'request-payment-recheck', { reason });
export const rejectPayment = (id: string, reason: string) =>
  action(id, 'reject-payment', { reason });
export const scheduleCheckIn = (
  id: string,
  body: { checkInAt: string; note?: string | null },
) => action(id, 'schedule-check-in', body);
export const cancelDeposit = (id: string) => action(id, 'cancel');
