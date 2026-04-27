'use client';

import Link from 'next/link';
import {
  Eye,
  EyeOff,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  AdminReviewItem,
  AdminReviewsMeta,
  AdminReviewsResponse,
  AdminReviewsSummary,
  AdminReviewStatusFilter,
} from './admin-reviews.types';

const DEFAULT_SUMMARY: AdminReviewsSummary = {
  total: 0,
  visible: 0,
  hidden: 0,
  avgRating: null,
};

const DEFAULT_META: AdminReviewsMeta = {
  total: 0,
  page: 1,
  limit: 50,
  pages: 1,
};

const STATUS_FILTERS: Array<{ value: AdminReviewStatusFilter; label: string }> = [
  { value: 'ALL', label: 'Все' },
  { value: 'VISIBLE', label: 'Видимые' },
  { value: 'HIDDEN', label: 'Скрытые' },
];

const RATING_FILTERS = ['ALL', '5', '4', '3', '2', '1'] as const;

type RatingFilter = (typeof RATING_FILTERS)[number];

function formatMoney(value: number | null | undefined): string {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₸';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRating(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }

  return value.toFixed(1);
}

function buildReviewQuery(params: {
  page: number;
  limit: number;
  search: string;
  status: AdminReviewStatusFilter;
  rating: RatingFilter;
  hasMedia: boolean;
  hasResponse: boolean;
}): string {
  const query = new URLSearchParams();

  query.set('page', String(params.page));
  query.set('limit', String(params.limit));
  query.set('status', params.status);

  const search = params.search.trim();
  if (search) {
    query.set('search', search);
  }

  if (params.rating !== 'ALL') {
    query.set('rating', params.rating);
  }

  if (params.hasMedia) {
    query.set('hasMedia', 'true');
  }

  if (params.hasResponse) {
    query.set('hasResponse', 'true');
  }

  return query.toString();
}

export default function AdminReviewsView() {
  const [items, setItems] = useState<AdminReviewItem[]>([]);
  const [summary, setSummary] = useState<AdminReviewsSummary>(DEFAULT_SUMMARY);
  const [meta, setMeta] = useState<AdminReviewsMeta>(DEFAULT_META);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<AdminReviewStatusFilter>('ALL');
  const [rating, setRating] = useState<RatingFilter>('ALL');
  const [hasMedia, setHasMedia] = useState(false);
  const [hasResponse, setHasResponse] = useState(false);
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutatingReviewId, setMutatingReviewId] = useState<string | null>(null);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timerId);
  }, [search]);

  const loadReviews = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      try {
        if (mode === 'initial') {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        const query = buildReviewQuery({
          page,
          limit: meta.limit || 50,
          search: debouncedSearch,
          status,
          rating,
          hasMedia,
          hasResponse,
        });

        const response = await fetch(`/api/proxy/admin/reviews?${query}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(text || `Не удалось загрузить отзывы: ${response.status}`);
        }

        const data = (await response.json()) as AdminReviewsResponse;

        setItems(Array.isArray(data.items) ? data.items : []);
        setSummary(data.summary ?? DEFAULT_SUMMARY);
        setMeta(data.meta ?? DEFAULT_META);
        setError(null);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Не удалось загрузить отзывы';

        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [debouncedSearch, hasMedia, hasResponse, meta.limit, page, rating, status],
  );

  useEffect(() => {
    void loadReviews('initial');
  }, [loadReviews]);

  const shownFrom = useMemo(() => {
    if (meta.total === 0) {
      return 0;
    }

    return (meta.page - 1) * meta.limit + 1;
  }, [meta.limit, meta.page, meta.total]);

  const shownTo = useMemo(() => {
    return Math.min(meta.total, meta.page * meta.limit);
  }, [meta.limit, meta.page, meta.total]);

  async function updateVisibility(review: AdminReviewItem, isHidden: boolean) {
    try {
      setMutatingReviewId(review.id);

      const response = await fetch(`/api/proxy/admin/reviews/${review.id}/visibility`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isHidden,
          reason: isHidden ? 'Скрыто администратором' : 'Восстановлено администратором',
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Не удалось обновить отзыв: ${response.status}`);
      }

      await loadReviews('refresh');
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : 'Не удалось обновить отзыв';

      setError(message);
    } finally {
      setMutatingReviewId(null);
    }
  }

  function resetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setStatus('ALL');
    setRating('ALL');
    setHasMedia(false);
    setHasResponse(false);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Отзывы</h1>
          <p className="mt-1 text-sm text-slate-500">
            Отзывы клиентов по ресторанам и заказам
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadReviews('refresh')}
          disabled={isRefreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Всего отзывов"
          value={summary.total}
          subtitle="Все время"
          icon={<MessageSquare className="h-5 w-5" />}
          iconClassName="bg-violet-100 text-violet-700"
        />

        <KpiCard
          title="Видимые"
          value={summary.visible}
          subtitle={
            summary.total > 0
              ? `${((summary.visible / summary.total) * 100).toFixed(1)}% от всех`
              : '0% от всех'
          }
          icon={<Eye className="h-5 w-5" />}
          iconClassName="bg-emerald-100 text-emerald-700"
        />

        <KpiCard
          title="Скрытые"
          value={summary.hidden}
          subtitle={
            summary.total > 0
              ? `${((summary.hidden / summary.total) * 100).toFixed(1)}% от всех`
              : '0% от всех'
          }
          icon={<EyeOff className="h-5 w-5" />}
          iconClassName="bg-red-100 text-red-700"
        />

        <KpiCard
          title="Средний рейтинг"
          value={formatRating(summary.avgRating)}
          subtitle="На основе отзывов"
          icon={<Star className="h-5 w-5" />}
          iconClassName="bg-amber-100 text-amber-700"
        />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 xl:max-w-[520px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по тексту, клиенту, телефону, ресторану, заказу"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <FilterGroup label="Статус:">
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setStatus(item.value);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    status === item.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </FilterGroup>

            <FilterGroup label="Оценка:">
              {RATING_FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setRating(item);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    rating === item
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item === 'ALL' ? 'Все оценки' : item}
                </button>
              ))}
            </FilterGroup>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={hasMedia}
                onChange={(event) => {
                  setHasMedia(event.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              С медиа
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={hasResponse}
                onChange={(event) => {
                  setHasResponse(event.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              С ответом
            </label>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Сбросить
            </button>
          </div>
        </div>

        {error ? (
          <div className="m-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="font-semibold">Не удалось загрузить отзывы</div>
            <div className="mt-1 line-clamp-3 text-xs">{error}</div>
            <button
              type="button"
              onClick={() => void loadReviews('refresh')}
              className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              Повторить
            </button>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-[1480px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Клиент</th>
                <th className="px-4 py-3">Ресторан</th>
                <th className="px-4 py-3">Заказ</th>
                <th className="px-4 py-3">Оценка</th>
                <th className="px-4 py-3">Текст</th>
                <th className="px-4 py-3">Медиа</th>
                <th className="px-4 py-3">Ответ</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">
                    Загрузка отзывов...
                  </td>
                </tr>
              ) : null}

              {!isLoading && items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">
                    Отзывы не найдены
                  </td>
                </tr>
              ) : null}

              {!isLoading &&
                items.map((review) => (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    isMutating={mutatingReviewId === review.id}
                    onHide={() => void updateVisibility(review, true)}
                    onRestore={() => void updateVisibility(review, false)}
                  />
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-500">
            Показано {shownFrom}–{shownTo} из {meta.total} отзывов
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={meta.page <= 1 || isLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Назад
            </button>

            <div className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white">
              {meta.page}
            </div>

            <div className="px-1 text-sm text-slate-500">из {Math.max(1, meta.pages)}</div>

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(Math.max(1, meta.pages), current + 1))}
              disabled={meta.page >= meta.pages || isLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Вперёд
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  iconClassName,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconClassName: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-600">{title}</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
          <div className="mt-2 text-sm text-slate-500">{subtitle}</div>
        </div>

        <div className={`rounded-2xl p-3 ${iconClassName}`}>{icon}</div>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </div>
  );
}

function ReviewRow({
  review,
  isMutating,
  onHide,
  onRestore,
}: {
  review: AdminReviewItem;
  isMutating: boolean;
  onHide: () => void;
  onRestore: () => void;
}) {
  return (
    <tr className="border-b border-slate-100 text-sm text-slate-700 transition hover:bg-slate-50/70">
      <td className="px-4 py-4 align-top">
        <div className="font-semibold text-slate-950">{review.client.name}</div>
        <div className="mt-1 text-xs text-slate-500">
          {review.client.phone ?? 'телефон не указан'}
        </div>
      </td>

      <td className="px-4 py-4 align-top">
        <div className="font-semibold text-slate-950">{review.restaurant.nameRu}</div>
        <div className="mt-1 text-xs text-slate-500">{review.restaurant.nameKk}</div>
      </td>

      <td className="px-4 py-4 align-top">
        {review.order ? (
          <div>
            <div className="font-semibold text-slate-950">№{review.order.number}</div>
            <div className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
              {review.order.status}
            </div>
            <div className="mt-1 text-xs text-slate-500">{formatMoney(review.order.total)}</div>
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>

      <td className="px-4 py-4 align-top">
        <div className="flex items-center gap-1">
          <span className="text-base font-semibold text-slate-950">{review.rating}</span>
          <span className="text-xs text-slate-500">/ 5</span>
        </div>
        <div className="mt-1 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`h-4 w-4 ${
                index < review.rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-slate-200 text-slate-200'
              }`}
            />
          ))}
        </div>
      </td>

      <td className="max-w-[360px] px-4 py-4 align-top">
        <div className="line-clamp-2 text-slate-700">
          {review.text?.trim() || 'Без текста'}
        </div>

        {review.pros.length > 0 ? (
          <div className="mt-2 line-clamp-1 text-xs text-emerald-700">
            Плюсы: {review.pros.join(', ')}
          </div>
        ) : null}

        {review.cons.length > 0 ? (
          <div className="mt-1 line-clamp-1 text-xs text-red-700">
            Минусы: {review.cons.join(', ')}
          </div>
        ) : null}
      </td>

      <td className="px-4 py-4 align-top">
        <div className="font-semibold text-slate-950">{review.mediaCount}</div>
      </td>

      <td className="px-4 py-4 align-top">
        {review.hasResponse ? (
          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
            Есть ответ
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            Нет ответа
          </span>
        )}
      </td>

      <td className="px-4 py-4 align-top">
        {review.isHidden ? (
          <span className="inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
            Скрыт
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
            Видимый
          </span>
        )}
      </td>

      <td className="px-4 py-4 align-top text-slate-500">
        {formatDateTime(review.createdAt)}
      </td>

      <td className="px-4 py-4 align-top">
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            href={`/layout-20/users/${review.client.id}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Клиент
          </Link>

          <Link
            href={`/layout-20/restaurants/${review.restaurant.id}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ресторан
          </Link>

          {review.order ? (
            <Link
              href={`/layout-20/orders/${review.order.id}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Заказ
            </Link>
          ) : null}

          {review.isHidden ? (
            <button
              type="button"
              onClick={onRestore}
              disabled={isMutating}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
            >
              Вернуть
            </button>
          ) : (
            <button
              type="button"
              onClick={onHide}
              disabled={isMutating}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              Скрыть
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}