'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Store,
  Utensils,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

type OwnerShape = {
  id?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

type RestaurantRow = {
  id: string;
  number?: number | null;
  slug?: string | null;
  nameRu: string;
  nameKk?: string | null;
  status?: string | null;
  runtimeStatus?: string | null;
  onboardingStatus?: string | null;
  isInApp?: boolean | null;
  isAcceptingOrders?: boolean | null;
  isPinned?: boolean | null;
  sortOrder?: number | null;
  phone?: string | null;
  address?: string | null;
  workingHours?: string | null;
  descriptionRu?: string | null;
  descriptionKk?: string | null;
  coverImageUrl?: string | null;
  ownerUserId?: string | null;
  ownerPhone?: string | null;
  owner?: OwnerShape | null;
  ownerUser?: OwnerShape | null;
  branchIndex?: number | null;
  branchNumber?: number | null;
  branchName?: string | null;
  isMainBranch?: boolean | null;
  restaurantCommissionPctOverride?: number | null;
  effectiveRestaurantCommissionPct?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type PendingRestaurantIdsResponse = {
  ids?: string[];
};

type StatusFilter = 'all' | 'open' | 'closed';
type AppFilter = 'all' | 'visible' | 'hidden';
type BranchFilter = 'all' | 'main' | 'branch';

type OwnerGroup = {
  key: string;
  title: string;
  phone: string | null;
  restaurants: RestaurantRow[];
  total: number;
  inAppCount: number;
  hiddenCount: number;
  openCount: number;
  closedCount: number;
};

const moneyFormatter = new Intl.NumberFormat('ru-RU');

function toPctOrNull(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return Math.trunc(parsed);
}

function getOwnerUserId(row: RestaurantRow): string | null {
  return row.ownerUserId ?? row.ownerUser?.id ?? row.owner?.id ?? null;
}

function getOwnerPhone(row: RestaurantRow): string | null {
  return row.ownerPhone ?? row.ownerUser?.phone ?? row.owner?.phone ?? row.phone ?? null;
}

function getRestaurantName(row: RestaurantRow): string {
  return row.nameRu || row.nameKk || 'Ресторан';
}

function isOpen(row: RestaurantRow): boolean {
  return row.runtimeStatus === 'OPEN' || row.status === 'OPEN';
}

function isVisibleInApp(row: RestaurantRow): boolean {
  return row.isInApp !== false;
}

function sortRestaurants(a: RestaurantRow, b: RestaurantRow): number {
  const aBranch = typeof a.branchNumber === 'number' ? a.branchNumber : null;
  const bBranch = typeof b.branchNumber === 'number' ? b.branchNumber : null;

  if (aBranch !== null && bBranch !== null && aBranch !== bBranch) {
    return aBranch - bBranch;
  }

  const aNumber = typeof a.number === 'number' ? a.number : Number.MAX_SAFE_INTEGER;
  const bNumber = typeof b.number === 'number' ? b.number : Number.MAX_SAFE_INTEGER;

  if (aNumber !== bNumber) return aNumber - bNumber;

  const aDate = a.createdAt ? Date.parse(a.createdAt) : Number.MAX_SAFE_INTEGER;
  const bDate = b.createdAt ? Date.parse(b.createdAt) : Number.MAX_SAFE_INTEGER;

  if (aDate !== bDate) return aDate - bDate;

  return getRestaurantName(a).localeCompare(getRestaurantName(b), 'ru');
}

function getBranchLabel(row: RestaurantRow, index: number): string {
  if (row.branchName?.trim()) return row.branchName.trim();
  if (row.isMainBranch === true) return 'Основной';

  if (typeof row.branchNumber === 'number' && row.branchNumber > 0) {
    return row.branchNumber === 1 ? 'Основной' : `Филиал ${row.branchNumber}`;
  }

  if (typeof row.branchIndex === 'number' && row.branchIndex > 0) {
    return row.branchIndex === 1 ? 'Основной' : `Филиал ${row.branchIndex}`;
  }

  return index === 0 ? 'Основной' : `Филиал ${index + 1}`;
}

function groupRestaurants(rows: RestaurantRow[]): OwnerGroup[] {
  const groups = new Map<string, OwnerGroup>();

  for (const row of rows) {
    const ownerId = getOwnerUserId(row);
    const phone = getOwnerPhone(row);
    const key = ownerId || phone || `restaurant:${row.id}`;
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        key,
        title: getRestaurantName(row),
        phone,
        restaurants: [row],
        total: 1,
        inAppCount: isVisibleInApp(row) ? 1 : 0,
        hiddenCount: isVisibleInApp(row) ? 0 : 1,
        openCount: isOpen(row) ? 1 : 0,
        closedCount: isOpen(row) ? 0 : 1,
      });
      continue;
    }

    current.restaurants.push(row);
    current.total += 1;
    current.inAppCount += isVisibleInApp(row) ? 1 : 0;
    current.hiddenCount += isVisibleInApp(row) ? 0 : 1;
    current.openCount += isOpen(row) ? 1 : 0;
    current.closedCount += isOpen(row) ? 0 : 1;
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      restaurants: [...group.restaurants].sort(sortRestaurants),
    }))
    .sort((a, b) => {
      const aName = a.title || a.phone || '';
      const bName = b.title || b.phone || '';
      return aName.localeCompare(bName, 'ru');
    });
}

function getApiList(data: any): RestaurantRow[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function mergeRestaurant(row: RestaurantRow, payload: any): RestaurantRow {
  if (!payload || typeof payload !== 'object') return row;

  return {
    ...row,
    ...payload,
    ownerUserId: payload.ownerUserId ?? row.ownerUserId,
    ownerPhone: payload.ownerPhone ?? row.ownerPhone,
    owner: payload.owner ?? row.owner,
    ownerUser: payload.ownerUser ?? row.ownerUser,
  };
}

function normalizeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getInitialCollapsed(groups: OwnerGroup[]): Record<string, boolean> {
  const next: Record<string, boolean> = {};

  for (const group of groups) {
    next[group.key] = true;
  }

  return next;
}

function hasIndividualCommission(row: RestaurantRow): boolean {
  return typeof row.restaurantCommissionPctOverride === 'number';
}

function countIndividualCommissions(rows: RestaurantRow[]): number {
  return rows.filter(hasIndividualCommission).length;
}

function IndividualCommissionBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-xl border border-amber-300 bg-amber-100 px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.04em] text-amber-900 shadow-[0_0_0_3px_rgba(251,191,36,0.18)]">
      {children}
    </span>
  );
}

function Badge({
  children,
  tone = 'gray',
}: {
  children: ReactNode;
  tone?: 'gray' | 'green' | 'red' | 'violet' | 'orange' | 'blue';
}) {
  const styles = {
    gray: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    violet: 'bg-violet-50 text-violet-700',
    orange: 'bg-orange-50 text-orange-700',
    blue: 'bg-blue-50 text-blue-700',
  } satisfies Record<string, string>;

  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[12px] font-black ${styles[tone]}`}>
      {children}
    </span>
  );
}

function SoftButton({
  children,
  onClick,
  disabled,
  tone = 'white',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'white' | 'violet' | 'red';
}) {
  const styles = {
    white: 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
    violet: 'border-violet-600 bg-violet-600 text-white hover:bg-violet-700 shadow-violet-200 shadow-lg',
    red: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  } satisfies Record<string, string>;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-[13px] font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

function OwnerAvatar({ index }: { index: number }) {
  const variants = [
    'bg-violet-100 text-violet-700',
    'bg-orange-100 text-orange-700',
    'bg-emerald-100 text-emerald-700',
    'bg-blue-100 text-blue-700',
  ];

  const cls = variants[index % variants.length];
  const Icon = index % 2 === 0 ? Store : Utensils;

  return (
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${cls}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

function toCsvValue(value: unknown): string {
  const raw = value == null ? '' : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

function downloadCsv(rows: RestaurantRow[]) {
  const headers = ['Название', 'Телефон', 'Адрес', 'Время', 'Статус', 'В приложении'];
  const lines = rows.map((row) => [
    getRestaurantName(row),
    row.phone || '',
    row.address || '',
    row.workingHours || '',
    isOpen(row) ? 'Открыт' : 'Закрыт',
    isVisibleInApp(row) ? 'Да' : 'Нет',
  ]);

  const csv = [headers, ...lines].map((line) => line.map(toCsvValue).join(';')).join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'restaurants.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function RestaurantsPage() {
  const router = useRouter();

  const [items, setItems] = useState<RestaurantRow[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [appFilter, setAppFilter] = useState<AppFilter>('all');
  const [branchFilter, setBranchFilter] = useState<BranchFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [defaultCommission, setDefaultCommission] = useState<number | null>(null);
  const [globalCommission, setGlobalCommission] = useState('');
  const [globalCommissionSaving, setGlobalCommissionSaving] = useState(false);
  const [globalCommissionError, setGlobalCommissionError] = useState<string | null>(null);
  const [commissionEditing, setCommissionEditing] = useState<Record<string, string>>({});
  const [commissionSavingId, setCommissionSavingId] = useState<string | null>(null);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);

      const [restaurantsData, pendingData, commissionData] = await Promise.allSettled([
        apiFetch<any>('/restaurants', { method: 'GET' }),
        apiFetch<PendingRestaurantIdsResponse>('/restaurant-auth/admin/pending-ids', { method: 'GET' }),
        apiFetch<any>('/restaurants/commission/default', { method: 'GET' }),
      ]);

      if (restaurantsData.status === 'rejected') {
        throw restaurantsData.reason;
      }

      const list = getApiList(restaurantsData.value);
      const groups = groupRestaurants(list);

      setItems(list);
      setCollapsed((current) => ({ ...getInitialCollapsed(groups), ...current }));

      if (pendingData.status === 'fulfilled') {
        setPendingIds(Array.isArray(pendingData.value?.ids) ? pendingData.value.ids : []);
      } else {
        setPendingIds([]);
      }

      if (commissionData.status === 'fulfilled') {
        const value = commissionData.value?.restaurantCommissionPctDefault;
        const normalized = typeof value === 'number' ? value : null;
        setDefaultCommission(normalized);
        setGlobalCommission(normalized === null ? '' : String(normalized));
        setGlobalCommissionError(null);
      } else {
        setDefaultCommission(null);
        setGlobalCommission('');
      }
    } catch (e) {
      setItems([]);
      setPendingIds([]);
      setError(normalizeError(e, 'Не удалось загрузить рестораны'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRestaurants();
  }, []);

  const pendingSet = useMemo(() => new Set(pendingIds), [pendingIds]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((row) => {
      if (q) {
        const haystack = [
          row.nameRu,
          row.nameKk,
          row.phone,
          row.address,
          row.workingHours,
          getOwnerPhone(row),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      if (statusFilter === 'open' && !isOpen(row)) return false;
      if (statusFilter === 'closed' && isOpen(row)) return false;
      if (appFilter === 'visible' && !isVisibleInApp(row)) return false;
      if (appFilter === 'hidden' && isVisibleInApp(row)) return false;

      return true;
    });
  }, [items, query, statusFilter, appFilter]);

  const allGroups = useMemo(() => groupRestaurants(filteredItems), [filteredItems]);

  const groups = useMemo(() => {
    if (branchFilter === 'all') return allGroups;

    return allGroups
      .map((group) => {
        const restaurants = group.restaurants.filter((row, index) => {
          const label = getBranchLabel(row, index);
          const isMain = label === 'Основной';
          return branchFilter === 'main' ? isMain : !isMain;
        });

        return {
          ...group,
          restaurants,
          total: restaurants.length,
          inAppCount: restaurants.filter(isVisibleInApp).length,
          hiddenCount: restaurants.filter((row) => !isVisibleInApp(row)).length,
          openCount: restaurants.filter(isOpen).length,
          closedCount: restaurants.filter((row) => !isOpen(row)).length,
        };
      })
      .filter((group) => group.restaurants.length > 0);
  }, [allGroups, branchFilter]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      groups: groupRestaurants(items).length,
      inApp: items.filter(isVisibleInApp).length,
      hidden: items.filter((row) => !isVisibleInApp(row)).length,
      open: items.filter(isOpen).length,
      closed: items.filter((row) => !isOpen(row)).length,
    };
  }, [items]);

  const toggleGroup = (key: string) => {
    setCollapsed((current) => ({ ...current, [key]: !current[key] }));
  };

  const openRestaurant = (id: string) => {
    router.push(`/layout-20/restaurants/${id}`);
  };

  const openCreateBranch = (group: OwnerGroup) => {
    const firstRestaurant = group.restaurants[0];
    const phone = group.phone || firstRestaurant?.phone || '';
    const ownerUserId = getOwnerUserId(firstRestaurant || ({} as RestaurantRow)) || '';

    const params = new URLSearchParams();
    params.set('mode', 'branch');

    if (phone) {
      params.set('ownerPhone', phone);
      params.set('phone', phone);
      params.set('initialPhone', phone);
    }

    if (ownerUserId) {
      params.set('ownerUserId', ownerUserId);
    }

    if (firstRestaurant?.id) {
      params.set('fromRestaurantId', firstRestaurant.id);
    }

    router.push(`/layout-20/restaurants/new?${params.toString()}`);
  };

  const saveGlobalCommission = async () => {
    try {
      setGlobalCommissionSaving(true);
      setGlobalCommissionError(null);
      setError(null);

      const pct = toPctOrNull(globalCommission);

      if (pct === null) {
        throw new Error('Введите комиссию от 0 до 100');
      }

      const updated = await apiFetch<any>('/restaurants/commission/default', {
        method: 'PATCH',
        body: JSON.stringify({
          restaurantCommissionPctDefault: pct,
        }),
      });

      const nextDefault =
        typeof updated?.restaurantCommissionPctDefault === 'number'
          ? updated.restaurantCommissionPctDefault
          : pct;

      setDefaultCommission(nextDefault);
      setGlobalCommission(String(nextDefault));

      setItems((current) =>
        current.map((item) => {
          const hasPersonalCommission =
            typeof item.restaurantCommissionPctOverride === 'number';

          if (hasPersonalCommission) return item;

          return {
            ...item,
            effectiveRestaurantCommissionPct: nextDefault,
          };
        }),
      );
    } catch (e) {
      const message = normalizeError(e, 'Не удалось сохранить общую комиссию');
      setGlobalCommissionError(message);
      setError(message);
    } finally {
      setGlobalCommissionSaving(false);
    }
  };

  const saveRestaurantCommission = async (row: RestaurantRow) => {
    try {
      setCommissionSavingId(row.id);
      setError(null);

      const raw = (commissionEditing[row.id] ?? '').trim();
      const pct = raw === '' ? null : toPctOrNull(raw);

      if (raw !== '' && pct === null) {
        throw new Error('Комиссия должна быть числом от 0 до 100');
      }

      const updated = await apiFetch<any>(`/restaurants/${row.id}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({
          restaurantCommissionPctOverride: pct,
        }),
      });

      const nextOverride =
        typeof updated?.restaurantCommissionPctOverride === 'number' ||
        updated?.restaurantCommissionPctOverride === null
          ? updated.restaurantCommissionPctOverride
          : pct;

      setItems((current) =>
        current.map((item) =>
          item.id === row.id
            ? mergeRestaurant(item, {
                restaurantCommissionPctOverride: nextOverride,
                effectiveRestaurantCommissionPct:
                  typeof updated?.effectiveRestaurantCommissionPct === 'number'
                    ? updated.effectiveRestaurantCommissionPct
                    : nextOverride ?? defaultCommission ?? item.effectiveRestaurantCommissionPct,
              })
            : item,
        ),
      );

      setCommissionEditing((current) => ({
        ...current,
        [row.id]: typeof nextOverride === 'number' ? String(nextOverride) : '',
      }));
    } catch (e) {
      setError(normalizeError(e, 'Не удалось сохранить комиссию ресторана'));
    } finally {
      setCommissionSavingId(null);
    }
  };

  const resetRestaurantCommission = async (row: RestaurantRow) => {
    try {
      setCommissionSavingId(row.id);
      setError(null);

      const updated = await apiFetch<any>(`/restaurants/${row.id}/commission/reset`, {
        method: 'POST',
      });

      setItems((current) =>
        current.map((item) =>
          item.id === row.id
            ? mergeRestaurant(item, {
                restaurantCommissionPctOverride:
                  typeof updated?.restaurantCommissionPctOverride === 'number' ||
                  updated?.restaurantCommissionPctOverride === null
                    ? updated.restaurantCommissionPctOverride
                    : null,
                effectiveRestaurantCommissionPct:
                  typeof updated?.effectiveRestaurantCommissionPct === 'number'
                    ? updated.effectiveRestaurantCommissionPct
                    : defaultCommission ?? item.effectiveRestaurantCommissionPct,
              })
            : item,
        ),
      );

      setCommissionEditing((current) => ({
        ...current,
        [row.id]: '',
      }));
    } catch (e) {
      setError(normalizeError(e, 'Не удалось сбросить комиссию ресторана'));
    } finally {
      setCommissionSavingId(null);
    }
  };

  const toggleInApp = async (row: RestaurantRow) => {
    const next = !isVisibleInApp(row);

    try {
      setBusyId(row.id);
      setError(null);
      setMenuId(null);

      const updated = await apiFetch<any>(`/restaurants/${row.id}/in-app`, {
        method: 'PATCH',
        body: JSON.stringify({ isInApp: next }),
      });

      setItems((current) =>
        current.map((item) =>
          item.id === row.id
            ? mergeRestaurant(item, {
                ...updated,
                isInApp: typeof updated?.isInApp === 'boolean' ? updated.isInApp : next,
              })
            : item,
        ),
      );

      if (next) {
        setPendingIds((current) => current.filter((id) => id !== row.id));
      }
    } catch (e) {
      setError(normalizeError(e, 'Не удалось обновить ресторан'));
    } finally {
      setBusyId(null);
    }
  };

  const archiveRestaurant = async (row: RestaurantRow) => {
    const confirmed = window.confirm(
      'Архивировать ресторан? Он останется в системе, но будет скрыт и закрыт для заказов.',
    );

    if (!confirmed) return;

    try {
      setBusyId(row.id);
      setError(null);
      setMenuId(null);

      const response = await apiFetch<any>(`/restaurants/${row.id}`, {
        method: 'DELETE',
      });

      const updated = response?.restaurant || response || {};

      setItems((current) =>
        current.map((item) =>
          item.id === row.id
            ? mergeRestaurant(item, {
                ...updated,
                isInApp: false,
                status: 'CLOSED',
                runtimeStatus: 'CLOSED',
                isAcceptingOrders: false,
                isPinned: false,
                sortOrder: 0,
              })
            : item,
        ),
      );

      setPendingIds((current) => current.filter((id) => id !== row.id));
    } catch (e) {
      setError(normalizeError(e, 'Не удалось архивировать ресторан'));
    } finally {
      setBusyId(null);
    }
  };

  const changeCommission = async (row: RestaurantRow) => {
    const current =
      typeof row.restaurantCommissionPctOverride === 'number'
        ? String(row.restaurantCommissionPctOverride)
        : '';

    const raw = window.prompt(
      'Введите комиссию ресторана от 0 до 100. Оставьте пустым, чтобы использовать общую комиссию.',
      current,
    );

    if (raw === null) return;

    const trimmed = raw.trim();
    const value = trimmed === '' ? null : Number(trimmed);

    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
      window.alert('Комиссия должна быть числом от 0 до 100');
      return;
    }

    try {
      setBusyId(row.id);
      setError(null);
      setMenuId(null);

      const updated = await apiFetch<any>(`/restaurants/${row.id}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({
          restaurantCommissionPctOverride: value === null ? null : Math.trunc(value),
        }),
      });

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === row.id
            ? mergeRestaurant(item, {
                restaurantCommissionPctOverride:
                  typeof updated?.restaurantCommissionPctOverride === 'number' ||
                  updated?.restaurantCommissionPctOverride === null
                    ? updated.restaurantCommissionPctOverride
                    : value,
                effectiveRestaurantCommissionPct:
                  typeof updated?.effectiveRestaurantCommissionPct === 'number'
                    ? updated.effectiveRestaurantCommissionPct
                    : item.effectiveRestaurantCommissionPct,
              })
            : item,
        ),
      );
    } catch (e) {
      setError(normalizeError(e, 'Не удалось изменить комиссию'));
    } finally {
      setBusyId(null);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setAppFilter('all');
    setBranchFilter('all');
  };

  return (
    <div className="min-h-screen w-full bg-[#f5f6fa] px-5 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="flex w-full max-w-none flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-slate-950">Рестораны</h1>
            <p className="mt-1 text-[14px] font-semibold text-slate-500">
              Управление ресторанами и филиалами
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SoftButton onClick={() => router.push('/layout-20/restaurants/new')}>
              <Plus className="h-4 w-4" />
              Добавить ресторан
            </SoftButton>

            <SoftButton tone="violet" onClick={() => router.push('/layout-20/restaurants/new?mode=branch')}>
              <Plus className="h-4 w-4" />
              Добавить филиал
            </SoftButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border border-white bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="text-[12px] font-black uppercase text-slate-400">Всего</div>
            <div className="mt-1 text-2xl font-black text-slate-950">{summary.total}</div>
          </div>
          <div className="rounded-2xl border border-white bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="text-[12px] font-black uppercase text-slate-400">Владельцы</div>
            <div className="mt-1 text-2xl font-black text-slate-950">{summary.groups}</div>
          </div>
          <div className="rounded-2xl border border-white bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="text-[12px] font-black uppercase text-slate-400">В приложении</div>
            <div className="mt-1 text-2xl font-black text-emerald-700">{summary.inApp}</div>
          </div>
          <div className="rounded-2xl border border-white bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="text-[12px] font-black uppercase text-slate-400">Скрыто</div>
            <div className="mt-1 text-2xl font-black text-slate-600">{summary.hidden}</div>
          </div>
          <div className="rounded-2xl border border-white bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="text-[12px] font-black uppercase text-slate-400">Открыто</div>
            <div className="mt-1 text-2xl font-black text-emerald-700">{summary.open}</div>
          </div>
          <div className="rounded-2xl border border-white bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="text-[12px] font-black uppercase text-slate-400">Закрыто</div>
            <div className="mt-1 text-2xl font-black text-red-700">{summary.closed}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[280px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по названию или адресу"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-[14px] font-semibold outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-bold text-slate-700 outline-none"
            >
              <option value="all">Все статусы</option>
              <option value="open">Открытые</option>
              <option value="closed">Закрытые</option>
            </select>

            <select
              value={appFilter}
              onChange={(event) => setAppFilter(event.target.value as AppFilter)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-bold text-slate-700 outline-none"
            >
              <option value="all">Все</option>
              <option value="visible">В приложении</option>
              <option value="hidden">Скрытые</option>
            </select>

            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value as BranchFilter)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-bold text-slate-700 outline-none"
            >
              <option value="all">Все типы</option>
              <option value="main">Основные</option>
              <option value="branch">Филиалы</option>
            </select>

            <SoftButton onClick={clearFilters}>
              <Filter className="h-4 w-4" />
              Фильтры
            </SoftButton>

            <button
              type="button"
              onClick={loadRestaurants}
              disabled={loading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              title="Обновить"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => downloadCsv(filteredItems)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              title="Скачать список"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="mr-2">
              <div className="text-[13px] font-black text-slate-900">Общая комиссия</div>
              <div className="text-[12px] font-bold text-slate-400">Применяется ко всем ресторанам без личной комиссии</div>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={globalCommission}
                onChange={(event) => setGlobalCommission(event.target.value)}
                disabled={globalCommissionSaving}
                inputMode="numeric"
                placeholder={defaultCommission === null ? '20' : String(defaultCommission)}
                className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-black text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
              />
              <span className="text-[13px] font-black text-slate-500">%</span>
              <button
                type="button"
                onClick={saveGlobalCommission}
                disabled={globalCommissionSaving}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-black text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {globalCommissionSaving ? 'Сохраняю...' : 'Сохранить для всех'}
              </button>
            </div>

            {globalCommissionError && (
              <div className="text-[13px] font-bold text-red-700">{globalCommissionError}</div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[14px] font-bold text-red-700">
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-2xl bg-white shadow-[0_12px_35px_rgba(15,23,42,0.04)]" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white py-14 text-center shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
            <div className="text-[18px] font-black text-slate-900">Рестораны не найдены</div>
            <div className="mt-2 text-[14px] font-semibold text-slate-500">
              Измените фильтры или добавьте ресторан.
            </div>
            <div className="mt-5">
              <SoftButton tone="violet" onClick={() => router.push('/layout-20/restaurants/new')}>
                <Plus className="h-4 w-4" />
                Добавить ресторан
              </SoftButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group, groupIndex) => {
              const isCollapsed = collapsed[group.key] === true;
              return (
                <div
                  key={group.key}
                  className="overflow-visible rounded-2xl border border-slate-100 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex flex-wrap items-center gap-4 px-4 py-4">
                    <OwnerAvatar index={groupIndex} />

                    <div className="min-w-[220px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[17px] font-black text-slate-950">
                          {group.title}
                        </div>
                        <Badge>{group.total} {group.total === 1 ? 'филиал' : 'филиала'}</Badge>
                      </div>

                      <div className="mt-1 text-[13px] font-bold text-slate-500">
                        Владелец: {group.phone || 'телефон не указан'}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="green">{group.inAppCount} в приложении</Badge>
                      <Badge>{group.hiddenCount} скрыт</Badge>
                      <Badge tone="green">{group.openCount} открыто</Badge>
                      <Badge tone="red">{group.closedCount} закрыто</Badge>
                      {countIndividualCommissions(group.restaurants) > 0 && (
                        <IndividualCommissionBadge>
                          Инд. комиссия: {countIndividualCommissions(group.restaurants)}
                        </IndividualCommissionBadge>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openCreateBranch(group)}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-black text-slate-800 transition hover:bg-slate-50"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Добавить филиал
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50"
                    >
                      {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="border-t border-slate-100">
                      {group.restaurants.map((row, index) => {
                        const branchLabel = getBranchLabel(row, index);
                        const visible = isVisibleInApp(row);
                        const open = isOpen(row);
                        const isPending = pendingSet.has(row.id) || (!!row.onboardingStatus && row.onboardingStatus !== 'APPROVED');
                        const commission =
                          typeof row.restaurantCommissionPctOverride === 'number'
                            ? row.restaurantCommissionPctOverride
                            : typeof row.effectiveRestaurantCommissionPct === 'number'
                              ? row.effectiveRestaurantCommissionPct
                              : defaultCommission;
                        const commissionInput =
                          commissionEditing[row.id] ??
                          (typeof row.restaurantCommissionPctOverride === 'number'
                            ? String(row.restaurantCommissionPctOverride)
                            : '');
                        const hasPersonalCommission =
                          typeof row.restaurantCommissionPctOverride === 'number';

                        return (
                          <div
                            key={row.id}
                            className={`group relative grid grid-cols-1 items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 xl:grid-cols-[36px_minmax(320px,1.45fr)_minmax(180px,0.75fr)_300px_190px_210px] 2xl:grid-cols-[40px_minmax(420px,1.6fr)_minmax(220px,0.75fr)_330px_210px_230px] ${
                              visible ? 'bg-white' : 'bg-slate-50/70'
                            } ${hasPersonalCommission ? 'border-l-4 border-l-amber-400 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.25)]' : ''}`}
                          >
                            <div className="hidden justify-center text-slate-300 xl:flex">⋮⋮</div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openRestaurant(row.id)}
                                  className="truncate text-left text-[16px] font-black text-slate-950 transition hover:text-violet-700"
                                >
                                  {getRestaurantName(row)}
                                </button>

                                <Badge tone={branchLabel === 'Основной' ? 'violet' : 'blue'}>{branchLabel}</Badge>
                                {hasPersonalCommission && (
                                  <IndividualCommissionBadge>
                                    Индивидуальная комиссия
                                  </IndividualCommissionBadge>
                                )}
                                {visible ? <Badge tone="green">В приложении</Badge> : <Badge>Скрыт</Badge>}
                                {open ? <Badge tone="green">Открыт</Badge> : <Badge tone="red">Закрыт</Badge>}
                                {isPending && <Badge tone="orange">На проверке</Badge>}
                              </div>

                              <div className="mt-1 truncate text-[13px] font-semibold text-slate-500">
                                {row.address || 'Адрес не указан'}
                              </div>
                            </div>

                            <div className="text-[13px] font-bold text-slate-500">
                              <div>{row.phone || 'Телефон не указан'}</div>
                              <div className="mt-1">{row.workingHours || 'Время не указано'}</div>
                            </div>

                            <div
                              className="flex flex-wrap items-center gap-2"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                            >
                              <div
                                className={`min-w-[112px] rounded-2xl px-3 py-2 ${
                                  hasPersonalCommission
                                    ? 'border-2 border-amber-300 bg-amber-50 shadow-[0_8px_18px_rgba(245,158,11,0.16)]'
                                    : 'border border-transparent bg-transparent'
                                }`}
                              >
                                <div
                                  className={`text-[12px] font-black uppercase tracking-[0.04em] ${
                                    hasPersonalCommission ? 'text-amber-900' : 'text-slate-500'
                                  }`}
                                >
                                  {hasPersonalCommission ? 'Инд. комиссия' : 'Общая комиссия'}
                                </div>
                                <div
                                  className={`text-[18px] font-black ${
                                    hasPersonalCommission ? 'text-amber-950' : 'text-slate-900'
                                  }`}
                                >
                                  {commission === null || commission === undefined ? '—' : `${moneyFormatter.format(commission)}%`}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <input
                                  value={commissionInput}
                                  onChange={(event) =>
                                    setCommissionEditing((current) => ({
                                      ...current,
                                      [row.id]: event.target.value,
                                    }))
                                  }
                                  disabled={commissionSavingId === row.id}
                                  inputMode="numeric"
                                  placeholder="общая"
                                  className="h-9 w-20 rounded-xl border border-slate-200 bg-white px-2.5 text-[13px] font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
                                  title="Пусто = использовать общую комиссию"
                                />
                                <span className="text-[12px] font-black text-slate-500">%</span>

                                <button
                                  type="button"
                                  disabled={commissionSavingId === row.id}
                                  onClick={() => saveRestaurantCommission(row)}
                                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                  OK
                                </button>

                                <button
                                  type="button"
                                  disabled={commissionSavingId === row.id}
                                  onClick={() => resetRestaurantCommission(row)}
                                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                                >
                                  Сброс
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={busyId === row.id}
                                onClick={() => toggleInApp(row)}
                                className={`inline-flex h-9 min-w-[92px] items-center justify-center rounded-xl px-3 text-[13px] font-black transition disabled:opacity-50 ${
                                  visible
                                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {visible ? 'Скрыть' : 'Показать'}
                              </button>

                              <button
                                type="button"
                                onClick={() => openRestaurant(row.id)}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-black text-slate-700 transition hover:bg-slate-50"
                              >
                                Открыть
                              </button>
                            </div>

                            <div className="relative flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={busyId === row.id}
                                onClick={() => archiveRestaurant(row)}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 px-3 text-[13px] font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                Архив
                              </button>

                              <button
                                type="button"
                                onClick={() => setMenuId((current) => (current === row.id ? null : row.id))}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {menuId === row.id && (
                                <div className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white py-2 shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
                                  <button
                                    type="button"
                                    onClick={() => openRestaurant(row.id)}
                                    className="block w-full px-4 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                                  >
                                    Редактировать
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busyId === row.id}
                                    onClick={() => changeCommission(row)}
                                    className="block w-full px-4 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    Изменить комиссию
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/layout-20/orders?restaurantId=${row.id}`)}
                                    className="block w-full px-4 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                                  >
                                    Заказы ресторана
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/layout-20/restaurants/${row.id}/reviews`)}
                                    className="block w-full px-4 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                                  >
                                    Отзывы
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="pb-4 text-center text-[13px] font-bold text-slate-400">
          Показано: {filteredItems.length} из {items.length}
        </div>
      </div>
    </div>
  );
}
