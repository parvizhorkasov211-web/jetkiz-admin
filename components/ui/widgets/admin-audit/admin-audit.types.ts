export type AuditSort = "asc" | "desc";

export type ActionGroup =
  | "all"
  | "auth"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "block"
  | "finance"
  | "content";

export type AuditUser = {
  id?: string;
  phone?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type AuditAdminUser = {
  id?: string;
  userId?: string;
  user?: AuditUser | null;
};

export type AuditLogItem = {
  id: string;
  adminUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData: unknown;
  newData: unknown;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
  adminUser?: AuditAdminUser | null;
};

export type AuditListResponse = {
  total: number;
  page: number;
  limit: number;
  items: AuditLogItem[];
};

export type AuditStatsResponse = {
  total: number;
  today: number;
  loginEvents: number;
  adminActions: number;
  exportActions?: number;
  byAction: Array<{ action: string; count: number }>;
  byEntityType: Array<{ entityType: string; count: number }>;
};

export type DictionaryResponse = {
  items: string[];
};

export type AuditChangeRow = {
  key: string;
  label: string;
  oldValue: string;
  newValue: string;
};