import { apiClient } from '../../lib/api-client';

export type CustomerType = 'INDIVIDUAL' | 'ORGANIZATION';
export type RentalMode = 'WHOLE_ROOM' | 'SHARED_BEDS';
export type RentalRequestStatus =
  'ACTIVE' | 'VIEWING' | 'DEPOSIT_PROCESS' | 'CLOSED';

export type CustomerInput = {
  customerType: CustomerType;
  fullName?: string;
  organizationName?: string;
  representativeName?: string;
  birthDate?: string | null;
  gender?: string | null;
  nationality?: string | null;
  identityDocumentType?: string | null;
  identityDocumentNumber?: string | null;
  taxCode?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export type RentalRequestInput = {
  branchId: string;
  expectedResidents: number;
  rentalMode: RentalMode;
  preferredRoomType?: string | null;
  maximumBudget?: string | null;
  expectedCheckInDate: string;
  rentalDurationMonths: number;
  genderRequirement?: string | null;
  requiresAirConditioner?: boolean | null;
  requiresParking?: boolean | null;
  quietPreference?: boolean | null;
  acceptsSharedBeds?: boolean | null;
  livingSchedule?: string | null;
  note?: string | null;
};

export type Customer = CustomerInput & { id: string };
export type RequestMember = {
  customerId: string;
  participationStatus: string;
  customer: Customer;
};
export type RentalRequest = RentalRequestInput & {
  id: string;
  status: RentalRequestStatus;
  registeredAt: string;
  representative: Customer;
  branch: { id: string; name: string };
  saleEmployee: { id: string; fullName: string };
  members: RequestMember[];
};

export function listRentalRequests(
  filters: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return apiClient<RentalRequest[]>(
    `/rental-requests${query.size ? `?${query.toString()}` : ''}`,
  );
}

export function getRentalRequest(id: string) {
  return apiClient<RentalRequest>(`/rental-requests/${id}`);
}
export function createRentalRequest(input: {
  customer: CustomerInput;
  rentalRequest: RentalRequestInput;
}) {
  return apiClient<RentalRequest>('/rental-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
export function updateRentalRequest(
  id: string,
  input: {
    customer?: CustomerInput;
    rentalRequest?: Partial<RentalRequestInput>;
  },
) {
  return apiClient<RentalRequest>(`/rental-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
export function addMember(id: string, customer: CustomerInput) {
  return apiClient<RequestMember>(`/rental-requests/${id}/members`, {
    method: 'POST',
    body: JSON.stringify({ customer }),
  });
}
export function updateMember(
  id: string,
  memberId: string,
  customer: CustomerInput,
) {
  return apiClient<Customer>(`/rental-requests/${id}/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ customer }),
  });
}
export function deleteMember(id: string, memberId: string) {
  return apiClient<null>(`/rental-requests/${id}/members/${memberId}`, {
    method: 'DELETE',
  });
}
export function closeRentalRequest(id: string) {
  return apiClient<RentalRequest>(`/rental-requests/${id}/close`, {
    method: 'POST',
  });
}
