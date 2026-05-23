import type { ActionGroup } from "./admin-audit.types";

export function isInternalAuditAction(action: string): boolean {
  return ["REFRESH"].includes(action.toUpperCase());
}

export function getActionLabel(action: string): string {
  const map: Record<string, string> = {
    LOGIN: "Вход администратора",
    LOGOUT: "Выход администратора",
    LOGOUT_ALL: "Выход со всех устройств",
    SESSION_REVOKE: "Отзыв сессии",

    CREATE_ADMIN: "Создание администратора",
    UPDATE_ADMIN_ROLES: "Изменение ролей администратора",
    DEACTIVATE_ADMIN: "Деактивация администратора",
    REACTIVATE_ADMIN: "Реактивация администратора",

    AUDIT_EXPORT: "Экспорт журнала",

    RESTAURANT_CREATE: "Создание ресторана",
    RESTAURANT_UPDATE: "Изменение ресторана",
    RESTAURANT_STATUS_CHANGE: "Смена статуса ресторана",
    RESTAURANT_COMMISSION_CHANGE: "Изменение комиссии ресторана",
    RESTAURANT_IN_APP_TOGGLE: "Показ ресторана в приложении",
    RESTAURANT_ACCEPTING_ORDERS_TOGGLE: "Приём заказов рестораном",

    PRODUCT_CREATE: "Создание товара",
    PRODUCT_UPDATE: "Изменение товара",
    PRODUCT_DELETE: "Удаление товара",
    PRODUCT_AVAILABILITY_CHANGE: "Доступность товара",

    CATEGORY_CREATE: "Создание категории",
    CATEGORY_UPDATE: "Изменение категории",
    CATEGORY_DELETE: "Удаление категории",

    PROMO_CODE_CREATE: "Создание промокода",
    PROMO_CODE_UPDATE: "Изменение промокода",
    PROMO_CODE_TOGGLE: "Включение/выключение промокода",
    PROMO_CODE_DELETE: "Удаление промокода",

    RESTAURANT_PAYOUT_EXPORT: "Экспорт выплат ресторанов",
    RESTAURANT_PAYOUT_MARK_PAID: "Выплата ресторану оплачена",
    RESTAURANT_PAYOUT_CANCEL: "Отмена выплаты ресторану",

    COURIER_CREATE: "Создание курьера",
    COURIER_UPDATE: "Изменение курьера",
    COURIER_BLOCK: "Блокировка курьера",
    COURIER_UNBLOCK: "Разблокировка курьера",

    COURIER_PAYOUT_MARK_PAID: "Выплата курьеру оплачена",
    COURIER_PAYOUT_CANCEL: "Отмена выплаты курьеру",
    COURIER_PAYOUT_UPDATE: "Изменение выплаты курьера",

    FINANCE_EXPORT: "Экспорт финансов",
    FINANCE_CONFIG_UPDATE: "Изменение финансовых настроек",

    NOTIFICATION_TEMPLATE_UPDATE: "Изменение шаблона уведомлений",
    NOTIFICATION_CAMPAIGN_CREATE: "Создание рассылки",
    NOTIFICATION_CAMPAIGN_START: "Запуск рассылки",
    NOTIFICATION_CAMPAIGN_STOP: "Остановка рассылки",

    HOME_CMS_UPDATE: "Изменение главной страницы",
    CMS_BANNER_CREATE: "Создание баннера",
    CMS_BANNER_UPDATE: "Изменение баннера",
    CMS_BANNER_ARCHIVE: "Архивация баннера",
    CMS_FEATURE_FLAGS_UPDATE: "Изменение feature flags",
    CMS_MAINTENANCE_UPDATE: "Изменение режима обслуживания",
    CMS_SUPPORT_UPDATE: "Изменение поддержки",

    REVIEW_VISIBILITY_UPDATE: "Изменение видимости отзыва",

    ORDER_ASSIGN_COURIER_BY_ADMIN: "Назначение курьера на заказ",
  };

  return map[action] ?? action;
}

export function getEntityTypeLabel(entityType: string): string {
  const map: Record<string, string> = {
    AUDIT: "Журнал действий",
    ADMIN_USER: "Администраторы",
    AdminUser: "Администраторы",
    AdminSession: "Сессии админов",
    RESTAURANT: "Рестораны",
    PRODUCT: "Товары",
    CATEGORY: "Категории",
    ORDER: "Заказы",
    COURIER: "Курьеры",
    CUSTOMER: "Клиенты",
    PROMO_CODE: "Промокоды",
    FINANCE_CONFIG: "Финансовые настройки",
    RESTAURANT_PAYOUT: "Выплаты ресторанов",
    COURIER_PAYOUT: "Выплаты курьеров",
    NOTIFICATION_CAMPAIGN: "Рассылки",
    NOTIFICATION_TEMPLATE: "Шаблоны уведомлений",
    CMS_BANNER: "Баннеры CMS",
    CMS_SETTINGS: "Настройки CMS",
    HOME_CMS: "Главная CMS",
    REVIEW: "Отзывы",
  };

  return map[entityType] ?? entityType;
}

export function getActionGroupLabel(group: ActionGroup): string {
  const map: Record<ActionGroup, string> = {
    all: "Все типы",
    auth: "Входы / сессии",
    create: "Создание",
    update: "Изменение",
    delete: "Удаление / архивация",
    export: "Экспорт",
    block: "Блокировки / доступ",
    finance: "Финансы",
    content: "Контент / CMS / уведомления",
  };

  return map[group];
}

export function getActionTone(action: string): string {
  const value = action.toUpperCase();

  if (
    value.includes("DELETE") ||
    value.includes("BLOCK") ||
    value.includes("CANCEL") ||
    value.includes("ARCHIVE") ||
    value.includes("DEACTIVATE")
  ) {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
  }

  if (
    value.includes("CREATE") ||
    value.includes("START") ||
    value.includes("UNBLOCK") ||
    value.includes("REACTIVATE")
  ) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (value.includes("EXPORT")) {
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
  }

  if (value.includes("LOGIN")) {
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }

  return "bg-violet-50 text-violet-700 ring-1 ring-violet-100";
}

export function getActionsByGroup(
  group: ActionGroup,
  allActions: string[],
): string[] {
  const visibleActions = allActions.filter(
    (action) => !isInternalAuditAction(action),
  );

  if (group === "all") return visibleActions;

  return visibleActions.filter((action) => {
    const value = action.toUpperCase();

    if (group === "auth") {
      return ["LOGIN", "LOGOUT", "LOGOUT_ALL", "SESSION_REVOKE"].includes(
        value,
      );
    }

    if (group === "create") return value.includes("CREATE");

    if (group === "update") {
      return (
        value.includes("UPDATE") ||
        value.includes("CHANGE") ||
        value.includes("TOGGLE")
      );
    }

    if (group === "delete") {
      return (
        value.includes("DELETE") ||
        value.includes("ARCHIVE") ||
        value.includes("CANCEL")
      );
    }

    if (group === "export") return value.includes("EXPORT");

    if (group === "block") {
      return (
        value.includes("BLOCK") ||
        value.includes("UNBLOCK") ||
        value.includes("DEACTIVATE") ||
        value.includes("REACTIVATE")
      );
    }

    if (group === "finance") {
      return (
        value.includes("PAYOUT") ||
        value.includes("FINANCE") ||
        value.includes("COMMISSION")
      );
    }

    if (group === "content") {
      return (
        value.includes("CMS") ||
        value.includes("NOTIFICATION") ||
        value.includes("BANNER") ||
        value.includes("REVIEW") ||
        value.includes("PROMO")
      );
    }

    return true;
  });
}

export function actionMatchesGroup(action: string, group: ActionGroup): boolean {
  if (isInternalAuditAction(action)) return false;

  return getActionsByGroup(group, [action]).length > 0;
}
