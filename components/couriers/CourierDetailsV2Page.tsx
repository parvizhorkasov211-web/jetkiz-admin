"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Copy,
  Edit3,
  KeyRound,
  Loader2,
  Power,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";

type TabKey = "overview" | "orders" | "finance" | "access" | "audit";

type AdminLike = {
  roleCodes?: string[];
  roles?: string[];
  permissionCodes?: string[];
  permissions?: string[];
} | null;

type AddressInfo = {
  title?: string | null;
  address?: string | null;
  floor?: string | null;
  door?: string | null;
  entrance?: string | null;
};

type OrderRow = {
  id: string;
  number?: number | null;
  status: string;
  total?: number | null;
  createdAt?: string | null;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  courierFeeGross?: number | null;
  courierCommissionAmount?: number | null;
  courierFee?: number | null;
  address?: AddressInfo | null;
  restaurant?: {
    id?: string | null;
    nameRu?: string | null;
    nameKk?: string | null;
  } | null;
};

type Courier = {
  id: string;
  userId: string;
  number?: number | null;
  phone: string;
  isActive: boolean;
  userBlockedAt?: string | null;
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  iin?: string | null;
  sensitiveAccess?: boolean;
  addressText?: string | null;
  comment?: string | null;
  blockedAt?: string | null;
  blockReason?: string | null;
  isOnline: boolean;
  personalFeeOverride?: number | null;
  payoutBonusAdd?: number | null;
  courierCommissionPctOverride?: number | null;
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
  lastAssignedAt?: string | null;
  mustChangePassword?: boolean | null;
  temporaryPasswordExpiresAt?: string | null;
  passwordUpdatedAt?: string | null;
  failedPasswordLoginCount?: number | null;
  lastPasswordLoginFailedAt?: string | null;
  passwordLockedUntil?: string | null;
  lastLoginAt?: string | null;
  activeOrders?: OrderRow[];
  recentCompletedOrders?: OrderRow[];
};

type FinanceSummary = {
  totalIncome?: number;
  totalPayout?: number;
  balance?: number;
  deliveredOrdersCount?: number;
  grossAmount?: number;
  commissionAmount?: number;
  accruedPayoutAmount?: number;
  pendingPayoutAmount?: number;
  paidPayoutAmount?: number;
  unpaidButAssignedAmount?: number;
};

type LedgerEntry = {
  id: string;
  type: string;
  amount: number;
  comment?: string | null;
  createdAt: string;
};

type LedgerResponse = {
  total?: number;
  page?: number;
  limit?: number;
  items?: LedgerEntry[];
};

type Payout = {
  id: string;
  courierUserId: string;
  periodFrom: string;
  periodTo: string;
  ordersCount?: number | null;
  grossAmount?: number | null;
  commissionAmount?: number | null;
  payoutAmount?: number | null;
  status: "PENDING" | "PAID" | "CANCELED" | string;
  paidAt?: string | null;
  note?: string | null;
  paymentReference?: string | null;
  paymentComment?: string | null;
  createdAt?: string | null;
};

type AuditItem = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: unknown;
  newData?: unknown;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  adminUser?: {
    user?: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
  } | null;
};

type AuditResponse = {
  total?: number;
  page?: number;
  limit?: number;
  items?: AuditItem[];
};

type PasswordResetResult = {
  temporaryPassword?: string;
  temporaryPasswordExpiresAt?: string | null;
};

type DialogKind =
  | "edit"
  | "block"
  | "unblock"
  | "forceOffline"
  | "resetPassword"
  | "createPayout"
  | "payPayout"
  | null;

type DialogState = {
  kind: DialogKind;
  payout?: Payout | null;
};

type EditForm = {
  firstName: string;
  lastName: string;
  phone: string;
  iin: string;
  addressText: string;
  comment: string;
  personalFeeOverride: string;
  payoutBonusAdd: string;
  courierCommissionPctOverride: string;
};

const emptyEditForm: EditForm = {
  firstName: "",
  lastName: "",
  phone: "",
  iin: "",
  addressText: "",
  comment: "",
  personalFeeOverride: "",
  payoutBonusAdd: "",
  courierCommissionPctOverride: "",
};

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function hasPermission(admin: AdminLike, permission: string): boolean {
  const roles = [...list(admin?.roleCodes), ...list(admin?.roles)];
  const permissions = [
    ...list(admin?.permissionCodes),
    ...list(admin?.permissions),
  ];

  return (
    roles.includes("SUPER_ADMIN") ||
    permissions.includes("admin.full_access") ||
    permissions.includes(permission)
  );
}

function formatName(courier?: Courier | null): string {
  const name = [courier?.firstName, courier?.lastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return name || "Без имени";
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function inputDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfMonthInput(): string {
  const now = new Date();
  return inputDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function todayInput(): string {
  return inputDate(new Date());
}

function toAlmatyDateTime(date: string, endOfDay = false): string {
  return `${date}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:00`;
}

function formatMoney(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString("ru-RU")} ₸`;
}

function formatPercent(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}%`;
}

function formatAddress(address?: AddressInfo | null): string {
  if (!address) return "-";
  return [
    address.title,
    address.address,
    address.entrance ? `подъезд ${address.entrance}` : null,
    address.floor ? `этаж ${address.floor}` : null,
    address.door ? `дверь ${address.door}` : null,
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(", ") || "-";
}

function statusLabel(courier: Courier): string {
  if (!courier.isActive || courier.blockedAt || courier.userBlockedAt) {
    return "Заблокирован";
  }
  if ((courier.activeOrders ?? []).length > 0) return "В заказе";
  if (courier.isOnline) return "На линии";
  return "Оффлайн";
}

function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    CREATED: "Создан",
    ACCEPTED: "Принят",
    COOKING: "Готовится",
    READY: "Готов",
    ON_THE_WAY: "В пути",
    DELIVERED: "Доставлен",
    REJECTED: "Отклонён",
    CANCELED: "Отменён",
    PAID: "Оплачен",
  };
  return map[status] ?? status;
}

function payoutStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Ожидает оплаты",
    PAID: "Оплачена",
    CANCELED: "Отменена",
  };
  return map[status] ?? status;
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    COURIER_CREATE: "Создание курьера",
    COURIER_UPDATE: "Редактирование",
    COURIER_BLOCK: "Блокировка",
    COURIER_UNBLOCK: "Разблокировка",
    COURIER_FORCE_OFFLINE: "Вывод с линии",
    COURIER_PASSWORD_RESET: "Сброс пароля",
    COURIER_EXPORT: "Экспорт",
    COURIER_PAYOUT_CREATE: "Создание выплаты",
    COURIER_PAYOUT_MARK_PAID: "Выплата отмечена оплаченной",
    COURIER_PAYOUT_UPDATE: "Финансовые условия",
  };
  return map[action] ?? action;
}

function assetUrl(value?: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/uploads/")) return `/api/proxy${value}`;
  return value;
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function activeOrdersFromError(error: unknown): OrderRow[] {
  const payload = (error as { payload?: unknown })?.payload;
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const message = record.message;
  if (message && typeof message === "object") {
    const activeOrders = (message as Record<string, unknown>).activeOrders;
    return Array.isArray(activeOrders) ? (activeOrders as OrderRow[]) : [];
  }

  const activeOrders = record.activeOrders;
  return Array.isArray(activeOrders) ? (activeOrders as OrderRow[]) : [];
}

export function CourierDetailsV2Page() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const courierUserId = String(params?.id ?? "");

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [admin, setAdmin] = useState<AdminLike>(null);
  const [courier, setCourier] = useState<Courier | null>(null);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [blockingOrders, setBlockingOrders] = useState<OrderRow[]>([]);
  const [dialog, setDialog] = useState<DialogState>({ kind: null });
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [blockReason, setBlockReason] = useState("");
  const [passwordResult, setPasswordResult] = useState<PasswordResetResult | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [payoutFrom, setPayoutFrom] = useState(startOfMonthInput());
  const [payoutTo, setPayoutTo] = useState(todayInput());
  const [payoutNote, setPayoutNote] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentComment, setPaymentComment] = useState("");

  const canUpdate = hasPermission(admin, "couriers.update");
  const canBlock = hasPermission(admin, "couriers.block");
  const canFinanceRead = hasPermission(admin, "finance.read");
  const canFinanceSettings = hasPermission(admin, "finance.settings");
  const canPayout = hasPermission(admin, "finance.payout");
  const canAudit = hasPermission(admin, "audit.read");
  const canSensitive = Boolean(courier?.sensitiveAccess);

  const avatar = assetUrl(courier?.avatarUrl);
  const initials = useMemo(() => {
    const parts = [courier?.firstName, courier?.lastName]
      .map((part) => String(part ?? "").trim()[0])
      .filter(Boolean);
    return parts.join("").slice(0, 2).toUpperCase() || "K";
  }, [courier?.firstName, courier?.lastName]);

  const load = useCallback(async () => {
    if (!courierUserId) return;

    setLoading(true);
    setError(null);
    setActionError(null);

    try {
      const session = await getSession();
      const currentAdmin = session.admin;
      setAdmin(currentAdmin);

      const courierData = await apiFetch<Courier>(`/couriers/${courierUserId}`);
      setCourier(courierData);

      if (hasPermission(currentAdmin, "finance.read")) {
        const [summary, ledgerResponse, payoutRows] = await Promise.all([
          apiFetch<FinanceSummary>(`/couriers/${courierUserId}/finance/summary`),
          apiFetch<LedgerResponse>(
            `/couriers/${courierUserId}/finance/ledger?page=1&limit=10`,
          ),
          apiFetch<Payout[]>(
            `/finance/courier-payouts?courierUserId=${encodeURIComponent(courierUserId)}`,
          ),
        ]);

        setFinance(summary);
        setLedger(Array.isArray(ledgerResponse.items) ? ledgerResponse.items : []);
        setPayouts(Array.isArray(payoutRows) ? payoutRows : []);
      } else {
        setFinance(null);
        setLedger([]);
        setPayouts([]);
      }

      if (hasPermission(currentAdmin, "audit.read")) {
        const auditResponse = await apiFetch<AuditResponse>(
          `/admin/audit?entityType=COURIER&entityId=${encodeURIComponent(courierUserId)}&limit=20`,
        ).catch(() => null);
        setAudit(Array.isArray(auditResponse?.items) ? auditResponse.items : []);
      } else {
        setAudit([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить карточку курьера.");
    } finally {
      setLoading(false);
    }
  }, [courierUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit() {
    if (!courier) return;

    setEditForm({
      firstName: courier.firstName ?? "",
      lastName: courier.lastName ?? "",
      phone: courier.phone ?? "",
      iin: courier.sensitiveAccess && courier.iin && !courier.iin.includes("*") ? courier.iin : "",
      addressText: courier.sensitiveAccess ? courier.addressText ?? "" : "",
      comment: courier.comment ?? "",
      personalFeeOverride:
        courier.personalFeeOverride == null ? "" : String(courier.personalFeeOverride),
      payoutBonusAdd: courier.payoutBonusAdd == null ? "" : String(courier.payoutBonusAdd),
      courierCommissionPctOverride:
        courier.courierCommissionPctOverride == null
          ? ""
          : String(courier.courierCommissionPctOverride),
    });
    setDialog({ kind: "edit" });
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !courier) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const body = new FormData();
      body.append("file", file);

      await apiFetch(`/couriers/${courier.userId}/avatar`, {
        method: "POST",
        body,
      });
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Не удалось загрузить фото.");
    } finally {
      setActionLoading(false);
      event.target.value = "";
    }
  }

  async function runAction(action: () => Promise<void>) {
    setActionLoading(true);
    setActionError(null);
    setBlockingOrders([]);

    try {
      await action();
      setDialog({ kind: null });
      await load();
    } catch (err) {
      const orders = activeOrdersFromError(err);
      setBlockingOrders(orders);
      setActionError(err instanceof Error ? err.message : "Действие не выполнено.");
    } finally {
      setActionLoading(false);
    }
  }

  async function saveEdit() {
    if (!courier) return;

    const payload: Record<string, unknown> = {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      phone: editForm.phone.trim(),
      comment: editForm.comment.trim() || null,
    };

    if (canSensitive) {
      if (editForm.iin.trim() && !editForm.iin.includes("*")) {
        payload.iin = editForm.iin.trim();
      }
      payload.addressText = editForm.addressText.trim() || null;
    }

    if (canFinanceSettings) {
      payload.personalFeeOverride = numberOrNull(editForm.personalFeeOverride);
      payload.payoutBonusAdd = numberOrNull(editForm.payoutBonusAdd);
      payload.courierCommissionPctOverride = numberOrNull(
        editForm.courierCommissionPctOverride,
      );
    }

    await runAction(async () => {
      await apiFetch(`/couriers/${courier.userId}/profile`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    });
  }

  async function blockCourier(blocked: boolean) {
    if (!courier) return;

    await runAction(async () => {
      await apiFetch(`/couriers/${courier.userId}/blocked`, {
        method: "PATCH",
        body: JSON.stringify({
          blocked,
          reason: blocked ? blockReason.trim() || null : null,
        }),
      });
    });
  }

  async function forceOffline() {
    if (!courier) return;

    await runAction(async () => {
      await apiFetch(`/couriers/${courier.userId}/online`, {
        method: "PATCH",
        body: JSON.stringify({ isOnline: false, source: "admin" }),
      });
    });
  }

  async function resetPassword() {
    if (!courier) return;

    await runAction(async () => {
      const result = await apiFetch<PasswordResetResult>(
        `/couriers/${courier.userId}/reset-password`,
        { method: "POST" },
      );
      setPasswordResult(result);
      setCopiedPassword(false);
    });
  }

  async function createPayout() {
    if (!courier) return;

    await runAction(async () => {
      await apiFetch("/finance/courier-payouts", {
        method: "POST",
        body: JSON.stringify({
          courierUserId: courier.userId,
          periodFrom: toAlmatyDateTime(payoutFrom),
          periodTo: toAlmatyDateTime(payoutTo, true),
          note: payoutNote.trim() || null,
        }),
      });
    });
  }

  async function markPayoutPaid() {
    const payout = dialog.payout;
    if (!payout) return;

    await runAction(async () => {
      await apiFetch(`/finance/courier-payouts/${payout.id}/pay`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentReference: paymentReference.trim(),
          paymentComment: paymentComment.trim() || null,
        }),
      });
    });
  }

  async function copyTemporaryPassword() {
    const password = passwordResult?.temporaryPassword;
    if (!password) return;

    await navigator.clipboard.writeText(password);
    setCopiedPassword(true);
  }

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "overview", label: "Обзор" },
    { key: "orders", label: "Заказы" },
    { key: "finance", label: "Финансы" },
    { key: "access", label: "Доступ и безопасность" },
    { key: "audit", label: "История действий" },
  ];

  if (loading && !courier) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Загрузка карточки курьера
      </main>
    );
  }

  if (error || !courier) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error || "Курьер не найден."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/layout-20/couriers")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-100"
              aria-label="Назад"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-lg font-semibold">
              {avatar ? (
                <Image
                  src={avatar}
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                {formatName(courier)}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>Номер курьера: {courier.number ?? "-"}</span>
                <span className="text-slate-300">/</span>
                <span>{courier.phone}</span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs ${
                    courier.isOnline
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {statusLabel(courier)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <button
                type="button"
                onClick={openEdit}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100"
              >
                <Edit3 size={16} />
                Редактировать
              </button>
            ) : null}

            {canUpdate && courier.isOnline ? (
              <button
                type="button"
                onClick={() => setDialog({ kind: "forceOffline" })}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-700 hover:bg-amber-100"
              >
                <Power size={16} />
                Вывести с линии
              </button>
            ) : null}

            {canUpdate ? (
              <button
                type="button"
                onClick={() => setDialog({ kind: "resetPassword" })}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100"
              >
                <KeyRound size={16} />
                Сбросить пароль
              </button>
            ) : null}

            {canBlock ? (
              <button
                type="button"
                onClick={() =>
                  setDialog({
                    kind: courier.isActive && !courier.blockedAt ? "block" : "unblock",
                  })
                }
                className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium ${
                  courier.isActive && !courier.blockedAt
                    ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {courier.isActive && !courier.blockedAt ? (
                  <Ban size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {courier.isActive && !courier.blockedAt ? "Заблокировать" : "Разблокировать"}
              </button>
            ) : null}
          </div>
        </div>

        {actionError ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {actionError}
            {blockingOrders.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {blockingOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => router.push(`/layout-20/orders/${order.id}`)}
                    className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Заказ #{order.number ?? "-"}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {passwordResult?.temporaryPassword ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm font-semibold text-amber-900">
                  Временный пароль показан один раз
                </div>
                <div className="mt-2 rounded-md border border-amber-300 bg-white px-3 py-2 font-mono text-sm text-slate-950">
                  {passwordResult.temporaryPassword}
                </div>
                <div className="mt-2 text-sm text-amber-800">
                  Срок действия: {formatDateTime(passwordResult.temporaryPasswordExpiresAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void copyTemporaryPassword()}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Copy size={16} />
                {copiedPassword ? "Скопировано" : "Скопировать"}
              </button>
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? "border-slate-950 text-slate-950"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <OverviewTab
            courier={courier}
            canUpdate={canUpdate}
            canSensitive={canSensitive}
            uploadPhoto={uploadPhoto}
            actionLoading={actionLoading}
          />
        ) : null}

        {activeTab === "orders" ? (
          <OrdersTab
            activeOrders={courier.activeOrders ?? []}
            completedOrders={courier.recentCompletedOrders ?? []}
            canFinance={canFinanceRead}
          />
        ) : null}

        {activeTab === "finance" ? (
          <FinanceTab
            canRead={canFinanceRead}
            canPayout={canPayout}
            finance={finance}
            ledger={ledger}
            payouts={payouts}
            openCreatePayout={() => setDialog({ kind: "createPayout" })}
            openPayPayout={(payout) => {
              setPaymentReference("");
              setPaymentComment("");
              setDialog({ kind: "payPayout", payout });
            }}
          />
        ) : null}

        {activeTab === "access" ? (
          <AccessTab
            courier={courier}
            canUpdate={canUpdate}
            openReset={() => setDialog({ kind: "resetPassword" })}
          />
        ) : null}

        {activeTab === "audit" ? <AuditTab canAudit={canAudit} items={audit} /> : null}

        <Dialog
          state={dialog}
          courier={courier}
          editForm={editForm}
          setEditForm={setEditForm}
          blockReason={blockReason}
          setBlockReason={setBlockReason}
          payoutFrom={payoutFrom}
          payoutTo={payoutTo}
          payoutNote={payoutNote}
          setPayoutFrom={setPayoutFrom}
          setPayoutTo={setPayoutTo}
          setPayoutNote={setPayoutNote}
          paymentReference={paymentReference}
          paymentComment={paymentComment}
          setPaymentReference={setPaymentReference}
          setPaymentComment={setPaymentComment}
          canSensitive={canSensitive}
          canFinanceSettings={canFinanceSettings}
          actionLoading={actionLoading}
          close={() => setDialog({ kind: null })}
          saveEdit={() => void saveEdit()}
          blockCourier={() => void blockCourier(true)}
          unblockCourier={() => void blockCourier(false)}
          forceOffline={() => void forceOffline()}
          resetPassword={() => void resetPassword()}
          createPayout={() => void createPayout()}
          markPayoutPaid={() => void markPayoutPaid()}
        />
      </div>
    </main>
  );
}

function OverviewTab(props: {
  courier: Courier;
  canUpdate: boolean;
  canSensitive: boolean;
  actionLoading: boolean;
  uploadPhoto: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const { courier, canUpdate, canSensitive, actionLoading, uploadPhoto } = props;

  const statItems = [
    { label: "Статус", value: statusLabel(courier) },
    { label: "Последняя связь", value: formatDateTime(courier.lastSeenAt) },
    { label: "Активных заказов", value: String((courier.activeOrders ?? []).length) },
    { label: "Фикс. начисление", value: formatMoney(courier.personalFeeOverride) },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item) => (
            <div key={item.label} className="rounded-md border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium uppercase text-slate-500">{item.label}</div>
              <div className="mt-1 text-lg font-semibold">{item.value}</div>
            </div>
          ))}
        </div>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold">Профиль</h2>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <Info label="Имя" value={courier.firstName} />
            <Info label="Фамилия" value={courier.lastName} />
            <Info label="Телефон" value={courier.phone} />
            <Info label="ИИН" value={courier.iin || "-"} muted={!canSensitive} />
            <Info label="Адрес" value={courier.addressText || "Скрыт или не указан"} />
            <Info label="Комментарий" value={courier.comment || "-"} />
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold">Условия начисления</h2>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <Info label="Фиксированное начисление" value={formatMoney(courier.personalFeeOverride)} />
            <Info label="Бонус к выплате" value={formatMoney(courier.payoutBonusAdd)} />
            <Info label="Комиссия JETKIZ" value={formatPercent(courier.courierCommissionPctOverride)} />
          </div>
        </section>
      </div>

      <aside className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold">Фото</h2>
        <p className="mt-1 text-sm text-slate-500">
          Backend проверяет содержимое изображения и пересохраняет файл без metadata.
        </p>
        {canUpdate ? (
          <label className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100">
            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Заменить фото
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadPhoto}
              className="sr-only"
              disabled={actionLoading}
            />
          </label>
        ) : null}
      </aside>
    </section>
  );
}

function OrdersTab(props: {
  activeOrders: OrderRow[];
  completedOrders: OrderRow[];
  canFinance: boolean;
}) {
  return (
    <section className="grid gap-4">
      <OrderList
        title="Активные заказы"
        empty="У курьера нет активных заказов."
        orders={props.activeOrders}
        canFinance={props.canFinance}
      />
      <OrderList
        title="Последние доставленные"
        empty="Доставленные заказы не найдены."
        orders={props.completedOrders}
        canFinance={props.canFinance}
      />
    </section>
  );
}

function OrderList(props: {
  title: string;
  empty: string;
  orders: OrderRow[];
  canFinance: boolean;
}) {
  const router = useRouter();

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold">{props.title}</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {props.orders.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500">{props.empty}</div>
        ) : null}
        {props.orders.map((order) => (
          <div key={order.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[120px_1fr_180px_140px]">
            <button
              type="button"
              onClick={() => router.push(`/layout-20/orders/${order.id}`)}
              className="text-left text-sm font-semibold text-slate-950 hover:underline"
            >
              Заказ #{order.number ?? "-"}
            </button>
            <div className="text-sm text-slate-600">
              <div>{order.restaurant?.nameRu ?? order.restaurant?.nameKk ?? "Ресторан не указан"}</div>
              <div className="mt-1 text-xs text-slate-500">{formatAddress(order.address)}</div>
            </div>
            <div className="text-sm text-slate-600">
              <div>{orderStatusLabel(order.status)}</div>
              <div className="mt-1 text-xs text-slate-500">
                {formatDateTime(order.deliveredAt ?? order.assignedAt ?? order.createdAt)}
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {props.canFinance ? formatMoney(order.courierFee) : "Скрыто"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinanceTab(props: {
  canRead: boolean;
  canPayout: boolean;
  finance: FinanceSummary | null;
  ledger: LedgerEntry[];
  payouts: Payout[];
  openCreatePayout: () => void;
  openPayPayout: (payout: Payout) => void;
}) {
  if (!props.canRead) {
    return (
      <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Недостаточно прав для просмотра финансов курьера.
      </section>
    );
  }

  const finance = props.finance ?? {};
  const metrics = [
    { label: "Начислено до комиссии", value: finance.grossAmount },
    { label: "Комиссия JETKIZ", value: finance.commissionAmount },
    { label: "Начислено курьеру", value: finance.accruedPayoutAmount },
    { label: "Доступно к выплате", value: finance.pendingPayoutAmount },
    { label: "В сформированных выплатах", value: finance.unpaidButAssignedAmount },
    { label: "Уже выплачено", value: finance.paidPayoutAmount },
  ];

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium uppercase text-slate-500">{item.label}</div>
            <div className="mt-1 text-xl font-semibold">{formatMoney(item.value)}</div>
          </div>
        ))}
      </div>

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold">Выплаты</h2>
          {props.canPayout ? (
            <button
              type="button"
              onClick={props.openCreatePayout}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Wallet size={16} />
              Создать выплату
            </button>
          ) : null}
        </div>
        <div className="divide-y divide-slate-100">
          {props.payouts.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slate-500">Выплаты не найдены.</div>
          ) : null}
          {props.payouts.map((payout) => (
            <div key={payout.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_140px_160px_140px]">
              <div>
                <div className="text-sm font-medium">
                  {formatDate(payout.periodFrom)} - {formatDate(payout.periodTo)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Заказов: {payout.ordersCount ?? 0} / {payout.note || "без комментария"}
                </div>
              </div>
              <div className="text-sm text-slate-600">{formatMoney(payout.payoutAmount)}</div>
              <div className="text-sm text-slate-600">{payoutStatusLabel(payout.status)}</div>
              <div>
                {props.canPayout && payout.status === "PENDING" ? (
                  <button
                    type="button"
                    onClick={() => props.openPayPayout(payout)}
                    className="h-8 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    Отметить оплату
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">
                    {payout.paidAt ? formatDateTime(payout.paidAt) : "-"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold">Последние движения ledger</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {props.ledger.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slate-500">Движения не найдены.</div>
          ) : null}
          {props.ledger.map((entry) => (
            <div key={entry.id} className="grid gap-2 px-4 py-3 md:grid-cols-[180px_1fr_140px]">
              <div className="text-sm text-slate-600">{formatDateTime(entry.createdAt)}</div>
              <div className="text-sm text-slate-600">{entry.type}</div>
              <div className="text-sm font-medium">{formatMoney(entry.amount)}</div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function AccessTab(props: {
  courier: Courier;
  canUpdate: boolean;
  openReset: () => void;
}) {
  const { courier } = props;

  const fields = [
    { label: "Доступ", value: courier.isActive && !courier.blockedAt ? "Активен" : "Заблокирован" },
    { label: "Нужна смена пароля", value: courier.mustChangePassword ? "Да" : "Нет" },
    { label: "Временный пароль до", value: formatDateTime(courier.temporaryPasswordExpiresAt) },
    { label: "Последний вход", value: formatDateTime(courier.lastLoginAt) },
    { label: "Пароль обновлён", value: formatDateTime(courier.passwordUpdatedAt) },
    { label: "Блокировка пароля", value: formatDateTime(courier.passwordLockedUntil) },
    { label: "Неудачных входов", value: String(courier.failedPasswordLoginCount ?? 0) },
    { label: "Последняя ошибка входа", value: formatDateTime(courier.lastPasswordLoginFailedAt) },
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Доступ и безопасность</h2>
          <p className="mt-1 text-sm text-slate-500">
            Текущий пароль никогда не отображается.
          </p>
        </div>
        {props.canUpdate ? (
          <button
            type="button"
            onClick={props.openReset}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100"
          >
            <KeyRound size={16} />
            Сбросить пароль
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <Info key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </section>
  );
}

function AuditTab(props: { canAudit: boolean; items: AuditItem[] }) {
  if (!props.canAudit) {
    return (
      <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Недостаточно прав для просмотра истории действий.
      </section>
    );
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold">История действий</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {props.items.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500">Записи аудита не найдены.</div>
        ) : null}
        {props.items.map((item) => {
          const actor = item.adminUser?.user;
          const actorName =
            [actor?.firstName, actor?.lastName].filter(Boolean).join(" ") ||
            actor?.phone ||
            actor?.email ||
            "Администратор";

          return (
            <div key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[220px_1fr_180px]">
              <div className="text-sm text-slate-600">{formatDateTime(item.createdAt)}</div>
              <div>
                <div className="text-sm font-medium">{actionLabel(item.action)}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {actorName}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {item.newData ? "Изменения сохранены" : "Без открытых деталей"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Info(props: { label: string; value: string | number | null | undefined; muted?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-medium uppercase text-slate-500">{props.label}</div>
      <div className={`mt-1 text-sm font-medium ${props.muted ? "text-slate-500" : "text-slate-900"}`}>
        {props.value ?? "-"}
      </div>
    </div>
  );
}

function Dialog(props: {
  state: DialogState;
  courier: Courier;
  editForm: EditForm;
  setEditForm: (form: EditForm) => void;
  blockReason: string;
  setBlockReason: (value: string) => void;
  payoutFrom: string;
  payoutTo: string;
  payoutNote: string;
  setPayoutFrom: (value: string) => void;
  setPayoutTo: (value: string) => void;
  setPayoutNote: (value: string) => void;
  paymentReference: string;
  paymentComment: string;
  setPaymentReference: (value: string) => void;
  setPaymentComment: (value: string) => void;
  canSensitive: boolean;
  canFinanceSettings: boolean;
  actionLoading: boolean;
  close: () => void;
  saveEdit: () => void;
  blockCourier: () => void;
  unblockCourier: () => void;
  forceOffline: () => void;
  resetPassword: () => void;
  createPayout: () => void;
  markPayoutPaid: () => void;
}) {
  const kind = props.state.kind;
  if (!kind) return null;

  const titleMap: Record<Exclude<DialogKind, null>, string> = {
    edit: "Редактировать курьера",
    block: "Заблокировать курьера",
    unblock: "Разблокировать курьера",
    forceOffline: "Вывести курьера с линии",
    resetPassword: "Сбросить пароль",
    createPayout: "Создать выплату",
    payPayout: "Отметить выплату оплаченной",
  };

  const submit = () => {
    switch (kind) {
      case "edit":
        props.saveEdit();
        break;
      case "block":
        props.blockCourier();
        break;
      case "unblock":
        props.unblockCourier();
        break;
      case "forceOffline":
        props.forceOffline();
        break;
      case "resetPassword":
        props.resetPassword();
        break;
      case "createPayout":
        props.createPayout();
        break;
      case "payPayout":
        props.markPayoutPaid();
        break;
      default:
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-600" />
          <div>
            <h2 className="text-base font-semibold">{titleMap[kind]}</h2>
            <p className="mt-1 text-sm text-slate-500">{formatName(props.courier)}</p>
          </div>
        </div>

        <div className="mt-4">
          {kind === "edit" ? <EditDialogBody {...props} /> : null}
          {kind === "block" ? (
            <div className="grid gap-3">
              <p className="text-sm text-slate-600">
                Если у курьера есть активный заказ, backend не позволит выполнить блокировку.
              </p>
              <label className="grid gap-1.5 text-sm font-medium">
                Причина
                <textarea
                  value={props.blockReason}
                  onChange={(event) => props.setBlockReason(event.target.value)}
                  className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </label>
            </div>
          ) : null}
          {kind === "unblock" ? (
            <p className="text-sm text-slate-600">Курьер снова станет активным, но не будет выведен на линию администратором.</p>
          ) : null}
          {kind === "forceOffline" ? (
            <p className="text-sm text-slate-600">Курьер будет принудительно переведён в оффлайн. Активные заказы автоматически не снимаются.</p>
          ) : null}
          {kind === "resetPassword" ? (
            <p className="text-sm text-slate-600">Backend сгенерирует временный пароль, потребует смену при входе и сбросит счётчик ошибок входа.</p>
          ) : null}
          {kind === "createPayout" ? <CreatePayoutBody {...props} /> : null}
          {kind === "payPayout" ? <PayPayoutBody {...props} /> : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={props.close}
            disabled={props.actionLoading}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={props.actionLoading}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {props.actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}

function EditDialogBody(props: Parameters<typeof Dialog>[0]) {
  const form = props.editForm;
  const set = (key: keyof EditForm, value: string) => {
    props.setEditForm({ ...form, [key]: value });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Имя" value={form.firstName} onChange={(value) => set("firstName", value)} />
        <TextField label="Фамилия" value={form.lastName} onChange={(value) => set("lastName", value)} />
        <TextField label="Телефон" value={form.phone} onChange={(value) => set("phone", value)} />
        {props.canSensitive ? (
          <TextField label="ИИН" value={form.iin} onChange={(value) => set("iin", value)} />
        ) : null}
      </div>

      {props.canSensitive ? (
        <TextField label="Адрес" value={form.addressText} onChange={(value) => set("addressText", value)} />
      ) : null}

      <label className="grid gap-1.5 text-sm font-medium">
        Комментарий
        <textarea
          value={form.comment}
          onChange={(event) => set("comment", event.target.value)}
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>

      {props.canFinanceSettings ? (
        <div className="grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-3">
          <TextField label="Фикс. начисление" value={form.personalFeeOverride} onChange={(value) => set("personalFeeOverride", value)} />
          <TextField label="Бонус к выплате" value={form.payoutBonusAdd} onChange={(value) => set("payoutBonusAdd", value)} />
          <TextField label="Комиссия JETKIZ, %" value={form.courierCommissionPctOverride} onChange={(value) => set("courierCommissionPctOverride", value)} />
        </div>
      ) : null}
    </div>
  );
}

function CreatePayoutBody(props: Parameters<typeof Dialog>[0]) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-slate-600">
        Период отправляется в backend как календарный период Asia/Almaty. В выплату попадут только доставленные неоплаченные заказы.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="С даты" type="date" value={props.payoutFrom} onChange={props.setPayoutFrom} />
        <TextField label="По дату" type="date" value={props.payoutTo} onChange={props.setPayoutTo} />
      </div>
      <TextField label="Комментарий" value={props.payoutNote} onChange={props.setPayoutNote} />
    </div>
  );
}

function PayPayoutBody(props: Parameters<typeof Dialog>[0]) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-slate-600">
        Сумма выплаты: {formatMoney(props.state.payout?.payoutAmount)}. Ссылка на платёж обязательна для audit trail.
      </p>
      <TextField label="Референс платежа" value={props.paymentReference} onChange={props.setPaymentReference} />
      <TextField label="Комментарий" value={props.paymentComment} onChange={props.setPaymentComment} />
    </div>
  );
}

function TextField(props: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {props.label}
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
      />
    </label>
  );
}
