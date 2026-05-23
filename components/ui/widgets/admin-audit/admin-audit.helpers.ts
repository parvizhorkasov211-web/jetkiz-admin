import { getActionLabel, getEntityTypeLabel } from "./admin-audit.labels";
import type {
  AuditChangeRow,
  AuditLogItem,
  AuditSort,
} from "./admin-audit.types";

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatInteger(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("ru-RU");
}

export function getActorName(item: AuditLogItem): string {
  const user = item.adminUser?.user;

  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user?.email ||
    user?.phone ||
    item.adminUser?.userId ||
    item.adminUserId ||
    "Неизвестный админ"
  );
}

export function getActorSubline(item: AuditLogItem): string {
  const user = item.adminUser?.user;

  return user?.phone || user?.email || item.adminUserId || "—";
}

export function getShortId(value: string | null | undefined): string {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

export function toApiDateTime(value: string): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString();
}

export function buildAuditQuery(params: {
  q: string;
  action: string;
  entityType: string;
  dateFrom: string;
  dateTo: string;
  sort: AuditSort;
  page?: number;
  limit?: number;
  includePagination?: boolean;
}) {
  const query = new URLSearchParams();

  const apiDateFrom = toApiDateTime(params.dateFrom);
  const apiDateTo = toApiDateTime(params.dateTo);

  if (params.q.trim()) query.set("q", params.q.trim());
  if (params.action) query.set("action", params.action);
  if (params.entityType) query.set("entityType", params.entityType);
  if (apiDateFrom) query.set("dateFrom", apiDateFrom);
  if (apiDateTo) query.set("dateTo", apiDateTo);

  query.set("sort", params.sort);

  if (params.includePagination !== false) {
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 20));
  }

  return query.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function getStringField(
  record: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function getNumberField(
  record: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    if (typeof value === "string" && value.trim()) {
      const n = Number(value.trim());

      if (Number.isFinite(n)) {
        return Math.trunc(n);
      }
    }
  }

  return null;
}

function getFullName(record: Record<string, unknown>): string {
  const directName = getStringField(record, [
    "entityName",
    "displayName",
    "name",
    "nameRu",
    "title",
    "titleRu",
    "restaurantName",
    "restaurantNameRu",
    "productName",
    "productNameRu",
    "courierName",
    "customerName",
    "userName",
  ]);

  if (directName) return directName;

  const firstName = getStringField(record, ["firstName", "firstname"]);
  const lastName = getStringField(record, ["lastName", "lastname", "surname"]);

  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function getPhone(record: Record<string, unknown>): string {
  return getStringField(record, [
    "entityPhone",
    "phone",
    "phoneNumber",
    "courierPhone",
    "customerPhone",
    "userPhone",
  ]);
}

function getObjectIdentityFromAudit(item: AuditLogItem): {
  number: number | null;
  name: string;
  phone: string;
} {
  const metadata = getRecord(item.metadata);
  const oldData = getRecord(item.oldData);
  const newData = getRecord(item.newData);

  const metadataUser = getRecord(metadata.user);
  const oldUser = getRecord(oldData.user);
  const newUser = getRecord(newData.user);

  const records = [
    metadata,
    metadataUser,
    newData,
    newUser,
    oldData,
    oldUser,
  ];

  for (const record of records) {
    const number = getNumberField(record, [
      "entityPublicNumber",
      "entityNumber",
      "publicNumber",
      "number",
    ]);

    const name = getFullName(record);
    const phone = getPhone(record);

    if (number || name || phone) {
      return { number, name, phone };
    }
  }

  return { number: null, name: "", phone: "" };
}

function getEntitySingleLabel(entityType: string): string {
  const map: Record<string, string> = {
    AUDIT: "Запись журнала",
    ADMIN_USER: "Администратор",
    AdminUser: "Администратор",
    AdminSession: "Сессия администратора",
    RESTAURANT: "Ресторан",
    PRODUCT: "Товар",
    CATEGORY: "Категория",
    ORDER: "Заказ",
    COURIER: "Курьер",
    CUSTOMER: "Клиент",
    PROMO_CODE: "Промокод",
    FINANCE_CONFIG: "Финансовая настройка",
    RESTAURANT_PAYOUT: "Выплата ресторана",
    COURIER_PAYOUT: "Выплата курьера",
    NOTIFICATION_CAMPAIGN: "Рассылка",
    NOTIFICATION_TEMPLATE: "Шаблон уведомления",
    CMS_BANNER: "Баннер CMS",
    CMS_SETTINGS: "Настройка CMS",
    HOME_CMS: "Главная CMS",
    REVIEW: "Отзыв",
  };

  return map[entityType] ?? getEntityTypeLabel(entityType);
}

function isHiddenChangeKey(key: string): boolean {
  return [
    "id",
    "userId",
    "adminUserId",
    "requestId",
    "sessionId",
    "previousSessionId",
    "deviceId",
    "source",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ].includes(key);
}

function getAllowedKeysByAction(action?: string): Set<string> | null {
  if (!action) return null;

  const value = action.toUpperCase();

  if (value === "COURIER_PAYOUT_UPDATE") {
    return new Set([
      "personalFeeOverride",
      "courierCommissionPctOverride",
      "payoutBonusAdd",
      "amount",
      "comment",
      "fee",
      "pct",
    ]);
  }

  if (value === "COURIER_BLOCK" || value === "COURIER_UNBLOCK") {
    return new Set(["isBlocked", "blocked", "blockedAt", "blockReason"]);
  }

  if (value === "COURIER_UPDATE") {
    return new Set([
      "firstName",
      "lastName",
      "phone",
      "email",
      "iin",
      "addressText",
      "comment",
      "avatarUrl",
      "isOnline",
      "isBlocked",
      "blocked",
      "blockedAt",
      "blockReason",
    ]);
  }

  if (
    value === "RESTAURANT_UPDATE" ||
    value === "RESTAURANT_STATUS_CHANGE" ||
    value === "RESTAURANT_COMMISSION_CHANGE" ||
    value === "RESTAURANT_IN_APP_TOGGLE" ||
    value === "RESTAURANT_ACCEPTING_ORDERS_TOGGLE"
  ) {
    return new Set([
      "nameRu",
      "nameKk",
      "titleRu",
      "titleKk",
      "phone",
      "address",
      "status",
      "isInApp",
      "isActive",
      "acceptingOrders",
      "isAcceptingOrders",
      "restaurantCommissionPctOverride",
      "commissionPct",
    ]);
  }

  if (
    value === "PRODUCT_UPDATE" ||
    value === "PRODUCT_DELETE" ||
    value === "PRODUCT_AVAILABILITY_CHANGE"
  ) {
    return new Set([
      "nameRu",
      "nameKk",
      "titleRu",
      "titleKk",
      "price",
      "isAvailable",
      "isActive",
      "imageUrl",
      "sortOrder",
    ]);
  }

  if (value.includes("PAYOUT") || value.includes("FINANCE")) {
    return new Set([
      "amount",
      "comment",
      "status",
      "fee",
      "pct",
      "commissionPct",
      "personalFeeOverride",
      "courierCommissionPctOverride",
      "restaurantCommissionPctOverride",
      "payoutBonusAdd",
    ]);
  }

  return null;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "number") return value.toLocaleString("ru-RU");

  if (typeof value === "string") {
    const statusMap: Record<string, string> = {
      OPEN: "Открыт",
      CLOSED: "Закрыт",
      ACTIVE: "Активен",
      INACTIVE: "Неактивен",
      BLOCKED: "Заблокирован",
      PAID: "Оплачено",
      PENDING: "Ожидает",
      FAILED: "Ошибка",
      CANCELED: "Отменено",
      CANCELLED: "Отменено",
      true: "Да",
      false: "Нет",
    };

    return statusMap[value] ?? value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getFieldLabel(key: string): string {
  const map: Record<string, string> = {
    number: "Номер",
    firstName: "Имя",
    lastName: "Фамилия",
    email: "Email",
    phone: "Телефон",
    iin: "ИИН",
    addressText: "Адрес",
    comment: "Комментарий",

    status: "Статус",
    isOnline: "Онлайн",
    isBlocked: "Блокировка",
    blocked: "Блокировка",
    blockedAt: "Дата блокировки",
    blockReason: "Причина блокировки",

    isInApp: "Показ в приложении",
    isAvailable: "Доступность",
    isActive: "Активность",
    acceptingOrders: "Приём заказов",
    isAcceptingOrders: "Приём заказов",

    restaurantCommissionPctOverride: "Комиссия ресторана",
    commissionPct: "Комиссия",
    courierCommissionPctOverride: "Комиссия курьера",
    personalFeeOverride: "Персональная выплата",
    payoutBonusAdd: "Бонус к выплате",

    amount: "Сумма",
    fee: "Тариф",
    pct: "Процент",

    nameRu: "Название RU",
    nameKk: "Название KK",
    titleRu: "Название RU",
    titleKk: "Название KK",
    address: "Адрес",
    price: "Цена",
    sortOrder: "Порядок",
    isPinned: "Закреплено",
    useRandom: "Случайный порядок",

    coverImageUrl: "Обложка",
    imageUrl: "Изображение",
    avatarUrl: "Фото",

    visibility: "Видимость",
    isVisible: "Видимость",
    courierId: "Курьер",
    orderId: "Заказ",
    roleCodes: "Роли",
  };

  return map[key] ?? key;
}

export function getChangeRows(
  oldData: unknown,
  newData: unknown,
  action?: string,
): AuditChangeRow[] {
  if (!isRecord(oldData) && !isRecord(newData)) return [];

  const oldRecord = isRecord(oldData) ? oldData : {};
  const newRecord = isRecord(newData) ? newData : {};
  const allowedKeys = getAllowedKeysByAction(action);

  const keys = Array.from(
    new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]),
  );

  return keys
    .filter((key) => !isHiddenChangeKey(key))
    .filter((key) => {
      if (!allowedKeys) return true;
      return allowedKeys.has(key);
    })
    .filter((key) => {
      const oldValue = oldRecord[key];
      const newValue = newRecord[key];

      const oldFormatted = formatValue(oldValue);
      const newFormatted = formatValue(newValue);

      if (oldFormatted === "—" && newFormatted === "—") {
        return false;
      }

      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    })
    .map((key) => ({
      key,
      label: getFieldLabel(key),
      oldValue: formatValue(oldRecord[key]),
      newValue: formatValue(newRecord[key]),
    }));
}

export function getAuditObjectLabel(item: AuditLogItem): string {
  const singleLabel = getEntitySingleLabel(item.entityType);
  const identity = getObjectIdentityFromAudit(item);

  const numberPart = identity.number ? `№${identity.number}` : "";
  const namePart = identity.name ? identity.name : "";
  const phonePart = identity.phone ? identity.phone : "";

  const main = [numberPart, namePart].filter(Boolean).join(" — ");

  if (main && phonePart) {
    return `${singleLabel} ${main}, ${phonePart}`;
  }

  if (main) {
    return `${singleLabel} ${main}`;
  }

  if (phonePart) {
    return `${singleLabel}: ${phonePart}`;
  }

  if (item.entityId) {
    return `${singleLabel} ID: ${item.entityId}`;
  }

  return singleLabel;
}

export function getAuditObjectShortLabel(item: AuditLogItem): string {
  const singleLabel = getEntitySingleLabel(item.entityType);
  const identity = getObjectIdentityFromAudit(item);

  const numberPart = identity.number ? `№${identity.number}` : "";
  const namePart = identity.name ? identity.name : "";
  const phonePart = identity.phone ? identity.phone : "";

  const main = [numberPart, namePart].filter(Boolean).join(" — ");

  if (main) return main;
  if (phonePart) return phonePart;
  if (item.entityId) return `ID: ${getShortId(item.entityId)}`;

  return singleLabel;
}

export function getAuditSummary(item: AuditLogItem): string {
  const actionLabel = getActionLabel(item.action);
  const entityLabel = getEntityTypeLabel(item.entityType);
  const objectLabel = getAuditObjectShortLabel(item);
  const changes = getChangeRows(item.oldData, item.newData, item.action);
  const action = item.action.toUpperCase();

  if (changes.length === 1) {
    const change = changes[0];

    return `${actionLabel}: ${objectLabel}, поле «${change.label}» изменено с «${change.oldValue}» на «${change.newValue}».`;
  }

  if (changes.length > 1) {
    const labels = changes
      .slice(0, 3)
      .map((change) => change.label)
      .join(", ");

    return `${actionLabel}: ${objectLabel}, изменены поля ${labels}.`;
  }

  if (action.includes("EXPORT")) {
    return `${actionLabel}. Администратор сделал выгрузку данных.`;
  }

  if (action.includes("LOGIN")) {
    return `${actionLabel}. Администратор вошёл в систему.`;
  }

  if (action.includes("LOGOUT")) {
    return `${actionLabel}. Администратор завершил работу.`;
  }

  return `${actionLabel} в разделе «${entityLabel}».`;
}

export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;

  if (
    typeof value === "object" &&
    Object.keys(value as Record<string, unknown>).length === 0
  ) {
    return false;
  }

  return true;
}

export function formatJson(value: unknown): string {
  if (!hasValue(value)) return "—";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}