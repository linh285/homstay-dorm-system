import { apiClient } from '../../lib/api-client';

export type ViewingStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'VISITED'
  | 'RESULT_RECORDED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type ViewingResult =
  | 'CUSTOMER_WANTS_DEPOSIT'
  | 'WANTS_MORE_VIEWINGS'
  | 'WANTS_TO_CHANGE_CRITERIA'
  | 'UNDECIDED'
  | 'NOT_INTERESTED';

export type ViewingDetail = {
  roomId: string;
  viewedInPerson: boolean;
  customerInterested: boolean;
  note: string | null;
  room: { id: string; name: string };
};

export type Viewing = {
  id: string;
  rentalRequestId: string;
  startsAt: string;
  endsAt: string | null;
  status: ViewingStatus;
  notificationChannel: string | null;
  notificationSent: boolean;
  customerVisited: boolean;
  finalResult: ViewingResult | null;
  followUpDate: string | null;
  note: string | null;
  rentalRequest: {
    id: string;
    branchId: string;
    status: string;
    representative: {
      id: string;
      fullName: string | null;
      organizationName: string | null;
    };
  };
  saleEmployee: { id: string; fullName: string };
  details: ViewingDetail[];
};

export function listViewings(
  filters: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return apiClient<Viewing[]>(
    `/viewings${query.size ? `?${query.toString()}` : ''}`,
  );
}

export function getViewing(id: string) {
  return apiClient<Viewing>(`/viewings/${id}`);
}

export function createViewing(input: {
  rentalRequestId: string;
  startsAt: string;
  endsAt?: string | null;
  roomIds: string[];
  notificationChannel?: string | null;
  notificationSent?: boolean;
  note?: string | null;
}) {
  return apiClient<Viewing>('/viewings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

function action<T>(id: string, path: string, body?: T) {
  return apiClient<Viewing>(`/viewings/${id}/${path}`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export const confirmViewing = (id: string) => action(id, 'confirm');
export const rescheduleViewing = (
  id: string,
  body: { startsAt: string; endsAt?: string | null; reason?: string | null },
) => action(id, 'reschedule', body);
export const cancelViewing = (id: string, reason?: string | null) =>
  action(id, 'cancel', { reason });
export const noShowViewing = (id: string, note?: string | null) =>
  action(id, 'no-show', { note });
export const confirmVisited = (id: string, note?: string | null) =>
  action(id, 'confirm-visited', { note });
export const recordResult = (
  id: string,
  body: {
    result: ViewingResult;
    selectedRoomId?: string | null;
    followUpDate?: string | null;
    note?: string | null;
  },
) => action(id, 'result', body);
