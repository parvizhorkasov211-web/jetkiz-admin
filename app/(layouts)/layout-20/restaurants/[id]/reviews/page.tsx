'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { apiFetch } from '@/lib/api';

type ReviewMediaType = 'IMAGE' | 'VIDEO' | 'AUDIO';

type ReviewMediaItem = {
  id: string;
  type: ReviewMediaType;
  url: string;
  previewUrl?: string | null;
  createdAt?: string;
};

type ReviewUser = {
  id: string;
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role?: string;
};

type ReviewOrderItem = {
  id: string;
  productId?: string;
  title: string;
  price: number;
  quantity: number;
};

type ReviewOrder = {
  id: string;
  number?: number;
  total: number;
  createdAt: string;
  deliveredAt?: string | null;
  status?: string;
  comment?: string | null;
  paymentMethod?: string;
  paymentStatus?: string;
  items?: ReviewOrderItem[];
};

type ReviewResponseItem = {
  id: string;
  text?: string | null;
  isHidden?: boolean;
  createdAt: string;
  updatedAt?: string;
  media?: ReviewMediaItem[];
  reactionsSummary?: Record<string, number>;
  createdByUser?: ReviewUser;
};

type ReviewItem = {
  id: string;
  rating: number;
  text: string | null;
  createdAt: string;
  orderId: string | null;
  restaurantId: string;
  userId: string;

  foodRating?: number | null;
  deliveryRating?: number | null;
  packingRating?: number | null;
  valueRating?: number | null;
  accuracyRating?: number | null;

  pros?: string[];
  cons?: string[];
  isHidden?: boolean;

  reactionsSummary?: Record<string, number>;
  media?: ReviewMediaItem[];
  response?: ReviewResponseItem | null;

  order?: ReviewOrder;
  user?: ReviewUser;
};

type ApiResponse = {
  items?: ReviewItem[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
};

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
}

function mediaUrl(url?: string | null) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiBase()}${url.startsWith('/') ? '' : '/'}${url}`;
}

function fmtMoney(n?: number | null) {
  const v = Number(n || 0);
  return new Intl.NumberFormat('ru-RU').format(v) + ' ₸';
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}

function fmtDateOnly(ymd: string) {
  try {
    const [Y, M, D] = ymd.split('-').map(Number);
    if (!Y || !M || !D) return ymd;
    const dt = new Date(Y, M - 1, D);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dt);
  } catch {
    return ymd;
  }
}

function stars(r: number) {
  const x = Math.max(0, Math.min(5, Math.round(r || 0)));
  return '★'.repeat(x) + '☆'.repeat(5 - x);
}

function ratingMeta(rating: number) {
  const r = Math.round(Number(rating || 0));

  if (r >= 5) {
    return {
      label: 'Отлично',
      pill: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rowBg: 'rgba(34, 197, 94, 0.05)',
      textColor: 'rgba(22, 163, 74, 1)',
      border: 'rgba(34, 197, 94, 0.25)',
    };
  }

  if (r >= 3) {
    return {
      label: 'Средне',
      pill: 'bg-amber-100 text-amber-800 border-amber-200',
      rowBg: 'rgba(245, 158, 11, 0.05)',
      textColor: 'rgba(217, 119, 6, 1)',
      border: 'rgba(245, 158, 11, 0.25)',
    };
  }

  return {
    label: 'Плохо',
    pill: 'bg-rose-100 text-rose-700 border-rose-200',
    rowBg: 'rgba(220, 38, 38, 0.05)',
    textColor: 'rgba(220, 38, 38, 1)',
    border: 'rgba(220, 38, 38, 0.25)',
  };
}

function toYmdLocalInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function detectPreset(from: string, to: string): 7 | 30 | 90 | null {
  if (!from || !to) return null;

  const today = new Date();
  const toExpected = toYmdLocalInput(today);
  if (to !== toExpected) return null;

  const ms = today.getTime();
  const f7 = toYmdLocalInput(new Date(ms - 7 * 86400000));
  const f30 = toYmdLocalInput(new Date(ms - 30 * 86400000));
  const f90 = toYmdLocalInput(new Date(ms - 90 * 86400000));

  if (from === f7) return 7;
  if (from === f30) return 30;
  if (from === f90) return 90;
  return null;
}

function classPreset(active: boolean) {
  return active
    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
    : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50';
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function normalizeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function safeRecord(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  return v as Record<string, number>;
}

function getClientName(user?: ReviewUser, fallbackUserId?: string) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || user?.phone || fallbackUserId || '—';
}

function countMediaByType(media?: ReviewMediaItem[]) {
  const list = normalizeArray<ReviewMediaItem>(media);
  return {
    image: list.filter((m) => m.type === 'IMAGE').length,
    video: list.filter((m) => m.type === 'VIDEO').length,
    audio: list.filter((m) => m.type === 'AUDIO').length,
    total: list.length,
  };
}

function ReactionSummary({ summary }: { summary?: Record<string, number> }) {
  const data = Object.entries(summary || {}).filter(([, v]) => Number(v) > 0);

  if (!data.length) {
    return <span className="text-sm text-slate-400">Нет реакций</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {data.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
        >
          <span>{reactionLabel(key)}</span>
          <span>{value}</span>
        </span>
      ))}
    </div>
  );
}

function reactionLabel(type: string) {
  switch (String(type).toUpperCase()) {
    case 'LIKE':
      return '👍 Like';
    case 'LOVE':
      return '❤️ Love';
    case 'FIRE':
      return '🔥 Fire';
    case 'USEFUL':
      return '✅ Useful';
    case 'YUMMY':
      return '😍 Yummy';
    default:
      return type;
  }
}

function MediaGrid({ media }: { media?: ReviewMediaItem[] }) {
  const list = normalizeArray<ReviewMediaItem>(media);

  if (!list.length) {
    return <div className="text-sm text-slate-400">Нет медиа</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {list.map((m) => {
        const src = mediaUrl(m.previewUrl || m.url);

        return (
          <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                {m.type}
              </span>
              <a
                href={mediaUrl(m.url)}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Открыть оригинал
              </a>
            </div>

            {m.type === 'IMAGE' && (
              <img
                src={src}
                alt="review media"
                className="h-52 w-full rounded-xl border border-slate-200 object-cover"
              />
            )}

            {m.type === 'VIDEO' && (
              <video
                src={mediaUrl(m.url)}
                controls
                preload="metadata"
                className="h-52 w-full rounded-xl border border-slate-200 bg-black object-cover"
                poster={m.previewUrl ? mediaUrl(m.previewUrl) : undefined}
              />
            )}

            {m.type === 'AUDIO' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-700">Аудио</div>
                <audio src={mediaUrl(m.url)} controls className="w-full" preload="metadata" />
              </div>
            )}

            {m.createdAt ? (
              <div className="mt-2 text-xs text-slate-500">{fmtDateTime(m.createdAt)}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  right,
  children,
  tone = 'default',
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'muted';
}) {
  const shell = tone === 'muted' ? 'bg-slate-100/80 border-slate-200' : 'bg-white border-slate-200';
  const body = tone === 'muted' ? 'bg-white/70' : 'bg-white';

  return (
    <div className={`rounded-2xl border shadow-sm ${shell}`}>
      <div className="px-4 py-4 border-b border-slate-200/70 flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-2xl leading-tight">{title}</div>
          {subtitle ? <div className="text-base opacity-70 mt-2">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0 text-base">{right}</div> : null}
      </div>
      <div className={`p-5 rounded-b-2xl ${body}`}>{children}</div>
    </div>
  );
}

type StatTheme = 'green' | 'blue' | 'orange' | 'red' | 'gray';

function themeToBg(theme: StatTheme) {
  switch (theme) {
    case 'green':
      return 'bg-gradient-to-br from-emerald-500 to-emerald-700';
    case 'blue':
      return 'bg-gradient-to-br from-sky-500 to-indigo-700';
    case 'orange':
      return 'bg-gradient-to-br from-orange-400 to-rose-600';
    case 'red':
      return 'bg-gradient-to-br from-red-500 to-rose-700';
    default:
      return 'bg-gradient-to-br from-slate-500 to-slate-700';
  }
}

function StatCard({
  title,
  value,
  hint,
  theme,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  theme: StatTheme;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-sm border border-white/15 ${themeToBg(theme)}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
            <span className="text-2xl">{icon ?? '●'}</span>
          </div>
          <div className="text-lg opacity-95 font-semibold">{title}</div>
        </div>
      </div>

      <div className="mt-4 text-4xl font-extrabold leading-tight">{value}</div>
      {hint ? <div className="mt-3 text-base opacity-95">{hint}</div> : null}
    </div>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-full border px-4 py-2 text-sm font-bold transition',
        active
          ? 'border-emerald-700 bg-emerald-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900 text-right">{value}</div>
    </div>
  );
}

function SubRatingRow({ label, value }: { label: string; value?: number | null }) {
  const num = Number(value || 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-slate-700">{label}</div>
        <div className="text-sm font-extrabold text-slate-900">{value ? `${num}★` : '—'}</div>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.max(0, Math.min(100, (num / 5) * 100))}%` }}
        />
      </div>
    </div>
  );
}

export default function RestaurantReviewsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const search = useSearchParams();
  const router = useRouter();

  const [from, setFrom] = useState(search.get('from') || '');
  const [to, setTo] = useState(search.get('to') || '');
  const [page, setPage] = useState<number>(Number(search.get('page') || 1));
  const [limit, setLimit] = useState<number>(Number(search.get('limit') || 50));

  const [ratingFilter, setRatingFilter] = useState<string>(search.get('ratingFilter') || 'all');
  const [mediaFilter, setMediaFilter] = useState<string>(search.get('mediaFilter') || 'all');
  const [hiddenFilter, setHiddenFilter] = useState<string>(search.get('hiddenFilter') || 'all');
  const [responseFilter, setResponseFilter] = useState<string>(search.get('responseFilter') || 'all');
  const [searchText, setSearchText] = useState<string>(search.get('q') || '');

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ReviewItem | null>(null);

  function applyPreset(days: number) {
    const t = new Date();
    const tYmd = toYmdLocalInput(t);
    const fYmd = toYmdLocalInput(new Date(t.getTime() - days * 86400000));
    setFrom(fYmd);
    setTo(tYmd);
    setPage(1);
  }

  function resetFilters() {
    const t = new Date();
    setTo(toYmdLocalInput(t));
    setFrom(toYmdLocalInput(new Date(t.getTime() - 30 * 86400000)));
    setPage(1);
    setLimit(50);
    setRatingFilter('all');
    setMediaFilter('all');
    setHiddenFilter('all');
    setResponseFilter('all');
    setSearchText('');
  }

  useEffect(() => {
    if (!from || !to) {
      const t = new Date();
      setTo(toYmdLocalInput(t));
      setFrom(toYmdLocalInput(new Date(t.getTime() - 30 * 86400000)));
    }
  }, [from, to]);

  const activePreset = useMemo(() => detectPreset(from, to), [from, to]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (searchText.trim()) p.set('q', searchText.trim());
    p.set('page', String(page));
    p.set('limit', String(limit));
    p.set('includeOrder', '1');
    p.set('includeUser', '1');
    p.set('ratingFilter', ratingFilter);
    p.set('mediaFilter', mediaFilter);
    p.set('hiddenFilter', hiddenFilter);
    p.set('responseFilter', responseFilter);
    return p.toString();
  }, [from, to, page, limit, ratingFilter, mediaFilter, hiddenFilter, responseFilter, searchText]);

  useEffect(() => {
    router.replace(`?${queryString}`);
  }, [queryString, router]);

  async function load() {
  setLoading(true);
  setError(null);

  try {
    const requestQuery = new URLSearchParams();

    if (from) requestQuery.set('from', from);
    if (to) requestQuery.set('to', to);

    requestQuery.set('page', String(page));
    requestQuery.set('limit', String(limit));
    requestQuery.set('includeOrder', '1');
    requestQuery.set('includeUser', '1');

    const j = (await apiFetch(
      `/restaurants/${id}/reviews?${requestQuery.toString()}`,
      {
        cache: 'no-store',
      },
    )) as ApiResponse;

    const list = Array.isArray(j?.items) ? j.items : [];

    setItems(list);
    setTotal(Number(j?.meta?.total || list.length || 0));
  } catch (e: any) {
    setItems([]);
    setTotal(0);
    setError(e?.message || 'Ошибка загрузки отзывов');
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    if (!id || !from || !to) return;
    load();
  }, [id, from, to, page, limit]);

  useEffect(() => {
    if (!selected) return;
    const fresh = items.find((x) => x.id === selected.id);
    if (fresh) setSelected(fresh);
  }, [items, selected]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  const filteredItems = useMemo(() => {
    let list = [...items];

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((r) => {
        const hay = [
          r.id,
          r.orderId,
          r.text,
          r.user?.phone,
          r.user?.firstName,
          r.user?.lastName,
          r.order?.number != null ? String(r.order.number) : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return hay.includes(q);
      });
    }

    if (ratingFilter === 'good') {
      list = list.filter((r) => Number(r.rating) >= 5);
    } else if (ratingFilter === 'mid') {
      list = list.filter((r) => {
        const x = Number(r.rating);
        return x >= 3 && x < 5;
      });
    } else if (ratingFilter === 'bad') {
      list = list.filter((r) => Number(r.rating) < 3);
    }

    if (mediaFilter === 'with-media') {
      list = list.filter((r) => normalizeArray<ReviewMediaItem>(r.media).length > 0);
    } else if (mediaFilter === 'image') {
      list = list.filter((r) => normalizeArray<ReviewMediaItem>(r.media).some((m) => m.type === 'IMAGE'));
    } else if (mediaFilter === 'video') {
      list = list.filter((r) => normalizeArray<ReviewMediaItem>(r.media).some((m) => m.type === 'VIDEO'));
    } else if (mediaFilter === 'audio') {
      list = list.filter((r) => normalizeArray<ReviewMediaItem>(r.media).some((m) => m.type === 'AUDIO'));
    }

    if (hiddenFilter === 'hidden') {
      list = list.filter((r) => !!r.isHidden);
    } else if (hiddenFilter === 'visible') {
      list = list.filter((r) => !r.isHidden);
    }

    if (responseFilter === 'with-response') {
      list = list.filter((r) => !!r.response);
    } else if (responseFilter === 'without-response') {
      list = list.filter((r) => !r.response);
    }

    return list;
  }, [items, ratingFilter, mediaFilter, hiddenFilter, responseFilter, searchText]);

  const stats = useMemo(() => {
    const s = {
      good: 0,
      mid: 0,
      bad: 0,
      avg: 0,
      withMedia: 0,
      hidden: 0,
      withoutResponse: 0,
    };

    let sum = 0;
    let cnt = 0;

    for (const r of filteredItems) {
      const x = Math.round(Number(r.rating || 0));
      sum += x;
      cnt += 1;

      if (x >= 5) s.good += 1;
      else if (x >= 3) s.mid += 1;
      else s.bad += 1;

      if (normalizeArray<ReviewMediaItem>(r.media).length > 0) s.withMedia += 1;
      if (r.isHidden) s.hidden += 1;
      if (!r.response) s.withoutResponse += 1;
    }

    s.avg = cnt ? Number((sum / cnt).toFixed(2)) : 0;
    return s;
  }, [filteredItems]);

  const periodLabel = useMemo(() => {
    if (!from || !to) return '—';
    return `${fmtDateOnly(from)} — ${fmtDateOnly(to)}`;
  }, [from, to]);

  const headerRight = (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        className="btn btn-lg btn-light"
        onClick={() => router.back()}
        style={{ borderRadius: 14 }}
        title="Назад"
      >
        ← Назад
      </button>

      <button
        className="btn btn-lg btn-light"
        onClick={() => router.push(`/layout-20/restaurants/${id}`)}
        style={{ borderRadius: 14 }}
        title="Вернуться в аналитику ресторана"
      >
        Аналитика
      </button>
    </div>
  );

  return (
    <>
      <div className="space-y-5 rounded-2xl bg-slate-50 p-4 md:p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-3xl font-extrabold leading-tight">Отзывы ресторана</div>
            <div className="mt-1 text-lg opacity-70">
              Период: <span className="font-semibold text-black">{periodLabel}</span>
              {loading ? ' · загрузка…' : ''}
            </div>
          </div>
          {headerRight}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-lg text-rose-700">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5">
          <StatCard
            theme="green"
            icon="★"
            title="Отличные"
            value={stats.good}
            hint={<span className="opacity-95">5★</span>}
          />
          <StatCard
            theme="orange"
            icon="☆"
            title="Средние"
            value={stats.mid}
            hint={<span className="opacity-95">3–4★</span>}
          />
          <StatCard
            theme="red"
            icon="✕"
            title="Плохие"
            value={stats.bad}
            hint={<span className="opacity-95">1–2★</span>}
          />
          <StatCard
            theme="blue"
            icon="📸"
            title="С media"
            value={stats.withMedia}
            hint={<span className="opacity-95">фото / видео / аудио</span>}
          />
          <StatCard
            theme="gray"
            icon="🙈"
            title="Скрытые"
            value={stats.hidden}
            hint={<span className="opacity-95">hidden</span>}
          />
          <StatCard
            theme="blue"
            icon="📌"
            title="Всего"
            value={filteredItems.length}
            hint={
              <span className="opacity-95">
                средняя: <b>{stats.avg ? `${stats.avg}★` : '—'}</b>
              </span>
            }
          />
        </div>

        <Panel
          title={
            <div className="flex items-center gap-3 flex-wrap">
              <span>Фильтры и период</span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-base font-semibold text-blue-700">
                {periodLabel} ({activePreset ? `${activePreset} дн.` : 'кастом'})
              </span>
            </div>
          }
          right={
            <div className="flex items-center gap-3">
              <div className="text-base opacity-70">Лимит</div>
              <select
                className="rounded-2xl border border-slate-300 px-3 py-2 text-base font-semibold bg-white"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                title="Количество на странице"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="text-xl font-extrabold">Быстрый выбор</div>
                <div className="text-base opacity-70">Пресеты периода</div>
              </div>

              <div className="flex flex-wrap gap-3">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => applyPreset(d)}
                    className={`px-6 py-3 rounded-2xl text-lg font-extrabold transition-all border ${classPreset(
                      activePreset === d
                    )}`}
                    title={`Выбрать период ${d} дней`}
                  >
                    {d} дней
                  </button>
                ))}

                <button
                  onClick={resetFilters}
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-lg font-extrabold text-slate-700 hover:bg-slate-50"
                  title="Сбросить фильтры"
                >
                  Сбросить
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="text-xl font-extrabold">Точная фильтрация</div>
                <div className="text-base opacity-70">Поиск, рейтинг, media, hidden, response</div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
                <div>
                  <div className="mb-2 text-base font-semibold">С даты</div>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <div className="mb-2 text-base font-semibold">По дату</div>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <div className="mb-2 text-base font-semibold">Поиск</div>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setPage(1);
                    }}
                    placeholder="ID, orderId, телефон, текст"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div className="flex flex-col">
                  <div className="mb-2 text-base font-semibold">Страница</div>
                  <div className="flex items-center gap-3">
                    <button
                      className="btn btn-lg btn-light"
                      style={{ borderRadius: 14 }}
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      ←
                    </button>

                    <div
                      className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-center text-lg font-extrabold"
                      style={{ minWidth: 140 }}
                    >
                      {page} / {totalPages}
                    </div>

                    <button
                      className="btn btn-lg btn-light"
                      style={{ borderRadius: 14 }}
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 text-sm font-bold text-slate-500">Рейтинг</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip active={ratingFilter === 'all'} onClick={() => setRatingFilter('all')}>
                      Все
                    </FilterChip>
                    <FilterChip active={ratingFilter === 'good'} onClick={() => setRatingFilter('good')}>
                      5★
                    </FilterChip>
                    <FilterChip active={ratingFilter === 'mid'} onClick={() => setRatingFilter('mid')}>
                      3–4★
                    </FilterChip>
                    <FilterChip active={ratingFilter === 'bad'} onClick={() => setRatingFilter('bad')}>
                      1–2★
                    </FilterChip>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-bold text-slate-500">Media</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip active={mediaFilter === 'all'} onClick={() => setMediaFilter('all')}>
                      Все
                    </FilterChip>
                    <FilterChip active={mediaFilter === 'with-media'} onClick={() => setMediaFilter('with-media')}>
                      С media
                    </FilterChip>
                    <FilterChip active={mediaFilter === 'image'} onClick={() => setMediaFilter('image')}>
                      Фото
                    </FilterChip>
                    <FilterChip active={mediaFilter === 'video'} onClick={() => setMediaFilter('video')}>
                      Видео
                    </FilterChip>
                    <FilterChip active={mediaFilter === 'audio'} onClick={() => setMediaFilter('audio')}>
                      Аудио
                    </FilterChip>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-bold text-slate-500">Видимость</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip active={hiddenFilter === 'all'} onClick={() => setHiddenFilter('all')}>
                      Все
                    </FilterChip>
                    <FilterChip active={hiddenFilter === 'visible'} onClick={() => setHiddenFilter('visible')}>
                      Видимые
                    </FilterChip>
                    <FilterChip active={hiddenFilter === 'hidden'} onClick={() => setHiddenFilter('hidden')}>
                      Скрытые
                    </FilterChip>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-bold text-slate-500">Ответ ресторана</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip active={responseFilter === 'all'} onClick={() => setResponseFilter('all')}>
                      Все
                    </FilterChip>
                    <FilterChip
                      active={responseFilter === 'with-response'}
                      onClick={() => setResponseFilter('with-response')}
                    >
                      Есть ответ
                    </FilterChip>
                    <FilterChip
                      active={responseFilter === 'without-response'}
                      onClick={() => setResponseFilter('without-response')}
                    >
                      Без ответа
                    </FilterChip>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-base text-blue-800">
                Таблица кликабельна: можно открыть детали отзыва, заказ и профиль клиента.
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title={
            <div className="flex items-center gap-3">
              <span>Список отзывов</span>
              <span className="badge badge-light-primary" style={{ fontSize: 14, padding: '8px 10px' }}>
                {filteredItems.length}
              </span>
            </div>
          }
          subtitle="В таблице уже видны media, visibility, response и быстрые действия."
          tone="muted"
        >
          {loading ? (
            <div className="text-lg opacity-70">Загрузка…</div>
          ) : !filteredItems.length ? (
            <div className="text-lg opacity-70">Нет отзывов за выбранный период / фильтры</div>
          ) : (
            <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-[1800px] w-full text-sm">
                <thead className="sticky top-0 z-10 bg-black/5">
                  <tr>
                    <th className="text-left p-4 w-[180px]">Оценка</th>
                    <th className="text-left p-4 min-w-[320px]">Текст</th>
                    <th className="text-left p-4 w-[170px]">Дата</th>
                    <th className="text-left p-4 w-[150px]">Заказ</th>
                    <th className="text-left p-4 w-[160px]">Сумма</th>
                    <th className="text-left p-4 w-[240px]">Клиент</th>
                    <th className="text-left p-4 w-[160px]">Media</th>
                    <th className="text-left p-4 w-[160px]">Response</th>
                    <th className="text-left p-4 w-[140px]">Статус</th>
                    <th className="text-left p-4 w-[220px]">Действия</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((r, idx) => {
                    const meta = ratingMeta(r.rating);
                    const mediaCount = countMediaByType(r.media);
                    const clientName = getClientName(r.user, r.userId);

                    return (
                      <tr
                        key={r.id}
                        className={cx('border-t', idx % 2 ? 'bg-black/[0.01]' : '', 'hover:bg-slate-50/80')}
                        style={{
                          background: meta.rowBg,
                          borderLeft: `4px solid ${meta.border}`,
                        }}
                      >
                        <td className="p-4 align-top">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center px-3 py-2 rounded-2xl border font-extrabold ${meta.pill}`}>
                              {Math.round(r.rating)}★
                            </span>

                            <div className="flex flex-col">
                              <div style={{ color: meta.textColor, fontWeight: 900, lineHeight: 1.1 }}>{stars(r.rating)}</div>
                              <div className="text-xs opacity-70">{meta.label}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 align-top">
                          <div className="space-y-2">
                            <div className="font-semibold text-slate-900 whitespace-normal line-clamp-3">
                              {r.text?.trim() ? r.text : '—'}
                            </div>

                            {!!normalizeArray<string>(r.pros).length && (
                              <div className="flex flex-wrap gap-1.5">
                                {normalizeArray<string>(r.pros).slice(0, 3).map((x, i) => (
                                  <span
                                    key={`${r.id}-pro-${i}`}
                                    className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200"
                                  >
                                    + {x}
                                  </span>
                                ))}
                              </div>
                            )}

                            {!!normalizeArray<string>(r.cons).length && (
                              <div className="flex flex-wrap gap-1.5">
                                {normalizeArray<string>(r.cons).slice(0, 2).map((x, i) => (
                                  <span
                                    key={`${r.id}-con-${i}`}
                                    className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200"
                                  >
                                    − {x}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-4 align-top font-semibold">{fmtDateTime(r.createdAt)}</td>

                        <td className="p-4 align-top">
                          {r.orderId ? (
                            <div className="space-y-2">
                              <Link
                                href={`/layout-20/orders/${r.orderId}`}
                                className="inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                              >
                                Открыть
                              </Link>
                              {r.order?.number != null ? (
                                <div className="text-xs text-slate-500">№ {r.order.number}</div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="opacity-70">—</span>
                          )}
                        </td>

                        <td className="p-4 align-top font-extrabold">
                          {r.order?.total != null ? fmtMoney(r.order.total) : <span className="opacity-70">—</span>}
                        </td>

                        <td className="p-4 align-top">
                          <div className="space-y-1">
                            <Link href={`/layout-20/users/${r.userId}`} className="font-extrabold text-blue-700 hover:underline">
                              {clientName}
                            </Link>
                            <div className="text-xs text-slate-500">{r.user?.phone || '—'}</div>
                          </div>
                        </td>

                        <td className="p-4 align-top">
                          {mediaCount.total ? (
                            <div className="space-y-2">
                              <div className="font-bold text-slate-800">{mediaCount.total}</div>
                              <div className="flex flex-wrap gap-1">
                                {mediaCount.image > 0 && (
                                  <span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700 border border-sky-200">
                                    📷 {mediaCount.image}
                                  </span>
                                )}
                                {mediaCount.video > 0 && (
                                  <span className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700 border border-violet-200">
                                    🎥 {mediaCount.video}
                                  </span>
                                )}
                                {mediaCount.audio > 0 && (
                                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
                                    🎤 {mediaCount.audio}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">Нет</span>
                          )}
                        </td>

                        <td className="p-4 align-top">
                          {r.response ? (
                            <div className="space-y-2">
                              <span
                                className={cx(
                                  'inline-flex rounded-full px-2.5 py-1 text-xs font-bold border',
                                  r.response.isHidden
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                )}
                              >
                                {r.response.isHidden ? 'Ответ скрыт' : 'Есть ответ'}
                              </span>
                              <div className="text-xs text-slate-500 line-clamp-2">{r.response.text || 'Без текста'}</div>
                            </div>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                              Нет ответа
                            </span>
                          )}
                        </td>

                        <td className="p-4 align-top">
                          <span
                            className={cx(
                              'inline-flex rounded-full px-2.5 py-1 text-xs font-bold border',
                              r.isHidden
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}
                          >
                            {r.isHidden ? 'Скрыт' : 'Видим'}
                          </span>
                        </td>

                        <td className="p-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelected(r)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Детали
                            </button>

                            {r.orderId ? (
                              <Link
                                href={`/layout-20/orders/${r.orderId}`}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                              >
                                Заказ
                              </Link>
                            ) : null}

                            <Link
                              href={`/layout-20/users/${r.userId}`}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Клиент
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-base opacity-70">
            Подсказка: кнопка «Детали» открывает полный разбор отзыва справа.
          </div>
        </Panel>

        <div style={{ height: 20 }} />
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-[760px] overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-extrabold">Детали отзыва</div>
                  <div className="mt-1 text-sm text-slate-500">
                    ID: <span className="font-semibold text-slate-800">{selected.id}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Закрыть
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <Panel
                title="Общее"
                subtitle="Базовая информация по отзыву, клиенту и заказу"
                tone="muted"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <span className={`inline-flex items-center px-3 py-2 rounded-2xl border font-extrabold ${ratingMeta(selected.rating).pill}`}>
                        {Math.round(selected.rating)}★
                      </span>
                      <div>
                        <div className="font-extrabold" style={{ color: ratingMeta(selected.rating).textColor }}>
                          {stars(selected.rating)}
                        </div>
                        <div className="text-xs text-slate-500">{ratingMeta(selected.rating).label}</div>
                      </div>
                    </div>

                    <InfoRow label="Дата" value={fmtDateTime(selected.createdAt)} />
                    <InfoRow label="Статус отзыва" value={selected.isHidden ? 'Скрыт' : 'Видим'} />
                    <InfoRow label="Order ID" value={selected.orderId || '—'} />
                    <InfoRow
                      label="Клиент"
                      value={
                        <Link href={`/layout-20/users/${selected.userId}`} className="text-blue-700 hover:underline">
                          {getClientName(selected.user, selected.userId)}
                        </Link>
                      }
                    />
                    <InfoRow label="Телефон" value={selected.user?.phone || '—'} />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <InfoRow
                      label="Сумма заказа"
                      value={selected.order?.total != null ? fmtMoney(selected.order.total) : '—'}
                    />
                    <InfoRow label="Номер заказа" value={selected.order?.number != null ? `№ ${selected.order.number}` : '—'} />
                    <InfoRow label="Статус заказа" value={selected.order?.status || '—'} />
                    <InfoRow label="Создан" value={fmtDateTime(selected.order?.createdAt)} />
                    <InfoRow label="Доставлен" value={fmtDateTime(selected.order?.deliveredAt || null)} />
                    <InfoRow label="Оплата" value={selected.order?.paymentMethod || '—'} />
                    <InfoRow label="Payment status" value={selected.order?.paymentStatus || '—'} />
                  </div>
                </div>
              </Panel>

              <Panel title="Текст и теги" subtitle="Полный текст, pros и cons">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-900">
                    {selected.text?.trim() ? selected.text : 'Нет текста'}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="mb-3 text-sm font-extrabold text-emerald-800">Плюсы</div>
                      {normalizeArray<string>(selected.pros).length ? (
                        <div className="flex flex-wrap gap-2">
                          {normalizeArray<string>(selected.pros).map((x, i) => (
                            <span
                              key={`pro-${i}`}
                              className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700"
                            >
                              {x}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-emerald-800/70">Нет</div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <div className="mb-3 text-sm font-extrabold text-rose-800">Минусы</div>
                      {normalizeArray<string>(selected.cons).length ? (
                        <div className="flex flex-wrap gap-2">
                          {normalizeArray<string>(selected.cons).map((x, i) => (
                            <span
                              key={`con-${i}`}
                              className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700"
                            >
                              {x}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-rose-800/70">Нет</div>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="Подрейтинги" subtitle="Разбивка качества по параметрам">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SubRatingRow label="Еда" value={selected.foodRating} />
                  <SubRatingRow label="Доставка" value={selected.deliveryRating} />
                  <SubRatingRow label="Упаковка" value={selected.packingRating} />
                  <SubRatingRow label="Цена / качество" value={selected.valueRating} />
                  <SubRatingRow label="Точность заказа" value={selected.accuracyRating} />
                </div>
              </Panel>

              <Panel title="Media" subtitle="Фото, видео и аудио отзыва">
                <MediaGrid media={selected.media} />
              </Panel>

              <Panel title="Реакции" subtitle="Сводка по реакциям на отзыв">
                <ReactionSummary summary={safeRecord(selected.reactionsSummary)} />
              </Panel>

              <Panel title="Ответ ресторана" subtitle="Текст ответа, автор и media">
                {selected.response ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="text-sm font-extrabold text-slate-800">
                          {selected.response.isHidden ? 'Ответ скрыт' : 'Ответ видим'}
                        </div>
                        <div className="text-xs text-slate-500">{fmtDateTime(selected.response.createdAt)}</div>
                      </div>

                      <div className="text-sm leading-6 text-slate-900">
                        {selected.response.text?.trim() ? selected.response.text : 'Без текста'}
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        Автор:{' '}
                        <span className="font-semibold text-slate-700">
                          {getClientName(selected.response.createdByUser, selected.response.createdByUser?.id)}
                        </span>
                        {selected.response.createdByUser?.role ? ` · ${selected.response.createdByUser.role}` : ''}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-extrabold text-slate-800">Media ответа</div>
                      <MediaGrid media={selected.response.media} />
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-extrabold text-slate-800">Реакции на ответ</div>
                      <ReactionSummary summary={safeRecord(selected.response.reactionsSummary)} />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Ответ ресторана отсутствует</div>
                )}
              </Panel>

              <Panel title="Состав заказа" subtitle="Что именно было заказано">
                {normalizeArray<ReviewOrderItem>(selected.order?.items).length ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-3 text-left">Позиция</th>
                          <th className="p-3 text-left">Кол-во</th>
                          <th className="p-3 text-left">Цена</th>
                          <th className="p-3 text-left">Сумма</th>
                        </tr>
                      </thead>
                      <tbody>
                        {normalizeArray<ReviewOrderItem>(selected.order?.items).map((it) => (
                          <tr key={it.id} className="border-t border-slate-100">
                            <td className="p-3 font-semibold text-slate-900">{it.title}</td>
                            <td className="p-3">{it.quantity}</td>
                            <td className="p-3">{fmtMoney(it.price)}</td>
                            <td className="p-3 font-bold">{fmtMoney(Number(it.price) * Number(it.quantity))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Состав заказа не пришёл с API</div>
                )}
              </Panel>

              <Panel title="Действия" subtitle="Здесь позже можно подключить moderation actions">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    onClick={() => alert('Дальше сюда подключается PATCH hide/unhide review')}
                  >
                    {selected.isHidden ? 'Показать отзыв' : 'Скрыть отзыв'}
                  </button>

                  {selected.response ? (
                    <button
                      type="button"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      onClick={() => alert('Дальше сюда подключается PATCH hide/unhide response')}
                    >
                      {selected.response.isHidden ? 'Показать ответ' : 'Скрыть ответ'}
                    </button>
                  ) : null}

                  {selected.orderId ? (
                    <Link
                      href={`/layout-20/orders/${selected.orderId}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Открыть заказ
                    </Link>
                  ) : null}

                  <Link
                    href={`/layout-20/users/${selected.userId}`}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Профиль клиента
                  </Link>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}