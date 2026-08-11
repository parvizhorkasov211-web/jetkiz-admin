export type CourierMapStatus = 'ONLINE_IDLE' | 'BUSY' | 'OFFLINE' | 'BLOCKED';

export type CourierMapPoint = {
  courierUserId: string;
  courierNumber: number;
  firstName: string;
  lastName: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  addressText: string | null;
  lat: number | null;
  lng: number | null;
  hasLocation: boolean;
  isOnline: boolean;
  status: CourierMapStatus;
  lastSeenAt: string | null;
  lastActiveAt: string | null;
  lastAssignedAt: string | null;
  blockedAt: string | null;
  blockReason: string | null;
  activeOrderId: string | null;
  activeOrderNumber: number | null;
  activeOrderStatus: string | null;
  restaurantName: string | null;
  deliveryAddress: string | null;
};

export type CourierMapFilter = 'ALL' | CourierMapStatus;
