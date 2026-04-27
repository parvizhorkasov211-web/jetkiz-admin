export type CourierMapStatus = 'ONLINE_IDLE' | 'BUSY' | 'OFFLINE' | 'BLOCKED';

export type CourierMapPoint = {
  courierUserId: string;
  name: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  isOnline: boolean;
  status: CourierMapStatus;
  lastSeenAt: string | null;
  lastActiveAt: string | null;
  blockedAt: string | null;
  activeOrderId: string | null;
  activeOrderNumber: number | null;
  activeOrderStatus: string | null;
  restaurantName: string | null;
  deliveryAddress: string | null;
};

export type CourierMapFilter = 'ALL' | CourierMapStatus;