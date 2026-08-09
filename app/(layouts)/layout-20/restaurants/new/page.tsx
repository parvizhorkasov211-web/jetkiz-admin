'use client';

import { ArrowLeft, Building2, Clock3, MapPin, Phone, Save, Store, X } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  status: 'OPEN' | 'CLOSED';
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  ownerPhone: '',
  restaurantPhone: '',
  nameRu: '',
  nameKk: '',
  address: '',
  openTime: '09:00',
  closeTime: '22:00',
  status: 'CLOSED',
};

const PHONE_DIGITS_LENGTH = 11;

function normalizePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
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

  if (message.includes('nameru')) return 'Укажите название на русском языке.';
  if (message.includes('namekk')) return 'Укажите название на казахском языке.';
  if (message.includes('phone')) return 'Проверьте номер телефона.';
  if (message.includes('workinghours')) return 'Проверьте время работы.';
  if (message.includes('already exists') || message.includes('unique')) {
    return 'Такая запись уже существует. Проверьте введённые данные.';
  }

  if (status === 400) return 'Проверьте заполненные поля и повторите попытку.';
  if (status === 401) return 'Сессия истекла. Войдите снова.';
  if (status === 403) return 'У вас нет прав для создания ресторана.';
  if (status === 409) return 'Такая запись уже существует или данные изменились.';
  if (status !== null && status >= 500) {
    return 'Сервис временно недоступен. Повторите попытку позже.';
  }

  return 'Не удалось создать ресторан. Повторите попытку.';
}

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-2 block text-[13px] font-black text-slate-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
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
    <>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full rounded-xl border bg-white px-3.5 text-[14px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50'
            : 'border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100'
        }`}
      />
      {error && <div className="mt-1.5 text-[12px] font-bold text-red-600">{error}</div>}
    </>
  );
}

export default function NewRestaurantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get('mode') ?? '';
  const ownerPhoneFromQuery =
    searchParams.get('ownerPhone') ??
    searchParams.get('phone') ??
    searchParams.get('initialPhone') ??
    '';
  const fromRestaurantId = searchParams.get('fromRestaurantId') ?? '';

  const isBranchMode =
    mode === 'branch' || Boolean(ownerPhoneFromQuery) || Boolean(fromRestaurantId);
  const fixedOwnerPhone = useMemo(
    () => formatPhone(ownerPhoneFromQuery),
    [ownerPhoneFromQuery],
  );

  const [form, setForm] = useState<FormState>(() => ({
    ...initialForm,
    ownerPhone: fixedOwnerPhone,
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const next: FieldErrors = {};

    if (!isPhoneComplete(form.ownerPhone)) {
      next.ownerPhone = isBranchMode
        ? 'Укажите полный номер владельца.'
        : 'Укажите полный номер владельца и ресторана.';
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
      const restaurantPhone =
        isBranchMode && form.restaurantPhone.trim()
          ? normalizePhoneDigits(form.restaurantPhone)
          : ownerPhone;

      const payload = {
        nameRu: form.nameRu.trim(),
        nameKk: form.nameKk.trim(),
        phone: restaurantPhone,
        address: form.address.trim() || undefined,
        workingHours: `${form.openTime}-${form.closeTime}`,
        status: form.status,
        ...(isBranchMode ? { ownerPhone } : {}),
      };

      await apiFetch(isBranchMode ? '/restaurants/admin/branches' : '/restaurants', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push('/layout-20/restaurants');
      router.refresh();
    } catch (error) {
      setPageError(createErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setForm({ ...initialForm, ownerPhone: fixedOwnerPhone });
    setErrors({});
    setPageError(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] px-5 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[980px]">
        <button
          type="button"
          onClick={() => router.push('/layout-20/restaurants')}
          className="mb-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-black text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к ресторанам
        </button>

        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            {isBranchMode ? (
              <Building2 className="h-6 w-6" />
            ) : (
              <Store className="h-6 w-6" />
            )}
          </div>
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-slate-950">
              {isBranchMode ? 'Добавить филиал' : 'Добавить ресторан'}
            </h1>
            <p className="mt-1 text-[14px] font-semibold text-slate-500">
              {isBranchMode
                ? 'Филиал будет привязан к выбранному владельцу.'
                : 'После создания ресторан появится в списке и будет ждать решения оператора.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-[13px] font-bold leading-5 text-violet-800">
          Новый ресторан создаётся скрытым и без приёма заказов. Показ в приложении и
          приём заказов включаются отдельно после проверки.
        </div>

        {pageError && (
          <div className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => setPageError(null)}
              aria-label="Закрыть сообщение"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-5 space-y-4">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
            <div className="mb-4">
              <div className="text-[16px] font-black text-slate-950">Владелец и связь</div>
              <div className="mt-1 text-[12px] font-semibold text-slate-500">
                {isBranchMode
                  ? 'Номер владельца определяет, к какой группе филиалов относится ресторан.'
                  : 'Для первого ресторана этот номер используется и как номер владельца, и как номер ресторана. После создания номер ресторана можно изменить отдельно.'}
              </div>
            </div>

            <div className={`grid gap-4 ${isBranchMode ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <FieldLabel required>
                  {isBranchMode ? 'Телефон владельца' : 'Телефон владельца и ресторана'}
                </FieldLabel>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-[14px] h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.ownerPhone}
                    disabled={isBranchMode && Boolean(fixedOwnerPhone)}
                    placeholder="+7 (___) ___-__-__"
                    onChange={(event) =>
                      setField('ownerPhone', formatPhone(event.target.value))
                    }
                    className={`h-11 w-full rounded-xl border bg-white pl-10 pr-3.5 text-[14px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
                      errors.ownerPhone
                        ? 'border-red-300 focus:ring-4 focus:ring-red-50'
                        : 'border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100'
                    }`}
                  />
                  {errors.ownerPhone && (
                    <div className="mt-1.5 text-[12px] font-bold text-red-600">
                      {errors.ownerPhone}
                    </div>
                  )}
                </div>
              </div>

              {isBranchMode && (
                <div>
                  <FieldLabel>Телефон филиала</FieldLabel>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-[14px] h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={form.restaurantPhone}
                      placeholder="Если пусто — номер владельца"
                      onChange={(event) =>
                        setField('restaurantPhone', formatPhone(event.target.value))
                      }
                      className={`h-11 w-full rounded-xl border bg-white pl-10 pr-3.5 text-[14px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 ${
                        errors.restaurantPhone
                          ? 'border-red-300 focus:ring-4 focus:ring-red-50'
                          : 'border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100'
                      }`}
                    />
                  </div>
                  {errors.restaurantPhone && (
                    <div className="mt-1.5 text-[12px] font-bold text-red-600">
                      {errors.restaurantPhone}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
            <div className="mb-4">
              <div className="text-[16px] font-black text-slate-950">Основные данные</div>
              <div className="mt-1 text-[12px] font-semibold text-slate-500">
                Заполните названия, адрес и график работы.
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel required>Название на русском</FieldLabel>
                <TextInput
                  value={form.nameRu}
                  onChange={(value) => setField('nameRu', value)}
                  placeholder="Например: Чайхана Астана"
                  error={errors.nameRu}
                />
              </div>
              <div>
                <FieldLabel required>Название на казахском</FieldLabel>
                <TextInput
                  value={form.nameKk}
                  onChange={(value) => setField('nameKk', value)}
                  placeholder="Название на казахском"
                  error={errors.nameKk}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Адрес</FieldLabel>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-[14px] h-4 w-4 text-slate-400" />
                  <input
                    value={form.address}
                    onChange={(event) => setField('address', event.target.value)}
                    placeholder="Город, улица, дом"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-[14px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                  />
                </div>
              </div>
              <div>
                <FieldLabel required>Открытие</FieldLabel>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-3.5 top-[14px] h-4 w-4 text-slate-400" />
                  <input
                    type="time"
                    value={form.openTime}
                    onChange={(event) => setField('openTime', event.target.value)}
                    className={`h-11 w-full rounded-xl border bg-white pl-10 pr-3.5 text-[14px] font-semibold outline-none transition ${
                      errors.openTime
                        ? 'border-red-300 focus:ring-4 focus:ring-red-50'
                        : 'border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100'
                    }`}
                  />
                </div>
                {errors.openTime && (
                  <div className="mt-1.5 text-[12px] font-bold text-red-600">
                    {errors.openTime}
                  </div>
                )}
              </div>
              <div>
                <FieldLabel required>Закрытие</FieldLabel>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-3.5 top-[14px] h-4 w-4 text-slate-400" />
                  <input
                    type="time"
                    value={form.closeTime}
                    onChange={(event) => setField('closeTime', event.target.value)}
                    className={`h-11 w-full rounded-xl border bg-white pl-10 pr-3.5 text-[14px] font-semibold outline-none transition ${
                      errors.closeTime
                        ? 'border-red-300 focus:ring-4 focus:ring-red-50'
                        : 'border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100'
                    }`}
                  />
                </div>
                {errors.closeTime && (
                  <div className="mt-1.5 text-[12px] font-bold text-red-600">
                    {errors.closeTime}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
            <div className="text-[16px] font-black text-slate-950">Работа после создания</div>
            <div className="mt-1 text-[12px] font-semibold text-slate-500">
              Это разрешение на работу ресторана. Публикация и приём заказов всё равно
              включаются отдельно.
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setField('status', 'CLOSED')}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  form.status === 'CLOSED'
                    ? 'border-violet-300 bg-violet-50 text-violet-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-[13px] font-black">Оставить остановленным</div>
                <div className="mt-1 text-[11px] font-semibold opacity-75">
                  Безопасный вариант до проверки.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setField('status', 'OPEN')}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  form.status === 'OPEN'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-[13px] font-black">Разрешить работу</div>
                <div className="mt-1 text-[11px] font-semibold opacity-75">
                  Ресторан всё равно останется скрытым до одобрения.
                </div>
              </button>
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3 pb-6">
            <button
              type="button"
              disabled={loading}
              onClick={clear}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Очистить
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => router.push('/layout-20/restaurants')}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void submit()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-600 bg-violet-600 px-6 text-[13px] font-black text-white shadow-lg shadow-violet-100 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading
                ? 'Сохраняю…'
                : isBranchMode
                  ? 'Создать филиал'
                  : 'Создать ресторан'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
