'use client';

import {
  ChevronRight,
  Download,
  RefreshCw,
  Search,
  ShieldBan,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/api';

type Segment = 'NEW' | 'REGULAR' | 'VIP';
type ClientState = 'ACTIVE' | 'BLOCKED' | 'INACTIVE';

type ClientRow = {
  id: string;
  phone: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name: string;
  isActive: boolean;
  isBlocked: boolean;
  state: ClientState;
  stateLabel: string;
  segment: Segment;
  totalOrders: number;
  deliveredCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  lastOrderNumber: number | null;
  lastOrderStatus: string | null;
  lastOrderTotal: number | null;
  lastActiveAt: string | null;
  createdAt: string;
  piiVisible?: boolean;
};

type ClientListResponse = {
  items: ClientRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    total: number;
    active: number;
    blocked: number;
    inactive: number;
    segments: { NEW: number; REGULAR: number; VIP: number };
  };
};

const EMPTY: ClientListResponse = {
  items: [],
  meta: { page: 1, limit: 25, total: 0, pages: 0 },
  summary: {
    total: 0,
    active: 0,
    blocked: 0,
    inactive: 0,
    segments: { NEW: 0, REGULAR: 0, VIP: 0 },
  },
};

function segmentLabel(value: Segment) {
  if (value === 'VIP') return 'VIP';
  if (value === 'REGULAR') return 'Постоянный';
  return 'Новый';
}

function segmentClass(value: Segment) {
  if (value === 'VIP') return 'border-violet-200 bg-violet-50 text-violet-700';
  if (value === 'REGULAR') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function stateClass(value: ClientState) {
  if (value === 'BLOCKED') return 'border-red-200 bg-red-50 text-red-700';
  if (value === 'ACTIVE') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function orderStatus(value: string | null) {
  switch (String(value ?? '').toUpperCase()) {
    case 'CREATED': return 'Создан';
    case 'ACCEPTED': return 'Принят';
    case 'COOKING': return 'Готовится';
    case 'READY': return 'Готов';
    case 'ON_THE_WAY': return 'В пути';
    case 'DELIVERED': return 'Доставлен';
    case 'REJECTED': return 'Отклонён';
    case 'CANCELED': return 'Отменён';
    case 'PAID': return 'Оплачен';
    default: return 'Нет заказов';
  }
}

function dateTime(value: string | null) {
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

function money(value: number | null | undefined) {
  return `${Math.round(Number(value ?? 0)).toLocaleString('ru-RU')} ₸`;
}

function friendlyError(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    if (status === 401) return 'Сессия истекла. Войдите снова.';
    if (status === 403) return 'У вас нет прав для этого действия.';
    if (status === 404) return 'Клиенты не найдены.';
    if (typeof status === 'number' && status >= 500) {
      return 'Сервис временно недоступен. Повторите попытку позже.';
    }
  }
  return fallback;
}

export default function UsersPage() {
  const router = useRouter();
  const limit = 25;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<'ALL' | Segment>('ALL');
  const [state, setState] = useState<'ALL' | ClientState>('ALL');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ClientListResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      segment,
      state,
    });
    if (search) params.set('q', search);
    return params.toString();
  }, [page, search, segment, state]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFetch<ClientListResponse>(`/admin/clients?${query}`);
      setData({
        items: Array.isArray(result?.items) ? result.items : [],
        meta: result?.meta ?? EMPTY.meta,
        summary: result?.summary ?? EMPTY.summary,
      });
    } catch (caught) {
      setData(EMPTY);
      setError(friendlyError(caught, 'Не удалось загрузить клиентов.'));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCsv() {
    try {
      setExporting(true);
      setError(null);
      const params = new URLSearchParams({ segment, state });
      if (search) params.set('q', search);
      const response = await fetch(`/api/proxy/admin/clients/export?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        if (response.status === 403) throw Object.assign(new Error(), { status: 403 });
        throw Object.assign(new Error(), { status: response.status });
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `klienty-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(friendlyError(caught, 'Не удалось скачать список клиентов.'));
    } finally {
      setExporting(false);
    }
  }

  const reset = () => {
    setSearchInput('');
    setSearch('');
    setSegment('ALL');
    setState('ALL');
    setPage(1);
  };

  const pages = Math.max(1, data.meta.pages || Math.ceil(data.meta.total / limit));

  return (
    <main className="min-h-screen bg-[#f7f7f8] px-5 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="w-full">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-black tracking-[-0.03em]">Клиенты</h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500">
              {data.meta.total.toLocaleString('ru-RU')} в списке с учётом фильтров
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={exporting}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-[13px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> {exporting ? 'Подготовка' : 'Экспорт'}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Обновить
            </button>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">
              Всего <UsersRound className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-2 text-[24px] font-black">{data.summary.total}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">
              Активные <UserRound className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-[24px] font-black">{data.summary.active}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">
              VIP <span className="text-[13px] text-violet-600">VIP</span>
            </div>
            <div className="mt-2 text-[24px] font-black">{data.summary.segments.VIP}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">
              Заблокированы <ShieldBan className="h-4 w-4 text-red-600" />
            </div>
            <div className="mt-2 text-[24px] font-black">{data.summary.blocked}</div>
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Поиск по имени, телефону или почте"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-[13px] font-semibold outline-none focus:border-slate-400"
              />
            </div>
            <select
              value={segment}
              onChange={(event) => {
                setSegment(event.target.value as 'ALL' | Segment);
                setPage(1);
              }}
              className="h-10 min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Любой сегмент</option>
              <option value="NEW">Новые</option>
              <option value="REGULAR">Постоянные</option>
              <option value="VIP">VIP</option>
            </select>
            <select
              value={state}
              onChange={(event) => {
                setState(event.target.value as 'ALL' | ClientState);
                setPage(1);
              }}
              className="h-10 min-w-[170px] rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Любое состояние</option>
              <option value="ACTIVE">Активные</option>
              <option value="BLOCKED">Заблокированные</option>
              <option value="INACTIVE">Неактивные</option>
            </select>
            {(searchInput || segment !== 'ALL' || state !== 'ALL') && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" /> Сбросить
              </button>
            )}
          </div>
        </section>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full table-fixed">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-black uppercase tracking-[0.07em] text-slate-400">
                  <th className="w-[22%] px-4 py-3">Клиент</th>
                  <th className="w-[13%] px-4 py-3">Состояние</th>
                  <th className="w-[15%] px-4 py-3">Контакты</th>
                  <th className="w-[12%] px-4 py-3">Сегмент</th>
                  <th className="w-[11%] px-4 py-3 text-right">Заказы</th>
                  <th className="w-[13%] px-4 py-3 text-right">Потрачено</th>
                  <th className="w-[12%] px-4 py-3">Последний заказ</th>
                  <th className="w-[36px] px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading && data.items.length === 0 ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td colSpan={8} className="h-[70px] animate-pulse bg-slate-50/60" />
                    </tr>
                  ))
                ) : data.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center">
                      <div className="text-[15px] font-black">Клиенты не найдены</div>
                      <div className="mt-1 text-[12px] font-medium text-slate-400">
                        Измените поиск или фильтры.
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.items.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => router.push(`/layout-20/users/${client.id}`)}
                      className="cursor-pointer border-b border-slate-100 text-[12px] transition hover:bg-slate-50 last:border-b-0"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-black text-slate-950">{client.name || 'Без имени'}</div>
                        <div className="mt-1 text-[11px] font-medium text-slate-400">
                          Зарегистрирован {dateTime(client.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold ${stateClass(client.state)}`}>
                          {client.stateLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{client.phone}</div>
                        <div className="mt-1 truncate text-[11px] font-medium text-slate-400">
                          {client.email || 'Почта не указана'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold ${segmentClass(client.segment)}`}>
                          {segmentLabel(client.segment)}
                        </span>
                        <div className="mt-1 text-[10px] font-medium text-slate-400">
                          по доставленным заказам
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-black text-slate-950">{client.totalOrders}</div>
                        <div className="mt-1 text-[10px] font-medium text-slate-400">
                          доставлено {client.deliveredCount}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-950">
                        {money(client.totalSpent)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-700">{orderStatus(client.lastOrderStatus)}</div>
                        <div className="mt-1 text-[10px] font-medium text-slate-400">
                          {client.lastOrderNumber ? `№${client.lastOrderNumber} · ` : ''}{dateTime(client.lastOrderAt)}
                        </div>
                      </td>
                      <td className="px-2 py-3.5 text-right text-slate-400">
                        <ChevronRight className="h-4 w-4" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <div className="text-[12px] font-medium text-slate-500">
              Страница {page} из {pages} · {data.meta.total.toLocaleString('ru-RU')} клиентов
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={page >= pages || loading}
                onClick={() => setPage((value) => value + 1)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Вперёд
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
