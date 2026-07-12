import { apiClient } from '../../lib/api-client';

export type CheckoutStatus =
  | 'DRAFT'
  | 'WAITING_INSPECTION'
  | 'INSPECTED'
  | 'WAITING_SETTLEMENT'
  | 'WAITING_CUSTOMER_CONFIRMATION'
  | 'DISPUTED'
  | 'WAITING_FINANCIAL_COMPLETION'
  | 'READY_TO_COMPLETE'
  | 'COMPLETED'
  | 'CANCELLED';

export type CheckoutRequest = {
  id: string;
  status: CheckoutStatus;
  depositId: string;
  contractId: string | null;
  hasContract: boolean;
  branch: { id: string; name: string };
  customer: {
    id: string;
    fullName: string | null;
    organizationName: string | null;
  };
  saleEmployee: { id: string; fullName: string } | null;
  requestedAt: string;
  expectedCheckoutAt: string | null;
  actualCheckoutAt: string | null;
  reason: string | null;
  note: string | null;
  beds: { bedId: string; bedName: string; roomName: string }[];
  inspection: {
    id: string;
    status: string | null;
    sanitationCondition: string | null;
    areaCondition: string | null;
  } | null;
  settlement: { id: string; status: string } | null;
  availableActions: string[];
};

export type InspectionItem = {
  id: string;
  roomAssetId: string | null;
  result: string;
  quantity: number | null;
  description: string | null;
  estimatedCost: string | null;
  note: string | null;
};

export type Inspection = {
  id: string;
  checkoutRequestId: string;
  status: string | null;
  manager: { id: string; fullName: string } | null;
  sanitationCondition: string | null;
  areaCondition: string | null;
  inspectedAt: string | null;
  note: string | null;
  items: InspectionItem[];
};

export function listCheckouts(
  filters: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return apiClient<CheckoutRequest[]>(
    `/checkout-requests${query.size ? `?${query.toString()}` : ''}`,
  );
}
export function getCheckout(id: string) {
  return apiClient<CheckoutRequest>(`/checkout-requests/${id}`);
}
export function createCheckout(body: {
  contractId?: string;
  depositId?: string;
  expectedCheckoutAt?: string | null;
  reason?: string | null;
  note?: string | null;
}) {
  return apiClient<CheckoutRequest>('/checkout-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
function checkoutAction(id: string, path: string, body?: unknown) {
  return apiClient<CheckoutRequest>(`/checkout-requests/${id}/${path}`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}
export const submitCheckout = (id: string) => checkoutAction(id, 'submit');
export const cancelCheckout = (id: string) => checkoutAction(id, 'cancel');
export const createInspection = (
  id: string,
  body: { sanitationCondition?: string; areaCondition?: string; note?: string },
) => checkoutAction(id, 'inspection', body);

export function getInspection(id: string) {
  return apiClient<Inspection>(`/checkout-inspections/${id}`);
}
export function updateInspection(
  id: string,
  body: {
    sanitationCondition?: string | null;
    areaCondition?: string | null;
    note?: string | null;
  },
) {
  return apiClient<Inspection>(`/checkout-inspections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
export function putInspectionItems(
  id: string,
  items: {
    roomAssetId?: string | null;
    result: string;
    quantity?: number | null;
    description?: string | null;
    estimatedCost?: string | null;
  }[],
) {
  return apiClient<Inspection>(`/checkout-inspections/${id}/items`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}
export function completeInspection(id: string) {
  return apiClient<Inspection>(`/checkout-inspections/${id}/complete`, {
    method: 'POST',
  });
}
