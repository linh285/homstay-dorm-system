import { apiClient } from '../../lib/api-client';

export type OperationalStatus = 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
export type BedBusinessStatus =
  | 'AVAILABLE'
  | 'HELD'
  | 'DEPOSITED'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE';

export type RoomListItem = {
  id: string;
  name: string;
  branch: { id: string; name: string };
  area: string | null;
  floor: number | null;
  roomType: string | null;
  maximumCapacity: number;
  genderPolicy: string | null;
  hasAirConditioner: boolean;
  hasParking: boolean;
  operationalStatus: OperationalStatus;
  totalBeds: number;
  availableBeds: number;
  minRent: string | null;
  maxRent: string | null;
};

export type Bed = {
  id: string;
  name: string;
  monthlyRent: string;
  operationalStatus: OperationalStatus;
  note: string | null;
  businessStatus: BedBusinessStatus;
};

export type Service = {
  id: string;
  name: string;
  unit: string | null;
  unitPrice: string;
};

export type AssetType = {
  id: string;
  name: string;
  unit: string | null;
  description: string | null;
};

export type RoomService = {
  serviceId: string;
  customPrice: string | null;
  note: string | null;
  service: Service;
};

export type RoomAsset = {
  id: string;
  assetTypeId: string;
  assetType: AssetType;
  quantity: number;
  currentCondition: string | null;
  note: string | null;
};

export type RoomDetail = {
  id: string;
  branch: { id: string; name: string };
  branchId: string;
  name: string;
  area: string | null;
  floor: number | null;
  roomType: string | null;
  maximumCapacity: number;
  genderPolicy: string | null;
  hasAirConditioner: boolean;
  hasParking: boolean;
  curfew: string | null;
  quietLevel: string | null;
  rules: string | null;
  operationalStatus: OperationalStatus;
  note: string | null;
  beds: Bed[];
  services: RoomService[];
  assets: RoomAsset[];
};

export type RoomInput = {
  branchId: string;
  name: string;
  area?: string | null;
  floor?: number | null;
  roomType?: string | null;
  maximumCapacity: number;
  genderPolicy?: string | null;
  hasAirConditioner?: boolean;
  hasParking?: boolean;
  curfew?: string | null;
  quietLevel?: string | null;
  rules?: string | null;
  operationalStatus: OperationalStatus;
  note?: string | null;
};

export type BedInput = {
  name: string;
  monthlyRent: string;
  operationalStatus: OperationalStatus;
  note?: string | null;
};

export function listRooms(filters: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, value);
  });
  return apiClient<RoomListItem[]>(
    `/rooms${query.size ? `?${query.toString()}` : ''}`,
  );
}

export function getRoom(id: string) {
  return apiClient<RoomDetail>(`/rooms/${id}`);
}

export type RoomAvailability = {
  roomId: string;
  beds: {
    id: string;
    name: string;
    monthlyRent: string;
    operationalStatus: OperationalStatus;
    businessStatus: BedBusinessStatus;
  }[];
};

export function getRoomAvailability(id: string) {
  return apiClient<RoomAvailability>(`/rooms/${id}/availability`);
}

export function createRoom(input: RoomInput) {
  return apiClient<RoomDetail>('/rooms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateRoom(id: string, input: Partial<RoomInput>) {
  return apiClient<RoomDetail>(`/rooms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function addBed(roomId: string, input: BedInput) {
  return apiClient<Bed>(`/rooms/${roomId}/beds`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateBed(bedId: string, input: Partial<BedInput>) {
  return apiClient<Bed>(`/beds/${bedId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listServices() {
  return apiClient<Service[]>('/services');
}

export function listAssetTypes() {
  return apiClient<AssetType[]>('/asset-types');
}

export function getRoomAssets(roomId: string) {
  return apiClient<RoomAsset[]>(`/rooms/${roomId}/assets`);
}

export function putRoomServices(
  roomId: string,
  services: { serviceId: string; customPrice?: string | null; note?: string | null }[],
) {
  return apiClient<RoomService[]>(`/rooms/${roomId}/services`, {
    method: 'PUT',
    body: JSON.stringify({ services }),
  });
}

export function putRoomAssets(
  roomId: string,
  assets: {
    assetTypeId: string;
    quantity: number;
    currentCondition?: string | null;
    note?: string | null;
  }[],
) {
  return apiClient<RoomAsset[]>(`/rooms/${roomId}/assets`, {
    method: 'PUT',
    body: JSON.stringify({ assets }),
  });
}
