'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, MapPin, Clock, Building2, Menu } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

type CreateRestaurantPayload = {
  nameRu: string;
  nameKk: string;
  phone: string;
  address: string | null;
  workingHours: string;
  status: 'OPEN' | 'CLOSED';
};

type FormState = {
  phone: string;
  nameRu: string;
  nameKk: string;
  address: string;
  openTime: string;
  closeTime: string;
  status: 'OPEN' | 'CLOSED';
};

type FieldErrors = Record<string, string>;

const PHONE_PREFIX = '+7';
const PHONE_PLACEHOLDER = '+7 (___) ___-__-__';
const PHONE_DIGITS_LENGTH = 11;

const initialForm: FormState = {
  phone: '',
  nameRu: '',
  nameKk: '',
  address: '',
  openTime: '09:00',
  closeTime: '22:00',
  status: 'OPEN',
};

function extractPhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizePhoneDigits(value: string): string {
  let digits = extractPhoneDigits(value);

  if (!digits) return '';

  if (digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  }

  if (!digits.startsWith('7')) {
    digits = `7${digits}`;
  }

  return digits.slice(0, PHONE_DIGITS_LENGTH);
}

function formatPhoneInput(value: string): string {
  const digits = normalizePhoneDigits(value);

  if (!digits) {
    return '';
  }

  const local = digits.slice(1);
  let result = PHONE_PREFIX;

  if (local.length > 0) {
    result += ` (${local.slice(0, 3)}`;
  }

  if (local.length >= 3) {
    result += ')';
  }

  if (local.length > 3) {
    result += ` ${local.slice(3, 6)}`;
  }

  if (local.length > 6) {
    result += `-${local.slice(6, 8)}`;
  }

  if (local.length > 8) {
    result += `-${local.slice(8, 10)}`;
  }

  return result;
}

function normalizePhoneForSubmit(value: string): string {
  return normalizePhoneDigits(value);
}

function isPhoneComplete(value: string): boolean {
  return normalizePhoneForSubmit(value).length === PHONE_DIGITS_LENGTH;
}

function extractErrorMessage(error: unknown): string {
  if (!error) return 'Ошибка создания ресторана';

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(maybeError.message) && maybeError.message.length > 0) {
      return maybeError.message.join(', ');
    }

    if (
      typeof maybeError.message === 'string' &&
      maybeError.message.trim().length > 0
    ) {
      return maybeError.message;
    }

    if (
      typeof maybeError.error === 'string' &&
      maybeError.error.trim().length > 0
    ) {
      return maybeError.error;
    }
  }

  return 'Ошибка создания ресторана';
}

export default function NewRestaurantPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const phoneIsComplete = useMemo(() => isPhoneComplete(form.phone), [form.phone]);

  const isFormValid = useMemo(() => {
    return (
      phoneIsComplete &&
      form.nameRu.trim() !== '' &&
      form.nameKk.trim() !== '' &&
      form.openTime.trim() !== '' &&
      form.closeTime.trim() !== ''
    );
  }, [phoneIsComplete, form.nameRu, form.nameKk, form.openTime, form.closeTime]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));

    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (pageError) {
      setPageError(null);
    }

    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  const handlePhoneChange = (value: string) => {
    const digits = extractPhoneDigits(value);
    if (digits.length > PHONE_DIGITS_LENGTH) return;

    setField('phone', formatPhoneInput(value));
  };

  const validateForm = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (!form.phone.trim()) {
      nextErrors.phone = 'Телефон обязателен';
    } else if (!phoneIsComplete) {
      nextErrors.phone = 'Номер должен содержать 11 цифр';
    }

    if (!form.nameRu.trim()) {
      nextErrors.nameRu = 'Название на русском обязательно';
    }

    if (!form.nameKk.trim()) {
      nextErrors.nameKk = 'Название на казахском обязательно';
    }

    if (!form.openTime.trim()) {
      nextErrors.openTime = 'Укажите время открытия';
    }

    if (!form.closeTime.trim()) {
      nextErrors.closeTime = 'Укажите время закрытия';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleClear = () => {
    setForm(initialForm);
    setErrors({});
    setPageError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setPageError(null);
      setSuccessMessage(null);

      const payload: CreateRestaurantPayload = {
        nameRu: form.nameRu.trim(),
        nameKk: form.nameKk.trim(),
        phone: normalizePhoneForSubmit(form.phone),
        address: form.address.trim() || null,
        workingHours: `${form.openTime} - ${form.closeTime}`,
        status: form.status,
      };

      await apiFetch('/restaurants', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMessage('Ресторан успешно создан');

      setForm(initialForm);
      setErrors({});

      setTimeout(() => {
        router.push('/layout-20/restaurants');
      }, 700);
    } catch (e: unknown) {
      setPageError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#489F2A] rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">Food Delivery Admin</h1>
                <p className="text-xs text-gray-500">Панель управления</p>
              </div>
            </div>

            <button
              type="button"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="max-w-[560px] mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Создание ресторана
            </h2>
            <p className="text-gray-600">
              Введите данные ресторана и владельца
            </p>
          </div>

          {pageError && (
            <div className="mb-6 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              {pageError}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
              {successMessage}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Телефон владельца
                  <span className="text-red-500 ml-1">*</span>
                </label>

                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder={PHONE_PLACEHOLDER}
                    className={`w-full bg-white text-gray-900 pl-11 pr-4 py-2.5 rounded-lg border ${
                      errors.phone
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-[#489F2A] focus:ring-[#489F2A]'
                    } focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all placeholder:text-gray-400`}
                  />
                </div>

                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1.5">{errors.phone}</p>
                )}

                <p className="text-gray-500 text-sm mt-1.5">
                  Используется для входа владельца ресторана
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Название ресторана (RU)
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={form.nameRu}
                  onChange={(e) => setField('nameRu', e.target.value)}
                  placeholder="Название на русском"
                  className={`w-full bg-white text-gray-900 px-4 py-2.5 rounded-lg border ${
                    errors.nameRu
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-[#489F2A] focus:ring-[#489F2A]'
                  } focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all placeholder:text-gray-400`}
                />
                {errors.nameRu && (
                  <p className="text-red-600 text-sm mt-1.5">{errors.nameRu}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Название ресторана (KK)
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={form.nameKk}
                  onChange={(e) => setField('nameKk', e.target.value)}
                  placeholder="Название на казахском"
                  className={`w-full bg-white text-gray-900 px-4 py-2.5 rounded-lg border ${
                    errors.nameKk
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-[#489F2A] focus:ring-[#489F2A]'
                  } focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all placeholder:text-gray-400`}
                />
                {errors.nameKk && (
                  <p className="text-red-600 text-sm mt-1.5">{errors.nameKk}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Адрес
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                    placeholder="Город, улица, дом"
                    className="w-full bg-white text-gray-900 pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#489F2A] focus:outline-none focus:ring-2 focus:ring-[#489F2A] focus:ring-opacity-20 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Время работы
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">
                      Открытие
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="time"
                        value={form.openTime}
                        onChange={(e) => setField('openTime', e.target.value)}
                        className={`w-full bg-white text-gray-900 pl-11 pr-4 py-2.5 rounded-lg border ${
                          errors.openTime
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-[#489F2A] focus:ring-[#489F2A]'
                        } focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all`}
                      />
                    </div>
                    {errors.openTime && (
                      <p className="text-red-600 text-sm mt-1.5">{errors.openTime}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">
                      Закрытие
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="time"
                        value={form.closeTime}
                        onChange={(e) => setField('closeTime', e.target.value)}
                        className={`w-full bg-white text-gray-900 pl-11 pr-4 py-2.5 rounded-lg border ${
                          errors.closeTime
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-[#489F2A] focus:ring-[#489F2A]'
                        } focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all`}
                      />
                    </div>
                    {errors.closeTime && (
                      <p className="text-red-600 text-sm mt-1.5">{errors.closeTime}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Статус
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setField('status', e.target.value as 'OPEN' | 'CLOSED')
                  }
                  className="w-full bg-white text-gray-900 px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#489F2A] focus:outline-none focus:ring-2 focus:ring-[#489F2A] focus:ring-opacity-20 transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage:
                      'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid || loading}
                  className="flex-1 bg-[#489F2A] hover:bg-[#3a7f22] text-white"
                >
                  {loading ? 'Создание...' : 'Создать ресторан'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={loading}
                >
                  Очистить
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/layout-20/restaurants')}
                  disabled={loading}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Важно:</strong> После создания ресторана владелец сможет
              войти в систему, используя указанный номер телефона.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}