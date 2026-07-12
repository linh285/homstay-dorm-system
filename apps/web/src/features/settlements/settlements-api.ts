import { apiClient } from '../../lib/api-client';

export type Settlement = {
  id: string;
  status: string;
  checkoutRequestId: string;
  customer: { id: string; fullName: string | null; organizationName: string | null };
  accountant: { id: string; fullName: string } | null;
  customerConfirmedBy: { id: string; fullName: string } | null;
  originalDepositAmount: string;
  refundRate: number;
  baseRefundAmount: string;
  totalDeductions: string;
  finalBalance: string;
  result: string;
  customerAgreedAt: string | null;
  disputeContent: string | null;
  paperCheckoutSigned: boolean;
  contractLiquidated: boolean;
  keysRecovered: boolean;
  customerLeft: boolean;
  deductions: {
    id: string;
    feeType: string;
    description: string | null;
    amount: string;
    source: string | null;
  }[];
  payments: {
    id: string;
    paymentType: string;
    direction: string;
    amountPaid: string | null;
    status: string;
  }[];
  availableActions: string[];
};

export function createSettlement(checkoutId: string) {
  return apiClient<Settlement>(`/checkout-requests/${checkoutId}/settlement`, {
    method: 'POST',
  });
}
export function getSettlement(id: string) {
  return apiClient<Settlement>(`/settlements/${id}`);
}
function action(id: string, path: string, body?: unknown) {
  return apiClient<Settlement>(`/settlements/${id}/${path}`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}
export function putDeductions(
  id: string,
  deductions: {
    type: string;
    description?: string | null;
    amount: string;
    source?: string | null;
  }[],
) {
  return apiClient<Settlement>(`/settlements/${id}/deductions`, {
    method: 'PUT',
    body: JSON.stringify({ deductions }),
  });
}
export const calculateSettlement = (id: string) => action(id, 'calculate');
export const finalizeSettlement = (id: string) => action(id, 'finalize');
export const customerAgreed = (id: string) => action(id, 'customer-agreed');
export const settlementDisputed = (id: string, content: string) =>
  action(id, 'disputed', { content });
export const returnToAccountant = (id: string) => action(id, 'return-to-accountant');
export const recordAdditionalPayment = (
  id: string,
  body: {
    amount: string;
    method: 'CASH' | 'BANK_TRANSFER';
    paidAt: string;
    transactionReference?: string | null;
    receiptNumber?: string | null;
    externalEvidenceChecked: boolean;
  },
) => action(id, 'record-additional-payment', body);
export const recordRefund = (
  id: string,
  body: {
    amount: string;
    method: 'CASH' | 'BANK_TRANSFER';
    paidAt: string;
    transactionReference?: string | null;
  },
) => action(id, 'record-refund', body);
export const confirmNoBalance = (id: string) => action(id, 'confirm-no-balance');
export const confirmLiquidation = (
  id: string,
  body: {
    paperCheckoutSigned: boolean;
    contractLiquidated: boolean;
    keysRecovered: boolean;
    customerLeft: boolean;
  },
) => action(id, 'confirm-liquidation', body);
export const completeCheckout = (id: string) => action(id, 'complete-checkout');
