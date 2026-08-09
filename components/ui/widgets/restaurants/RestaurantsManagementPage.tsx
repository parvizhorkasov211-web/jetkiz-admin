'use client';

import {
  Archive,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  ImageIcon,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Store,
  UnlockKeyhole,
  Upload,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { apiFetch } from '@/lib/api';
import { getSession } from '@/lib/auth';

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
  onboardingNote?: string | null;
  isInApp?: boolean | null;
  isAcceptingOrders?: boolean | null;
  isPinned?: boolean | null;
  sortOrder?: number | null;
  useRandom?: boolean | null;
  phone?: string | null;
  address?: string | null;
  workingHours?: string | null;
  descriptionRu?: string | null;
  descriptionKk?: string | null;
  coverImageUrl?: string | null;
  ownerUserId?: string | null;
  ownerPhone?: string | null;
  ownerName?: string | null;
  owner?: OwnerShape | null;
  ownerUser?: OwnerShape | null;
  branchIndex?: number | null;
  branchCount?: number | null;
  branchNumber?: number | null;
  branchName?: string | null;
  branchLabel?: string | null;
  isMainBranch?: boolean | null;
  restaurantCommissionPctOverride?: number | null;
  effectiveRestaurantCommissionPct?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type OwnerGroup = {
  key: string;
  phone: string | null;
  ownerName: string | null;
  restaurants: RestaurantRow[];
};

type ModerationFilter = 'all' | 'attention' | 'approved' | 'rejected' | 'blocked';
type VisibilityFilter = 'all' | 'visible' | 'hidden';
type OrdersFilter = 'all' | 'accepting' | 'paused';

type EditorState = {
  nameRu: string;
  nameKk: string;
  phone: string;
  address: string;
  workingHours: string;
  descriptionRu: string;
  descriptionKk: string;
  ownerPhone: string;
  sortOrder: string;
};

type DecisionKind = 'needs_changes' | 'reject' | 'block' | 'unblock' | 'archive' | 'save_owner';
type DecisionState = { kind: DecisionKind; rowId: string } | null;

type AdminView = {
  permissionCodes?: string[];
  permissions?: string[];
};

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

function listFromResponse(value: unknown): RestaurantRow[] {
  if (Array.isArray(value)) return value as RestaurantRow[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as RestaurantRow[];
    if (Array.isArray(record.data)) return record.data as RestaurantRow[];
  }
  return [];
}

function ownerId(row: RestaurantRow): string | null {
  return row.ownerUserId ?? row.ownerUser?.id ?? row.owner?.id ?? null;
}

function ownerPhone(row: RestaurantRow): string | null {
  return row.ownerPhone ?? row.ownerUser?.phone ?? row.owner?.phone ?? null;
}

function ownerName(row: RestaurantRow): string | null {
  if (row.ownerName?.trim()) return row.ownerName.trim();
  const name = [row.ownerUser?.firstName ?? row.owner?.firstName, row.ownerUser?.lastName ?? row.owner?.lastName]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return name || null;
}

function restaurantName(row: RestaurantRow): string {
  return row.nameRu?.trim() || row.nameKk?.trim() || 'Ресторан без названия';
}

function onboarding(row: RestaurantRow): string {
  return String(row.onboardingStatus ?? '').trim().toUpperCase();
}

function isApproved(row: RestaurantRow): boolean {
  return onboarding(row) === 'APPROVED';
}

function isBlocked(row: RestaurantRow): boolean {
  return onboarding(row) === 'BLOCKED';
}

function needsAttention(row: RestaurantRow): boolean {
  const value = onboarding(row);
  return value === '' || value === 'DRAFT' || value === 'PENDING_REVIEW' || value === 'NEEDS_CHANGES';
}

function moderationLabel(row: RestaurantRow): string {
  switch (onboarding(row)) {
    case 'DRAFT': return 'Черновик';
    case 'PENDING_REVIEW': return 'На проверке';
    case 'NEEDS_CHANGES': return 'Нужны изменения';
    case 'APPROVED': return 'Одобрен';
    case 'REJECTED': return 'Отклонён';
    case 'BLOCKED': return 'Заблокирован';
    default: return 'Нужно проверить';
  }
}

function moderationTone(row: RestaurantRow): 'neutral' | 'success' | 'warning' | 'danger' {
  const value = onboarding(row);
  if (value === 'APPROVED') return 'success';
  if (value === 'REJECTED' || value === 'BLOCKED') return 'danger';
  if (value === 'PENDING_REVIEW' || value === 'NEEDS_CHANGES' || value === 'DRAFT' || !value) return 'warning';
  return 'neutral';
}

function branchLabel(row: RestaurantRow, index: number): string {
  if (row.branchLabel?.trim()) return row.branchLabel.replace('#', '').trim();
  if (row.branchName?.trim()) return row.branchName.trim();
  if (row.isMainBranch === true) return 'Основной';
  const num = row.branchIndex ?? row.branchNumber;
  if (num === 1) return 'Основной';
  if (typeof num === 'number' && num > 1) return `Филиал ${num}`;
  return index === 0 ? 'Основной' : `Филиал ${index + 1}`;
}

function groupRestaurants(rows: RestaurantRow[]): OwnerGroup[] {
  const groups = new Map<string, OwnerGroup>();
  for (const row of rows) {
    const key = ownerId(row) || `restaurant:${row.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.restaurants.push(row);
    } else {
      groups.set(key, {
        key,
        phone: ownerPhone(row),
        ownerName: ownerName(row),
        restaurants: [row],
      });
    }
  }
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      restaurants: [...group.restaurants].sort((a, b) => {
        const ai = a.branchIndex ?? a.branchNumber ?? a.number ?? Number.MAX_SAFE_INTEGER;
        const bi = b.branchIndex ?? b.branchNumber ?? b.number ?? Number.MAX_SAFE_INTEGER;
        return ai === bi ? restaurantName(a).localeCompare(restaurantName(b), 'ru') : ai - bi;
      }),
    }))
    .sort((a, b) => (a.ownerName || a.phone || restaurantName(a.restaurants[0])).localeCompare(
      b.ownerName || b.phone || restaurantName(b.restaurants[0]),
      'ru',
    ));
}

function editorFrom(row: RestaurantRow): EditorState {
  return {
    nameRu: row.nameRu ?? '',
    nameKk: row.nameKk ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    workingHours: row.workingHours ?? '',
    descriptionRu: row.descriptionRu ?? '',
    descriptionKk: row.descriptionKk ?? '',
    ownerPhone: ownerPhone(row) ?? '',
    sortOrder: String(row.sortOrder ?? 0),
  };
}

function permissionCodes(admin: AdminView | null): string[] {
  if (!admin) return [];
  return Array.from(new Set([
    ...(Array.isArray(admin.permissionCodes) ? admin.permissionCodes : []),
    ...(Array.isArray(admin.permissions) ? admin.permissions : []),
  ].map((value) => String(value).trim()).filter(Boolean)));
}

function can(admin: AdminView | null, code: string): boolean {
  if (!admin) return false;
  const codes = permissionCodes(admin);
  return codes.length === 0 || codes.includes('*') || codes.includes(code);
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

function errorText(error: unknown, fallback: string): string {
  const status = errorStatus(error);
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('restaurant not found')) return 'Ресторан не найден. Обновите список.';
  if (message.includes('phone')) return 'Проверьте номер телефона.';
  if (message.includes('nameru')) return 'Укажите название на русском языке.';
  if (message.includes('namekk')) return 'Укажите название на казахском языке.';
  if (message.includes('workinghours')) return 'Проверьте график работы.';
  if (message.includes('unsupported file type')) return 'Выберите изображение JPG, PNG или WebP.';
  if (status === 400) return 'Проверьте заполненные данные и повторите попытку.';
  if (status === 401) return 'Сессия истекла. Войдите снова.';
  if (status === 403) return 'У вас нет прав для этого действия.';
  if (status === 404) return 'Ресторан не найден. Обновите список.';
  if (status === 409) return 'Данные уже изменились. Обновите список и повторите действие.';
  if (status !== null && status >= 500) return 'Сервис временно недоступен. Повторите попытку позже.';
  return fallback;
}

function absoluteImage(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? `/api/proxy${path}` : `/api/proxy/${path}`;
}

function normalizedPhone(value: string | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  return digits;
}

function csvValue(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function downloadList(rows: RestaurantRow[]) {
  const header = ['Ресторан', 'Владелец', 'Телефон', 'Адрес', 'Проверка', 'В приложении', 'Приём заказов'];
  const body = rows.map((row) => [
    restaurantName(row),
    ownerPhone(row) || '',
    row.phone || '',
    row.address || '',
    moderationLabel(row),
    row.isInApp === true ? 'Да' : 'Нет',
    row.isAcceptingOrders === true ? 'Да' : 'Нет',
  ]);
  const text = [header, ...body].map((line) => line.map(csvValue).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([`\ufeff${text}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'restorany.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function StatusTag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'blue' }) {
  const cls = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  }[tone];
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold ${cls}`}>{children}</span>;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const color = {
    default: 'text-slate-950',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
  }[tone];
  return (
    <div className="min-w-0 border-r border-slate-200 px-5 py-4 last:border-r-0">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</div>
      <div className={`mt-1 text-[24px] font-black leading-none ${color}`}>{value}</div>
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
  kind = 'secondary',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  kind?: 'primary' | 'secondary' | 'danger' | 'success';
  className?: string;
}) {
  const styles = {
    primary: 'border-slate-950 bg-slate-950 text-white hover:bg-slate-800',
    secondary: 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
    danger: 'border-red-200 bg-white text-red-700 hover:bg-red-50',
    success: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
  }[kind];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-[13px] font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-bold text-slate-600">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11px] font-medium text-slate-400">{hint}</span> : null}
    </label>
  );
}

const inputClass = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400';
const textareaClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400';

function StateSwitch({
  label,
  description,
  active,
  onClick,
  disabled,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-5 border-b border-slate-100 py-3.5 text-left last:border-b-0 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-slate-900">{label}</span>
        <span className="mt-0.5 block text-[11px] font-medium leading-4 text-slate-400">{description}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${active ? 'bg-slate-950' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${active ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

export function RestaurantsManagementPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<RestaurantRow[]>([]);
  const [admin, setAdmin] = useState<AdminView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [moderationFilter, setModerationFilter] = useState<ModerationFilter>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [ordersFilter, setOrdersFilter] = useState<OrdersFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [decision, setDecision] = useState<DecisionState>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);

  const [defaultCommission, setDefaultCommission] = useState<number | null>(null);
  const [globalCommission, setGlobalCommission] = useState('');
  const [globalCommissionSaving, setGlobalCommissionSaving] = useState(false);
  const [commissionInput, setCommissionInput] = useState('');
  const [commissionSaving, setCommissionSaving] = useState(false);

  const canUpdate = can(admin, 'restaurants.update');
  const canFinance = can(admin, 'finance.settings');

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [restaurantsResult, commissionResult, sessionResult] = await Promise.allSettled([
        apiFetch<unknown>('/restaurants'),
        apiFetch<{ restaurantCommissionPctDefault?: number }>('/restaurants/commission/default'),
        getSession(),
      ]);
      if (restaurantsResult.status === 'rejected') throw restaurantsResult.reason;
      const next = listFromResponse(restaurantsResult.value);
      setItems(next);
      if (commissionResult.status === 'fulfilled') {
        const value = commissionResult.value.restaurantCommissionPctDefault;
        const normalized = typeof value === 'number' ? value : null;
        setDefaultCommission(normalized);
        setGlobalCommission(normalized === null ? '' : String(normalized));
      }
      if (sessionResult.status === 'fulfilled' && sessionResult.value.authenticated) {
        setAdmin((sessionResult.value.admin ?? null) as AdminView | null);
      }
    } catch (caught) {
      setError(errorText(caught, 'Не удалось загрузить рестораны. Повторите попытку.'));
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeRow = useMemo(() => items.find((row) => row.id === activeId) ?? null, [items, activeId]);

  useEffect(() => {
    if (!activeRow) return;
    setEditor(editorFrom(activeRow));
    const value = activeRow.restaurantCommissionPctOverride;
    setCommissionInput(typeof value === 'number' ? String(value) : '');
  }, [activeRow]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((row) => {
      if (q) {
        const text = [row.nameRu, row.nameKk, row.phone, row.address, ownerPhone(row), ownerName(row)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (moderationFilter === 'attention' && !needsAttention(row)) return false;
      if (moderationFilter === 'approved' && !isApproved(row)) return false;
      if (moderationFilter === 'rejected' && onboarding(row) !== 'REJECTED') return false;
      if (moderationFilter === 'blocked' && !isBlocked(row)) return false;
      if (visibilityFilter === 'visible' && row.isInApp !== true) return false;
      if (visibilityFilter === 'hidden' && row.isInApp === true) return false;
      if (ordersFilter === 'accepting' && row.isAcceptingOrders !== true) return false;
      if (ordersFilter === 'paused' && row.isAcceptingOrders === true) return false;
      return true;
    });
  }, [items, query, moderationFilter, visibilityFilter, ordersFilter]);

  const groups = useMemo(() => groupRestaurants(filtered), [filtered]);
  const allGroups = useMemo(() => groupRestaurants(items), [items]);
  const summary = useMemo(() => ({
    total: items.length,
    owners: allGroups.length,
    attention: items.filter(needsAttention).length,
    visible: items.filter((row) => row.isInApp === true).length,
    accepting: items.filter((row) => row.isAcceptingOrders === true).length,
    blocked: items.filter(isBlocked).length,
  }), [items, allGroups]);

  const runMutation = async (row: RestaurantRow, action: () => Promise<unknown>, success: string) => {
    try {
      setBusyId(row.id);
      setError(null);
      setNotice(null);
      await action();
      await load(true);
      setNotice(success);
    } catch (caught) {
      setError(errorText(caught, 'Не удалось выполнить действие. Повторите попытку.'));
    } finally {
      setBusyId(null);
    }
  };

  const patch = async (row: RestaurantRow, body: Record<string, unknown>, success: string) => {
    await runMutation(row, () => apiFetch(`/restaurants/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }), success);
  };

  const approve = async (row: RestaurantRow) => {
    await patch(row, { onboardingStatus: 'APPROVED', onboardingNote: null }, 'Ресторан одобрен. Показ и приём заказов включаются отдельно.');
  };

  const setVisible = async (row: RestaurantRow, next: boolean) => {
    if (next && !isApproved(row)) {
      setError('Сначала одобрите ресторан. После этого его можно показать в приложении.');
      return;
    }
    await runMutation(row, () => apiFetch(`/restaurants/${row.id}/in-app`, {
      method: 'PATCH',
      body: JSON.stringify({ isInApp: next }),
    }), next ? 'Ресторан показан в приложении.' : 'Ресторан скрыт, приём заказов остановлен.');
  };

  const setAccepting = async (row: RestaurantRow, next: boolean) => {
    if (next && !isApproved(row)) return setError('Сначала одобрите ресторан.');
    if (next && row.isInApp !== true) return setError('Сначала покажите ресторан в приложении.');
    if (next && row.status !== 'OPEN') return setError('Сначала разрешите работу ресторана.');
    await patch(row, { isAcceptingOrders: next }, next ? 'Приём заказов включён.' : 'Приём заказов остановлен.');
  };

  const setWorkAllowed = async (row: RestaurantRow, next: boolean) => {
    await patch(
      row,
      next ? { status: 'OPEN' } : { status: 'CLOSED', isAcceptingOrders: false },
      next ? 'Работа ресторана разрешена.' : 'Работа ресторана остановлена.',
    );
  };

  const setPinned = async (row: RestaurantRow, next: boolean) => {
    if (next && row.isInApp !== true) return setError('Закрепить можно только ресторан, который показан в приложении.');
    await runMutation(row, () => apiFetch(`/restaurants/${row.id}/pinned`, {
      method: 'PATCH',
      body: JSON.stringify({ isPinned: next, sortOrder: Math.max(0, Math.round(Number(row.sortOrder ?? 0))) }),
    }), next ? 'Ресторан закреплён.' : 'Закрепление снято.');
  };

  const saveEditor = async (row: RestaurantRow, allowOwnerChange = false) => {
    if (!editor) return;
    const nameRu = editor.nameRu.trim();
    const nameKk = editor.nameKk.trim();
    if (!nameRu) return setError('Укажите название на русском языке.');
    if (!nameKk) return setError('Укажите название на казахском языке.');
    const order = Number(editor.sortOrder || 0);
    if (!Number.isFinite(order) || order < 0) return setError('Порядок показа должен быть целым числом от нуля.');

    const ownerChanged = normalizedPhone(editor.ownerPhone) !== normalizedPhone(ownerPhone(row));
    if (ownerChanged && !allowOwnerChange) {
      setDecision({ kind: 'save_owner', rowId: row.id });
      return;
    }

    const body: Record<string, unknown> = {
      nameRu,
      nameKk,
      phone: editor.phone,
      address: editor.address,
      workingHours: editor.workingHours,
      descriptionRu: editor.descriptionRu,
      descriptionKk: editor.descriptionKk,
      sortOrder: Math.round(order),
    };
    if (ownerChanged) body.ownerPhone = editor.ownerPhone;
    await runMutation(row, () => apiFetch(`/restaurants/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }), ownerChanged ? 'Данные сохранены, владелец изменён.' : 'Данные ресторана сохранены.');
  };

  const uploadCover = async (file: File | null) => {
    if (!activeRow || !file) return;
    if (!IMAGE_TYPES.has(file.type)) return setError('Выберите изображение JPG, PNG или WebP.');
    if (file.size > MAX_IMAGE_SIZE) return setError('Размер изображения не должен превышать 8 МБ.');
    try {
      setCoverUploading(true);
      setError(null);
      const form = new FormData();
      form.append('file', file);
      await apiFetch(`/restaurants/${activeRow.id}/cover`, { method: 'POST', body: form });
      await load(true);
      setNotice('Обложка обновлена.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (caught) {
      setError(errorText(caught, 'Не удалось загрузить изображение.'));
    } finally {
      setCoverUploading(false);
    }
  };

  const saveGlobalCommission = async () => {
    const value = Number(globalCommission.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError('Комиссия должна быть числом от 0 до 100.');
      return;
    }
    try {
      setGlobalCommissionSaving(true);
      setError(null);
      const result = await apiFetch<{ restaurantCommissionPctDefault?: number }>('/restaurants/commission/default', {
        method: 'PATCH',
        body: JSON.stringify({ restaurantCommissionPctDefault: Math.trunc(value) }),
      });
      const next = typeof result.restaurantCommissionPctDefault === 'number' ? result.restaurantCommissionPctDefault : Math.trunc(value);
      setDefaultCommission(next);
      setGlobalCommission(String(next));
      setNotice('Общая комиссия сохранена.');
      await load(true);
    } catch (caught) {
      setError(errorText(caught, 'Не удалось сохранить общую комиссию.'));
    } finally {
      setGlobalCommissionSaving(false);
    }
  };

  const saveRestaurantCommission = async (row: RestaurantRow) => {
    const raw = commissionInput.trim();
    const value = raw === '' ? null : Number(raw.replace(',', '.'));
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
      setError('Комиссия должна быть числом от 0 до 100.');
      return;
    }
    try {
      setCommissionSaving(true);
      setError(null);
      await apiFetch(`/restaurants/${row.id}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({ restaurantCommissionPctOverride: value === null ? null : Math.trunc(value) }),
      });
      await load(true);
      setNotice(value === null ? 'Для ресторана используется общая комиссия.' : 'Индивидуальная комиссия сохранена.');
    } catch (caught) {
      setError(errorText(caught, 'Не удалось сохранить комиссию ресторана.'));
    } finally {
      setCommissionSaving(false);
    }
  };

  const openBranch = (group: OwnerGroup) => {
    const first = group.restaurants[0];
    const params = new URLSearchParams({ mode: 'branch' });
    const phone = group.phone || first?.phone || '';
    if (phone) params.set('ownerPhone', phone);
    if (first?.id) params.set('fromRestaurantId', first.id);
    router.push(`/layout-20/restaurants/new?${params.toString()}`);
  };

  const decisionRow = decision ? items.find((row) => row.id === decision.rowId) ?? null : null;

  const confirmDecision = async () => {
    if (!decision || !decisionRow) return;
    const row = decisionRow;
    const note = decisionNote.trim();
    const needsReason = decision.kind === 'needs_changes' || decision.kind === 'reject' || decision.kind === 'block';
    if (needsReason && !note) return setError('Укажите причину решения.');
    const kind = decision.kind;
    setDecision(null);
    setDecisionNote('');

    if (kind === 'needs_changes') {
      await patch(row, { onboardingStatus: 'NEEDS_CHANGES', onboardingNote: note, isInApp: false, isAcceptingOrders: false }, 'Ресторан возвращён на доработку.');
      return;
    }
    if (kind === 'reject') {
      await patch(row, { onboardingStatus: 'REJECTED', onboardingNote: note, isInApp: false, isAcceptingOrders: false }, 'Ресторан отклонён.');
      return;
    }
    if (kind === 'block') {
      await patch(row, { onboardingStatus: 'BLOCKED', onboardingNote: note, isInApp: false, isAcceptingOrders: false, status: 'CLOSED', isPinned: false, sortOrder: 0 }, 'Ресторан заблокирован.');
      return;
    }
    if (kind === 'unblock') {
      await patch(row, { onboardingStatus: 'APPROVED', onboardingNote: null, isInApp: false, isAcceptingOrders: false }, 'Блокировка снята. Показ и приём заказов остаются выключенными.');
      return;
    }
    if (kind === 'archive') {
      await runMutation(row, () => apiFetch(`/restaurants/${row.id}`, { method: 'DELETE' }), 'Ресторан архивирован.');
      return;
    }
    if (kind === 'save_owner') await saveEditor(row, true);
  };

  const clearFilters = () => {
    setQuery('');
    setModerationFilter('all');
    setVisibilityFilter('all');
    setOrdersFilter('all');
  };

  const decisionInfo = (() => {
    if (!decision) return null;
    const data: Record<DecisionKind, { title: string; text: string; action: string; danger?: boolean; reason?: boolean }> = {
      needs_changes: { title: 'Вернуть на доработку', text: 'Ресторан будет скрыт, а приём заказов остановлен.', action: 'Вернуть на доработку', reason: true },
      reject: { title: 'Отклонить ресторан', text: 'Ресторан будет скрыт и не сможет принимать заказы.', action: 'Отклонить', danger: true, reason: true },
      block: { title: 'Заблокировать ресторан', text: 'Ресторан будет закрыт, скрыт и остановит приём заказов.', action: 'Заблокировать', danger: true, reason: true },
      unblock: { title: 'Снять блокировку', text: 'Ресторан станет одобренным, но останется скрытым до отдельного включения.', action: 'Снять блокировку' },
      archive: { title: 'Архивировать ресторан', text: 'История сохранится. Ресторан будет скрыт и остановлен.', action: 'Архивировать', danger: true },
      save_owner: { title: 'Сменить владельца', text: 'Доступ текущего владельца будет отключён, новый владелец получит доступ к этому ресторану.', action: 'Сохранить и сменить владельца' },
    };
    return data[decision.kind];
  })();

  return (
    <div className="min-h-screen bg-[#f7f7f8] px-5 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1680px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-black tracking-[-0.03em]">Рестораны</h1>
            <p className="mt-1 text-[14px] font-medium text-slate-500">Управление ресторанами и филиалами</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => router.push('/layout-20/restaurants/new')} disabled={!canUpdate}>
              <Plus className="h-4 w-4" /> Добавить ресторан
            </Button>
            <Button kind="primary" onClick={() => router.push('/layout-20/restaurants/new?mode=branch')} disabled={!canUpdate}>
              <Plus className="h-4 w-4" /> Добавить филиал
            </Button>
          </div>
        </header>

        <section className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <Metric label="Всего" value={summary.total} />
            <Metric label="Владельцев" value={summary.owners} />
            <Metric label="Нужно решение" value={summary.attention} tone="warning" />
            <Metric label="В приложении" value={summary.visible} tone="success" />
            <Metric label="Принимают заказы" value={summary.accepting} tone="success" />
            <Metric label="Заблокировано" value={summary.blocked} tone="danger" />
          </div>
        </section>

        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по названию, адресу, телефону или владельцу"
                className={`${inputClass} pl-10`}
              />
            </div>
            <select value={moderationFilter} onChange={(event) => setModerationFilter(event.target.value as ModerationFilter)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none">
              <option value="all">Все решения</option>
              <option value="attention">Нужно решение</option>
              <option value="approved">Одобренные</option>
              <option value="rejected">Отклонённые</option>
              <option value="blocked">Заблокированные</option>
            </select>
            <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none">
              <option value="all">Все публикации</option>
              <option value="visible">В приложении</option>
              <option value="hidden">Скрытые</option>
            </select>
            <button type="button" onClick={() => setFiltersOpen((value) => !value)} className={`h-10 rounded-lg border px-3 text-[13px] font-bold ${filtersOpen ? 'border-slate-400 bg-slate-100 text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
              Фильтры
            </button>
            <button type="button" onClick={() => void load()} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Обновить">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => downloadList(filtered)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Скачать список">
              <Download className="h-4 w-4" />
            </button>
          </div>

          {filtersOpen ? (
            <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
              <Field label="Приём заказов">
                <select value={ordersFilter} onChange={(event) => setOrdersFilter(event.target.value as OrdersFilter)} className={inputClass}>
                  <option value="all">Любое состояние</option>
                  <option value="accepting">Принимают</option>
                  <option value="paused">Остановлен</option>
                </select>
              </Field>
              {canFinance ? (
                <Field label="Общая комиссия" hint="Для ресторанов без своей настройки">
                  <div className="flex items-center gap-2">
                    <input value={globalCommission} onChange={(event) => setGlobalCommission(event.target.value)} className={`${inputClass} w-24`} inputMode="decimal" placeholder={defaultCommission === null ? '20' : String(defaultCommission)} />
                    <span className="text-[13px] font-bold text-slate-500">%</span>
                    <Button onClick={() => void saveGlobalCommission()} disabled={globalCommissionSaving}>{globalCommissionSaving ? 'Сохраняю' : 'Сохранить'}</Button>
                  </div>
                </Field>
              ) : null}
              <Button onClick={clearFilters}><RotateCcw className="h-4 w-4" /> Сбросить</Button>
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
            <span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Закрыть"><X className="h-4 w-4" /></button>
          </div>
        ) : null}
        {notice ? (
          <div className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700">
            <span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Закрыть"><X className="h-4 w-4" /></button>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-[16px] font-black">Список ресторанов</h2>
              <p className="mt-0.5 text-[12px] font-medium text-slate-400">Нажмите на ресторан, чтобы открыть управление</p>
            </div>
            <div className="text-[12px] font-bold text-slate-400">Показано: {filtered.length} из {items.length}</div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1040px]">
              <div className="grid grid-cols-[minmax(280px,1.6fr)_minmax(180px,1fr)_150px_130px_150px_120px_56px] items-center border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                <div>Ресторан</div><div>Владелец</div><div>Проверка</div><div>В приложении</div><div>Заказы</div><div>Сейчас</div><div />
              </div>

              {loading && items.length === 0 ? (
                <div className="space-y-0">
                  {[0, 1, 2].map((item) => <div key={item} className="h-[74px] animate-pulse border-b border-slate-100 bg-slate-50/60" />)}
                </div>
              ) : groups.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="text-[16px] font-black text-slate-900">Ничего не найдено</div>
                  <div className="mt-1 text-[13px] font-medium text-slate-400">Измените фильтры или добавьте ресторан.</div>
                  <div className="mt-4 flex justify-center gap-2"><Button onClick={clearFilters}>Сбросить фильтры</Button><Button kind="primary" onClick={() => router.push('/layout-20/restaurants/new')}>Добавить ресторан</Button></div>
                </div>
              ) : groups.map((group) => {
                const expanded = expandedGroups[group.key] !== false;
                const attentionCount = group.restaurants.filter(needsAttention).length;
                return (
                  <div key={group.key} className="border-b border-slate-200 last:border-b-0">
                    <div className="flex items-center justify-between gap-4 bg-slate-50/70 px-5 py-2.5">
                      <button type="button" onClick={() => setExpandedGroups((current) => ({ ...current, [group.key]: !expanded }))} className="flex min-w-0 items-center gap-2 text-left">
                        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        <span className="truncate text-[12px] font-black text-slate-700">{group.ownerName || group.phone || 'Владелец не указан'}</span>
                        <span className="text-[11px] font-semibold text-slate-400">· {group.restaurants.length} {group.restaurants.length === 1 ? 'филиал' : 'филиала'}</span>
                        {attentionCount > 0 ? <StatusTag tone="warning">Нужно решение: {attentionCount}</StatusTag> : null}
                      </button>
                      <Button onClick={() => openBranch(group)} disabled={!canUpdate}><Plus className="h-3.5 w-3.5" /> Филиал</Button>
                    </div>

                    {expanded ? group.restaurants.map((row, index) => {
                      const busy = busyId === row.id;
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => setActiveId(row.id)}
                          className="grid w-full grid-cols-[minmax(280px,1.6fr)_minmax(180px,1fr)_150px_130px_150px_120px_56px] items-center px-5 py-3.5 text-left transition hover:bg-slate-50"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"><Store className="h-4 w-4" /></div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2"><span className="truncate text-[13px] font-black text-slate-950">{restaurantName(row)}</span><StatusTag>{branchLabel(row, index)}</StatusTag></div>
                              <div className="mt-1 truncate text-[11px] font-medium text-slate-400">{row.address || 'Адрес не указан'} · {row.workingHours || 'график не указан'}</div>
                            </div>
                          </div>
                          <div className="min-w-0 pr-3"><div className="truncate text-[12px] font-bold text-slate-700">{ownerName(row) || ownerPhone(row) || 'Не указан'}</div><div className="mt-1 truncate text-[11px] font-medium text-slate-400">{ownerPhone(row) || 'нет телефона'}</div></div>
                          <div><StatusTag tone={moderationTone(row)}>{moderationLabel(row)}</StatusTag></div>
                          <div>{row.isInApp === true ? <StatusTag tone="success">Показывается</StatusTag> : <StatusTag>Скрыт</StatusTag>}</div>
                          <div>{row.isAcceptingOrders === true ? <StatusTag tone="blue">Принимает</StatusTag> : <StatusTag>Остановлены</StatusTag>}</div>
                          <div>{row.runtimeStatus === 'OPEN' ? <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Открыт</span> : <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500"><span className="h-2 w-2 rounded-full bg-slate-300" />Закрыт</span>}</div>
                          <div className="flex justify-end"><span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white"><ChevronRight className={`h-4 w-4 ${busy ? 'animate-pulse' : ''}`} /></span></div>
                        </button>
                      );
                    }) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {activeRow && editor ? (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/35" onMouseDown={(event) => { if (event.currentTarget === event.target) setActiveId(null); }}>
          <aside className="h-full w-full max-w-[640px] overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-4 px-6 py-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-[21px] font-black tracking-[-0.02em]">{restaurantName(activeRow)}</h2>
                    <StatusTag tone={moderationTone(activeRow)}>{moderationLabel(activeRow)}</StatusTag>
                  </div>
                  <div className="mt-1 text-[12px] font-medium text-slate-400">Владелец: {ownerName(activeRow) || ownerPhone(activeRow) || 'не указан'}</div>
                </div>
                <button type="button" onClick={() => setActiveId(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Закрыть"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-4 border-t border-slate-100 text-center text-[11px] font-bold">
                <div className="px-2 py-2.5 text-slate-500">Проверка<br /><span className="text-slate-900">{moderationLabel(activeRow)}</span></div>
                <div className="border-l border-slate-100 px-2 py-2.5 text-slate-500">Приложение<br /><span className="text-slate-900">{activeRow.isInApp ? 'Включено' : 'Скрыт'}</span></div>
                <div className="border-l border-slate-100 px-2 py-2.5 text-slate-500">Заказы<br /><span className="text-slate-900">{activeRow.isAcceptingOrders ? 'Принимает' : 'Стоп'}</span></div>
                <div className="border-l border-slate-100 px-2 py-2.5 text-slate-500">Сейчас<br /><span className={activeRow.runtimeStatus === 'OPEN' ? 'text-emerald-700' : 'text-slate-900'}>{activeRow.runtimeStatus === 'OPEN' ? 'Открыт' : 'Закрыт'}</span></div>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              <section className="px-6 py-5">
                <div className="mb-4 flex items-center justify-between"><div><h3 className="text-[14px] font-black">Решение по ресторану</h3><p className="mt-1 text-[11px] font-medium text-slate-400">Одобрение не включает публикацию автоматически.</p></div></div>
                <div className="flex flex-wrap gap-2">
                  {!isApproved(activeRow) && !isBlocked(activeRow) ? <Button kind="success" disabled={!canUpdate || busyId === activeRow.id} onClick={() => void approve(activeRow)}><Check className="h-4 w-4" /> Одобрить</Button> : null}
                  {!isBlocked(activeRow) ? <Button disabled={!canUpdate || busyId === activeRow.id} onClick={() => setDecision({ kind: 'needs_changes', rowId: activeRow.id })}>Вернуть на доработку</Button> : null}
                  {!isBlocked(activeRow) ? <Button kind="danger" disabled={!canUpdate || busyId === activeRow.id} onClick={() => setDecision({ kind: 'reject', rowId: activeRow.id })}>Отклонить</Button> : null}
                  {!isBlocked(activeRow) ? <Button kind="danger" disabled={!canUpdate || busyId === activeRow.id} onClick={() => setDecision({ kind: 'block', rowId: activeRow.id })}><LockKeyhole className="h-4 w-4" /> Заблокировать</Button> : <Button disabled={!canUpdate || busyId === activeRow.id} onClick={() => setDecision({ kind: 'unblock', rowId: activeRow.id })}><UnlockKeyhole className="h-4 w-4" /> Снять блокировку</Button>}
                </div>
                {activeRow.onboardingNote ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-medium leading-5 text-amber-900"><span className="font-black">Комментарий:</span> {activeRow.onboardingNote}</div> : null}
              </section>

              <section className="px-6 py-5">
                <h3 className="text-[14px] font-black">Публикация и работа</h3>
                <div className="mt-2">
                  <StateSwitch label={activeRow.isInApp ? 'Показывается в приложении' : 'Скрыт в приложении'} description="Определяет, видят ли клиенты ресторан." active={activeRow.isInApp === true} disabled={!canUpdate || busyId === activeRow.id} onClick={() => void setVisible(activeRow, activeRow.isInApp !== true)} />
                  <StateSwitch label={activeRow.isAcceptingOrders ? 'Принимает заказы' : 'Приём заказов остановлен'} description="Можно включить только после одобрения, публикации и разрешения работы." active={activeRow.isAcceptingOrders === true} disabled={!canUpdate || busyId === activeRow.id} onClick={() => void setAccepting(activeRow, activeRow.isAcceptingOrders !== true)} />
                  <StateSwitch label={activeRow.status === 'OPEN' ? 'Работа разрешена' : 'Работа остановлена'} description="Ручное разрешение на работу ресторана." active={activeRow.status === 'OPEN'} disabled={!canUpdate || busyId === activeRow.id} onClick={() => void setWorkAllowed(activeRow, activeRow.status !== 'OPEN')} />
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"><div><div className="text-[12px] font-bold text-slate-700">По графику сейчас</div><div className="mt-0.5 text-[11px] font-medium text-slate-400">{activeRow.workingHours || 'График не указан'}</div></div><StatusTag tone={activeRow.runtimeStatus === 'OPEN' ? 'success' : 'neutral'}>{activeRow.runtimeStatus === 'OPEN' ? 'Открыт' : 'Закрыт'}</StatusTag></div>
              </section>

              <section className="px-6 py-5">
                <div className="mb-4 flex items-center justify-between"><div><h3 className="text-[14px] font-black">Основные данные</h3><p className="mt-1 text-[11px] font-medium text-slate-400">Изменения применяются только после сохранения.</p></div><Pencil className="h-4 w-4 text-slate-400" /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Название на русском"><input className={inputClass} value={editor.nameRu} onChange={(event) => setEditor({ ...editor, nameRu: event.target.value })} /></Field>
                  <Field label="Название на казахском"><input className={inputClass} value={editor.nameKk} onChange={(event) => setEditor({ ...editor, nameKk: event.target.value })} /></Field>
                  <Field label="Телефон ресторана"><input className={inputClass} value={editor.phone} onChange={(event) => setEditor({ ...editor, phone: event.target.value })} /></Field>
                  <Field label="Телефон владельца"><input className={inputClass} value={editor.ownerPhone} onChange={(event) => setEditor({ ...editor, ownerPhone: event.target.value })} /></Field>
                  <div className="sm:col-span-2"><Field label="Адрес"><input className={inputClass} value={editor.address} onChange={(event) => setEditor({ ...editor, address: event.target.value })} /></Field></div>
                  <div className="sm:col-span-2"><Field label="График работы"><input className={inputClass} value={editor.workingHours} onChange={(event) => setEditor({ ...editor, workingHours: event.target.value })} placeholder="09:00-22:00" /></Field></div>
                  <div className="sm:col-span-2"><Field label="Описание на русском"><textarea className={textareaClass} rows={3} value={editor.descriptionRu} onChange={(event) => setEditor({ ...editor, descriptionRu: event.target.value })} /></Field></div>
                  <div className="sm:col-span-2"><Field label="Описание на казахском"><textarea className={textareaClass} rows={3} value={editor.descriptionKk} onChange={(event) => setEditor({ ...editor, descriptionKk: event.target.value })} /></Field></div>
                </div>
                <div className="mt-4 flex justify-end"><Button kind="primary" disabled={!canUpdate || busyId === activeRow.id} onClick={() => void saveEditor(activeRow)}><Save className="h-4 w-4" /> Сохранить данные</Button></div>
              </section>

              <section className="px-6 py-5">
                <h3 className="text-[14px] font-black">Обложка</h3>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-[92px] w-[140px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {activeRow.coverImageUrl ? <img src={absoluteImage(activeRow.coverImageUrl)} alt="Обложка ресторана" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-slate-300" />}
                  </div>
                  <div className="min-w-0"><p className="text-[11px] font-medium text-slate-400">JPG, PNG или WebP, до 8 МБ.</p><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void uploadCover(event.target.files?.[0] ?? null)} /><Button className="mt-3" onClick={() => fileInputRef.current?.click()} disabled={!canUpdate || coverUploading}><Upload className="h-4 w-4" /> {coverUploading ? 'Загружаю' : 'Выбрать изображение'}</Button></div>
                </div>
              </section>

              <section className="px-6 py-5">
                <h3 className="text-[14px] font-black">Порядок показа</h3>
                <div className="mt-2">
                  <StateSwitch label={activeRow.isPinned ? 'Ресторан закреплён' : 'Без закрепления'} description="Закреплённые рестораны получают приоритет в выдаче." active={activeRow.isPinned === true} disabled={!canUpdate || busyId === activeRow.id} onClick={() => void setPinned(activeRow, activeRow.isPinned !== true)} />
                  <StateSwitch label={activeRow.useRandom ? 'Случайный показ включён' : 'Случайный показ выключен'} description="Меняет порядок показа при разрешённом случайном режиме." active={activeRow.useRandom === true} disabled={!canUpdate || busyId === activeRow.id} onClick={() => void patch(activeRow, { useRandom: activeRow.useRandom !== true }, activeRow.useRandom ? 'Случайный показ отключён.' : 'Случайный показ включён.')} />
                </div>
                <div className="mt-3 max-w-[180px]"><Field label="Порядок"><input className={inputClass} value={editor.sortOrder} inputMode="numeric" onChange={(event) => setEditor({ ...editor, sortOrder: event.target.value })} /></Field></div>
              </section>

              {canFinance ? (
                <section className="px-6 py-5">
                  <h3 className="text-[14px] font-black">Комиссия ресторана</h3>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">Пустое поле означает общую комиссию.</p>
                  <div className="mt-3 flex items-center gap-2"><input value={commissionInput} onChange={(event) => setCommissionInput(event.target.value)} className={`${inputClass} w-28`} inputMode="decimal" placeholder="общая" /><span className="text-[13px] font-bold text-slate-500">%</span><Button onClick={() => void saveRestaurantCommission(activeRow)} disabled={commissionSaving}>{commissionSaving ? 'Сохраняю' : 'Сохранить'}</Button><span className="text-[11px] font-medium text-slate-400">Сейчас: {activeRow.effectiveRestaurantCommissionPct ?? defaultCommission ?? 0}%</span></div>
                </section>
              ) : null}

              <section className="px-6 py-5">
                <h3 className="text-[14px] font-black">Разделы ресторана</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button onClick={() => router.push(`/layout-20/restaurants/${activeRow.id}`)}>Карточка <ArrowUpRight className="h-3.5 w-3.5" /></Button>
                  <Button onClick={() => router.push(`/layout-20/restaurants/${activeRow.id}/menu`)}><UtensilsCrossed className="h-3.5 w-3.5" /> Меню</Button>
                  <Button onClick={() => router.push(`/layout-20/orders?restaurantId=${encodeURIComponent(activeRow.id)}`)}>Заказы</Button>
                  <Button onClick={() => router.push(`/layout-20/restaurants/${activeRow.id}/reviews`)}>Отзывы</Button>
                </div>
              </section>

              <section className="px-6 py-5">
                <h3 className="text-[14px] font-black text-red-700">Архив</h3>
                <p className="mt-1 text-[11px] font-medium text-slate-400">История ресторана не удаляется.</p>
                <Button kind="danger" className="mt-3" disabled={!canUpdate || busyId === activeRow.id} onClick={() => setDecision({ kind: 'archive', rowId: activeRow.id })}><Archive className="h-4 w-4" /> Архивировать ресторан</Button>
              </section>
            </div>
          </aside>
        </div>
      ) : null}

      {decision && decisionInfo && decisionRow ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-[480px] rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4"><div><h3 className="text-[17px] font-black">{decisionInfo.title}</h3><p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">{decisionInfo.text}</p></div><button type="button" onClick={() => { setDecision(null); setDecisionNote(''); }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500"><X className="h-4 w-4" /></button></div>
            <div className="px-5 py-4">
              {decisionInfo.reason ? <Field label="Причина"><textarea className={textareaClass} rows={4} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Коротко укажите причину" /></Field> : null}
              <div className="mt-4 flex justify-end gap-2"><Button onClick={() => { setDecision(null); setDecisionNote(''); }}>Отмена</Button><Button kind={decisionInfo.danger ? 'danger' : 'primary'} onClick={() => void confirmDecision()}>{decisionInfo.action}</Button></div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
