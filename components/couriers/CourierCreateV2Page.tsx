"use client";

import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Loader2,
  Upload,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";

type AdminLike = {
  roleCodes?: string[];
  roles?: string[];
  permissionCodes?: string[];
  permissions?: string[];
} | null;

type CreateCourierResponse = {
  userId?: string;
  id?: string;
  number?: number | null;
  firstName?: string;
  lastName?: string;
  phone?: string;
  temporaryPassword?: string;
  temporaryPasswordExpiresAt?: string | Date | null;
};

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  iin: string;
  addressText: string;
  password: string;
  personalFeeOverride: string;
  payoutBonusAdd: string;
  courierCommissionPctOverride: string;
};

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  phone: "",
  iin: "",
  addressText: "",
  password: "",
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

function formatDate(value?: string | Date | null): string {
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

function optionalInt(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

export function CourierCreateV2Page() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminLike>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateCourierResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmClosePassword, setConfirmClosePassword] = useState(false);

  const canCreate =
    hasPermission(admin, "couriers.update") &&
    hasPermission(admin, "couriers.sensitive_read");
  const canFinance = hasPermission(admin, "finance.settings");

  useEffect(() => {
    void getSession().then((session) => setAdmin(session.admin));
  }, []);

  const setField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    setPhoto(event.target.files?.[0] ?? null);
  }

  async function uploadPhoto(courierUserId: string) {
    if (!photo) return;

    const body = new FormData();
    body.append("file", photo);

    await apiFetch(`/couriers/${courierUserId}/avatar`, {
      method: "POST",
      body,
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreate) {
      setError("Недостаточно прав для создания курьера с ИИН и адресом.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    setCreated(null);
    setCopied(false);

    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        iin: form.iin.trim(),
        addressText: form.addressText.trim() || undefined,
        password: form.password || undefined,
      };

      if (canFinance) {
        const personalFeeOverride = optionalInt(form.personalFeeOverride);
        const payoutBonusAdd = optionalInt(form.payoutBonusAdd);
        const courierCommissionPctOverride = optionalInt(
          form.courierCommissionPctOverride,
        );

        if (personalFeeOverride !== undefined) {
          payload.personalFeeOverride = personalFeeOverride;
        }
        if (payoutBonusAdd !== undefined) {
          payload.payoutBonusAdd = payoutBonusAdd;
        }
        if (courierCommissionPctOverride !== undefined) {
          payload.courierCommissionPctOverride = courierCommissionPctOverride;
        }
      }

      const response = await apiFetch<CreateCourierResponse>("/couriers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const courierUserId = response.userId ?? response.id;
      if (courierUserId && photo) {
        try {
          await uploadPhoto(courierUserId);
        } catch (uploadError) {
          setNotice(
            uploadError instanceof Error
              ? `Курьер создан, но фото не загрузилось: ${uploadError.message}`
              : "Курьер создан, но фото не загрузилось.",
          );
        }
      }

      setCreated(response);
      setForm(initialForm);
      setPhoto(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось создать курьера.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyPassword() {
    const password = created?.temporaryPassword;
    if (!password) return;

    await navigator.clipboard.writeText(password);
    setCopied(true);
  }

  function closePasswordPanel() {
    if (created?.temporaryPassword && !copied) {
      setConfirmClosePassword(true);
      return;
    }

    setCreated(null);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Новый курьер</h1>
            <p className="mt-1 text-sm text-slate-500">
              Телефон и ИИН нормализуются на backend до проверки уникальности.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/layout-20/couriers")}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            Назад
          </button>
        </div>

        {!canCreate ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Недостаточно прав для создания курьера.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {notice}
          </div>
        ) : null}

        {created?.temporaryPassword ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm font-semibold text-amber-900">
                  Временный пароль показан один раз
                </div>
                <div className="mt-2 rounded-md border border-amber-300 bg-white px-3 py-2 font-mono text-sm text-slate-950">
                  {created.temporaryPassword}
                </div>
                <div className="mt-2 text-sm text-amber-800">
                  Срок действия: {formatDate(created.temporaryPasswordExpiresAt)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyPassword()}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <Copy size={16} />
                  {copied ? "Скопировано" : "Скопировать"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/layout-20/couriers/${created.userId ?? created.id ?? ""}`)
                  }
                  className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100"
                >
                  Открыть карточку
                </button>
                <button
                  type="button"
                  onClick={closePasswordPanel}
                  className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100"
                >
                  Скрыть
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <form
          onSubmit={(event) => void submit(event)}
          className="grid gap-5 rounded-md border border-slate-200 bg-white p-4"
        >
          <section className="grid gap-4">
            <div>
              <h2 className="text-base font-semibold">Личные данные</h2>
              <p className="mt-1 text-sm text-slate-500">
                Эти поля используются в карточке и операционных списках.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Имя
                <input
                  value={form.firstName}
                  onChange={(event) => setField("firstName", event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  required
                  disabled={!canCreate || saving}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Фамилия
                <input
                  value={form.lastName}
                  onChange={(event) => setField("lastName", event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  required
                  disabled={!canCreate || saving}
                />
              </label>
            </div>
          </section>

          <section className="grid gap-4 border-t border-slate-200 pt-4">
            <div>
              <h2 className="text-base font-semibold">Контакты и документы</h2>
              <p className="mt-1 text-sm text-slate-500">
                ИИН хранится полностью, но отображается только при наличии прав.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Телефон
                <input
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  placeholder="+7 700 000 00 00"
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  required
                  disabled={!canCreate || saving}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                ИИН
                <input
                  value={form.iin}
                  onChange={(event) => setField("iin", event.target.value)}
                  inputMode="numeric"
                  maxLength={24}
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  required
                  disabled={!canCreate || saving}
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              Адрес
              <input
                value={form.addressText}
                onChange={(event) => setField("addressText", event.target.value)}
                className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                disabled={!canCreate || saving}
              />
            </label>
          </section>

          <section className="grid gap-4 border-t border-slate-200 pt-4">
            <div>
              <h2 className="text-base font-semibold">Фото и доступ</h2>
              <p className="mt-1 text-sm text-slate-500">
                Фото будет загружено после создания курьера. Пароль можно оставить пустым.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Фотография
                <span className="inline-flex h-10 items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
                  <Upload size={16} />
                  {photo ? photo.name : "JPEG, PNG или WebP"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onPhotoChange}
                    className="sr-only"
                    disabled={!canCreate || saving}
                  />
                </span>
              </label>

              <label className="grid gap-1.5 text-sm font-medium">
                Пароль
                <input
                  value={form.password}
                  onChange={(event) => setField("password", event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Пусто: backend сгенерирует временный"
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  disabled={!canCreate || saving}
                />
              </label>
            </div>
          </section>

          {canFinance ? (
            <section className="grid gap-4 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="text-base font-semibold">Финансовые условия</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Поля применяются только если backend поддерживает override.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  Фиксированное начисление
                  <input
                    value={form.personalFeeOverride}
                    onChange={(event) =>
                      setField("personalFeeOverride", event.target.value)
                    }
                    inputMode="numeric"
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                    disabled={!canCreate || saving}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Бонус к выплате
                  <input
                    value={form.payoutBonusAdd}
                    onChange={(event) => setField("payoutBonusAdd", event.target.value)}
                    inputMode="numeric"
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                    disabled={!canCreate || saving}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Комиссия JETKIZ, %
                  <input
                    value={form.courierCommissionPctOverride}
                    onChange={(event) =>
                      setField("courierCommissionPctOverride", event.target.value)
                    }
                    inputMode="numeric"
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                    disabled={!canCreate || saving}
                  />
                </label>
              </div>
            </section>
          ) : null}

          <button
            type="submit"
            disabled={!canCreate || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {saving ? "Создание..." : "Создать курьера"}
          </button>
        </form>

        {confirmClosePassword ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
            <div className="w-full max-w-md rounded-md bg-white p-5 shadow-xl">
              <h2 className="text-base font-semibold">Скрыть временный пароль?</h2>
              <p className="mt-2 text-sm text-slate-600">
                Пароль показывается только один раз. Убедитесь, что он сохранён безопасно.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClosePassword(false)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100"
                >
                  Вернуться
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreated(null);
                    setConfirmClosePassword(false);
                  }}
                  className="h-9 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Скрыть
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
