'use client';

import {
  ArrowLeft,
  Building2,
  Clock3,
  MapPin,
  Phone,
  Save,
  Store,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { apiFetch } from '@/lib/api';

type FormState = {
  ownerPhone: string;
  restaurantPhone: string;
  nameRu: string;
  nameKk: string;
  address: string;
  openTime: string;
  closeTime: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

type SourceRestaurant = {
  id: string;
  nameRu?: string | null;
  ownerUserId?: string | null;
  ownerPhone?: string | null;
  ownerUser?: {
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

const initialForm: FormState = {
  ownerPhone: '',
  restaurantPhone: '',
  nameRu: '',
  nameKk: '',
  address: '',
  openTime: '09:00',
  closeTime: '22:00',
};

const PHONE_DIGITS_LENGTH = 11;
const inputBase =
  'h-10 w-full rounded-lg border bg-white px-3 text-[13px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

function normalizePhoneDigits(value: string): string {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith('7')) digits = `7${digits}`;
  return digits.slice(0, PHONE_DIGITS_LENGTH);
}

function formatPhone(value: string): string {
  const digits = normalizePhoneDigits(value);
  if (!digits) return '';

  const local = digits.slice(1);
  let result = '+7';
  if (local.length > 0) result += ` (${local.slice(0, 3)}`;
  if (local.length >= 3) result += ')';
  if (local.length > 3) result += ` ${local.slice(3, 6)}`;
  if (local.length > 6) result += `-${local.slice(6, 8)}`;
  if (local.length > 8) result += `-${local.slice(8, 10)}`;
  return result;
}

function isPhoneComplete(value: string): boolean {
  return normalizePhoneDigits(value).length === PHONE_DIGITS_LENGTH;
}

function statusFromError(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

function createErrorMessage(error: unknown): string {
  const status = statusFromError(error);
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('source restaurant')) {
    return 'Не удалось определить владельца выбранного ресторана. Вернитесь в список и повторите добавление филиала.';
  }
  if (message.includes('owner does not match')) {
    return 'Выбранный владелец не совпадает с владельцем исходного ресторана.';
  }
  if (message.includes('owneruserid') || message.includes('fromrestaurantid')) {
    return 'Сначала выберите ресторан владельца в списке и добавьте филиал из его карточки.';
  }
  if (message.includes('nameru')) return 'Укажите название на русском языке.';
  if (message.includes('namekk')) return 'Укажите название на казахском языке.';
  if (message.includes('phone')) return 'Проверьте номер телефона.';
  if (message.includes('workinghours')) return 'Проверьте время работы.';
  if (message.includes('already exists') || message.includes('unique')) {
    return 'Такой ресторан уже существует. Проверьте название и адрес.';
  }

  if (status === 400) return 'Проверьте заполненные поля и повторите попытку.';
  if (status === 401) return 'Сессия истекла. Войдите снова.';
  if (status === 403) return 'У вас нет прав для создания ресторана.';
  if (status === 404) return 'Исходный ресторан или владелец не найден.';
  if (status === 409) return 'Такая запись уже существует или данные изменились.';
  if (status !== null && status >= 500) {
    return 'Сервис временно недоступен. Повторите попытку позже.';
  }

  return 'Не удалось создать ресторан. Повторите попытку.';
}

function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11px] font-medium leading-4 text-slate-400">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-[11px] font-semibold text-rose-600">{error}</span> : null}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  error,
  type = 'text',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${inputBase} ${
        error
          ? 'border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
          : 'border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
      }`}
    />
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-[15px] font-bold text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] font-medium leading-4 text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function NewRestaurantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get('mode') ?? '';
  const ownerUserIdFromQuery = searchParams.get('ownerUserId') ?? '';
  const fromRestaurantId = searchParams.get('fromRestaurantId') ?? '';
  const ownerPhoneFromQuery =
    searchParams.get('ownerPhone') ??
    searchParams.get('phone') ??
    searchParams.get('initialPhone') ??
    '';

  const isBranchMode =
    mode === 'branch' ||
    Boolean(ownerUserIdFromQuery) ||
    Boolean(fromRestaurantId);
  const hasExplicitBranchOwner = Boolean(
    ownerUserIdFromQuery || fromRestaurantId,
  );
  const fixedOwnerPhone = useMemo(
    () => formatPhone(ownerPhoneFromQuery),
    [ownerPhoneFromQuery],
  );

  const [form, setForm] = useState<FormState>(() => ({
    ...initialForm,
    ownerPhone: fixedOwnerPhone,
  }));
  const [sourceRestaurant, setSourceRestaurant] = useState<SourceRestaurant | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isBranchMode || !fromRestaurantId) return;
    let alive = true;

    (async () => {
      try {
        setSourceLoading(true);
        const source = await apiFetch<SourceRestaurant>(
          `/restaurants/admin/${fromRestaurantId}`,
        );
        if (!alive) return;
        setSourceRestaurant(source);
        const phone =
          source.ownerPhone ?? source.ownerUser?.phone ?? ownerPhoneFromQuery;
        if (phone) {
          setForm((current) => ({
            ...current,
            ownerPhone: formatPhone(phone),
          }));
        }
      } catch (error) {
        if (!alive) return;
        setPageError(createErrorMessage(error));
      } finally {
        if (alive) setSourceLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isBranchMode, fromRestaurantId, ownerPhoneFromQuery]);

  const resolvedOwnerUserId =
    ownerUserIdFromQuery || sourceRestaurant?.ownerUserId || '';

  const sourceOwnerLabel = useMemo(() => {
    const name = [
      sourceRestaurant?.ownerUser?.firstName,
      sourceRestaurant?.ownerUser?.lastName,
    ]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
      .join(' ');
    return name || form.ownerPhone || 'Владелец выбранного ресторана';
  }, [sourceRestaurant, form.ownerPhone]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setPageError(null);
  };

  const validate = (): boolean => {
    if (isBranchMode && !hasExplicitBranchOwner) {
      setPageError(
        'Сначала выберите ресторан владельца в списке и добавьте филиал из его карточки.',
      );
      return false;
    }

    const next: FieldErrors = {};

    if (!isBranchMode && !isPhoneComplete(form.ownerPhone)) {
      next.ownerPhone = 'Укажите полный номер владельца и ресторана.';
    }
    if (
      isBranchMode &&
      form.restaurantPhone.trim() &&
      !isPhoneComplete(form.restaurantPhone)
    ) {
      next.restaurantPhone =
        'Укажите полный номер ресторана или оставьте поле пустым.';
    }
    if (!form.nameRu.trim()) next.nameRu = 'Укажите название на русском языке.';
    if (!form.nameKk.trim()) next.nameKk = 'Укажите название на казахском языке.';
    if (!form.openTime) next.openTime = 'Укажите время открытия.';
    if (!form.closeTime) next.closeTime = 'Укажите время закрытия.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      setPageError(null);

      const ownerPhone = normalizePhoneDigits(form.ownerPhone);
      const branchPhone = form.restaurantPhone.trim()
        ? normalizePhoneDigits(form.restaurantPhone)
        : undefined;

      const commonPayload = {
        nameRu: form.nameRu.trim(),
        nameKk: form.nameKk.trim(),
        address: form.address.trim() || undefined,
        workingHours: `${form.openTime}-${form.closeTime}`,
        status: 'CLOSED' as const,
        isInApp: false,
        isAcceptingOrders: false,
      };

      const payload = isBranchMode
        ? {
            ...commonPayload,
            ...(branchPhone ? { phone: branchPhone } : {}),
            ...(resolvedOwnerUserId
              ? { ownerUserId: resolvedOwnerUserId }
              : {}),
            ...(fromRestaurantId
              ? { fromRestaurantId }
              : {}),
          }
        : {
            ...commonPayload,
            phone: ownerPhone,
          };

      await apiFetch(
        isBranchMode ? '/restaurants/admin/branches' : '/restaurants',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      router.push('/layout-20/restaurants');
      router.refresh();
    } catch (error) {
      setPageError(createErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setForm({
      ...initialForm,
      ownerPhone: isBranchMode ? form.ownerPhone : fixedOwnerPhone,
    });
    setErrors({});
    setPageError(null);
  };

  const branchSourceInvalid = isBranchMode && !hasExplicitBranchOwner;

  return (
    <div className="min-h-screen w-full bg-[#f7f8fa] px-4 py-5 text-slate-950 md:px-6 xl:px-8">
      <div className="w-full">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/layout-20/restaurants')}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              aria-label="Назад"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-[28px] font-bold tracking-[-0.025em]">
                {isBranchMode ? 'Добавить филиал' : 'Добавить ресторан'}
              </h1>
              <p className="mt-1 text-[13px] font-medium text-slate-500">
                {isBranchMode
                  ? 'Новый филиал выбранного владельца'
                  : 'Новая заявка ресторана'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clear}
              disabled={loading}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-45"
            >
              Очистить
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading || sourceLoading || branchSourceInvalid}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Создаю' : isBranchMode ? 'Создать филиал' : 'Создать ресторан'}
            </button>
          </div>
        </header>

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-medium leading-5 text-amber-900">
          После создания ресторан будет <span className="font-semibold">на проверке</span>, скрыт от клиентов и не будет принимать заказы. Эти состояния включаются отдельно после одобрения.
        </div>

        {branchSourceInvalid ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-medium text-rose-700">
            Филиал нельзя создавать по произвольному номеру телефона. Вернитесь в список ресторанов, откройте нужный ресторан и нажмите «Добавить филиал этому владельцу».
          </div>
        ) : null}

        {pageError ? (
          <div className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-medium text-rose-700">
            <span>{pageError}</span>
            <button type="button" onClick={() => setPageError(null)} aria-label="Закрыть сообщение">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">
          <div className="space-y-4">
            {isBranchMode ? (
              <Section
                title="Владелец филиала"
                subtitle="Связь берётся из выбранного ресторана. Телефон ниже показан только как контакт."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-400">Владелец</div>
                    <div className="mt-1 text-[13px] font-semibold text-slate-900">
                      {sourceLoading ? 'Загрузка…' : sourceOwnerLabel}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {form.ownerPhone || 'Телефон не указан'}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-400">Исходный ресторан</div>
                    <div className="mt-1 text-[13px] font-semibold text-slate-900">
                      {sourceLoading
                        ? 'Загрузка…'
                        : sourceRestaurant?.nameRu || 'Выбран из списка ресторанов'}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Новый филиал получит этого же владельца
                    </div>
                  </div>
                </div>
              </Section>
            ) : (
              <Section
                title="Владелец и основной телефон"
                subtitle="Для первого ресторана этот номер создаёт владельца и используется как телефон ресторана. Позже телефон ресторана можно изменить отдельно."
              >
                <div className="max-w-[440px]">
                  <Field
                    label="Телефон владельца и ресторана"
                    required
                    error={errors.ownerPhone}
                  >
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={form.ownerPhone}
                        placeholder="+7 (___) ___-__-__"
                        onChange={(event) =>
                          setField('ownerPhone', formatPhone(event.target.value))
                        }
                        className={`${inputBase} pl-10 ${
                          errors.ownerPhone
                            ? 'border-rose-300 focus:ring-2 focus:ring-rose-100'
                            : 'border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
                        }`}
                      />
                    </div>
                  </Field>
                </div>
              </Section>
            )}

            <Section
              title="Название и контакт филиала"
              subtitle={isBranchMode
                ? 'Телефон филиала может отличаться от телефона владельца.'
                : 'Название хранится отдельно на русском и казахском языках.'}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Название на русском" required error={errors.nameRu}>
                  <TextInput
                    value={form.nameRu}
                    onChange={(value) => setField('nameRu', value)}
                    placeholder="Например, PRO.Хинкали"
                    error={errors.nameRu}
                  />
                </Field>
                <Field label="Название на казахском" required error={errors.nameKk}>
                  <TextInput
                    value={form.nameKk}
                    onChange={(value) => setField('nameKk', value)}
                    placeholder="Название на казахском"
                    error={errors.nameKk}
                  />
                </Field>

                {isBranchMode ? (
                  <div className="sm:col-span-2 max-w-[440px]">
                    <Field
                      label="Телефон филиала"
                      hint="Необязательно. Если оставить пустым, будет использован контакт владельца."
                      error={errors.restaurantPhone}
                    >
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={form.restaurantPhone}
                          placeholder="+7 (___) ___-__-__"
                          onChange={(event) =>
                            setField(
                              'restaurantPhone',
                              formatPhone(event.target.value),
                            )
                          }
                          className={`${inputBase} pl-10 ${
                            errors.restaurantPhone
                              ? 'border-rose-300 focus:ring-2 focus:ring-rose-100'
                              : 'border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
                          }`}
                        />
                      </div>
                    </Field>
                  </div>
                ) : null}
              </div>
            </Section>

            <Section
              title="Адрес и график"
              subtitle="График используется для фактической доступности ресторана по времени. Ночной график также поддерживается."
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                <Field label="Адрес ресторана">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.address}
                      onChange={(event) => setField('address', event.target.value)}
                      placeholder="Город, улица, дом"
                      className={`${inputBase} border-slate-200 pl-10 focus:border-slate-400 focus:ring-2 focus:ring-slate-100`}
                    />
                  </div>
                </Field>
                <Field label="Открытие" required error={errors.openTime}>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="time"
                      value={form.openTime}
                      onChange={(event) => setField('openTime', event.target.value)}
                      className={`${inputBase} border-slate-200 pl-10 focus:border-slate-400 focus:ring-2 focus:ring-slate-100`}
                    />
                  </div>
                </Field>
                <Field label="Закрытие" required error={errors.closeTime}>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="time"
                      value={form.closeTime}
                      onChange={(event) => setField('closeTime', event.target.value)}
                      className={`${inputBase} border-slate-200 pl-10 focus:border-slate-400 focus:ring-2 focus:ring-slate-100`}
                    />
                  </div>
                </Field>
              </div>
            </Section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-[15px] font-bold">Что произойдёт после создания</h2>
              </div>
              <div className="divide-y divide-slate-100 px-5">
                <div className="flex items-start gap-3 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                    {isBranchMode ? <Building2 className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                  </div>
                  <div><div className="text-[12px] font-semibold">На проверке</div><div className="mt-1 text-[11px] leading-4 text-slate-400">Оператор должен отдельно одобрить ресторан.</div></div>
                </div>
                <div className="py-4"><div className="text-[12px] font-semibold">Скрыт от клиентов</div><div className="mt-1 text-[11px] leading-4 text-slate-400">Одобрение само по себе не включает показ.</div></div>
                <div className="py-4"><div className="text-[12px] font-semibold">Приём заказов остановлен</div><div className="mt-1 text-[11px] leading-4 text-slate-400">Его включают отдельным действием после публикации.</div></div>
                <div className="py-4"><div className="text-[12px] font-semibold">Работа остановлена</div><div className="mt-1 text-[11px] leading-4 text-slate-400">Разрешение работы включается отдельно от графика.</div></div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="text-[12px] font-semibold text-slate-900">Перед сохранением</div>
              <div className="mt-2 text-[11px] leading-5 text-slate-400">
                Проверьте название на двух языках, номер телефона, адрес и время работы. После создания все эти данные можно изменить в управлении рестораном.
              </div>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={loading || sourceLoading || branchSourceInvalid}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Создаю' : isBranchMode ? 'Создать филиал' : 'Создать ресторан'}
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
