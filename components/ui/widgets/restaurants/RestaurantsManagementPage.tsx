'use client';

import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  ImageIcon,
  LockKeyhole,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Store,
  UnlockKeyhole,
  Upload,
  Utensils,
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
  title: string;
  phone: string | null;
  ownerName: string | null;
  restaurants: RestaurantRow[];
  total: number;
  inAppCount: number;
  acceptingCount: number;
  attentionCount: number;
};

type ModerationFilter = 'all' | 'attention' | 'approved' | 'rejected' | 'blocked';
type AppFilter = 'all' | 'visible' | 'hidden';
type OrdersFilter = 'all' | 'accepting' | 'paused';
type BranchFilter = 'all' | 'main' | 'branch';
type RuntimeFilter = 'all' | 'open' | 'closed';

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

type DecisionKind =
  | 'needs_changes'
  | 'reject'
  | 'block'
  | 'unblock'
  | 'archive'
  | 'save_owner';

type DecisionState = {
  kind: DecisionKind;
  rowId: string;
} | null;

type AdminView = {
  permissionCodes?: string[];
  permissions?: string[];
  roleCodes?: string[];
  roles?: string[];
};

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

function getApiList(data: unknown): RestaurantRow[] {
  if (Array.isArray(data)) return data as RestaurantRow[];
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as RestaurantRow[];
    if (Array.isArray(record.data)) return record.data as RestaurantRow[];
  }
  return [];
}

function getOwnerUserId(row: RestaurantRow): string | null {
  return row.ownerUserId ?? row.ownerUser?.id ?? row.owner?.id ?? null;
}

function getOwnerPhone(row: RestaurantRow): string | null {
  return row.ownerPhone ?? row.ownerUser?.phone ?? row.owner?.phone ?? null;
}

function getOwnerName(row: RestaurantRow): string | null {
  if (row.ownerName?.trim()) return row.ownerName.trim();
  const parts = [row.ownerUser?.firstName ?? row.owner?.firstName, row.ownerUser?.lastName ?? row.owner?.lastName]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

function getRestaurantName(row: RestaurantRow): string {
  return row.nameRu?.trim() || row.nameKk?.trim() || 'Ресторан без названия';
}

function isVisibleInApp(row: RestaurantRow): boolean {
  return row.isInApp === true;
}

function isAcceptingOrders(row: RestaurantRow): boolean {
  return row.isAcceptingOrders === true;
}

function isOpenNow(row: RestaurantRow): boolean {
  return row.runtimeStatus === 'OPEN';
}

function isManuallyOpen(row: RestaurantRow): boolean {
  return row.status === 'OPEN';
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
  return value === 'DRAFT' || value === 'PENDING_REVIEW' || value === 'NEEDS_CHANGES' || !value;
}

function moderationLabel(row: RestaurantRow): {
  label: string;
  tone: BadgeTone;
} {
  switch (onboarding(row)) {
    case 'DRAFT':
      return { label: 'Черновик', tone: 'gray' };
    case 'PENDING_REVIEW':
      return { label: 'На проверке', tone: 'orange' };
    case 'NEEDS_CHANGES':
      return { label: 'Нужны изменения', tone: 'orange' };
    case 'APPROVED':
      return { label: 'Одобрен', tone: 'green' };
    case 'REJECTED':
      return { label: 'Отклонён', tone: 'red' };
    case 'BLOCKED':
      return { label: 'Заблокирован', tone: 'red' };
    default:
      return { label: 'Нужно проверить', tone: 'orange' };
  }
}

function getBranchLabel(row: RestaurantRow, index: number): string {
  if (row.branchLabel?.trim()) return row.branchLabel.replace('#', '').trim();
  if (row.branchName?.trim()) return row.branchName.trim();
  if (row.isMainBranch === true) return 'Основной';
  const branchNumber = row.branchNumber ?? row.branchIndex;
  if (typeof branchNumber === 'number' && branchNumber > 0) {
    return branchNumber === 1 ? 'Основной' : `Филиал ${branchNumber}`;
  }
  return index === 0 ? 'Основной' : `Филиал ${index + 1}`;
}

function sortRestaurants(a: RestaurantRow, b: RestaurantRow): number {
  const aIndex = a.branchIndex ?? a.branchNumber ?? Number.MAX_SAFE_INTEGER;
  const bIndex = b.branchIndex ?? b.branchNumber ?? Number.MAX_SAFE_INTEGER;
  if (aIndex !== bIndex) return aIndex - bIndex;
  const aNumber = a.number ?? Number.MAX_SAFE_INTEGER;
  const bNumber = b.number ?? Number.MAX_SAFE_INTEGER;
  if (aNumber !== bNumber) return aNumber - bNumber;
  return getRestaurantName(a).localeCompare(getRestaurantName(b), 'ru');
}

function groupRestaurants(rows: RestaurantRow[]): OwnerGroup[] {
  const groups = new Map<string, OwnerGroup>();

  for (const row of rows) {
    const ownerId = getOwnerUserId(row);
    const phone = getOwnerPhone(row);
    const key = ownerId || `restaurant:${row.id}`;
    const group = groups.get(key);

    if (!group) {
      groups.set(key, {
        key,
        title: getRestaurantName(row),
        phone,
        ownerName: getOwnerName(row),
        restaurants: [row],
        total: 1,
        inAppCount: isVisibleInApp(row) ? 1 : 0,
        acceptingCount: isAcceptingOrders(row) ? 1 : 0,
        attentionCount: needsAttention(row) ? 1 : 0,
      });
      continue;
    }

    group.restaurants.push(row);
    group.total += 1;
    group.inAppCount += isVisibleInApp(row) ? 1 : 0;
    group.acceptingCount += isAcceptingOrders(row) ? 1 : 0;
    group.attentionCount += needsAttention(row) ? 1 : 0;
  }

  return Array.from(groups.values())
    .map((group) => ({ ...group, restaurants: [...group.restaurants].sort(sortRestaurants) }))
    .sort((a, b) => (a.ownerName || a.phone || a.title).localeCompare(b.ownerName || b.phone || b.title, 'ru'));
}

function branchWord(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'филиалов';
  if (mod10 === 1) return 'филиал';
  if (mod10 >= 2 && mod10 <= 4) return 'филиала';
  return 'филиалов';
}

function normalizePhoneForCompare(value: string | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  return digits;
}

function absoluteUploadUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? `/api/proxy${path}` : `/api/proxy/${path}`;
}

function mergeRestaurant(row: RestaurantRow, payload: unknown): RestaurantRow {
  if (!payload || typeof payload !== 'object') return row;
  const data = payload as Partial<RestaurantRow>;
  return {
    ...row,
    ...data,
    ownerUserId: data.ownerUserId ?? row.ownerUserId,
    ownerPhone: data.ownerPhone ?? row.ownerPhone,
    owner: data.owner ?? row.owner,
    ownerUser: data.ownerUser ?? row.ownerUser,
  };
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

function restaurantError(error: unknown, fallback: string): string {
  const status = errorStatus(error);
  const message = error instanceof Error ? error.message.trim() : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('restaurant not found')) return 'Ресторан не найден. Обновите список.';
  if (normalized.includes('ownerphone') || normalized.includes('phone is invalid')) return 'Проверьте номер телефона владельца.';
  if (normalized.includes('nameru is required')) return 'Укажите название на русском языке.';
  if (normalized.includes('namekk is required')) return 'Укажите название на казахском языке.';
  if (normalized.includes('workinghours')) return 'Проверьте график работы.';
  if (normalized.includes('unsupported file type')) return 'Выберите изображение JPG, PNG или WebP.';
  if (normalized.includes('file is required')) return 'Выберите изображение.';
  if (normalized.includes('permission') || normalized.includes('forbidden')) return 'У вас нет прав для этого действия.';

  if (status === 400) return 'Проверьте заполненные данные и повторите попытку.';
  if (status === 401) return 'Сессия истекла. Войдите снова.';
  if (status === 403) return 'У вас нет прав для этого действия.';
  if (status === 404) return 'Ресторан не найден. Обновите список.';
  if (status === 409) return 'Данные уже изменились. Обновите список и повторите действие.';
  if (status !== null && status >= 500) return 'Сервис временно недоступен. Повторите попытку позже.';

  if (message && /[а-яё]/i.test(message) && !/(backend|frontend|api|database|server)/i.test(message)) {
    return message;
  }

  return fallback;
}

function getPermissionCodes(admin: AdminView | null): string[] {
  if (!admin) return [];
  const codes = [
    ...(Array.isArray(admin.permissionCodes) ? admin.permissionCodes : []),
    ...(Array.isArray(admin.permissions) ? admin.permissions : []),
  ];
  return Array.from(new Set(codes.map((value) => String(value).trim()).filter(Boolean)));
}

function canDo(admin: AdminView | null, code: string): boolean {
  if (!admin) return false;
  const codes = getPermissionCodes(admin);
  if (codes.length === 0) return true;
  return codes.includes(code) || codes.includes('*');
}

function emptyEditor(row: RestaurantRow): EditorState {
  return {
    nameRu: row.nameRu ?? '',
    nameKk: row.nameKk ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    workingHours: row.workingHours ?? '',
    descriptionRu: row.descriptionRu ?? '',
    descriptionKk: row.descriptionKk ?? '',
    ownerPhone: getOwnerPhone(row) ?? '',
    sortOrder: String(row.sortOrder ?? 0),
  };
}

function toCsvValue(value: unknown): string {
  const raw = value == null ? '' : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

function downloadCsv(rows: RestaurantRow[]) {
  const headers = [
    'Название',
    'Владелец',
    'Телефон ресторана',
    'Адрес',
    'Проверка',
    'В приложении',
    'Приём заказов',
    'Сейчас работает',
  ];
  const lines = rows.map((row) => [
    getRestaurantName(row),
    getOwnerPhone(row) || '',
    row.phone || '',
    row.address || '',
    moderationLabel(row).label,
    isVisibleInApp(row) ? 'Да' : 'Нет',
    isAcceptingOrders(row) ? 'Да' : 'Нет',
    isOpenNow(row) ? 'Да' : 'Нет',
  ]);
  const csv = [headers, ...lines].map((line) => line.map(toCsvValue).join(';')).join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'restorany.csv';
  link.click();
  URL.revokeObjectURL(url);
}

type BadgeTone = 'gray' | 'green' | 'red' | 'violet' | 'orange' | 'blue';

function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: BadgeTone }) {
  const styles: Record<BadgeTone, string> = {
    gray: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    violet: 'bg-violet-50 text-violet-700',
    orange: 'bg-orange-50 text-orange-800',
    blue: 'bg-blue-50 text-blue-700',
  };
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
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'white' | 'violet' | 'red' | 'green';
  title?: string;
}) {
  const styles = {
    white: 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
    violet: 'border-violet-600 bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-100',
    red: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-[13px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

function KpiCard({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'green' | 'orange' | 'red' }) {
  const valueStyle = {
    default: 'text-slate-950',
    green: 'text-emerald-700',
    orange: 'text-orange-700',
    red: 'text-red-700',
  }[tone];
  return (
    <div className="rounded-2xl border border-white bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="text-[11px] font-black uppercase tracking-[0.04em] text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-black ${valueStyle}`}>{value}</div>
    </div>
  );
}

function OwnerAvatar({ index }: { index: number }) {
  const variants = [
    'bg-violet-100 text-violet-700',
    'bg-orange-100 text-orange-700',
    'bg-emerald-100 text-emerald-700',
    'bg-blue-100 text-blue-700',
  ];
  const Icon = index % 2 === 0 ? Store : Utensils;
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${variants[index % variants.length]}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[12px] font-black text-slate-600">{children}</div>;
}

function Input({ value, onChange, placeholder, disabled, type = 'text' }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[14px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-400"
    />
  );
}

function Textarea({ value, onChange, placeholder, disabled, rows = 3 }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[14px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-400"
    />
  );
}

function ToggleAction({
  active,
  activeLabel,
  inactiveLabel,
  onClick,
  disabled,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
        active ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <div>
        <div className={`text-[13px] font-black ${active ? 'text-emerald-800' : 'text-slate-800'}`}>
          {active ? activeLabel : inactiveLabel}
        </div>
      </div>
      <div className={`relative h-6 w-11 rounded-full transition ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${active ? 'left-6' : 'left-1'}`} />
      </div>
    </button>
  );
}

export function RestaurantsManagementPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<RestaurantRow[]>([]);
  const [admin, setAdmin] = useState<AdminView | null>(null);
  const [query, setQuery] = useState('');
  const [moderationFilter, setModerationFilter] = useState<ModerationFilter>('all');
  const [appFilter, setAppFilter] = useState<AppFilter>('all');
  const [ordersFilter, setOrdersFilter] = useState<OrdersFilter>('all');
  const [branchFilter, setBranchFilter] = useState<BranchFilter>('all');
  const [runtimeFilter, setRuntimeFilter] = useState<RuntimeFilter>('all');
  const [advancedFilters, setAdvancedFilters] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [decision, setDecision] = useState<DecisionState>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);

  const [defaultCommission, setDefaultCommission] = useState<number | null>(null);
  const [globalCommission, setGlobalCommission] = useState('');
  const [globalCommissionSaving, setGlobalCommissionSaving] = useState(false);
  const [globalCommissionError, setGlobalCommissionError] = useState<string | null>(null);
  const [commissionEditing, setCommissionEditing] = useState<Record<string, string>>({});
  const [commissionSavingId, setCommissionSavingId] = useState<string | null>(null);

  const canUpdate = canDo(admin, 'restaurants.update');
  const canFinance = canDo(admin, 'finance.settings');

  const loadRestaurants = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const [restaurantsResult, commissionResult, sessionResult] = await Promise.allSettled([
        apiFetch<unknown>('/restaurants', { method: 'GET' }),
        apiFetch<{ restaurantCommissionPctDefault?: number }>('/restaurants/commission/default', { method: 'GET' }),
        getSession(),
      ]);

      if (restaurantsResult.status === 'rejected') throw restaurantsResult.reason;

      const nextItems = getApiList(restaurantsResult.value);
      setItems(nextItems);
      setCollapsed((current) => {
        const next = { ...current };
        for (const group of groupRestaurants(nextItems)) {
          if (next[group.key] === undefined) next[group.key] = false;
        }
        return next;
      });

      if (commissionResult.status === 'fulfilled') {
        const value = commissionResult.value?.restaurantCommissionPctDefault;
        const normalized = typeof value === 'number' ? value : null;
        setDefaultCommission(normalized);
        setGlobalCommission(normalized === null ? '' : String(normalized));
        setGlobalCommissionError(null);
      }

      if (sessionResult.status === 'fulfilled' && sessionResult.value.authenticated) {
        setAdmin((sessionResult.value.admin ?? null) as AdminView | null);
      }
    } catch (caught) {
      setError(restaurantError(caught, 'Не удалось загрузить рестораны. Повторите попытку.'));
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRestaurants();
  }, [loadRestaurants]);

  const activeRow = useMemo(
    () => (activeId ? items.find((row) => row.id === activeId) ?? null : null),
    [activeId, items],
  );

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
          getOwnerName(row),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (moderationFilter === 'attention' && !needsAttention(row)) return false;
      if (moderationFilter === 'approved' && !isApproved(row)) return false;
      if (moderationFilter === 'rejected' && onboarding(row) !== 'REJECTED') return false;
      if (moderationFilter === 'blocked' && !isBlocked(row)) return false;
      if (appFilter === 'visible' && !isVisibleInApp(row)) return false;
      if (appFilter === 'hidden' && isVisibleInApp(row)) return false;
      if (ordersFilter === 'accepting' && !isAcceptingOrders(row)) return false;
      if (ordersFilter === 'paused' && isAcceptingOrders(row)) return false;
      if (runtimeFilter === 'open' && !isOpenNow(row)) return false;
      if (runtimeFilter === 'closed' && isOpenNow(row)) return false;

      if (branchFilter !== 'all') {
        const isMain = row.isMainBranch === true || row.branchIndex === 1 || row.branchNumber === 1;
        if (branchFilter === 'main' && !isMain) return false;
        if (branchFilter === 'branch' && isMain) return false;
      }

      return true;
    });
  }, [items, query, moderationFilter, appFilter, ordersFilter, branchFilter, runtimeFilter]);

  const groups = useMemo(() => groupRestaurants(filteredItems), [filteredItems]);
  const summary = useMemo(() => ({
    total: items.length,
    owners: groupRestaurants(items).length,
    attention: items.filter(needsAttention).length,
    inApp: items.filter(isVisibleInApp).length,
    accepting: items.filter(isAcceptingOrders).length,
    blocked: items.filter(isBlocked).length,
  }), [items]);

  const clearMessages = () => {
    setError(null);
    setNotice(null);
  };

  const showNotice = (message: string) => {
    setError(null);
    setNotice(message);
  };

  const openManager = (row: RestaurantRow) => {
    setActiveId(row.id);
    setEditor(emptyEditor(row));
    clearMessages();
  };

  const closeManager = () => {
    setActiveId(null);
    setEditor(null);
    setDecision(null);
    setDecisionNote('');
  };

  const openCreateBranch = (group: OwnerGroup) => {
    if (!canUpdate) {
      setError('У вас нет прав для добавления филиалов.');
      return;
    }
    const first = group.restaurants[0];
    const params = new URLSearchParams({ mode: 'branch' });
    const phone = group.phone || first?.phone || '';
    const ownerUserId = first ? getOwnerUserId(first) : null;
    if (phone) {
      params.set('ownerPhone', phone);
      params.set('phone', phone);
      params.set('initialPhone', phone);
    }
    if (ownerUserId) params.set('ownerUserId', ownerUserId);
    if (first?.id) params.set('fromRestaurantId', first.id);
    router.push(`/layout-20/restaurants/new?${params.toString()}`);
  };

  const runMutation = async (
    row: RestaurantRow,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    try {
      setBusyId(row.id);
      clearMessages();
      await action();
      await loadRestaurants(true);
      showNotice(successMessage);
    } catch (caught) {
      setError(restaurantError(caught, 'Не удалось выполнить действие. Повторите попытку.'));
    } finally {
      setBusyId(null);
    }
  };

  const patchRestaurant = async (row: RestaurantRow, body: Record<string, unknown>, successMessage: string) => {
    await runMutation(
      row,
      () => apiFetch(`/restaurants/${row.id}`, { method: 'PATCH', body: JSON.stringify(body) }),
      successMessage,
    );
  };

  const approveRestaurant = async (row: RestaurantRow) => {
    if (!canUpdate) return setError('У вас нет прав для изменения ресторана.');
    await patchRestaurant(row, { onboardingStatus: 'APPROVED', onboardingNote: null }, 'Ресторан одобрен. Публикация включается отдельно.');
  };

  const publishRestaurant = async (row: RestaurantRow) => {
    if (!canUpdate) return setError('У вас нет прав для изменения ресторана.');
    if (!isApproved(row)) return setError('Сначала одобрите ресторан, затем его можно показать в приложении.');
    await runMutation(
      row,
      () => apiFetch(`/restaurants/${row.id}/in-app`, { method: 'PATCH', body: JSON.stringify({ isInApp: true }) }),
      'Ресторан показан в приложении. Приём заказов включается отдельно.',
    );
  };

  const hideRestaurant = async (row: RestaurantRow) => {
    if (!canUpdate) return setError('У вас нет прав для изменения ресторана.');
    await runMutation(
      row,
      () => apiFetch(`/restaurants/${row.id}/in-app`, { method: 'PATCH', body: JSON.stringify({ isInApp: false }) }),
      'Ресторан скрыт в приложении, приём заказов остановлен.',
    );
  };

  const toggleAccepting = async (row: RestaurantRow) => {
    if (!canUpdate) return setError('У вас нет прав для изменения ресторана.');
    const next = !isAcceptingOrders(row);
    if (next && !isApproved(row)) return setError('Приём заказов можно включить только после одобрения ресторана.');
    if (next && !isVisibleInApp(row)) return setError('Сначала покажите ресторан в приложении.');
    if (next && !isManuallyOpen(row)) return setError('Сначала разрешите работу ресторана.');
    await patchRestaurant(
      row,
      { isAcceptingOrders: next },
      next ? 'Приём заказов включён.' : 'Приём заказов приостановлен.',
    );
  };

  const toggleManualOpen = async (row: RestaurantRow) => {
    if (!canUpdate) return setError('У вас нет прав для изменения ресторана.');
    const nextOpen = !isManuallyOpen(row);
    await patchRestaurant(
      row,
      nextOpen ? { status: 'OPEN' } : { status: 'CLOSED', isAcceptingOrders: false },
      nextOpen ? 'Работа ресторана разрешена. Приём заказов включается отдельно.' : 'Работа ресторана остановлена.',
    );
  };

  const togglePinned = async (row: RestaurantRow) => {
    if (!canUpdate) return setError('У вас нет прав для изменения ресторана.');
    const next = row.isPinned !== true;
    if (next && !isVisibleInApp(row)) return setError('Закрепить можно только ресторан, который показан в приложении.');
    await runMutation(
      row,
      () => apiFetch(`/restaurants/${row.id}/pinned`, {
        method: 'PATCH',
        body: JSON.stringify({ isPinned: next, sortOrder: Math.max(0, Number(row.sortOrder ?? 0)) }),
      }),
      next ? 'Ресторан закреплён.' : 'Закрепление снято.',
    );
  };

  const toggleRandom = async (row: RestaurantRow) => {
    if (!canUpdate) return setError('У вас нет прав для изменения ресторана.');
    await patchRestaurant(
      row,
      { useRandom: row.useRandom !== true },
      row.useRandom === true ? 'Случайный показ отключён.' : 'Случайный показ включён.',
    );
  };

  const openDecision = (row: RestaurantRow, kind: DecisionKind) => {
    setDecision({ kind, rowId: row.id });
    setDecisionNote(kind === 'needs_changes' || kind === 'reject' || kind === 'block' ? row.onboardingNote ?? '' : '');
    clearMessages();
  };

  const decisionRow = decision ? items.find((row) => row.id === decision.rowId) ?? null : null;

  const performSaveEditor = async (row: RestaurantRow, allowOwnerChange = false) => {
    if (!editor) return;
    const nameRu = editor.nameRu.trim();
    const nameKk = editor.nameKk.trim();
    if (!nameRu) return setError('Укажите название на русском языке.');
    if (!nameKk) return setError('Укажите название на казахском языке.');
    const sortOrder = Number(editor.sortOrder || 0);
    if (!Number.isFinite(sortOrder) || sortOrder < 0) return setError('Порядок показа должен быть целым числом от нуля.');

    const ownerChanged = normalizePhoneForCompare(editor.ownerPhone) !== normalizePhoneForCompare(getOwnerPhone(row));
    if (ownerChanged && !allowOwnerChange) {
      setDecision({ kind: 'save_owner', rowId: row.id });
      return;
    }

    const payload: Record<string, unknown> = {
      nameRu,
      nameKk,
      phone: editor.phone,
      address: editor.address,
      workingHours: editor.workingHours,
      descriptionRu: editor.descriptionRu,
      descriptionKk: editor.descriptionKk,
      sortOrder: Math.round(sortOrder),
    };
    if (ownerChanged) payload.ownerPhone = editor.ownerPhone;

    await runMutation(
      row,
      () => apiFetch(`/restaurants/${row.id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
      ownerChanged ? 'Данные сохранены, владелец изменён.' : 'Данные ресторана сохранены.',
    );
    setEditor({ ...editor, sortOrder: String(Math.round(sortOrder)) });
  };

  const confirmDecision = async () => {
    if (!decision || !decisionRow) return;
    const row = decisionRow;
    const note = decisionNote.trim();

    if ((decision.kind === 'needs_changes' || decision.kind === 'reject' || decision.kind === 'block') && !note) {
      setError('Укажите причину. Она нужна для понятной истории решения.');
      return;
    }

    const kind = decision.kind;
    setDecision(null);
    setDecisionNote('');

    if (kind === 'needs_changes') {
      await patchRestaurant(row, {
        onboardingStatus: 'NEEDS_CHANGES',
        onboardingNote: note,
        isInApp: false,
        isAcceptingOrders: false,
      }, 'Ресторан отправлен на доработку и скрыт из приложения.');
      return;
    }

    if (kind === 'reject') {
      await patchRestaurant(row, {
        onboardingStatus: 'REJECTED',
        onboardingNote: note,
        isInApp: false,
        isAcceptingOrders: false,
      }, 'Заявка отклонена, ресторан скрыт из приложения.');
      return;
    }

    if (kind === 'block') {
      await patchRestaurant(row, {
        onboardingStatus: 'BLOCKED',
        onboardingNote: note,
        isInApp: false,
        isAcceptingOrders: false,
        status: 'CLOSED',
        isPinned: false,
        sortOrder: 0,
      }, 'Ресторан заблокирован, скрыт и остановлен.');
      return;
    }

    if (kind === 'unblock') {
      await patchRestaurant(row, {
        onboardingStatus: 'APPROVED',
        onboardingNote: null,
        isInApp: false,
        isAcceptingOrders: false,
      }, 'Блокировка снята. Публикация и приём заказов остаются выключенными.');
      return;
    }

    if (kind === 'archive') {
      await runMutation(
        row,
        () => apiFetch(`/restaurants/${row.id}`, { method: 'DELETE' }),
        'Ресторан архивирован: он скрыт и не принимает заказы.',
      );
      return;
    }

    if (kind === 'save_owner') {
      await performSaveEditor(row, true);
    }
  };

  const uploadCover = async (file: File | null) => {
    if (!activeRow || !file) return;
    if (!canUpdate) return setError('У вас нет прав для изменения ресторана.');
    if (!IMAGE_TYPES.has(file.type)) return setError('Выберите изображение JPG, PNG или WebP.');
    if (file.size > MAX_IMAGE_SIZE) return setError('Размер изображения не должен превышать 8 МБ.');

    try {
      setCoverUploading(true);
      clearMessages();
      const form = new FormData();
      form.append('file', file);
      await apiFetch(`/restaurants/${activeRow.id}/cover`, { method: 'POST', body: form });
      await loadRestaurants(true);
      showNotice('Обложка ресторана обновлена.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (caught) {
      setError(restaurantError(caught, 'Не удалось загрузить изображение. Повторите попытку.'));
    } finally {
      setCoverUploading(false);
    }
  };

  const saveGlobalCommission = async () => {
    try {
      setGlobalCommissionSaving(true);
      setGlobalCommissionError(null);
      const value = Number(globalCommission.replace(',', '.'));
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        setGlobalCommissionError('Введите число от 0 до 100.');
        return;
      }
      const result = await apiFetch<{ restaurantCommissionPctDefault?: number }>('/restaurants/commission/default', {
        method: 'PATCH',
        body: JSON.stringify({ restaurantCommissionPctDefault: Math.trunc(value) }),
      });
      const next = typeof result.restaurantCommissionPctDefault === 'number' ? result.restaurantCommissionPctDefault : Math.trunc(value);
      setDefaultCommission(next);
      setGlobalCommission(String(next));
      showNotice('Общая комиссия сохранена.');
      await loadRestaurants(true);
    } catch (caught) {
      setGlobalCommissionError(restaurantError(caught, 'Не удалось сохранить общую комиссию.'));
    } finally {
      setGlobalCommissionSaving(false);
    }
  };

  const saveRestaurantCommission = async (row: RestaurantRow) => {
    const raw = (commissionEditing[row.id] ?? '').trim();
    const value = raw === '' ? null : Number(raw.replace(',', '.'));
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
      setError('Комиссия должна быть числом от 0 до 100.');
      return;
    }
    try {
      setCommissionSavingId(row.id);
      clearMessages();
      const result = await apiFetch(`/restaurants/${row.id}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({ restaurantCommissionPctOverride: value === null ? null : Math.trunc(value) }),
      });
      setItems((current) => current.map((item) => item.id === row.id ? mergeRestaurant(item, result) : item));
      showNotice(value === null ? 'Для ресторана используется общая комиссия.' : 'Индивидуальная комиссия сохранена.');
      await loadRestaurants(true);
    } catch (caught) {
      setError(restaurantError(caught, 'Не удалось сохранить комиссию ресторана.'));
    } finally {
      setCommissionSavingId(null);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setModerationFilter('all');
    setAppFilter('all');
    setOrdersFilter('all');
    setBranchFilter('all');
    setRuntimeFilter('all');
  };

  const decisionCopy = (() => {
    if (!decision || !decisionRow) return null;
    switch (decision.kind) {
      case 'needs_changes':
        return { title: 'Вернуть на доработку', text: 'Ресторан будет скрыт, а приём заказов остановлен.', button: 'Вернуть на доработку', destructive: false, needsReason: true };
      case 'reject':
        return { title: 'Отклонить заявку', text: 'Ресторан будет скрыт и не сможет принимать заказы.', button: 'Отклонить', destructive: true, needsReason: true };
      case 'block':
        return { title: 'Заблокировать ресторан', text: 'Ресторан будет скрыт, закрыт и остановит приём заказов.', button: 'Заблокировать', destructive: true, needsReason: true };
      case 'unblock':
        return { title: 'Снять блокировку', text: 'Ресторан вернётся в одобренные, но останется скрытым и с выключенным приёмом заказов.', button: 'Снять блокировку', destructive: false, needsReason: false };
      case 'archive':
        return { title: 'Архивировать ресторан', text: 'Ресторан останется в системе, но будет скрыт, закрыт и не будет принимать заказы.', button: 'Архивировать', destructive: true, needsReason: false };
      case 'save_owner':
        return { title: 'Сменить владельца', text: 'Доступ текущего владельца к этому ресторану будет отключён, а новый владелец получит доступ.', button: 'Сохранить и сменить владельца', destructive: false, needsReason: false };
    }
  })();

  return (
    <div className="min-h-screen w-full bg-[#f5f6fa] px-5 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-slate-950">Рестораны</h1>
            <p className="mt-1 text-[14px] font-semibold text-slate-500">
              Владельцы, филиалы, проверка, публикация и работа ресторанов
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SoftButton
              disabled={!canUpdate}
              onClick={() => router.push('/layout-20/restaurants/new')}
              title={!canUpdate ? 'У вас нет прав для добавления ресторанов' : undefined}
            >
              <Plus className="h-4 w-4" />
              Добавить ресторан
            </SoftButton>
            <SoftButton
              tone="violet"
              disabled={!canUpdate}
              onClick={() => router.push('/layout-20/restaurants/new?mode=branch')}
              title={!canUpdate ? 'У вас нет прав для добавления филиалов' : undefined}
            >
              <Plus className="h-4 w-4" />
              Добавить филиал
            </SoftButton>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Всего" value={summary.total} />
          <KpiCard label="Владельцев" value={summary.owners} />
          <KpiCard label="Нужно решение" value={summary.attention} tone="orange" />
          <KpiCard label="В приложении" value={summary.inApp} tone="green" />
          <KpiCard label="Принимают заказы" value={summary.accepting} tone="green" />
          <KpiCard label="Заблокировано" value={summary.blocked} tone="red" />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[280px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Название, адрес, телефон или владелец"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-[14px] font-semibold outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <select
              value={moderationFilter}
              onChange={(event) => setModerationFilter(event.target.value as ModerationFilter)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-bold text-slate-700 outline-none"
            >
              <option value="all">Все решения</option>
              <option value="attention">Нужно решение</option>
              <option value="approved">Одобренные</option>
              <option value="rejected">Отклонённые</option>
              <option value="blocked">Заблокированные</option>
            </select>

            <select
              value={appFilter}
              onChange={(event) => setAppFilter(event.target.value as AppFilter)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-bold text-slate-700 outline-none"
            >
              <option value="all">Все публикации</option>
              <option value="visible">В приложении</option>
              <option value="hidden">Скрытые</option>
            </select>

            <button
              type="button"
              onClick={() => setAdvancedFilters((value) => !value)}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-[13px] font-black transition ${advancedFilters ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              <Settings2 className="h-4 w-4" />
              Ещё фильтры
            </button>

            <button
              type="button"
              onClick={() => void loadRestaurants()}
              disabled={loading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              title="Обновить"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(filteredItems)}
              disabled={filteredItems.length === 0}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              title="Скачать список"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          {advancedFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
              <select
                value={ordersFilter}
                onChange={(event) => setOrdersFilter(event.target.value as OrdersFilter)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none"
              >
                <option value="all">Любой приём заказов</option>
                <option value="accepting">Принимают заказы</option>
                <option value="paused">Приём остановлен</option>
              </select>
              <select
                value={runtimeFilter}
                onChange={(event) => setRuntimeFilter(event.target.value as RuntimeFilter)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none"
              >
                <option value="all">Любое состояние сейчас</option>
                <option value="open">Сейчас открыты</option>
                <option value="closed">Сейчас закрыты</option>
              </select>
              <select
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value as BranchFilter)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none"
              >
                <option value="all">Основные и филиалы</option>
                <option value="main">Только основные</option>
                <option value="branch">Только филиалы</option>
              </select>
              <SoftButton onClick={clearFilters}>
                <RotateCcw className="h-4 w-4" />
                Сбросить
              </SoftButton>
            </div>
          )}

          {canFinance && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="mr-2">
                <div className="text-[13px] font-black text-slate-900">Общая комиссия</div>
                <div className="text-[12px] font-bold text-slate-400">Для ресторанов без отдельной настройки</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={globalCommission}
                  onChange={(event) => setGlobalCommission(event.target.value)}
                  disabled={globalCommissionSaving}
                  inputMode="decimal"
                  placeholder={defaultCommission === null ? '20' : String(defaultCommission)}
                  className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-black text-slate-900 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
                />
                <span className="text-[13px] font-black text-slate-500">%</span>
                <button
                  type="button"
                  onClick={() => void saveGlobalCommission()}
                  disabled={globalCommissionSaving}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-black text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {globalCommissionSaving ? 'Сохраняю…' : 'Сохранить'}
                </button>
              </div>
              {globalCommissionError && <div className="text-[13px] font-bold text-red-700">{globalCommissionError}</div>}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[14px] font-bold text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Закрыть сообщение"><X className="h-4 w-4" /></button>
          </div>
        )}
        {notice && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[14px] font-bold text-emerald-700">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Закрыть сообщение"><X className="h-4 w-4" /></button>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-white" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white py-14 text-center shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
            <div className="text-[18px] font-black text-slate-900">Ничего не найдено</div>
            <div className="mt-2 text-[14px] font-semibold text-slate-500">Измените фильтры или добавьте ресторан.</div>
            <div className="mt-5 flex justify-center gap-3">
              <SoftButton onClick={clearFilters}>Сбросить фильтры</SoftButton>
              <SoftButton tone="violet" disabled={!canUpdate} onClick={() => router.push('/layout-20/restaurants/new')}>
                <Plus className="h-4 w-4" /> Добавить ресторан
              </SoftButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group, groupIndex) => {
              const isCollapsed = collapsed[group.key] === true;
              return (
                <div key={group.key} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-center gap-4 px-4 py-4">
                    <OwnerAvatar index={groupIndex} />
                    <div className="min-w-[230px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[16px] font-black text-slate-950">{group.title}</div>
                        <Badge>{group.total} {branchWord(group.total)}</Badge>
                        {group.attentionCount > 0 && <Badge tone="orange">Нужно решение: {group.attentionCount}</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-bold text-slate-500">
                        <span>Владелец: {group.ownerName || group.phone || 'не указан'}</span>
                        {group.ownerName && group.phone && <span>{group.phone}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="green">В приложении: {group.inAppCount}</Badge>
                      <Badge tone="blue">Принимают заказы: {group.acceptingCount}</Badge>
                    </div>
                    <SoftButton disabled={!canUpdate} onClick={() => openCreateBranch(group)}>
                      <Plus className="h-4 w-4" /> Добавить филиал
                    </SoftButton>
                    <button
                      type="button"
                      onClick={() => setCollapsed((current) => ({ ...current, [group.key]: !current[group.key] }))}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50"
                      aria-label={isCollapsed ? 'Показать филиалы' : 'Скрыть филиалы'}
                    >
                      {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="border-t border-slate-100">
                      {group.restaurants.map((row, index) => {
                        const moderation = moderationLabel(row);
                        const branchLabel = getBranchLabel(row, index);
                        const rowBusy = busyId === row.id;
                        const personalCommission = typeof row.restaurantCommissionPctOverride === 'number';
                        const commission = personalCommission
                          ? row.restaurantCommissionPctOverride
                          : row.effectiveRestaurantCommissionPct ?? defaultCommission;

                        return (
                          <div key={row.id} className="grid grid-cols-1 gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 xl:grid-cols-[minmax(300px,1.5fr)_minmax(220px,0.9fr)_minmax(380px,1.4fr)_auto] xl:items-center">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <button type="button" onClick={() => openManager(row)} className="truncate text-left text-[16px] font-black text-slate-950 transition hover:text-violet-700">
                                  {getRestaurantName(row)}
                                </button>
                                <Badge tone={branchLabel === 'Основной' ? 'violet' : 'blue'}>{branchLabel}</Badge>
                                <Badge tone={moderation.tone}>{moderation.label}</Badge>
                              </div>
                              <div className="mt-1 truncate text-[13px] font-semibold text-slate-500">{row.address || 'Адрес не указан'}</div>
                              <div className="mt-1 text-[12px] font-bold text-slate-400">{row.phone || 'Телефон не указан'} · {row.workingHours || 'График не указан'}</div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge tone={isVisibleInApp(row) ? 'green' : 'gray'}>{isVisibleInApp(row) ? 'В приложении' : 'Скрыт'}</Badge>
                              <Badge tone={isAcceptingOrders(row) ? 'green' : 'gray'}>{isAcceptingOrders(row) ? 'Принимает заказы' : 'Приём остановлен'}</Badge>
                              <Badge tone={isOpenNow(row) ? 'green' : 'red'}>{isOpenNow(row) ? 'Сейчас открыт' : 'Сейчас закрыт'}</Badge>
                              {row.isPinned && <Badge tone="violet">Закреплён</Badge>}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={rowBusy || !canUpdate || (!isApproved(row) && !isVisibleInApp(row))}
                                onClick={() => void (isVisibleInApp(row) ? hideRestaurant(row) : publishRestaurant(row))}
                                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12px] font-black transition disabled:opacity-40 ${isVisibleInApp(row) ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                              >
                                {isVisibleInApp(row) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {isVisibleInApp(row) ? 'Скрыть' : 'Показать'}
                              </button>
                              <button
                                type="button"
                                disabled={rowBusy || !canUpdate || (!isAcceptingOrders(row) && (!isApproved(row) || !isVisibleInApp(row) || !isManuallyOpen(row)))}
                                onClick={() => void toggleAccepting(row)}
                                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12px] font-black transition disabled:opacity-40 ${isAcceptingOrders(row) ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                              >
                                {isAcceptingOrders(row) ? <PauseCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                {isAcceptingOrders(row) ? 'Остановить заказы' : 'Принимать заказы'}
                              </button>
                              <button
                                type="button"
                                onClick={() => openManager(row)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700 transition hover:bg-slate-50"
                              >
                                <Settings2 className="h-4 w-4" /> Управление
                              </button>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              {canFinance && (
                                <div className="hidden text-right 2xl:block">
                                  <div className="text-[11px] font-bold text-slate-400">Комиссия</div>
                                  <div className="text-[13px] font-black text-slate-700">{commission === null || commission === undefined ? '—' : `${commission}%`}</div>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => router.push(`/layout-20/restaurants/${row.id}`)}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700 transition hover:bg-slate-50"
                              >
                                Карточка
                              </button>
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

        <div className="pb-4 text-center text-[13px] font-bold text-slate-400">Показано: {filteredItems.length} из {items.length}</div>
      </div>

      {activeRow && editor && (
        <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/30 backdrop-blur-[2px]" onMouseDown={(event) => {
          if (event.currentTarget === event.target) closeManager();
        }}>
          <aside className="h-full w-full max-w-[680px] overflow-y-auto bg-[#f8f9fc] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-[20px] font-black text-slate-950">{getRestaurantName(activeRow)}</h2>
                    <Badge tone={moderationLabel(activeRow).tone}>{moderationLabel(activeRow).label}</Badge>
                  </div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-500">Владелец: {getOwnerName(activeRow) || getOwnerPhone(activeRow) || 'не указан'}</div>
                </div>
                <button type="button" onClick={closeManager} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="Закрыть">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-black text-slate-950">Решение по ресторану</div>
                    <div className="mt-1 text-[12px] font-semibold text-slate-500">Одобрение не включает публикацию и приём заказов автоматически.</div>
                  </div>
                </div>
                {activeRow.onboardingNote && (
                  <div className="mb-3 rounded-xl bg-orange-50 px-3 py-2 text-[12px] font-bold text-orange-800">Последняя причина: {activeRow.onboardingNote}</div>
                )}
                <div className="flex flex-wrap gap-2">
                  {!isApproved(activeRow) && !isBlocked(activeRow) && (
                    <SoftButton tone="green" disabled={!canUpdate || busyId === activeRow.id} onClick={() => void approveRestaurant(activeRow)}>
                      <Check className="h-4 w-4" /> Одобрить
                    </SoftButton>
                  )}
                  {!isBlocked(activeRow) && (
                    <>
                      <SoftButton disabled={!canUpdate || busyId === activeRow.id} onClick={() => openDecision(activeRow, 'needs_changes')}>Вернуть на доработку</SoftButton>
                      <SoftButton tone="red" disabled={!canUpdate || busyId === activeRow.id} onClick={() => openDecision(activeRow, 'reject')}>Отклонить</SoftButton>
                      <SoftButton tone="red" disabled={!canUpdate || busyId === activeRow.id} onClick={() => openDecision(activeRow, 'block')}>
                        <LockKeyhole className="h-4 w-4" /> Заблокировать
                      </SoftButton>
                    </>
                  )}
                  {isBlocked(activeRow) && (
                    <SoftButton tone="green" disabled={!canUpdate || busyId === activeRow.id} onClick={() => openDecision(activeRow, 'unblock')}>
                      <UnlockKeyhole className="h-4 w-4" /> Снять блокировку
                    </SoftButton>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-[15px] font-black text-slate-950">Публикация и работа</div>
                <div className="mt-1 text-[12px] font-semibold text-slate-500">Каждое состояние управляется отдельно, без скрытых автоматических включений.</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ToggleAction
                    active={isVisibleInApp(activeRow)}
                    activeLabel="Показывается в приложении"
                    inactiveLabel="Скрыт из приложения"
                    disabled={!canUpdate || busyId === activeRow.id || (!isApproved(activeRow) && !isVisibleInApp(activeRow))}
                    onClick={() => void (isVisibleInApp(activeRow) ? hideRestaurant(activeRow) : publishRestaurant(activeRow))}
                  />
                  <ToggleAction
                    active={isAcceptingOrders(activeRow)}
                    activeLabel="Принимает заказы"
                    inactiveLabel="Приём заказов остановлен"
                    disabled={!canUpdate || busyId === activeRow.id || (!isAcceptingOrders(activeRow) && (!isApproved(activeRow) || !isVisibleInApp(activeRow) || !isManuallyOpen(activeRow)))}
                    onClick={() => void toggleAccepting(activeRow)}
                  />
                  <ToggleAction
                    active={isManuallyOpen(activeRow)}
                    activeLabel="Работа разрешена"
                    inactiveLabel="Работа остановлена вручную"
                    disabled={!canUpdate || busyId === activeRow.id}
                    onClick={() => void toggleManualOpen(activeRow)}
                  />
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[12px] font-black text-slate-500">По графику сейчас</div>
                    <div className={`mt-1 text-[14px] font-black ${isOpenNow(activeRow) ? 'text-emerald-700' : 'text-red-700'}`}>{isOpenNow(activeRow) ? 'Открыт' : 'Закрыт'}</div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-400">{activeRow.workingHours || 'График не указан'}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-black text-slate-950">Основные данные</div>
                    <div className="mt-1 text-[12px] font-semibold text-slate-500">Изменения сохраняются только после нажатия кнопки.</div>
                  </div>
                  <Pencil className="h-4 w-4 text-slate-400" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><FieldLabel>Название на русском</FieldLabel><Input value={editor.nameRu} onChange={(value) => setEditor({ ...editor, nameRu: value })} disabled={!canUpdate} /></div>
                  <div><FieldLabel>Название на казахском</FieldLabel><Input value={editor.nameKk} onChange={(value) => setEditor({ ...editor, nameKk: value })} disabled={!canUpdate} /></div>
                  <div><FieldLabel>Телефон ресторана</FieldLabel><Input value={editor.phone} onChange={(value) => setEditor({ ...editor, phone: value })} placeholder="+7…" disabled={!canUpdate} /></div>
                  <div><FieldLabel>Телефон владельца</FieldLabel><Input value={editor.ownerPhone} onChange={(value) => setEditor({ ...editor, ownerPhone: value })} placeholder="+7…" disabled={!canUpdate} /></div>
                  <div className="sm:col-span-2"><FieldLabel>Адрес</FieldLabel><Input value={editor.address} onChange={(value) => setEditor({ ...editor, address: value })} disabled={!canUpdate} /></div>
                  <div className="sm:col-span-2"><FieldLabel>График работы</FieldLabel><Input value={editor.workingHours} onChange={(value) => setEditor({ ...editor, workingHours: value })} placeholder="09:00-23:00" disabled={!canUpdate} /></div>
                  <div className="sm:col-span-2"><FieldLabel>Описание на русском</FieldLabel><Textarea value={editor.descriptionRu} onChange={(value) => setEditor({ ...editor, descriptionRu: value })} disabled={!canUpdate} /></div>
                  <div className="sm:col-span-2"><FieldLabel>Описание на казахском</FieldLabel><Textarea value={editor.descriptionKk} onChange={(value) => setEditor({ ...editor, descriptionKk: value })} disabled={!canUpdate} /></div>
                </div>
                <div className="mt-4 flex justify-end">
                  <SoftButton tone="violet" disabled={!canUpdate || busyId === activeRow.id} onClick={() => void performSaveEditor(activeRow)}>
                    <Save className="h-4 w-4" /> {busyId === activeRow.id ? 'Сохраняю…' : 'Сохранить данные'}
                  </SoftButton>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-[15px] font-black text-slate-950">Обложка</div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:w-44">
                    {activeRow.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={absoluteUploadUrl(activeRow.coverImageUrl)} alt="Обложка ресторана" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-slate-500">JPG, PNG или WebP, до 8 МБ.</div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => void uploadCover(event.target.files?.[0] ?? null)}
                    />
                    <div className="mt-3">
                      <SoftButton disabled={!canUpdate || coverUploading} onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4" /> {coverUploading ? 'Загружаю…' : 'Выбрать изображение'}
                      </SoftButton>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-[15px] font-black text-slate-950">Порядок показа</div>
                <div className="mt-1 text-[12px] font-semibold text-slate-500">Закрепление, порядок и случайный показ не связаны с публикацией.</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ToggleAction
                    active={activeRow.isPinned === true}
                    activeLabel="Ресторан закреплён"
                    inactiveLabel="Ресторан не закреплён"
                    disabled={!canUpdate || busyId === activeRow.id || (activeRow.isPinned !== true && !isVisibleInApp(activeRow))}
                    onClick={() => void togglePinned(activeRow)}
                  />
                  <ToggleAction
                    active={activeRow.useRandom === true}
                    activeLabel="Участвует в случайном показе"
                    inactiveLabel="Случайный показ выключен"
                    disabled={!canUpdate || busyId === activeRow.id}
                    onClick={() => void toggleRandom(activeRow)}
                  />
                </div>
                <div className="mt-3 max-w-[220px]">
                  <FieldLabel>Порядок</FieldLabel>
                  <Input value={editor.sortOrder} onChange={(value) => setEditor({ ...editor, sortOrder: value })} type="number" disabled={!canUpdate} />
                </div>
              </section>

              {canFinance && (
                <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="text-[15px] font-black text-slate-950">Комиссия ресторана</div>
                  <div className="mt-1 text-[12px] font-semibold text-slate-500">Пустое поле означает общую комиссию.</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={commissionEditing[activeRow.id] ?? (typeof activeRow.restaurantCommissionPctOverride === 'number' ? String(activeRow.restaurantCommissionPctOverride) : '')}
                      onChange={(event) => setCommissionEditing((current) => ({ ...current, [activeRow.id]: event.target.value }))}
                      inputMode="decimal"
                      placeholder="общая"
                      className="h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-black outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                    />
                    <span className="text-[13px] font-black text-slate-500">%</span>
                    <SoftButton disabled={commissionSavingId === activeRow.id} onClick={() => void saveRestaurantCommission(activeRow)}>
                      {commissionSavingId === activeRow.id ? 'Сохраняю…' : 'Сохранить'}
                    </SoftButton>
                    <div className="text-[12px] font-semibold text-slate-500">
                      Сейчас: {typeof activeRow.restaurantCommissionPctOverride === 'number' ? `${activeRow.restaurantCommissionPctOverride}% отдельно` : `${activeRow.effectiveRestaurantCommissionPct ?? defaultCommission ?? 0}% общая`}
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-[15px] font-black text-slate-950">Разделы ресторана</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <SoftButton onClick={() => router.push(`/layout-20/restaurants/${activeRow.id}`)}>Карточка ресторана</SoftButton>
                  <SoftButton onClick={() => router.push(`/layout-20/restaurants/${activeRow.id}/menu`)}>Меню</SoftButton>
                  <SoftButton onClick={() => router.push(`/layout-20/orders?restaurantId=${activeRow.id}`)}>Заказы ресторана</SoftButton>
                  <SoftButton onClick={() => router.push(`/layout-20/restaurants/${activeRow.id}/reviews`)}>Отзывы</SoftButton>
                </div>
              </section>

              <section className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="text-[15px] font-black text-red-800">Архив</div>
                <div className="mt-1 text-[12px] font-semibold text-red-700">Архивация не удаляет историю ресторана.</div>
                <div className="mt-3">
                  <SoftButton tone="red" disabled={!canUpdate || busyId === activeRow.id} onClick={() => openDecision(activeRow, 'archive')}>
                    <Archive className="h-4 w-4" /> Архивировать ресторан
                  </SoftButton>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}

      {decision && decisionRow && decisionCopy && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.currentTarget === event.target) {
            setDecision(null);
            setDecisionNote('');
          }
        }}>
          <div className="w-full max-w-[500px] rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[19px] font-black text-slate-950">{decisionCopy.title}</h3>
                <p className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">{decisionCopy.text}</p>
              </div>
              <button type="button" onClick={() => { setDecision(null); setDecisionNote(''); }} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Закрыть">
                <X className="h-4 w-4" />
              </button>
            </div>

            {decisionCopy.needsReason && (
              <div className="mt-4">
                <FieldLabel>Причина</FieldLabel>
                <Textarea value={decisionNote} onChange={setDecisionNote} placeholder="Напишите коротко и понятно, почему принято это решение" rows={4} />
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <SoftButton onClick={() => { setDecision(null); setDecisionNote(''); }}>Отмена</SoftButton>
              <SoftButton tone={decisionCopy.destructive ? 'red' : 'violet'} disabled={busyId === decisionRow.id} onClick={() => void confirmDecision()}>
                {decisionCopy.button}
              </SoftButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
