export type NotificationTargetType =
  | "ALL_USERS"
  | "CLIENTS"
  | "COURIERS"
  | "RESTAURANTS"
  | "USER_IDS"
  | "PHONE"
  | "CLIENTS_WITH_ORDERS"
  | "CLIENTS_WITHOUT_ORDERS"
  | "CLIENTS_INACTIVE_30D"
  | "CLIENTS_MARKETING_OPT_IN";

export type NotificationCampaignStatus =
  | "DRAFT"
  | "SENDING"
  | "SENT"
  | "FAILED"
  | "PARTIAL"
  | "STOPPED";

export type NotificationOpenApp = "auto" | "client" | "courier" | "restaurant";

export type NotificationOpenAction =
  | "auto_home"
  | "auto_profile"
  | "client_home"
  | "client_orders"
  | "client_order"
  | "client_promos"
  | "client_restaurant"
  | "client_category"
  | "client_profile"
  | "client_reviews"
  | "courier_home"
  | "courier_available_orders"
  | "courier_active_order"
  | "courier_history"
  | "courier_balance"
  | "courier_profile"
  | "restaurant_home"
  | "restaurant_orders"
  | "restaurant_order"
  | "restaurant_menu"
  | "restaurant_reviews"
  | "restaurant_finance"
  | "restaurant_profile";

export type SendFormState = {
  targetType: NotificationTargetType;
  targetPhone: string;
  targetUserIds: string;
  app: NotificationOpenApp;
  openAction: NotificationOpenAction;
  openValue: string;
  title: string;
  body: string;
};

export type OpenOption = {
  value: NotificationOpenAction;
  label: string;
  app: NotificationOpenApp;
  screen: string;
  valueKey?: string;
  valueLabel?: string;
  valuePlaceholder?: string;
};

export type CreateNotificationCampaignPayload = {
  title: string;
  body: string;
  targetType: NotificationTargetType;
  targetPhone?: string;
  targetUserIds?: string[];
  data: Record<string, string>;
};

export type NotificationTemplate = {
  id: string;
  code: string;
  title: string;
  body: string;
  isActive: boolean;
  variables?: unknown;
  createdAt: string;
  updatedAt: string;
};

export type NotificationCampaign = {
  id: string;
  title: string;
  body: string;
  targetType: NotificationTargetType;
  targetUserIds?: string[];
  targetPhone?: string | null;
  data?: Record<string, unknown> | null;
  status: NotificationCampaignStatus;
  recipientsCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdByAdminId?: string | null;
  startedAt?: string | null;
  sentAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type NotificationCampaignDetail = NotificationCampaign & {
  recipients?: Array<{
    id: string;
    userId: string;
    status: string;
    errorMessage?: string | null;
    sentAt?: string | null;
    failedAt?: string | null;
    skippedAt?: string | null;
    createdAt: string;
    user?: {
      id: string;
      phone?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      role?: string | null;
    };
  }>;
};

export type CampaignsListResponse = {
  items?: NotificationCampaign[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
};

export type TemplatesListResponse = {
  items?: NotificationTemplate[];
  total?: number;
};
