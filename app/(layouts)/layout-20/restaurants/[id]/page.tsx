'use client';

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ImageIcon,
  MapPin,
  Phone,
  RefreshCw,
  Star,
  Upload,
  UtensilsCrossed,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { apiFetch } from '@/lib/api';

type Suggestion = {
  type: 'warning' | 'info' | 'success';
  title: string;
  text: string;
};

type Metrics = {
  period?: { from: string; to: string; days: number };
  totalOrders?: number;
  deliveredCount?: number;
  canceledCount?: number;
  paidCount?: number;
  revenue?: { totalPaid: number; totalDelivered: number; totalRevenue: number };
  avgCheckRevenue?: number;
  trendRevenuePercent?: number | null;
  rates?: { cancelRatePercent: number; paidRatePercent: number; deliveredRatePercent: number };
  customers?: {
    activeCustomers: number;
    activeCustomers7d: number;
    activeCustomers30d: number;
    newCustomers: number;
    repeatRatePercent: number;
  };
  reviews?: { ratingAvg: number | null; reviewsCount: number; reviewRatePercent: number };
  daily?: Array<{
    date: string;
    orders: number;
    delivered: number;
    canceled: number;
    paid: number;
    revenue: number;
  }>;
  topClients?: Array<{
    userId: string;
    phone: string | null;
    name: string | null;
    ordersCount: number;
    spent: number;
    lastOrderAt: string | null;
    recencyDays: number | null;
    status: string;
  }>;
  recentOrders?: Array<{
    id: string;
    createdAt: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    total: number;
    userId: string;
    userName: string | null;
    userPhone: string | null;
  }>;
  suggestions?: Suggestion[];
};

type RestaurantDetails = {
  id: string;
  number?: number;
  nameRu: string;
  nameKk?: string | null;
  descriptionRu?: string | null;
  descriptionKk?: string | null;
  phone?: string | null;
  address?: string | null;
  workingHours?: string | null;
  coverImageUrl?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  status?: string | null;
  runtimeStatus?: string | null;
  onboardingStatus?: string | null;
  onboardingNote?: string | null;
  isAcceptingOrders?: boolean | null;
  isInApp?: boolean | null;
  ownerPhone?: string | null;
  ownerUser?: {
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

function money(value: number | null | undefined): string {
  return `${Math.round(Number(value ?? 0)).toLocaleString('ru-RU')} ₸`;
}

function percent(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `${Number.isFinite(n) ? Math.round(n) : 0}%`;
}

function dateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function imageUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? `/api/proxy${path}` : `/api/proxy/${path}`;
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

function friendlyError(error: unknown, fallback: string): string {
  const status = errorStatus(error);
  if (status === 401) return 'Сессия истекла. Войдите снова.';
  if (status === 403) return 'У вас нет прав для просмотра этого ресторана.';
  if (status === 404) return 'Ресторан не найден.';
  if (status !== null && status >= 500) return 'Данные временно недоступны. Повторите попытку позже.';
  return fallback;
}

function moderationLabel(value?: string | null): string {
  switch (String(value ?? '').toUpperCase()) {
    case 'DRAFT': return 'Черновик';
    case 'PENDING_REVIEW': return 'На проверке';
    case 'NEEDS_CHANGES': return 'Нужны изменения';
    case 'APPROVED': return 'Одобрен';
    case 'REJECTED': return 'Отклонён';
    case 'BLOCKED': return 'Заблокирован';
    default: return 'Нужно проверить';
  }
}

function moderationTone(value?: string | null): 'neutral' | 'success' | 'warning' | 'danger' {
  const key = String(value ?? '').toUpperCase();
  if (key === 'APPROVED') return 'success';
  if (key === 'REJECTED' || key === 'BLOCKED') return 'danger';
  if (key === 'PENDING_REVIEW' || key === 'NEEDS_CHANGES' || key === 'DRAFT' || !key) return 'warning';
  return 'neutral';
}

function orderStatus(value?: string | null): string {
  switch (String(value ?? '').toUpperCase()) {
    case 'CREATED': return 'Создан';
    case 'ACCEPTED': return 'Принят';
    case 'COOKING': return 'Готовится';
    case 'READY': return 'Готов';
    case 'ON_THE_WAY': return 'В пути';
    case 'DELIVERED': return 'Доставлен';
    case 'CANCELLED':
    case 'CANCELED': return 'Отменён';
    default: return 'Не указан';
  }
}

function paymentStatus(value?: string | null): string {
  switch (String(value ?? '').toUpperCase()) {
    case 'PAID': return 'Оплачен';
    case 'PENDING': return 'Ожидает оплаты';
    case 'FAILED': return 'Ошибка оплаты';
    case 'REFUNDED': return 'Возвращён';
    case 'CANCELLED':
    case 'CANCELED': return 'Отменён';
    default: return 'Не указан';
  }
}

function paymentMethod(value?: string | null): string {
  switch (String(value ?? '').toUpperCase()) {
    case 'CARD': return 'Карта';
    case 'CASH': return 'Наличные';
    case 'ONLINE': return 'Онлайн';
    default: return '';
  }
}

function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'blue' }) {
  const cls = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  }[tone];
  return <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold ${cls}`}>{children}</span>;
}

function Button({ children, onClick, primary = false, disabled = false }: { children: ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-[13px] font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${primary ? 'border-slate-950 bg-slate-950 text-white hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'}`}
    >
      {children}
    </button>
  );
}

function Kpi({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="border-r border-slate-200 px-5 py-4 last:border-r-0">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</div>
      <div className="mt-2 text-[25px] font-black tracking-[-0.03em] text-slate-950">{value}</div>
      {note ? <div className="mt-1 text-[11px] font-medium text-slate-400">{note}</div> : null}
    </div>
  );
}

function Section({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-[16px] font-black text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-[12px] font-medium text-slate-400">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function LineChart({ data, valueKey, formatValue }: { data: NonNullable<Metrics['daily']>; valueKey: 'revenue' | 'orders'; formatValue: (value: number) => string }) {
  const width = 900;
  const height = 220;
  const left = 22;
  const right = 28;
  const top = 22;
  const bottom = 38;
  const values = data.map((item) => Number(item[valueKey] ?? 0));
  const max = Math.max(1, ...values);
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const points = values.map((value, index) => ({
    x: left + (index * plotWidth) / Math.max(1, values.length - 1),
    y: top + ((max - value) * plotHeight) / max,
    value,
  }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="overflow-x-auto p-5">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[700px] w-full">
        {[0, 0.5, 1].map((part) => {
          const y = top + plotHeight * part;
          return <line key={part} x1={left} y1={y} x2={width - right} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
        <path d={path} fill="none" stroke="#111827" strokeWidth="2.5" />
        {points.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r="3.5" fill="#111827"><title>{`${dateLabel(data[index].date)} · ${formatValue(point.value)}`}</title></circle>
            {index % labelEvery === 0 || index === points.length - 1 ? <text x={point.x} y={height - 12} fontSize="11" fill="#94a3b8" textAnchor="middle">{dateLabel(data[index].date)}</text> : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function RestaurantDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const fileRef = useRef<HTMLInputElement | null>(null);

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(toDateInput(new Date(today.getTime() - 30 * 86400000)));
  const [to, setTo] = useState(toDateInput(today));
  const [details, setDetails] = useState<RestaurantDetails | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useMemo(() => {
    const search = new URLSearchParams();
    search.set('from', from);
    search.set('to', to);
    return search.toString();
  }, [from, to]);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const value = await apiFetch<RestaurantDetails>(`/restaurants/admin/${id}`);
      setDetails(value);
    } catch (caught) {
      setError(friendlyError(caught, 'Не удалось загрузить ресторан.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      setMetricsError(null);
      const value = await apiFetch<Metrics>(`/restaurants/${id}/metrics?${query}`);
      setMetrics(value);
    } catch (caught) {
      setMetrics(null);
      setMetricsError(friendlyError(caught, 'Статистика за выбранный период временно недоступна.'));
    } finally {
      setMetricsLoading(false);
    }
  }, [id, query]);

  useEffect(() => { void loadDetails(); }, [loadDetails]);
  useEffect(() => { void loadMetrics(); }, [loadMetrics]);

  const applyPreset = (days: number) => {
    const end = new Date();
    setTo(toDateInput(end));
    setFrom(toDateInput(new Date(end.getTime() - days * 86400000)));
  };

  const uploadCover = async (file: File | null) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Выберите изображение JPG, PNG или WebP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Размер изображения не должен превышать 8 МБ.');
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const form = new FormData();
      form.append('file', file);
      await apiFetch(`/restaurants/${id}/cover`, { method: 'POST', body: form });
      await loadDetails();
      setNotice('Обложка обновлена.');
      if (fileRef.current) fileRef.current.value = '';
    } catch (caught) {
      setError(friendlyError(caught, 'Не удалось загрузить изображение.'));
    } finally {
      setUploading(false);
    }
  };

  const safe = {
    orders: metrics?.totalOrders ?? 0,
    delivered: metrics?.deliveredCount ?? 0,
    canceled: metrics?.canceledCount ?? 0,
    paid: metrics?.paidCount ?? 0,
    revenue: metrics?.revenue?.totalRevenue ?? 0,
    avgCheck: metrics?.avgCheckRevenue ?? 0,
    cancelRate: metrics?.rates?.cancelRatePercent ?? 0,
    paidRate: metrics?.rates?.paidRatePercent ?? 0,
    clients: metrics?.customers?.activeCustomers ?? 0,
    clients7: metrics?.customers?.activeCustomers7d ?? 0,
    clients30: metrics?.customers?.activeCustomers30d ?? 0,
    newClients: metrics?.customers?.newCustomers ?? 0,
    repeatRate: metrics?.customers?.repeatRatePercent ?? 0,
    rating: metrics?.reviews?.ratingAvg ?? details?.ratingAvg ?? null,
    reviews: metrics?.reviews?.reviewsCount ?? details?.ratingCount ?? 0,
  };

  const owner = useMemo(() => {
    const name = [details?.ownerUser?.firstName, details?.ownerUser?.lastName].filter(Boolean).join(' ').trim();
    return name || details?.ownerPhone || details?.ownerUser?.phone || 'Не указан';
  }, [details]);

  if (loading && !details) {
    return <div className="min-h-screen bg-[#f7f7f8] p-6"><div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] px-5 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1680px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => router.push('/layout-20/restaurants')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-[30px] font-black tracking-[-0.03em]">{details?.nameRu || 'Ресторан'}</h1><Tag tone={moderationTone(details?.onboardingStatus)}>{moderationLabel(details?.onboardingStatus)}</Tag></div>
              <p className="mt-1 text-[13px] font-medium text-slate-400">Карточка ресторана и показатели работы</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push(`/layout-20/restaurants/${id}/menu`)}><UtensilsCrossed className="h-4 w-4" /> Меню</Button>
            <Button onClick={() => router.push(`/layout-20/orders?restaurantId=${encodeURIComponent(id)}`)}>Заказы</Button>
            <Button onClick={() => router.push(`/layout-20/restaurants/${id}/reviews`)}><Star className="h-4 w-4" /> Отзывы</Button>
            <Button primary onClick={() => router.push('/layout-20/restaurants')}>Управление рестораном <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </header>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">{error}</div> : null}
        {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700">{notice}</div> : null}

        <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-white xl:grid-cols-[360px_1fr]">
          <div className="border-b border-slate-200 p-5 xl:border-b-0 xl:border-r">
            <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {details?.coverImageUrl ? <img src={imageUrl(details.coverImageUrl)} alt="Обложка ресторана" className="h-full w-full object-cover" /> : <ImageIcon className="h-7 w-7 text-slate-300" />}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void uploadCover(event.target.files?.[0] ?? null)} />
            <div className="mt-3"><Button onClick={() => fileRef.current?.click()} disabled={uploading}><Upload className="h-4 w-4" /> {uploading ? 'Загружаю' : 'Изменить обложку'}</Button></div>
          </div>

          <div className="p-5">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Адрес</div><div className="mt-2 flex items-start gap-2 text-[13px] font-bold text-slate-800"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{details?.address || 'Не указан'}</div></div>
              <div><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Телефон</div><div className="mt-2 flex items-center gap-2 text-[13px] font-bold text-slate-800"><Phone className="h-4 w-4 text-slate-400" />{details?.phone || 'Не указан'}</div></div>
              <div><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">График работы</div><div className="mt-2 flex items-center gap-2 text-[13px] font-bold text-slate-800"><CalendarDays className="h-4 w-4 text-slate-400" />{details?.workingHours || 'Не указан'}</div></div>
              <div><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Владелец</div><div className="mt-2 text-[13px] font-bold text-slate-800">{owner}</div></div>
              <div><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Публикация</div><div className="mt-2">{details?.isInApp ? <Tag tone="success">В приложении</Tag> : <Tag>Скрыт</Tag>}</div></div>
              <div><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Приём заказов</div><div className="mt-2">{details?.isAcceptingOrders ? <Tag tone="blue">Принимает</Tag> : <Tag>Остановлен</Tag>}</div></div>
            </div>
            {details?.descriptionRu ? <div className="mt-5 border-t border-slate-100 pt-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Описание</div><p className="mt-2 text-[13px] font-medium leading-6 text-slate-600">{details.descriptionRu}</p></div> : null}
          </div>
        </section>

        <Section
          title="Период"
          subtitle="Показатели и графики ниже рассчитываются для выбранных дат."
          right={<Button onClick={() => void loadMetrics()} disabled={metricsLoading}><RefreshCw className={`h-4 w-4 ${metricsLoading ? 'animate-spin' : ''}`} /> Обновить</Button>}
        >
          <div className="flex flex-wrap items-end gap-3 p-5">
            <div className="flex gap-2"><Button onClick={() => applyPreset(7)}>7 дней</Button><Button onClick={() => applyPreset(30)}>30 дней</Button><Button onClick={() => applyPreset(90)}>90 дней</Button></div>
            <label><span className="mb-1.5 block text-[11px] font-bold text-slate-500">С даты</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold outline-none" /></label>
            <label><span className="mb-1.5 block text-[11px] font-bold text-slate-500">По дату</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold outline-none" /></label>
            {metrics?.period ? <div className="pb-2 text-[12px] font-medium text-slate-400">{metrics.period.days} дней</div> : null}
          </div>
        </Section>

        {metricsError ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">{metricsError}</div> : null}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Выручка" value={money(safe.revenue)} note={`Средний чек: ${money(safe.avgCheck)}`} />
            <Kpi label="Заказы" value={safe.orders} note={`Доставлено: ${safe.delivered}`} />
            <Kpi label="Оплачено" value={safe.paid} note={percent(safe.paidRate)} />
            <Kpi label="Отмены" value={safe.canceled} note={percent(safe.cancelRate)} />
            <Kpi label="Клиенты" value={safe.clients} note={`Новых: ${safe.newClients}`} />
            <Kpi label="Рейтинг" value={safe.rating == null ? '—' : safe.rating.toFixed(1)} note={`Отзывов: ${safe.reviews}`} />
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <Section title="Выручка по дням" subtitle="Сумма за каждый день выбранного периода.">
            {metrics?.daily?.length ? <LineChart data={metrics.daily} valueKey="revenue" formatValue={money} /> : <div className="p-10 text-center text-[13px] font-medium text-slate-400">За выбранный период данных нет.</div>}
          </Section>
          <Section title="Заказы по дням" subtitle="Количество заказов за каждый день.">
            {metrics?.daily?.length ? <LineChart data={metrics.daily} valueKey="orders" formatValue={(value) => String(Math.round(value))} /> : <div className="p-10 text-center text-[13px] font-medium text-slate-400">За выбранный период данных нет.</div>}
          </Section>
        </div>

        <Section title="Клиенты" subtitle="Активность и возврат клиентов за выбранный период.">
          <div className="grid grid-cols-2 divide-x divide-slate-200 md:grid-cols-5">
            <Kpi label="Активные" value={safe.clients} />
            <Kpi label="За 7 дней" value={safe.clients7} />
            <Kpi label="За 30 дней" value={safe.clients30} />
            <Kpi label="Новые" value={safe.newClients} />
            <Kpi label="Возврат" value={percent(safe.repeatRate)} />
          </div>
        </Section>

        {metrics?.suggestions?.length ? (
          <Section title="Рекомендации" subtitle="Подсказки, рассчитанные по текущим показателям.">
            <div className="divide-y divide-slate-100">
              {metrics.suggestions.map((item, index) => <div key={`${item.title}-${index}`} className="px-5 py-4"><div className="text-[13px] font-black text-slate-900">{item.title}</div><div className="mt-1 text-[12px] font-medium leading-5 text-slate-500">{item.text}</div></div>)}
            </div>
          </Section>
        ) : null}

        <Section title="Последние заказы" subtitle="Нажмите на строку, чтобы открыть заказ." right={<Button onClick={() => router.push(`/layout-20/orders?restaurantId=${encodeURIComponent(id)}`)}>Все заказы <ArrowRight className="h-4 w-4" /></Button>}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-400"><th className="px-5 py-3">Дата</th><th className="px-5 py-3">Статус</th><th className="px-5 py-3">Оплата</th><th className="px-5 py-3">Сумма</th><th className="px-5 py-3">Клиент</th></tr></thead>
              <tbody>
                {metrics?.recentOrders?.length ? metrics.recentOrders.map((order) => <tr key={order.id} onClick={() => router.push(`/layout-20/orders/${order.id}`)} className="cursor-pointer border-b border-slate-100 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 last:border-b-0"><td className="px-5 py-3.5">{dateTime(order.createdAt)}</td><td className="px-5 py-3.5">{orderStatus(order.status)}</td><td className="px-5 py-3.5">{paymentStatus(order.paymentStatus)}{paymentMethod(order.paymentMethod) ? ` · ${paymentMethod(order.paymentMethod)}` : ''}</td><td className="px-5 py-3.5 font-black text-slate-950">{money(order.total)}</td><td className="px-5 py-3.5">{order.userName || order.userPhone || 'Не указан'}</td></tr>) : <tr><td colSpan={5} className="px-5 py-10 text-center text-[13px] font-medium text-slate-400">За выбранный период заказов нет.</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Постоянные клиенты" subtitle="Клиенты с наибольшей активностью и суммой заказов.">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-400"><th className="px-5 py-3">Клиент</th><th className="px-5 py-3">Телефон</th><th className="px-5 py-3">Заказов</th><th className="px-5 py-3">Потрачено</th><th className="px-5 py-3">Последний заказ</th></tr></thead>
              <tbody>
                {metrics?.topClients?.length ? metrics.topClients.map((client) => <tr key={client.userId} className="border-b border-slate-100 text-[12px] font-semibold text-slate-700 last:border-b-0"><td className="px-5 py-3.5 font-bold text-slate-900">{client.name || 'Без имени'}</td><td className="px-5 py-3.5">{client.phone || '—'}</td><td className="px-5 py-3.5">{client.ordersCount}</td><td className="px-5 py-3.5 font-black text-slate-950">{money(client.spent)}</td><td className="px-5 py-3.5">{dateTime(client.lastOrderAt)}</td></tr>) : <tr><td colSpan={5} className="px-5 py-10 text-center text-[13px] font-medium text-slate-400">Данных пока нет.</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}
