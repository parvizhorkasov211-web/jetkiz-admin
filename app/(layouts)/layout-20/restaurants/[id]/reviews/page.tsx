'use client';

import Link from 'next/link';
import { Eye, EyeOff, RefreshCw, Search, Star } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/api';
import type {
  AdminReviewItem,
  AdminReviewsMeta,
  AdminReviewsResponse,
  AdminReviewStatusFilter,
} from '@/components/ui/widgets/admin-reviews/admin-reviews.types';

type RatingFilter = 'ALL' | '5' | '4' | '3' | '2' | '1';

const EMPTY_META: AdminReviewsMeta = {
  total: 0,
  page: 1,
  limit: 50,
  pages: 1,
};

function dateInput(daysAgo = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value: number | null | undefined): string {
  return `${new Intl.NumberFormat('ru-RU').format(Number(value ?? 0))} ₸`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Не удалось загрузить отзывы ресторана';
}

export default function RestaurantReviewsPage() {
  const params = useParams<{ id: string }>();
  const restaurantId = String(params?.id ?? '').trim();

  const [items, setItems] = useState<AdminReviewItem[]>([]);
  const [meta, setMeta] = useState<AdminReviewsMeta>(EMPTY_META);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<AdminReviewStatusFilter>('ALL');
  const [rating, setRating] = useState<RatingFilter>('ALL');
  const [hasMedia, setHasMedia] = useState(false);
  const [hasResponse, setHasResponse] = useState(false);
  const [from, setFrom] = useState(dateInput(30));
  const [to, setTo] = useState(dateInput(0));
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = useMemo(() => {
    const value = new URLSearchParams();
    value.set('restaurantId', restaurantId);
    value.set('page', String(page));
    value.set('limit', String(meta.limit || 50));
    value.set('status', status);
    if (from) value.set('from', from);
    if (to) value.set('to', to);
    if (debouncedSearch) value.set('search', debouncedSearch);
    if (rating !== 'ALL') value.set('rating', rating);
    if (hasMedia) value.set('hasMedia', 'true');
    if (hasResponse) value.set('hasResponse', 'true');
    return value.toString();
  }, [debouncedSearch, from, hasMedia, hasResponse, meta.limit, page, rating, restaurantId, status, to]);

  const load = useCallback(
    async (initial = false) => {
      if (!restaurantId) return;
      initial ? setLoading(true) : setRefreshing(true);
      setError(null);

      try {
        const response = (await apiFetch(`/admin/reviews?${query}`, {
          cache: 'no-store',
        })) as AdminReviewsResponse;

        setItems(Array.isArray(response.items) ? response.items : []);
        setMeta(response.meta ?? EMPTY_META);
      } catch (loadError) {
        setItems([]);
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query, restaurantId],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  async function updateVisibility(review: AdminReviewItem, isHidden: boolean) {
    setMutatingId(review.id);
    setError(null);

    try {
      await apiFetch(`/admin/reviews/${review.id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({
          isHidden,
          reason: isHidden
            ? 'Скрыто администратором из карточки ресторана'
            : 'Восстановлено администратором из карточки ресторана',
        }),
      });
      await load(false);
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    } finally {
      setMutatingId(null);
    }
  }

  const restaurantName = items[0]?.restaurant?.nameRu || 'Ресторан';

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href={`/layout-20/restaurants/${restaurantId}`} className="text-sm font-semibold text-violet-600 hover:text-violet-700">
              ← Карточка ресторана
            </Link>
            <h1 className="mt-2 text-2xl font-bold">Отзывы ресторана</h1>
            <p className="mt-1 text-sm text-slate-500">
              {restaurantName}. Все данные загружаются через защищённый административный API.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(false)}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </header>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-6">
          <label className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Текст, клиент, телефон или номер заказа"
              className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-violet-400"
            />
          </label>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as AdminReviewStatusFilter);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="ALL">Все отзывы</option>
            <option value="VISIBLE">Видимые</option>
            <option value="HIDDEN">Скрытые</option>
          </select>

          <select
            value={rating}
            onChange={(event) => {
              setRating(event.target.value as RatingFilter);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="ALL">Все оценки</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={String(value)}>{value} ★</option>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          />

          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={hasMedia}
              onChange={(event) => {
                setHasMedia(event.target.checked);
                setPage(1);
              }}
            />
            Только с фото/медиа
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={hasResponse}
              onChange={(event) => {
                setHasResponse(event.target.checked);
                setPage(1);
              }}
            />
            Только с ответом
          </label>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Клиент</th>
                  <th className="px-4 py-3">Заказ</th>
                  <th className="px-4 py-3">Оценка</th>
                  <th className="px-4 py-3">Отзыв</th>
                  <th className="px-4 py-3">Медиа</th>
                  <th className="px-4 py-3">Ответ ресторана</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">Загрузка отзывов...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">По выбранным условиям отзывов нет</td></tr>
                ) : items.map((review) => (
                  <tr key={review.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="font-semibold">{review.client.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{review.client.phone || 'Телефон не указан'}</div>
                    </td>
                    <td className="px-4 py-4">
                      {review.order ? (
                        <>
                          <Link href={`/layout-20/orders/${review.order.id}`} className="font-semibold text-violet-600 hover:underline">
                            № {review.order.number}
                          </Link>
                          <div className="mt-1 text-xs text-slate-500">{formatMoney(review.order.total)}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 font-bold text-amber-700">
                        <Star className="h-4 w-4 fill-current" /> {review.rating}
                      </span>
                    </td>
                    <td className="max-w-[340px] px-4 py-4">
                      <div className="whitespace-pre-wrap text-slate-700">{review.text || 'Без текста'}</div>
                      {review.pros.length ? <div className="mt-2 text-xs text-emerald-700">Плюсы: {review.pros.join(', ')}</div> : null}
                      {review.cons.length ? <div className="mt-1 text-xs text-rose-700">Минусы: {review.cons.join(', ')}</div> : null}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{review.mediaCount || 0}</td>
                    <td className="max-w-[260px] px-4 py-4 text-slate-600">{review.response?.text || 'Нет ответа'}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${review.isHidden ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {review.isHidden ? 'Скрыт' : 'Виден'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatDate(review.createdAt)}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        disabled={mutatingId === review.id}
                        onClick={() => void updateVisibility(review, !review.isHidden)}
                        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50 ${review.isHidden ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-rose-200 text-rose-700 hover:bg-rose-50'}`}
                      >
                        {review.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        {review.isHidden ? 'Показать' : 'Скрыть'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-500">Всего: {meta.total.toLocaleString('ru-RU')}</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Назад</button>
              <span>{meta.page} / {Math.max(1, meta.pages)}</span>
              <button type="button" disabled={page >= meta.pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Далее</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
