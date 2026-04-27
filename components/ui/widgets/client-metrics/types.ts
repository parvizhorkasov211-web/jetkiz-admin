export type ClientMetricTrend = {
  value: string;
  direction: "up" | "down" | "neutral";
};

export type ClientMetricKpi = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  trend: ClientMetricTrend;
};

export type ClientMetricsSummary = {
  totalClients: number;
  activeToday: number;
  newThisWeek: number;
  totalOrders: number;
  avgOrdersPerClient: number;
  totalRevenue: number;
};

export type ClientMetricsPeriod =
  | "today"
  | "7d"
  | "14d"
  | "30d"
  | "month"
  | "year";

export type ClientActivityPoint = {
  bucketStart: string;
  activeClients: number;
  newClients: number;
};

export type ClientDevicePlatform = {
  platform: string;
  count: number;
  pct: number;
};

export type ClientLanguageStat = {
  language: string;
  count: number;
  pct: number;
};

export type ClientEventStat = {
  eventName: string;
  count: number;
};

export type ClientRetentionItem = {
  label: string;
  value: number;
};

export type ClientMetricsTableItem = {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  name?: string | null;
  email: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  blockedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  language: string | null;
  ordersCount: number;
  deliveredCount: number;
  totalSpent: number;
  avgCheck: number;
  lastOrderAt: string | null;
  lastOrderStatus: string | null;
  segment: "NEW" | "REGULAR" | "VIP" | string;
  devicesCount: number;
  favoriteRestaurantsCount: number;
  favoriteProductsCount: number;
};