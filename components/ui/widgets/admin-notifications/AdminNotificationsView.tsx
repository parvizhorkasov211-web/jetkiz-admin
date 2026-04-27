"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bookmark,
  Clock3,
  Eye,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  XCircle,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import type {
  CampaignsListResponse,
  NotificationCampaign,
  NotificationCampaignDetail,
  NotificationCampaignStatus,
  NotificationTargetType,
  NotificationTemplate,
  TemplatesListResponse,
} from "./admin-notifications.types";

type TabKey = "new" | "templates" | "history";

type NotificationOpenApp = "auto" | "client" | "courier" | "restaurant";

type NotificationOpenAction =
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

type SendFormState = {
  targetType: NotificationTargetType;
  targetPhone: string;
  targetUserIds: string;
  app: NotificationOpenApp;
  openAction: NotificationOpenAction;
  openValue: string;
  title: string;
  body: string;
};

type OpenOption = {
  value: NotificationOpenAction;
  label: string;
  app: NotificationOpenApp;
  screen: string;
  valueKey?: string;
  valueLabel?: string;
  valuePlaceholder?: string;
};

type CampaignPayload = {
  title: string;
  body: string;
  targetType: NotificationTargetType;
  targetPhone?: string;
  targetUserIds?: string[];
  data: Record<string, string>;
};

const targetLabels: Record<NotificationTargetType, string> = {
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

const statusLabels: Record<NotificationCampaignStatus, string> = {
  DRAFT: "Черновик",
  SENDING: "Отправляется",
  SENT: "Отправлено",
  FAILED: "Ошибка",
  PARTIAL: "Отправлено частично",
  STOPPED: "Остановлено",
};

const appLabels: Record<NotificationOpenApp, string> = {
  auto: "Своё приложение",
  client: "Клиентское приложение",
  courier: "Приложение курьера",
  restaurant: "Приложение ресторана",
};

const templateEventLabels: Record<string, string> = {
  ORDER_CREATED: "Заказ создан",
  ORDER_ACCEPTED: "Заказ принят",
  ORDER_COOKING: "Заказ готовится",
  ORDER_READY: "Заказ готов",
  ORDER_ON_THE_WAY: "Курьер в пути",
  ORDER_DELIVERED: "Заказ доставлен",
  ORDER_CANCELED: "Заказ отменён",
};

const OPEN_OPTIONS: Record<NotificationOpenApp, OpenOption[]> = {
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

function getDefaultAppByTarget(
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

function getDefaultActionByApp(app: NotificationOpenApp): NotificationOpenAction {
  return OPEN_OPTIONS[app][0].value;
}

function getInitialForm(): SendFormState {
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

function getOpenOption(
  app: NotificationOpenApp,
  action: NotificationOpenAction,
): OpenOption {
  return (
    OPEN_OPTIONS[app].find((item) => item.value === action) ??
    OPEN_OPTIONS[app][0]
  );
}

function splitUserIds(value: string): string[] {
  return value
    .split(/[\n,;]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildOpenData(form: SendFormState): Record<string, string> {
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

function buildPayload(form: SendFormState): CampaignPayload {
  const payload: CampaignPayload = {
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

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    if (error.message.includes("No recipients found")) {
      return "В выбранной группе нет получателей";
    }

    return error.message;
  }

  return fallback;
}

function formatDate(value?: string | null): string {
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

function getStatusClass(status: NotificationCampaignStatus): string {
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

function StatusBadge({ status }: { status: NotificationCampaignStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusClass(
        status,
      )}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function StatCard(props: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  tone: "violet" | "amber" | "emerald";
}) {
  const toneClass =
    props.tone === "violet"
      ? "bg-violet-100 text-violet-700"
      : props.tone === "amber"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${toneClass}`}>
          {props.icon}
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-600">{props.title}</div>
          <div className="mt-1 text-2xl font-bold text-slate-950">{props.value}</div>
          <div className="mt-1 text-xs text-slate-500">{props.subtitle}</div>
        </div>
      </div>
    </div>
  );
}

export function AdminNotificationsView() {
  const [activeTab, setActiveTab] = useState<TabKey>("new");

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [campaignTotal, setCampaignTotal] = useState(0);

  const [selectedCampaign, setSelectedCampaign] =
    useState<NotificationCampaignDetail | null>(null);

  const [form, setForm] = useState<SendFormState>(getInitialForm());
  const [templateDrafts, setTemplateDrafts] = useState<
    Record<string, { title: string; body: string; isActive: boolean }>
  >({});

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingTemplateCode, setSavingTemplateCode] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);

      const templatesJson = (await apiFetch("/admin/notifications/templates", {
        method: "GET",
        cache: "no-store",
      })) as TemplatesListResponse;

      const campaignsJson = (await apiFetch(
        "/admin/notifications/campaigns?page=1&limit=20",
        {
          method: "GET",
          cache: "no-store",
        },
      )) as CampaignsListResponse;

      const nextTemplates = Array.isArray(templatesJson.items)
        ? templatesJson.items
        : [];

      const nextCampaigns = Array.isArray(campaignsJson.items)
        ? campaignsJson.items
        : [];

      setTemplates(nextTemplates);
      setCampaigns(nextCampaigns);
      setCampaignTotal(Number(campaignsJson.meta?.total ?? nextCampaigns.length) || 0);

      const drafts: Record<
        string,
        { title: string; body: string; isActive: boolean }
      > = {};

      for (const template of nextTemplates) {
        drafts[template.code] = {
          title: template.title,
          body: template.body,
          isActive: Boolean(template.isActive),
        };
      }

      setTemplateDrafts(drafts);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Не удалось загрузить уведомления"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const sendingCount = useMemo(() => {
    return campaigns.filter((item) => item.status === "SENDING").length;
  }, [campaigns]);

  const firstSendingCampaign = useMemo(() => {
    return campaigns.find((item) => item.status === "SENDING") ?? null;
  }, [campaigns]);

  const currentOpenOption = getOpenOption(form.app, form.openAction);
  const currentOpenOptions = OPEN_OPTIONS[form.app];

  const previewTitle = form.title.trim() || "Скидка 20% на любимые блюда!";
  const previewBody =
    form.body.trim() ||
    "Только сегодня заказывайте вкусное и экономьте вместе с JETKIZ.";

  function validateForm(): boolean {
    const title = form.title.trim();
    const body = form.body.trim();
    const option = getOpenOption(form.app, form.openAction);

    if (!title) {
      setError("Введите заголовок уведомления");
      return false;
    }

    if (!body) {
      setError("Введите текст уведомления");
      return false;
    }

    if (form.targetType === "PHONE" && !form.targetPhone.trim()) {
      setError("Введите телефон пользователя");
      return false;
    }

    if (form.targetType === "USER_IDS" && splitUserIds(form.targetUserIds).length === 0) {
      setError("Введите список пользователей");
      return false;
    }

    if (option.valueKey && !form.openValue.trim()) {
      setError(`Заполните поле: ${option.valueLabel}`);
      return false;
    }

    return true;
  }

  function updateTargetType(nextTargetType: NotificationTargetType) {
    const nextApp = getDefaultAppByTarget(nextTargetType);
    const nextAction = getDefaultActionByApp(nextApp);

    setForm((prev) => ({
      ...prev,
      targetType: nextTargetType,
      app: nextApp,
      openAction: nextAction,
      openValue: "",
      targetPhone: nextTargetType === "PHONE" ? prev.targetPhone : "",
      targetUserIds: nextTargetType === "USER_IDS" ? prev.targetUserIds : "",
    }));
  }

  function updateApp(nextApp: NotificationOpenApp) {
    const nextAction = getDefaultActionByApp(nextApp);

    setForm((prev) => ({
      ...prev,
      app: nextApp,
      openAction: nextAction,
      openValue: "",
    }));
  }

  function updateOpenAction(nextAction: NotificationOpenAction) {
    setForm((prev) => ({
      ...prev,
      openAction: nextAction,
      openValue: "",
    }));
  }

  async function handleSend() {
    if (!validateForm()) return;

    try {
      setSending(true);
      setError(null);
      setNotice(null);

      await apiFetch("/admin/notifications/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(form)),
      });

      setNotice("Отправка создана");
      setForm(getInitialForm());
      await loadAll();
      setActiveTab("history");
    } catch (sendError) {
      setError(getErrorMessage(sendError, "Не удалось отправить уведомление"));
    } finally {
      setSending(false);
    }
  }

  async function handleSaveDraft() {
    if (!validateForm()) return;

    try {
      setSending(true);
      setError(null);
      setNotice(null);

      await apiFetch("/admin/notifications/campaigns/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(form)),
      });

      setNotice("Черновик сохранён");
      setForm(getInitialForm());
      await loadAll();
      setActiveTab("history");
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Не удалось сохранить черновик"));
    } finally {
      setSending(false);
    }
  }

  async function handleSendDraft(campaign: NotificationCampaign) {
    if (campaign.status !== "DRAFT") return;

    const confirmed = window.confirm("Запустить отправку этого черновика?");
    if (!confirmed) return;

    try {
      setError(null);
      setNotice(null);

      await apiFetch(
        `/admin/notifications/campaigns/${encodeURIComponent(campaign.id)}/send`,
        {
          method: "POST",
        },
      );

      setNotice("Черновик запущен");
      await loadAll();
    } catch (sendDraftError) {
      setError(getErrorMessage(sendDraftError, "Не удалось запустить черновик"));
    }
  }

  async function handleStopCampaign(campaign: NotificationCampaign) {
    if (campaign.status !== "SENDING") return;

    const confirmed = window.confirm(
      "Остановить отправку?\n\nУведомления, которые уже отправлены, останутся у пользователей. Остальным пользователям сообщение больше не отправится.",
    );

    if (!confirmed) return;

    try {
      setError(null);
      setNotice(null);

      await apiFetch(
        `/admin/notifications/campaigns/${encodeURIComponent(campaign.id)}/stop`,
        {
          method: "POST",
        },
      );

      setNotice("Отправка остановлена");
      await loadAll();
    } catch (stopError) {
      setError(getErrorMessage(stopError, "Не удалось остановить отправку"));
    }
  }

  async function handleSaveTemplate(code: string) {
    const draft = templateDrafts[code];

    if (!draft) return;

    if (!draft.title.trim()) {
      setError("Введите заголовок автоуведомления");
      return;
    }

    if (!draft.body.trim()) {
      setError("Введите текст автоуведомления");
      return;
    }

    try {
      setSavingTemplateCode(code);
      setError(null);
      setNotice(null);

      await apiFetch(`/admin/notifications/templates/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: draft.title.trim(),
          body: draft.body.trim(),
          isActive: draft.isActive,
        }),
      });

      setNotice("Автоуведомление сохранено");
      await loadAll();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Не удалось сохранить автоуведомление"));
    } finally {
      setSavingTemplateCode(null);
    }
  }

  async function handleOpenCampaign(id: string) {
    try {
      setError(null);

      const detail = (await apiFetch(
        `/admin/notifications/campaigns/${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      )) as NotificationCampaignDetail;

      setSelectedCampaign(detail);
    } catch (detailError) {
      setError(getErrorMessage(detailError, "Не удалось открыть отправку"));
    }
  }

  function handleRepeat(campaign: NotificationCampaign) {
    const data = campaign.data ?? {};
    const rawApp = String(data.app ?? "auto");

    const app: NotificationOpenApp =
      rawApp === "client" ||
      rawApp === "courier" ||
      rawApp === "restaurant" ||
      rawApp === "auto"
        ? rawApp
        : getDefaultAppByTarget(campaign.targetType);

    const screen = String(data.screen ?? "");
    const option =
      OPEN_OPTIONS[app].find((item) => item.screen === screen) ?? OPEN_OPTIONS[app][0];

    const value =
      option.valueKey && typeof data[option.valueKey] === "string"
        ? String(data[option.valueKey])
        : "";

    setForm({
      targetType: campaign.targetType,
      targetPhone: campaign.targetPhone ?? "",
      targetUserIds: Array.isArray(campaign.targetUserIds)
        ? campaign.targetUserIds.join("\n")
        : "",
      app,
      openAction: option.value,
      openValue: value,
      title: campaign.title,
      body: campaign.body,
    });

    setActiveTab("new");
    setNotice("Данные скопированы в новую отправку");
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Уведомления</h1>
          <p className="mt-1 text-sm text-slate-500">
            Отправка сообщений пользователям и настройка стандартных уведомлений
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Обновить
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            <Send size={16} />
            Новая отправка
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StatCard
          title="Всего отправок"
          value={campaignTotal}
          subtitle="за всё время"
          tone="violet"
          icon={<Send size={22} />}
        />

        <StatCard
          title="Отправляется"
          value={sendingCount}
          subtitle="сейчас"
          tone="amber"
          icon={<Clock3 size={22} />}
        />

        <StatCard
          title="Готовые шаблоны"
          value={templates.length}
          subtitle="автоуведомлений"
          tone="emerald"
          icon={<Bookmark size={22} />}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex border-b border-slate-200 px-4">
          {[
            { key: "new" as const, label: "Новая отправка" },
            { key: "templates" as const, label: "Автоуведомления" },
            { key: "history" as const, label: "История" },
          ].map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "relative px-4 py-4 text-sm font-semibold",
                  active
                    ? "text-violet-700"
                    : "text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                {tab.label}

                {active ? (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />
                ) : null}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Загрузка…</div>
        ) : null}

        {!loading && activeTab === "new" ? (
          <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Кому отправить
                  </label>

                  <select
                    value={form.targetType}
                    onChange={(event) =>
                      updateTargetType(event.target.value as NotificationTargetType)
                    }
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-500"
                  >
                    <option value="ALL_USERS">Все пользователи</option>
                    <option value="CLIENTS">Все клиенты</option>
                    <option value="CLIENTS_WITH_ORDERS">Клиенты с заказами</option>
                    <option value="CLIENTS_WITHOUT_ORDERS">Клиенты без заказов</option>
                    <option value="CLIENTS_INACTIVE_30D">Давно не заказывали</option>
                    <option value="CLIENTS_MARKETING_OPT_IN">Согласны получать акции</option>
                    <option value="COURIERS">Курьеры</option>
                    <option value="RESTAURANTS">Рестораны</option>
                    <option value="PHONE">Один пользователь</option>
                    <option value="USER_IDS">Список пользователей</option>
                  </select>
                </div>

                {form.targetType === "PHONE" || form.targetType === "USER_IDS" ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Какое приложение открыть
                    </label>

                    <select
                      value={form.app}
                      onChange={(event) =>
                        updateApp(event.target.value as NotificationOpenApp)
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-500"
                    >
                      <option value="auto">Своё приложение пользователя</option>
                      <option value="client">Клиентское приложение</option>
                      <option value="courier">Приложение курьера</option>
                      <option value="restaurant">Приложение ресторана</option>
                    </select>
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    Откроется: {" "}
                    <b className="text-slate-900">
                      {appLabels[getDefaultAppByTarget(form.targetType)]}
                    </b>
                  </div>
                )}

                {form.targetType === "PHONE" ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Телефон пользователя
                    </label>

                    <input
                      value={form.targetPhone}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          targetPhone: event.target.value,
                        }))
                      }
                      placeholder="+77000000000"
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-violet-500"
                    />
                  </div>
                ) : null}

                {form.targetType === "USER_IDS" ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Список пользователей
                    </label>

                    <textarea
                      value={form.targetUserIds}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          targetUserIds: event.target.value,
                        }))
                      }
                      placeholder="Каждого пользователя с новой строки"
                      rows={4}
                      className="w-full resize-none rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-500"
                    />
                  </div>
                ) : null}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-semibold text-slate-700">
                      Заголовок
                    </label>
                    <span className="text-xs text-slate-400">
                      {form.title.length} / 120
                    </span>
                  </div>

                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        title: event.target.value.slice(0, 120),
                      }))
                    }
                    placeholder="Введите заголовок уведомления"
                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-semibold text-slate-700">
                      Текст уведомления
                    </label>
                    <span className="text-xs text-slate-400">
                      {form.body.length} / 1000
                    </span>
                  </div>

                  <textarea
                    value={form.body}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        body: event.target.value.slice(0, 1000),
                      }))
                    }
                    placeholder="Введите текст уведомления"
                    rows={5}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Куда открыть после нажатия
                  </label>

                  <select
                    value={form.openAction}
                    onChange={(event) =>
                      updateOpenAction(event.target.value as NotificationOpenAction)
                    }
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-500"
                  >
                    {currentOpenOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {currentOpenOption.valueKey ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {currentOpenOption.valueLabel}
                    </label>

                    <input
                      value={form.openValue}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          openValue: event.target.value,
                        }))
                      }
                      placeholder={currentOpenOption.valuePlaceholder}
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-violet-500"
                    />
                  </div>
                ) : null}

                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                  Умные группы клиентов теперь работают через backend. Телефонный push уйдёт только тем, у кого приложение уже зарегистрировало push-token.
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => void handleSend()}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send size={16} />
                    {sending ? "Отправляем…" : "Отправить"}
                  </button>

                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => void handleSaveDraft()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={16} />
                    Сохранить черновик
                  </button>

                  <button
                    type="button"
                    disabled={!firstSendingCampaign || sending}
                    onClick={() => {
                      if (firstSendingCampaign) {
                        void handleStopCampaign(firstSendingCampaign);
                      }
                    }}
                    title={
                      firstSendingCampaign
                        ? "Остановить текущую отправку"
                        : "Сейчас нет активной отправки"
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <XCircle size={16} />
                    Остановить отправку
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-4 text-sm font-bold text-slate-900">
                  Что увидят пользователи
                </div>

                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-bold text-white">
                        JETKIZ
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-semibold text-slate-950">
                            {previewTitle}
                          </div>
                          <div className="shrink-0 text-xs text-slate-400">
                            сейчас
                          </div>
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                          {previewBody}
                        </div>

                        <div className="mt-2 text-xs text-slate-400">JETKIZ</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  После нажатия: {" "}
                  <b className="text-slate-900">{appLabels[form.app]}</b> → {" "}
                  <b className="text-slate-900">{currentOpenOption.label}</b>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-4 text-sm font-bold text-slate-900">
                  Состояние отправки
                </div>

                <div className="space-y-3 text-sm">
                  {[
                    {
                      label: "Черновик",
                      text: "Сообщение сохранено, но не отправляется",
                      badge: "Черновик",
                      cls: "bg-slate-100 text-slate-700",
                    },
                    {
                      label: "Отправляется",
                      text: "Сообщение в процессе отправки",
                      badge: "Отправляется",
                      cls: "bg-blue-100 text-blue-700",
                    },
                    {
                      label: "Отправлено",
                      text: "Все получатели успешно получили сообщение",
                      badge: "Отправлено",
                      cls: "bg-emerald-100 text-emerald-700",
                    },
                    {
                      label: "Отправлено частично",
                      text: "Сообщение отправлено не всем получателям",
                      badge: "Частично",
                      cls: "bg-amber-100 text-amber-700",
                    },
                    {
                      label: "Остановлено",
                      text: "Отправка была остановлена вручную",
                      badge: "Остановлено",
                      cls: "bg-orange-100 text-orange-700",
                    },
                    {
                      label: "Ошибка",
                      text: "Произошла ошибка при отправке",
                      badge: "Ошибка",
                      cls: "bg-rose-100 text-rose-700",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="grid grid-cols-[140px_1fr_auto] items-center gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="font-semibold text-slate-800">
                        {item.label}
                      </div>
                      <div className="text-slate-500">{item.text}</div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.cls}`}
                      >
                        {item.badge}
                      </span>
                    </div>
                  ))}
                </div>

                {firstSendingCampaign ? (
                  <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                    Отправлено: {firstSendingCampaign.sentCount} из {" "}
                    {firstSendingCampaign.recipientsCount}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "templates" ? (
          <div className="p-4">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Событие</th>
                    <th className="px-4 py-3 text-left">Заголовок</th>
                    <th className="px-4 py-3 text-left">Текст</th>
                    <th className="px-4 py-3 text-left">Включено</th>
                    <th className="px-4 py-3 text-right">Действие</th>
                  </tr>
                </thead>

                <tbody>
                  {templates.map((template) => {
                    const draft = templateDrafts[template.code] ?? {
                      title: template.title,
                      body: template.body,
                      isActive: template.isActive,
                    };

                    return (
                      <tr key={template.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {templateEventLabels[template.code] ?? template.title}
                        </td>

                        <td className="px-4 py-3">
                          <input
                            value={draft.title}
                            onChange={(event) =>
                              setTemplateDrafts((prev) => ({
                                ...prev,
                                [template.code]: {
                                  ...draft,
                                  title: event.target.value,
                                },
                              }))
                            }
                            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-violet-500"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <textarea
                            value={draft.body}
                            onChange={(event) =>
                              setTemplateDrafts((prev) => ({
                                ...prev,
                                [template.code]: {
                                  ...draft,
                                  body: event.target.value,
                                },
                              }))
                            }
                            rows={2}
                            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={draft.isActive}
                              onChange={(event) =>
                                setTemplateDrafts((prev) => ({
                                  ...prev,
                                  [template.code]: {
                                    ...draft,
                                    isActive: event.target.checked,
                                  },
                                }))
                              }
                              className="h-4 w-4"
                            />
                            Да
                          </label>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={savingTemplateCode === template.code}
                            onClick={() => void handleSaveTemplate(template.code)}
                            className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                          >
                            {savingTemplateCode === template.code
                              ? "Сохраняем…"
                              : "Сохранить"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {templates.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Автоуведомления не найдены
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "history" ? (
          <div className="p-4">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-4">
                <div className="text-sm font-bold text-slate-900">
                  Последние отправки
                </div>
              </div>

              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Дата</th>
                    <th className="px-4 py-3 text-left">Кому</th>
                    <th className="px-4 py-3 text-left">Заголовок</th>
                    <th className="px-4 py-3 text-left">Статус</th>
                    <th className="px-4 py-3 text-left">Отправлено</th>
                    <th className="px-4 py-3 text-left">Не отправлено</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>

                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(campaign.createdAt)}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800">
                        {targetLabels[campaign.targetType]}
                      </td>

                      <td className="max-w-[360px] truncate px-4 py-3 text-slate-900">
                        {campaign.title}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={campaign.status} />
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {campaign.sentCount}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {campaign.failedCount + campaign.skippedCount}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void handleOpenCampaign(campaign.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Eye size={14} />
                            Подробнее
                          </button>

                          {campaign.status === "DRAFT" ? (
                            <button
                              type="button"
                              onClick={() => void handleSendDraft(campaign)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              <Send size={14} />
                              Запустить
                            </button>
                          ) : null}

                          {campaign.status === "SENDING" ? (
                            <button
                              type="button"
                              onClick={() => void handleStopCampaign(campaign)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              <XCircle size={14} />
                              Остановить
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleRepeat(campaign)}
                            className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                          >
                            <RotateCcw size={14} />
                            Повторить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {campaigns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Отправок пока нет
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                Показано {campaigns.length} из {campaignTotal}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {selectedCampaign ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40">
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <div className="text-lg font-bold text-slate-950">
                  {selectedCampaign.title}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {formatDate(selectedCampaign.createdAt)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Закрыть
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 text-sm font-bold text-slate-900">
                  Информация
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div>
                    Кому: {" "}
                    <b className="text-slate-900">
                      {targetLabels[selectedCampaign.targetType]}
                    </b>
                  </div>
                  <div>
                    Статус: <StatusBadge status={selectedCampaign.status} />
                  </div>
                  <div>
                    Отправлено: {" "}
                    <b className="text-slate-900">{selectedCampaign.sentCount}</b>
                  </div>
                  <div>
                    Не отправлено: {" "}
                    <b className="text-slate-900">
                      {selectedCampaign.failedCount + selectedCampaign.skippedCount}
                    </b>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 text-sm font-bold text-slate-900">Текст</div>
                <div className="text-sm font-semibold text-slate-900">
                  {selectedCampaign.title}
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {selectedCampaign.body}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 text-sm font-bold text-slate-900">
                  Получатели
                </div>

                <div className="space-y-2">
                  {(selectedCampaign.recipients ?? [])
                    .slice(0, 50)
                    .map((recipient) => {
                      const name = [
                        recipient.user?.firstName,
                        recipient.user?.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <div
                          key={recipient.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-sm"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">
                              {name || recipient.user?.phone || recipient.userId}
                            </div>
                            <div className="text-xs text-slate-500">
                              {recipient.user?.phone ?? recipient.userId}
                            </div>
                          </div>

                          <div className="text-xs font-semibold text-slate-500">
                            {recipient.status}
                          </div>
                        </div>
                      );
                    })}

                  {(selectedCampaign.recipients ?? []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      Получатели не найдены
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


