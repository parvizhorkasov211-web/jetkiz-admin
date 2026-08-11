export type CourierMapStatus = 'ONLINE_IDLE' | 'BUSY' | 'OFFLINE' | 'BLOCKED';

export type CourierMapPoint = {
  courierUserId: string;
  courierNumber: number | null;
  firstName: string;
  lastName: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  lat: number | null;
  lng: number | null;
  isOnline: boolean;
  isActive: boolean;
  status: CourierMapStatus;
  lastSeenAt: string | null;
  lastActiveAt: string | null;
  locationAgeSec: number | null;
  locationFresh: boolean;
  blockedAt: string | null;
  activeOrdersCount: number;
  activeOrderId: string | null;
  activeOrderNumber: number | null;
  activeOrderStatus: string | null;
  restaurantName: string | null;
  restaurantAddress: string | null;
  deliveryAddress: string | null;

  // Realtime-only telemetry. Snapshot API intentionally does not persist these
  // high-frequency values in the primary database.
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  capturedAt?: string | null;
};

export type CourierMapSummary = {
  total: number;
  online: number;
  onlineIdle: number;
  busy: number;
  offline: number;
  blocked: number;
  staleOnline: number;
  busyWithoutFreshLocation: number;
  trackedNow: number;
};

export type CourierMapResponse = {
  generatedAt: string;
  freshnessSeconds: number;
  summary: CourierMapSummary;
  points: CourierMapPoint[];
};

export type CourierMapFilter = 'ALL' | CourierMapStatus;
