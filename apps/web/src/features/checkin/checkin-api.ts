import { apiClient } from '../../lib/api-client';

export type ContractStatus =
  | 'CHECKIN_DRAFT'
  | 'ARRIVED'
  | 'WAITING_ELIGIBILITY'
  | 'ELIGIBILITY_APPROVED'
  | 'CHECKIN_STOPPED'
  | 'PAPER_SIGNED'
  | 'WAITING_INITIAL_PAYMENT'
  | 'READY_FOR_HANDOVER'
  | 'ACTIVE'
  | 'LIQUIDATED';

export type ContractMember = {
  customerId: string;
  fullName: string | null;
  gender: string | null;
  identityDocumentNumber: string | null;
  plannedBedId: string | null;
  plannedBedName: string | null;
  identityChecked: boolean;
  eligibilityResult: string | null;
  rejectionReason: string | null;
  participationStatus: string;
};

export type Contract = {
  id: string;
  status: ContractStatus;
  depositId: string;
  branch: { id: string; name: string };
  customer: {
    id: string;
    fullName: string | null;
    organizationName: string | null;
  };
  saleEmployee: { id: string; fullName: string } | null;
  paperContractNumber: string | null;
  customerArrived: boolean;
  customerArrivedAt: string | null;
  signedDate: string | null;
  startsOn: string;
  endsOn: string;
  paymentCycle: string | null;
  totalMonthlyRent: string;
  paperContractSigned: boolean;
  specialTerms: string | null;
  scheduledCheckInAt: string | null;
  depositedBeds: {
    bedId: string;
    bedName: string;
    roomId: string;
    roomName: string;
    monthlyRent: string;
  }[];
  members: ContractMember[];
  contractBeds: {
    bedId: string;
    bedName: string;
    residentCustomerId: string | null;
    residentName: string | null;
    monthlyRent: string;
  }[];
  services: {
    serviceId: string;
    name: string;
    unitPrice: string;
    calculationMethod: string | null;
  }[];
  handover: { id: string; status: string } | null;
  initialPayment: {
    id: string;
    amountDue: string;
    amountPaid: string | null;
    status: string;
    method: string | null;
    items: {
      itemType: string;
      description: string | null;
      quantity: string;
      unitPrice: string;
      amount: string;
    }[];
  } | null;
  availableActions: string[];
};

export function listContracts(
  filters: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return apiClient<Contract[]>(
    `/contracts${query.size ? `?${query.toString()}` : ''}`,
  );
}

export function getContract(id: string) {
  return apiClient<Contract>(`/contracts/${id}`);
}

export function createContractFromDeposit(depositId: string) {
  return apiClient<Contract>(`/contracts/from-deposit/${depositId}`, {
    method: 'POST',
  });
}

function action<T>(id: string, path: string, body?: T) {
  return apiClient<Contract>(`/contracts/${id}/${path}`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export const confirmArrival = (id: string, arrivedAt?: string) =>
  action(id, 'confirm-arrival', { arrivedAt });
export const updateResidents = (
  id: string,
  residents: { customerId: string; bedId: string; identityChecked: boolean }[],
) =>
  apiClient<Contract>(`/contracts/${id}/residents`, {
    method: 'PUT',
    body: JSON.stringify({ residents }),
  });
export const submitEligibilityReview = (id: string) =>
  action(id, 'submit-eligibility-review');
export const approveResident = (id: string, customerId: string) =>
  action(id, `residents/${customerId}/approve`);
export const rejectResident = (
  id: string,
  customerId: string,
  reason: string,
) => action(id, `residents/${customerId}/reject`, { reason });
export const approveEligibility = (id: string) =>
  action(id, 'approve-eligibility');
export const stopCheckIn = (id: string, reason?: string) =>
  action(id, 'stop-check-in', { reason });
export const recordPaperContract = (
  id: string,
  body: {
    paperContractNumber: string;
    signedDate: string;
    startDate: string;
    endDate: string;
    paymentCycle?: string | null;
    specialTerms?: string | null;
    services?: {
      serviceId: string;
      price: string;
      calculationMethod?: string | null;
    }[];
  },
) => action(id, 'record-paper-contract', body);
export const confirmPaperSigning = (id: string) =>
  action(id, 'confirm-paper-signing', { paperContractSigned: true });
export const createInitialPayment = (
  id: string,
  items: {
    type: string;
    description?: string;
    quantity: number;
    unitPrice: string;
  }[],
) => action(id, 'create-initial-payment', { items });
export const recordInitialPayment = (
  id: string,
  body: {
    amount: string;
    method: 'CASH' | 'BANK_TRANSFER';
    paidAt: string;
    transactionReference?: string | null;
    externalEvidenceChecked: boolean;
    note?: string | null;
  },
) => action(id, 'record-initial-payment', body);
export const confirmInitialPayment = (id: string) =>
  action(id, 'confirm-initial-payment');
export const submitHandover = (id: string) => action(id, 'submit-handover');

// Handover
export type Handover = {
  id: string;
  contractId: string;
  contractStatus: string;
  status: string;
  roomIds: string[];
  manager: { id: string; fullName: string };
  customer: {
    id: string;
    fullName: string | null;
    organizationName: string | null;
  };
  areaCondition: string | null;
  utilitiesGuided: boolean;
  safetyGuided: boolean;
  paperRecordSigned: boolean;
  handedOverAt: string | null;
  note: string | null;
  assets: {
    roomAssetId: string;
    assetTypeName: string;
    standardQuantity: number;
    deliveredQuantity: number;
    conditionAtHandover: string | null;
    note: string | null;
  }[];
};

export function createHandover(contractId: string, areaCondition?: string) {
  return apiClient<Handover>(`/contracts/${contractId}/handovers`, {
    method: 'POST',
    body: JSON.stringify({ areaCondition }),
  });
}
export function getHandover(id: string) {
  return apiClient<Handover>(`/handovers/${id}`);
}
export function updateHandover(
  id: string,
  body: {
    areaCondition?: string | null;
    utilitiesGuided?: boolean;
    safetyGuided?: boolean;
    paperHandoverSigned?: boolean;
    note?: string | null;
  },
) {
  return apiClient<Handover>(`/handovers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
export function putHandoverAssets(
  id: string,
  assets: {
    roomAssetId: string;
    deliveredQuantity: number;
    conditionAtHandover?: string | null;
    note?: string | null;
  }[],
) {
  return apiClient<Handover>(`/handovers/${id}/assets`, {
    method: 'PUT',
    body: JSON.stringify({ assets }),
  });
}
export function completeHandover(id: string) {
  return apiClient<Handover>(`/handovers/${id}/complete`, { method: 'POST' });
}
