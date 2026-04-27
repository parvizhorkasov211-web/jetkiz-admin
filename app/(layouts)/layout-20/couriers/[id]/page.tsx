"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { CourierFinancePanel } from "@/components/ui/widgets/CourierFinancePanel";
import {
  CourierOnTimeRateMetric,
  CourierOnTimeRateWidget,
} from "@/components/ui/widgets/CourierOnTimeRateWidget";

type ActiveOrder = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  assignedAt?: string | null;
  phone?: string | null;
  addressId?: string | null;
  restaurant?: {
    id: string;
    nameRu: string;
  } | null;
};

type Courier = {
  id: string;
  userId: string;
  phone: string;

  isActive: boolean;

  avatarUrl?: string | null;

  firstName: string;
  lastName: string;
  iin: string;

  addressText?: string | null;
  comment?: string | null;

  blockedAt?: string | null;
  blockReason?: string | null;

  isOnline: boolean;
  personalFeeOverride?: number | null;
  payoutBonusAdd?: number | null;

  activeOrders?: ActiveOrder[];
  activeTariff?: {
    lastActiveAt?: string | null;
  } | null;

  lastActiveAt?: string | null;
};

type CompletedRange = "lifetime" | "day" | "month" | "year" | "custom";

type CompletedCountResponse = {
  totalCompleted?: number;
};

type ApiCourierResponse = Courier;

function str(value: unknown): string {
  return value == null ? "" : String(value);
}

function fmtDate(value: unknown): string {
  try {
    if (!value) {
      return "—";
    }

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("ru-RU");
  } catch {
    return String(value ?? "");
  }
}

function resolveAvatarSrc(avatarUrl?: string | null): string {
  if (!avatarUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(avatarUrl)) {
    return avatarUrl;
  }

  const base = String(process.env.NEXT_PUBLIC_API_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (!base) {
    return avatarUrl;
  }

  return `${base}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;
}

function formatMoney(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return `${Math.round(amount).toLocaleString("ru-RU")} ₸`;
}

function getOrderStatusUi(status?: string | null) {
  const normalized = String(status ?? "").toUpperCase();

  if (["DELIVERED", "COMPLETED"].includes(normalized)) {
    return {
      label: "Доставлен",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    };
  }

  if (["CANCELLED", "CANCELED", "REJECTED"].includes(normalized)) {
    return {
      label: "Отменён",
      cls: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    };
  }

  if (
    [
      "COURIER_ASSIGNED",
      "ASSIGNED",
      "ON_THE_WAY",
      "IN_DELIVERY",
      "PICKED_UP",
    ].includes(normalized)
  ) {
    return {
      label: "В доставке",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
    };
  }

  if (
    [
      "CREATED",
      "NEW",
      "PENDING",
      "PREPARING",
      "ACCEPTED",
      "COOKING",
      "READY",
      "PAID",
    ].includes(normalized)
  ) {
    return {
      label: status || "Новый",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    };
  }

  return {
    label: status || "—",
    cls: "bg-slate-50 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  };
}

function StatCard({
  title,
  value,
  subtitle,
  gradient,
}: {
  title: string;
  value: string;
  subtitle: string;
  gradient: string;
}) {
  return (
    <div
      className="flex min-h-[140px] flex-col justify-between rounded-3xl p-5 text-white shadow-sm"
      style={{ background: gradient }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold opacity-90">{title}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-lg">
          ●
        </div>
      </div>

      <div>
        <div className="mb-2 text-3xl font-bold leading-none">{value}</div>
        <div className="text-sm opacity-90">{subtitle}</div>
      </div>
    </div>
  );
}

export default function CourierDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const courierId = useMemo(() => {
    const value = (params as { id?: string | string[] })?.id;

    if (Array.isArray(value)) {
      return String(value[0] ?? "").trim();
    }

    return String(value ?? "").trim();
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [courier, setCourier] = useState<Courier | null>(null);

  const [otdLoading, setOtdLoading] = useState(false);
  const [otd, setOtd] = useState<CourierOnTimeRateMetric | null>(null);

  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedCount, setCompletedCount] = useState<number | null>(null);
  const [completedRange, setCompletedRange] = useState<CompletedRange>("month");
  const [completedFrom, setCompletedFrom] = useState("");
  const [completedTo, setCompletedTo] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [iin, setIin] = useState("");
  const [addressText, setAddressText] = useState("");
  const [comment, setComment] = useState("");
  const [personalFeeOverride, setPersonalFeeOverride] = useState("");
  const [payoutBonusAdd, setPayoutBonusAdd] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);

  const [blockReason, setBlockReason] = useState("");
  const [orderIdToAssign, setOrderIdToAssign] = useState("");

  const buildCompletedQuery = (courierUserId: string) => {
    const id = String(courierUserId || "").trim();
    const query: string[] = [`courierUserId=${encodeURIComponent(id)}`];

    if (completedRange === "day") {
      query.push("range=day");
    } else if (completedRange === "month") {
      query.push("range=month");
    } else if (completedRange === "year") {
      query.push("range=year");
    } else if (completedRange === "custom") {
      const from = completedFrom.trim();
      const to = completedTo.trim();

      if (from) {
        query.push(`from=${encodeURIComponent(from)}`);
      }

      if (to) {
        query.push(`to=${encodeURIComponent(to)}`);
      }
    }

    return `/couriers/metrics/completed-count?${query.join("&")}`;
  };

  const loadCompleted = async (courierUserId?: string) => {
    const id = String(courierUserId || courierId || "").trim();

    if (!id) {
      return;
    }

    try {
      setCompletedLoading(true);

      const url = buildCompletedQuery(id);
      const json = (await apiFetch(url)) as CompletedCountResponse;

      setCompletedCount(
        typeof json.totalCompleted === "number" ? json.totalCompleted : 0,
      );
    } catch {
      setCompletedCount(null);
    } finally {
      setCompletedLoading(false);
    }
  };

  const loadOtd = async (courierUserId?: string) => {
    const id = String(courierUserId || courierId || "").trim();

    if (!id) {
      return;
    }

    try {
      setOtdLoading(true);

      const json = (await apiFetch(
        `/couriers/metrics/on-time-rate?courierUserId=${encodeURIComponent(
          id,
        )}&slaMin=45`,
      )) as CourierOnTimeRateMetric;

      setOtd(json);
    } catch {
      setOtd(null);
    } finally {
      setOtdLoading(false);
    }
  };

  const load = async () => {
    if (!courierId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const courierJson = (await apiFetch(
        `/couriers/${courierId}`,
      )) as ApiCourierResponse;

      setCourier(courierJson);

      setFirstName(str(courierJson.firstName));
      setLastName(str(courierJson.lastName));
      setIin(str(courierJson.iin));
      setAddressText(str(courierJson.addressText ?? ""));
      setComment(str(courierJson.comment ?? ""));
      setPersonalFeeOverride(
        courierJson.personalFeeOverride == null
          ? ""
          : String(courierJson.personalFeeOverride),
      );
      setPayoutBonusAdd(
        courierJson.payoutBonusAdd == null
          ? ""
          : String(courierJson.payoutBonusAdd),
      );
      setBlockReason(str(courierJson.blockReason ?? ""));

      if (!avatarFile) {
        setAvatarPreview(resolveAvatarSrc(courierJson.avatarUrl ?? null));
      }

      void loadOtd(courierJson.userId || courierId);
      void loadCompleted(courierJson.userId || courierId);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Ошибка загрузки";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierId]);

  useEffect(() => {
    if (!courier) {
      return;
    }

    void loadCompleted(courier.userId || courierId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedRange, completedFrom, completedTo]);

  useEffect(() => {
    return () => {
      try {
        if (avatarPreview && avatarPreview.startsWith("blob:")) {
          URL.revokeObjectURL(avatarPreview);
        }
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showAvatarViewer) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowAvatarViewer(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAvatarViewer]);

  const onPickAvatar = (file?: File | null) => {
    setError(null);
    setInfo(null);

    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(resolveAvatarSrc(courier?.avatarUrl ?? null));
      return;
    }

    const allowedType =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp";

    if (!allowedType) {
      setError("Только jpeg/png/webp");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Файл слишком большой (макс 5MB)");
      return;
    }

    setAvatarFile(file);

    try {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    } catch {
      // ignore
    }

    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async () => {
    if (!courierId) {
      return;
    }

    if (!avatarFile) {
      setError("Выбери файл");
      return;
    }

    try {
      setAvatarUploading(true);
      setError(null);
      setInfo(null);

      const formData = new FormData();
      formData.append("file", avatarFile);

      await apiFetch(`/couriers/${courierId}/avatar`, {
        method: "POST",
        body: formData,
      });

      setInfo("Фото загружено");
      setAvatarFile(null);
      await load();
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Ошибка загрузки фото";
      setError(message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!courierId) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setInfo(null);

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        iin: iin.trim(),
        addressText: addressText.trim() || null,
        comment: comment.trim() || null,
        personalFeeOverride:
          personalFeeOverride.trim() === ""
            ? null
            : Number(personalFeeOverride),
        payoutBonusAdd:
          payoutBonusAdd.trim() === "" ? null : Number(payoutBonusAdd),
      };

      await apiFetch(`/couriers/${courierId}/profile`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setInfo("Сохранено");
      await load();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Ошибка сохранения";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (nextBlocked: boolean) => {
    if (!courierId) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setInfo(null);

      await apiFetch(`/couriers/${courierId}/blocked`, {
        method: "PATCH",
        body: JSON.stringify({
          blocked: nextBlocked,
          reason: nextBlocked ? blockReason.trim() || null : null,
        }),
      });

      setInfo(nextBlocked ? "Курьер заблокирован" : "Курьер разблокирован");
      await load();
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Ошибка";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleOnline = async (nextOnline: boolean) => {
    if (!courierId) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setInfo(null);

      await apiFetch(`/couriers/${courierId}/online`, {
        method: "PATCH",
        body: JSON.stringify({
          isOnline: nextOnline,
          source: "admin",
        }),
      });

      setInfo(nextOnline ? "Онлайн включен" : "Онлайн выключен");
      await load();
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Ошибка";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const assignOrder = async () => {
    if (!courierId) {
      return;
    }

    const orderId = orderIdToAssign.trim();

    if (!orderId) {
      setError("Укажи orderId");
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setInfo(null);

      await apiFetch(`/couriers/${courierId}/assign-order`, {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });

      setInfo("Заказ назначен");
      setOrderIdToAssign("");
      await load();
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Ошибка";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const unassignOrder = async (orderId: string) => {
    if (!courierId) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setInfo(null);

      await apiFetch(`/couriers/${courierId}/unassign-order`, {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });

      setInfo("Заказ снят");
      await load();
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Ошибка";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const title = useMemo(() => {
    if (!courier) {
      return "Курьер";
    }

    return `${courier.firstName} ${courier.lastName}`.trim() || courier.phone;
  }, [courier]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-2 text-lg font-semibold text-slate-900">
            Загрузка курьера
          </div>
          <div className="text-slate-500">
            Подготавливаем профиль, метрики и активные заказы...
          </div>
        </div>
      </div>
    );
  }

  if (!courier) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-3 text-lg font-semibold text-slate-900">
            Курьер не найден
          </div>
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            onClick={() => router.back()}
            type="button"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  const blocked = !courier.isActive || Boolean(courier.blockedAt);
  const avatarSrc = avatarPreview || resolveAvatarSrc(courier.avatarUrl ?? null);
  const canOpenViewer = Boolean(avatarSrc);

  return (
    <div className="courier-details-page min-h-screen bg-[#f5f7fb] p-6">
      <div className="max-w-none">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <button
              className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              onClick={() => router.push("/layout-20/couriers")}
              type="button"
            >
              ← Назад
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                Курьер
              </h1>

              <span
                className={`inline-flex rounded-full border px-3 py-2 text-xs font-semibold ${
                  blocked
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {blocked ? "Заблокирован" : "Активен"}
              </span>

              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
                  courier.isOnline
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    courier.isOnline ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                {courier.isOnline ? "Онлайн" : "Оффлайн"}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">{courier.phone}</p>
          </div>

          <button
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
            onClick={saveProfile}
            disabled={saving}
            type="button"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {info ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
            {info}
          </div>
        ) : null}

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 text-xl font-extrabold text-slate-700 ${
                  canOpenViewer ? "cursor-pointer" : "cursor-default"
                }`}
                onClick={() => {
                  if (canOpenViewer) {
                    setShowAvatarViewer(true);
                  }
                }}
                title={canOpenViewer ? "Открыть фото" : ""}
              >
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>
                    {(courier.firstName?.[0] || courier.phone?.[0] || "C").toUpperCase()}
                  </span>
                )}
              </button>

              <div>
                <div className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {title}
                </div>
                <div className="mt-2 text-base font-bold text-slate-800">
                  Телефон:{" "}
                  <span className="font-extrabold text-slate-900">
                    {courier.phone}
                  </span>
                </div>
                <div className="mt-1 text-base font-bold text-slate-800">
                  ИИН:{" "}
                  <span className="font-extrabold text-slate-900">
                    {courier.iin || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MiniInfoCard
                title="Активные заказы"
                value={String(courier.activeOrders?.length ?? 0)}
              />
              <MiniInfoCard
                title="Legacy тариф"
                value={
                  personalFeeOverride.trim() === ""
                    ? "—"
                    : formatMoney(personalFeeOverride)
                }
              />
              <MiniInfoCard
                title="Бонус"
                value={
                  payoutBonusAdd.trim() === ""
                    ? "—"
                    : formatMoney(payoutBonusAdd)
                }
              />
              <MiniInfoCard
                title="Последняя активность"
                value={fmtDate(courier.activeTariff?.lastActiveAt ?? courier.lastActiveAt)}
              />
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Выполнено заказов"
            value={completedLoading ? "…" : String(completedCount ?? "—")}
            subtitle="Метрика по выбранному периоду"
            gradient="linear-gradient(135deg, #1bc5bd 0%, #0bb783 100%)"
          />
          <StatCard
            title="Активные заказы"
            value={String(courier.activeOrders?.length ?? 0)}
            subtitle="Текущие назначения"
            gradient="linear-gradient(135deg, #3699ff 0%, #3f51f7 100%)"
          />
          <StatCard
            title="Legacy override"
            value={
              personalFeeOverride.trim() === ""
                ? "—"
                : formatMoney(personalFeeOverride)
            }
            subtitle="Персональный тариф"
            gradient="linear-gradient(135deg, #8950fc 0%, #d65db1 100%)"
          />
          <StatCard
            title="Бонус к выплате"
            value={
              payoutBonusAdd.trim() === "" ? "—" : formatMoney(payoutBonusAdd)
            }
            subtitle="Надбавка курьеру"
            gradient="linear-gradient(135deg, #ff6b6b 0%, #f64e60 100%)"
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Профиль</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Основные данные курьера и фото профиля
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl bg-slate-50 p-5">
              <div className="mb-3 text-sm font-semibold text-slate-700">
                Фото курьера
              </div>

              <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center">
                <button
                  type="button"
                  className={`flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white ${
                    canOpenViewer ? "cursor-pointer" : "cursor-default"
                  }`}
                  onClick={() => {
                    if (canOpenViewer) {
                      setShowAvatarViewer(true);
                    }
                  }}
                >
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt="avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-slate-400">Нет фото</div>
                  )}
                </button>

                <div className="flex w-full flex-col gap-3">
                  <div>
                    <input
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => onPickAvatar(event.target.files?.[0] ?? null)}
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      Форматы: jpeg/png/webp, до 5MB
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      onClick={uploadAvatar}
                      disabled={avatarUploading}
                      type="button"
                    >
                      {avatarUploading ? "Загрузка…" : "Загрузить фото"}
                    </button>

                    <button
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                      onClick={() => onPickAvatar(null)}
                      disabled={avatarUploading}
                      type="button"
                    >
                      Сбросить выбор
                    </button>

                    {canOpenViewer ? (
                      <button
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                        onClick={() => setShowAvatarViewer(true)}
                        type="button"
                      >
                        Открыть
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Имя" value={firstName} onChange={setFirstName} />
              <FormField label="Фамилия" value={lastName} onChange={setLastName} />
              <FormField label="ИИН" value={iin} onChange={setIin} />
              <FormField label="Адрес" value={addressText} onChange={setAddressText} />

              <div className="md:col-span-2">
                <FormField
                  label="Комментарий"
                  value={comment}
                  onChange={setComment}
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                <FormField
                  label="Персональный тариф (legacy override, работает только когда погода выключена)"
                  value={personalFeeOverride}
                  onChange={setPersonalFeeOverride}
                  placeholder="Напр. 1100"
                  white
                />

                <div className="mt-4">
                  <FormField
                    label="Бонус к выплате курьеру (надбавка, тг)"
                    value={payoutBonusAdd}
                    onChange={setPayoutBonusAdd}
                    placeholder="Напр. 200"
                    white
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 text-2xl font-bold text-slate-900">
                Метрики
              </div>

              <div className="mb-4">
                <div className="mb-2 text-sm font-semibold text-slate-700">
                  Период выполненных заказов
                </div>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  value={completedRange}
                  onChange={(event) =>
                    setCompletedRange(event.target.value as CompletedRange)
                  }
                >
                  <option value="day">За день (сегодня)</option>
                  <option value="month">За месяц (с начала месяца)</option>
                  <option value="year">За год (с начала года)</option>
                  <option value="custom">Произвольно (from/to)</option>
                  <option value="lifetime">За всё время</option>
                </select>
              </div>

              {completedRange === "custom" ? (
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-sm font-semibold text-slate-700">
                      From
                    </div>
                    <input
                      type="date"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                      value={completedFrom}
                      onChange={(event) => setCompletedFrom(event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-semibold text-slate-700">
                      To
                    </div>
                    <input
                      type="date"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                      value={completedTo}
                      onChange={(event) => setCompletedTo(event.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-medium text-slate-500">
                  Выполнено заказов
                </div>
                <div className="mt-1 text-3xl font-bold text-slate-900">
                  {completedLoading ? "…" : completedCount ?? "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <CourierOnTimeRateWidget metric={otd} loading={otdLoading} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 text-2xl font-bold text-slate-900">
                Финансы
              </div>
              <CourierFinancePanel courierId={courierId} />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 text-2xl font-bold text-slate-900">
                Статус
              </div>

              <div className="grid grid-cols-1 gap-4">
                <MiniInfoCard title="Активен" value={blocked ? "Нет" : "Да"} />
                <MiniInfoCard title="Онлайн" value={courier.isOnline ? "Да" : "Нет"} />

                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">
                    Причина блокировки
                  </div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                    value={blockReason}
                    onChange={(event) => setBlockReason(event.target.value)}
                    placeholder="Причина"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {blocked ? (
                    <button
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50"
                      onClick={() => void toggleBlock(false)}
                      disabled={actionLoading}
                      type="button"
                    >
                      Разблокировать
                    </button>
                  ) : (
                    <button
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"
                      onClick={() => void toggleBlock(true)}
                      disabled={actionLoading}
                      type="button"
                    >
                      Заблокировать
                    </button>
                  )}

                  {courier.isOnline ? (
                    <button
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                      onClick={() => void toggleOnline(false)}
                      disabled={actionLoading}
                      type="button"
                    >
                      Выключить онлайн
                    </button>
                  ) : (
                    <button
                      className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50"
                      onClick={() => void toggleOnline(true)}
                      disabled={actionLoading || blocked}
                      type="button"
                    >
                      Включить онлайн
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Активные заказы
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Назначение и снятие заказов с курьера
            </p>
          </div>

          <div className="border-b border-slate-200 bg-slate-50/60 px-6 py-5">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none md:w-80"
                value={orderIdToAssign}
                onChange={(event) => setOrderIdToAssign(event.target.value)}
                placeholder="orderId"
              />
              <button
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void assignOrder()}
                disabled={actionLoading}
                type="button"
              >
                Назначить
              </button>
            </div>
          </div>

          {!courier.activeOrders?.length ? (
            <div className="px-6 py-16 text-center">
              <div className="mb-3 text-5xl">📦</div>
              <div className="mb-2 text-xl font-bold text-slate-900">
                Нет активных заказов
              </div>
              <div className="text-sm text-slate-500">
                У курьера сейчас нет активных назначений
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Статус
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Сумма
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Создан
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Назначен
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Ресторан
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Действия
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {courier.activeOrders.map((order) => {
                    const ui = getOrderStatusUi(order.status);

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-5 align-top">
                          <div className="break-all text-sm font-semibold text-slate-800">
                            {order.id}
                          </div>
                        </td>
                        <td className="px-6 py-5 align-top">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${ui.cls}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${ui.dot}`} />
                            {ui.label}
                          </span>
                        </td>
                        <td className="px-6 py-5 align-top">
                          <div className="text-sm font-bold text-slate-900">
                            {formatMoney(order.total)}
                          </div>
                        </td>
                        <td className="px-6 py-5 align-top">
                          <div className="text-sm font-semibold text-slate-800">
                            {fmtDate(order.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-5 align-top">
                          <div className="text-sm font-semibold text-slate-800">
                            {fmtDate(order.assignedAt)}
                          </div>
                        </td>
                        <td className="px-6 py-5 align-top">
                          <div className="text-sm font-semibold text-slate-800">
                            {order.restaurant?.nameRu ?? "—"}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right align-top">
                          <button
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                            onClick={() => void unassignOrder(order.id)}
                            disabled={actionLoading}
                            type="button"
                          >
                            Снять
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAvatarViewer ? (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 p-4"
          onClick={() => setShowAvatarViewer(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex h-[min(820px,calc(100vh-24px))] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="text-xl font-bold text-slate-900">
                Фото курьера
              </div>
              <button
                className="h-10 w-10 rounded-xl border border-slate-200 bg-white font-bold text-slate-700"
                onClick={() => setShowAvatarViewer(false)}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-4">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="avatar-full"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-sm text-slate-300">Нет фото</div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setShowAvatarViewer(false)}
                type="button"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MiniInfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-500">{title}</div>
      <div className="mt-2 text-base font-extrabold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  white = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  white?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
      <input
        className={`w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ${
          white ? "bg-white" : "bg-slate-50"
        }`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}