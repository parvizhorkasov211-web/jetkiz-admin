import type {
  CreateNotificationCampaignPayload,
  NotificationCampaignStatus,
  NotificationOpenAction,
  NotificationOpenApp,
  NotificationTargetType,
  OpenOption,
  SendFormState,
} from "./admin-notifications.types";

export const targetLabels: Record<NotificationTargetType, string> = {
  ALL_USERS: "Все пользователи",
  CLIENTS: "Все клиенты",
  CLIENTS_WITH_ORDERS: "Клиенты с заказами",
  CLIENTS_WITHOUT_ORDERS: "Клиенты без заказов",
  CLIENTS_INACTIVE_30D: "Давно не заказывали",
  CLIENTS_MARKETING_OPT_IN: "Согласны получать акции",
  COURIERS: "Курьеры",
  RESTAURANTS: "Рестораны",
  USER_IDS: "Список пользователей",
  PHONE: "Один пользователь",
};

export const statusLabels: Record<NotificationCampaignStatus, string> = {
  DRAFT: "Черновик",
  SENDING: "Отправляется",
  SENT: "Отправлено",
  FAILED: "Ошибка",
  PARTIAL: "Отправлено частично",
  STOPPED: "Остановлено",
};

export const appLabels: Record<NotificationOpenApp, string> = {
  auto: "Своё приложение",
  client: "Клиентское приложение",
  courier: "Приложение курьера",
  restaurant: "Приложение ресторана",
};

export const templateEventLabels: Record<string, string> = {
  ORDER_CREATED: "Заказ создан",
  ORDER_ACCEPTED: "Заказ принят",
  ORDER_COOKING: "Заказ готовится",
  ORDER_READY: "Заказ готов",
  ORDER_ON_THE_WAY: "Курьер в пути",
  ORDER_DELIVERED: "Заказ доставлен",
  ORDER_CANCELED: "Заказ отменён",
};

export const OPEN_OPTIONS: Record<NotificationOpenApp, OpenOption[]> = {
  auto: [
    {
      value: "auto_home",
      label: "Главная в своём приложении",
      app: "auto",
      screen: "home",
    },
    {
      value: "auto_profile",
      label: "Профиль",
      app: "auto",
      screen: "profile",
    },
  ],
  client: [
    {
      value: "client_home",
      label: "Главная",
      app: "client",
      screen: "home",
    },
    {
      value: "client_orders",
      label: "Заказы",
      app: "client",
      screen: "orders",
    },
    {
      value: "client_order",
      label: "Конкретный заказ",
      app: "client",
      screen: "order",
      valueKey: "orderId",
      valueLabel: "Номер заказа или ID заказа",
      valuePlaceholder: "Например: 123",
    },
    {
      value: "client_promos",
      label: "Акции",
      app: "client",
      screen: "promos",
    },
    {
      value: "client_restaurant",
      label: "Ресторан",
      app: "client",
      screen: "restaurant",
      valueKey: "restaurantId",
      valueLabel: "ID ресторана",
      valuePlaceholder: "Введите ID ресторана",
    },
    {
      value: "client_category",
      label: "Категория",
      app: "client",
      screen: "category",
      valueKey: "categoryId",
      valueLabel: "ID или код категории",
      valuePlaceholder: "Например: burgers или category-id",
    },
    {
      value: "client_profile",
      label: "Профиль",
      app: "client",
      screen: "profile",
    },
    {
      value: "client_reviews",
      label: "Отзывы",
      app: "client",
      screen: "reviews",
    },
  ],
  courier: [
    {
      value: "courier_home",
      label: "Главная курьера",
      app: "courier",
      screen: "home",
    },
    {
      value: "courier_available_orders",
      label: "Доступные заказы",
      app: "courier",
      screen: "available_orders",
    },
    {
      value: "courier_active_order",
      label: "Текущий заказ",
      app: "courier",
      screen: "active_order",
    },
    {
      value: "courier_history",
      label: "История доставок",
      app: "courier",
      screen: "history",
    },
    {
      value: "courier_balance",
      label: "Баланс",
      app: "courier",
      screen: "balance",
    },
    {
      value: "courier_profile",
      label: "Профиль",
      app: "courier",
      screen: "profile",
    },
  ],
  restaurant: [
    {
      value: "restaurant_home",
      label: "Главная ресторана",
      app: "restaurant",
      screen: "home",
    },
    {
      value: "restaurant_orders",
      label: "Заказы ресторана",
      app: "restaurant",
      screen: "orders",
    },
    {
      value: "restaurant_order",
      label: "Конкретный заказ",
      app: "restaurant",
      screen: "order",
      valueKey: "orderId",
      valueLabel: "Номер заказа или ID заказа",
      valuePlaceholder: "Например: 123",
    },
    {
      value: "restaurant_menu",
      label: "Меню",
      app: "restaurant",
      screen: "menu",
    },
    {
      value: "restaurant_reviews",
      label: "Отзывы",
      app: "restaurant",
      screen: "reviews",
    },
    {
      value: "restaurant_finance",
      label: "Финансы",
      app: "restaurant",
      screen: "finance",
    },
    {
      value: "restaurant_profile",
      label: "Профиль ресторана",
      app: "restaurant",
      screen: "profile",
    },
  ],
};

export function getDefaultAppByTarget(
  targetType: NotificationTargetType,
): NotificationOpenApp {
  if (
    targetType === "CLIENTS" ||
    targetType === "CLIENTS_WITH_ORDERS" ||
    targetType === "CLIENTS_WITHOUT_ORDERS" ||
    targetType === "CLIENTS_INACTIVE_30D" ||
    targetType === "CLIENTS_MARKETING_OPT_IN"
  ) {
    return "client";
  }

  if (targetType === "COURIERS") return "courier";
  if (targetType === "RESTAURANTS") return "restaurant";
  return "auto";
}

export function getDefaultActionByApp(
  app: NotificationOpenApp,
): NotificationOpenAction {
  return OPEN_OPTIONS[app][0].value;
}

export function getInitialNotificationForm(): SendFormState {
  const app = getDefaultAppByTarget("ALL_USERS");

  return {
    targetType: "ALL_USERS",
    targetPhone: "",
    targetUserIds: "",
    app,
    openAction: getDefaultActionByApp(app),
    openValue: "",
    title: "",
    body: "",
  };
}

export function getOpenOption(
  app: NotificationOpenApp,
  action: NotificationOpenAction,
): OpenOption {
  return OPEN_OPTIONS[app].find((item) => item.value === action) ?? OPEN_OPTIONS[app][0];
}

export function splitUserIds(value: string): string[] {
  return value
    .split(/[\n,;]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validateSendForm(form: SendFormState): string | null {
  const title = form.title.trim();
  const body = form.body.trim();
  const openOption = getOpenOption(form.app, form.openAction);

  if (!title) return "Введите заголовок уведомления";
  if (!body) return "Введите текст уведомления";

  if (form.targetType === "PHONE" && !form.targetPhone.trim()) {
    return "Введите телефон пользователя";
  }

  if (form.targetType === "USER_IDS" && splitUserIds(form.targetUserIds).length === 0) {
    return "Введите список пользователей";
  }

  if (openOption.valueKey && !form.openValue.trim()) {
    return `Заполните поле: ${openOption.valueLabel}`;
  }

  return null;
}

export function buildOpenData(form: SendFormState): Record<string, string> {
  const option = getOpenOption(form.app, form.openAction);

  const data: Record<string, string> = {
    app: option.app,
    screen: option.screen,
  };

  const value = form.openValue.trim();

  if (option.valueKey && value) {
    data[option.valueKey] = value;
  }

  return data;
}

export function buildCampaignPayload(
  form: SendFormState,
): CreateNotificationCampaignPayload {
  const payload: CreateNotificationCampaignPayload = {
    title: form.title.trim(),
    body: form.body.trim(),
    targetType: form.targetType,
    data: buildOpenData(form),
  };

  if (form.targetType === "PHONE") {
    payload.targetPhone = form.targetPhone.trim();
  }

  if (form.targetType === "USER_IDS") {
    payload.targetUserIds = splitUserIds(form.targetUserIds);
  }

  return payload;
}

export function getStatusClass(status: NotificationCampaignStatus): string {
  switch (status) {
    case "SENT":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "SENDING":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "PARTIAL":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "STOPPED":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    case "FAILED":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "DRAFT":
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
