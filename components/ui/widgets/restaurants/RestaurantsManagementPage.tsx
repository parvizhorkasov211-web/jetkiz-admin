'use client';

import {
  Archive,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  ImageIcon,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Store,
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
  nameRu: string;
  nameKk?: string | null;
  status?: string | null;
  runtimeStatus?: string | null;
  onboardingStatus?: string | null;
  onboardingNote?: string | null;
  blockedAt?: string | null;
  blockReason?: string | null;
  archived?: boolean | null;
  isInApp?: boolean | null;
  isAcceptingOrders?: boolean | null;
  canAcceptOrders?: boolean | null;
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
  branchLabel?: string | null;
  isMainBranch?: boolean | null;
};

type AdminView = {
  permissionCodes?: string[];
  permissions?: string[];
};

type ModerationFilter = 'all' | 'attention' | 'approved' | 'blocked' | 'archived';
type VisibilityFilter = 'all' | 'visible' | 'hidden';
type OrdersFilter = 'all' | 'accepting' | 'paused';

type EditorState = {
  nameRu: string;
  nameKk: string;
  phone: string;
  ownerPhone: string;
  address: string;
  workingHours: string;
  descriptionRu: string;
  descriptionKk: string;
  sortOrder: string;
};

type DialogKind = 'changes' | 'reject' | 'block' | 'archive' | 'restore' | 'owner';
type DialogState = { kind: DialogKind; restaurantId: string } | null;

const PAGE_SIZE = 20;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getRows(value: unknown): RestaurantRow[] {
  if (Array.isArray(value)) return value as RestaurantRow[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as RestaurantRow[];
    if (Array.isArray(record.data)) return record.data as RestaurantRow[];
  }
  return [];
}

function restaurantName(row: RestaurantRow) {
  return row.nameRu?.trim() || row.nameKk?.trim() || 'Ресторан без названия';
}

function ownerPhone(row: RestaurantRow) {
  return row.ownerPhone ?? row.ownerUser?.phone ?? row.owner?.phone ?? null;
}

function ownerName(row: RestaurantRow) {
  if (row.ownerName?.trim()) return row.ownerName.trim();
  const parts = [
    row.ownerUser?.firstName ?? row.owner?.firstName,
    row.ownerUser?.lastName ?? row.owner?.lastName,
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  return parts.join(' ') || null;
}

function onboarding(row: RestaurantRow) {
  return String(row.onboardingStatus ?? '').trim().toUpperCase();
}

function isApproved(row: RestaurantRow) {
  return onboarding(row) === 'APPROVED';
}

function isArchived(row: RestaurantRow) {
  return row.archived === true || Boolean(row.blockedAt && row.blockReason === 'ARCHIVED');
}

function isBlocked(row: RestaurantRow) {
  return !isArchived(row) && (onboarding(row) === 'BLOCKED' || Boolean(row.blockedAt));
}

function needsDecision(row: RestaurantRow) {
  if (isArchived(row)) return false;
  const value = onboarding(row);
  return !value || value === 'DRAFT' || value === 'PENDING_REVIEW' || value === 'NEEDS_CHANGES';
}

function moderationLabel(row: RestaurantRow) {
  if (isArchived(row)) return 'В архиве';
  if (isBlocked(row)) return 'Заблокирован';
  switch (onboarding(row)) {
    case 'DRAFT': return 'Черновик';
    case 'PENDING_REVIEW': return 'На проверке';
    case 'NEEDS_CHANGES': return 'Нужны изменения';
    case 'APPROVED': return 'Одобрен';
    case 'REJECTED': return 'Отклонён';
    default: return 'Нужно проверить';
  }
}

function moderationTone(row: RestaurantRow): Tone {
  if (isArchived(row)) return 'neutral';
  if (isBlocked(row) || onboarding(row) === 'REJECTED') return 'danger';
  if (isApproved(row)) return 'success';
  return 'warning';
}

function branchLabel(row: RestaurantRow) {
  if (row.branchLabel?.trim()) return row.branchLabel.replace('#', '').trim();
  if (row.isMainBranch === true || row.branchIndex === 1) return 'Основной';
  if (typeof row.branchIndex === 'number' && row.branchIndex > 1) return `Филиал ${row.branchIndex}`;
  return 'Основной';
}

function absoluteImage(path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? `/api/proxy${path}` : `/api/proxy/${path}`;
}

function normalizePhone(value: string | null | undefined) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  return digits;
}

function editorFrom(row: RestaurantRow): EditorState {
  return {
    nameRu: row.nameRu ?? '',
    nameKk: row.nameKk ?? '',
    phone: row.phone ?? '',
    ownerPhone: ownerPhone(row) ?? '',
    address: row.address ?? '',
    workingHours: row.workingHours ?? '',
    descriptionRu: row.descriptionRu ?? '',
    descriptionKk: row.descriptionKk ?? '',
    sortOrder: String(row.sortOrder ?? 0),
  };
}

function permissions(admin: AdminView | null) {
  if (!admin) return [];
  return Array.from(new Set([
    ...(Array.isArray(admin.permissionCodes) ? admin.permissionCodes : []),
    ...(Array.isArray(admin.permissions) ? admin.permissions : []),
  ].map((item) => String(item).trim()).filter(Boolean)));
}

function can(admin: AdminView | null, code: string) {
  if (!admin) return false;
  const list = permissions(admin);
  return list.length === 0 || list.includes('*') || list.includes(code);
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const value = (error as { status?: unknown }).status;
  return typeof value === 'number' ? value : null;
}

function errorText(error: unknown, fallback: string) {
  const status = errorStatus(error);
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('must be approved')) return 'Сначала одобрите ресторан.';
  if (message.includes('cannot accept orders')) return 'В текущем состоянии ресторан не может принимать заказы.';
  if (message.includes('blocked restaurant')) return 'Заблокированный ресторан нельзя показывать клиентам.';
  if (message.includes('restaurant not found')) return 'Ресторан не найден. Обновите список.';
  if (message.includes('phone')) return 'Проверьте номер телефона.';
  if (message.includes('workinghours')) return 'Проверьте график работы.';
  if (message.includes('valid image') || message.includes('unsupported file')) return 'Не удалось обработать изображение. Выберите JPG, PNG или WebP.';
  if (status === 400) return 'Проверьте заполненные данные и повторите действие.';
  if (status === 401) return 'Сессия истекла. Войдите снова.';
  if (status === 403) return 'У вас нет прав для этого действия.';
  if (status === 404) return 'Ресторан не найден. Обновите список.';
  if (status === 409) return 'Данные уже изменились. Обновите список и повторите действие.';
  if (status !== null && status >= 500) return 'Сервис временно недоступен. Повторите попытку позже.';
  return fallback;
}

function exportCsv(rows: RestaurantRow[]) {
  const columns = ['Ресторан', 'Филиал', 'Телефон', 'Адрес', 'Владелец', 'Проверка', 'В приложении', 'Приём заказов', 'Сейчас'];
  const lines = rows.map((row) => [
    restaurantName(row),
    branchLabel(row),
    row.phone || '',
    row.address || '',
    ownerName(row) || ownerPhone(row) || '',
    moderationLabel(row),
    row.isInApp ? 'Да' : 'Нет',
    row.isAcceptingOrders ? 'Да' : 'Нет',
    row.runtimeStatus === 'OPEN' ? 'Открыт' : 'Закрыт',
  ]);
  const q = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [columns, ...lines].map((line) => line.map(q).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'restorany.csv';
  a.click();
  URL.revokeObjectURL(url);
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'blue';

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const styles: Record<Tone, string> = {
    neutral: 'border-slate-200 bg-white text-slate-600',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold leading-none ${styles[tone]}`}>{children}</span>;
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
  kind?: 'primary' | 'secondary' | 'export' | 'danger' | 'success';
  className?: string;
}) {
  const style = {
    primary: 'border-slate-950 bg-slate-950 text-white hover:bg-slate-800',
    secondary: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    export: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    danger: 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
    success: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
  }[kind];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${style} ${className}`}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  note,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  note: string;
  icon: ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'red';
}) {
  const iconStyle = {
    neutral: 'text-slate-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-rose-600',
  }[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">{label}</div>
          <div className="mt-1 text-[25px] font-bold leading-none text-slate-950">{value}</div>
          <div className="mt-2 text-[11px] font-medium text-slate-400">{note}</div>
        </div>
        <div className={`mt-1 ${iconStyle}`}>{icon}</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11px] font-medium text-slate-400">{hint}</span> : null}
    </label>
  );
}

const inputClass = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400';
const textareaClass = 'w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400';

function ToggleRow({
  title,
  description,
  active,
  onClick,
  disabled,
}: {
  title: string;
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
      className="flex w-full items-center justify-between gap-4 border-b border-slate-100 py-3 text-left last:border-b-0 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span>
        <span className="block text-[13px] font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-[11px] font-medium leading-4 text-slate-400">{description}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${active ? 'bg-slate-950' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${active ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

function DrawerSection({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 px-6 py-5">
      <div className="mb-4">
        <h3 className="text-[14px] font-bold text-slate-950">{title}</h3>
        {subtitle ? <p className="mt-1 text-[11px] font-medium leading-4 text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function RestaurantsManagementPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [rows, setRows] = useState<RestaurantRow[]>([]);
  const [admin, setAdmin] = useState<AdminView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [moderationFilter, setModerationFilter] = useState<ModerationFilter>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [ordersFilter, setOrdersFilter] = useState<OrdersFilter>('all');
  const [page, setPage] = useState(1);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [reason, setReason] = useState('');
  const [uploading, setUploading] = useState(false);

  const canUpdate = can(admin, 'restaurants.update');

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [restaurantsResult, sessionResult] = await Promise.allSettled([
        apiFetch<unknown>('/restaurants'),
        getSession(),
      ]);
      if (restaurantsResult.status === 'rejected') throw restaurantsResult.reason;
      setRows(getRows(restaurantsResult.value));
      if (sessionResult.status === 'fulfilled' && sessionResult.value.authenticated) {
        setAdmin((sessionResult.value.admin ?? null) as AdminView | null);
      }
    } catch (caught) {
      setError(errorText(caught, 'Не удалось загрузить список ресторанов. Повторите попытку.'));
      if (!silent) setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeRow = useMemo(() => rows.find((row) => row.id === activeId) ?? null, [rows, activeId]);

  useEffect(() => {
    setEditor(activeRow ? editorFrom(activeRow) : null);
  }, [activeRow]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (q) {
        const haystack = [
          row.nameRu,
          row.nameKk,
          row.phone,
          row.address,
          row.workingHours,
          ownerName(row),
          ownerPhone(row),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (moderationFilter === 'attention' && !needsDecision(row)) return false;
      if (moderationFilter === 'approved' && !isApproved(row)) return false;
      if (moderationFilter === 'blocked' && !isBlocked(row)) return false;
      if (moderationFilter === 'archived' && !isArchived(row)) return false;
      if (visibilityFilter === 'visible' && row.isInApp !== true) return false;
      if (visibilityFilter === 'hidden' && row.isInApp === true) return false;
      if (ordersFilter === 'accepting' && row.isAcceptingOrders !== true) return false;
      if (ordersFilter === 'paused' && row.isAcceptingOrders === true) return false;
      return true;
    });
  }, [rows, query, moderationFilter, visibilityFilter, ordersFilter]);

  useEffect(() => { setPage(1); }, [query, moderationFilter, visibilityFilter, ordersFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const summary = useMemo(() => ({
    total: rows.length,
    visible: rows.filter((row) => row.isInApp === true && !isArchived(row)).length,
    accepting: rows.filter((row) => row.isAcceptingOrders === true && !isArchived(row)).length,
    attention: rows.filter(needsDecision).length,
    blocked: rows.filter(isBlocked).length,
    archived: rows.filter(isArchived).length,
  }), [rows]);

  const run = async (row: RestaurantRow, operation: () => Promise<unknown>, success: string) => {
    try {
      setBusyId(row.id);
      setError(null);
      setNotice(null);
      await operation();
      await load(true);
      setNotice(success);
    } catch (caught) {
      setError(errorText(caught, 'Не удалось выполнить действие. Повторите попытку.'));
    } finally {
      setBusyId(null);
    }
  };

  const patch = (row: RestaurantRow, body: Record<string, unknown>, success: string) =>
    run(row, () => apiFetch(`/restaurants/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }), success);

  const approve = (row: RestaurantRow) => patch(
    row,
    { onboardingStatus: 'APPROVED', onboardingNote: null },
    'Ресторан одобрен. Показ и приём заказов включаются отдельно.',
  );

  const toggleVisible = async (row: RestaurantRow) => {
    const next = row.isInApp !== true;
    if (next && !isApproved(row)) return setError('Сначала одобрите ресторан.');
    if (next && isBlocked(row)) return setError('Сначала снимите блокировку.');
    await run(row, () => apiFetch(`/restaurants/${row.id}/in-app`, {
      method: 'PATCH',
      body: JSON.stringify({ isInApp: next }),
    }), next ? 'Ресторан показан клиентам.' : 'Ресторан скрыт, приём заказов остановлен.');
  };

  const toggleAccepting = async (row: RestaurantRow) => {
    const next = row.isAcceptingOrders !== true;
    if (next && !isApproved(row)) return setError('Сначала одобрите ресторан.');
    if (next && row.isInApp !== true) return setError('Сначала покажите ресторан клиентам.');
    if (next && row.status !== 'OPEN') return setError('Сначала разрешите работу ресторана.');
    await patch(row, { isAcceptingOrders: next }, next ? 'Приём заказов включён.' : 'Приём заказов остановлен.');
  };

  const toggleWork = async (row: RestaurantRow) => {
    const next = row.status !== 'OPEN';
    await patch(
      row,
      next ? { status: 'OPEN' } : { status: 'CLOSED', isAcceptingOrders: false },
      next ? 'Работа ресторана разрешена.' : 'Работа ресторана остановлена.',
    );
  };

  const togglePinned = async (row: RestaurantRow) => {
    const next = row.isPinned !== true;
    if (next && row.isInApp !== true) return setError('Сначала покажите ресторан клиентам.');
    await run(row, () => apiFetch(`/restaurants/${row.id}/pinned`, {
      method: 'PATCH',
      body: JSON.stringify({ isPinned: next, sortOrder: Math.max(0, Math.round(Number(row.sortOrder ?? 0))) }),
    }), next ? 'Ресторан закреплён.' : 'Закрепление снято.');
  };

  const saveEditor = async (row: RestaurantRow, allowOwnerChange = false) => {
    if (!editor) return;
    if (!editor.nameRu.trim()) return setError('Укажите название на русском языке.');
    if (!editor.nameKk.trim()) return setError('Укажите название на казахском языке.');
    const sortOrder = Number(editor.sortOrder || 0);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) return setError('Порядок показа должен быть целым числом от нуля.');

    const ownerChanged = normalizePhone(editor.ownerPhone) !== normalizePhone(ownerPhone(row));
    if (ownerChanged && !allowOwnerChange) {
      setDialog({ kind: 'owner', restaurantId: row.id });
      return;
    }

    const body: Record<string, unknown> = {
      nameRu: editor.nameRu.trim(),
      nameKk: editor.nameKk.trim(),
      phone: editor.phone,
      address: editor.address,
      workingHours: editor.workingHours,
      descriptionRu: editor.descriptionRu,
      descriptionKk: editor.descriptionKk,
      sortOrder,
    };
    if (ownerChanged) body.ownerPhone = editor.ownerPhone;

    await run(row, () => apiFetch(`/restaurants/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }), ownerChanged ? 'Данные сохранены, владелец изменён.' : 'Данные ресторана сохранены.');
  };

  const uploadCover = async (file: File | null) => {
    if (!activeRow || !file) return;
    if (!IMAGE_TYPES.has(file.type)) return setError('Выберите изображение JPG, PNG или WebP.');
    if (file.size > MAX_IMAGE_SIZE) return setError('Размер изображения не должен превышать 8 МБ.');

    try {
      setUploading(true);
      setError(null);
      const form = new FormData();
      form.append('file', file);
      await apiFetch(`/restaurants/${activeRow.id}/cover`, { method: 'POST', body: form });
      await load(true);
      setNotice('Обложка обновлена.');
      if (fileRef.current) fileRef.current.value = '';
    } catch (caught) {
      setError(errorText(caught, 'Не удалось загрузить изображение.'));
    } finally {
      setUploading(false);
    }
  };

  const dialogRow = dialog ? rows.find((row) => row.id === dialog.restaurantId) ?? null : null;

  const confirmDialog = async () => {
    if (!dialog || !dialogRow) return;
    const row = dialogRow;
    const text = reason.trim();
    if (['changes', 'reject', 'block'].includes(dialog.kind) && !text) {
      setError('Укажите причину решения.');
      return;
    }
    const kind = dialog.kind;
    setDialog(null);
    setReason('');

    if (kind === 'changes') {
      await patch(row, {
        onboardingStatus: 'NEEDS_CHANGES',
        onboardingNote: text,
        isInApp: false,
        isAcceptingOrders: false,
      }, 'Ресторан возвращён на доработку.');
    } else if (kind === 'reject') {
      await patch(row, {
        onboardingStatus: 'REJECTED',
        onboardingNote: text,
        isInApp: false,
        isAcceptingOrders: false,
      }, 'Ресторан отклонён.');
    } else if (kind === 'block') {
      await patch(row, {
        onboardingStatus: 'BLOCKED',
        onboardingNote: text,
      }, 'Ресторан заблокирован и остановлен.');
    } else if (kind === 'archive') {
      await run(row, () => apiFetch(`/restaurants/${row.id}`, { method: 'DELETE' }), 'Ресторан перемещён в архив.');
    } else if (kind === 'restore') {
      await patch(row, {
        onboardingStatus: 'APPROVED',
        onboardingNote: null,
        status: 'CLOSED',
        isInApp: false,
        isAcceptingOrders: false,
        isPinned: false,
      }, 'Ресторан восстановлен. Показ и приём заказов остаются выключенными.');
    } else if (kind === 'owner') {
      await saveEditor(row, true);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setModerationFilter('all');
    setVisibilityFilter('all');
    setOrdersFilter('all');
  };

  const openBranch = (row: RestaurantRow) => {
    const params = new URLSearchParams({ mode: 'branch', fromRestaurantId: row.id });
    const phone = ownerPhone(row);
    if (phone) params.set('ownerPhone', phone);
    router.push(`/layout-20/restaurants/new?${params.toString()}`);
  };

  const dialogCopy = (() => {
    if (!dialog) return null;
    const map: Record<DialogKind, { title: string; text: string; action: string; danger?: boolean; reason?: boolean }> = {
      changes: { title: 'Вернуть на доработку', text: 'Ресторан будет скрыт, а приём заказов остановлен.', action: 'Вернуть на доработку', reason: true },
      reject: { title: 'Отклонить ресторан', text: 'Ресторан будет скрыт и не сможет принимать заказы.', action: 'Отклонить', danger: true, reason: true },
      block: { title: 'Заблокировать ресторан', text: 'Ресторан будет закрыт, скрыт и остановит приём заказов.', action: 'Заблокировать', danger: true, reason: true },
      archive: { title: 'Переместить в архив', text: 'История сохранится. Ресторан будет скрыт и остановлен.', action: 'В архив', danger: true },
      restore: { title: 'Восстановить ресторан', text: 'Ресторан вернётся в рабочий список, но останется скрытым до отдельного включения.', action: 'Восстановить' },
      owner: { title: 'Сменить владельца', text: 'Доступ текущего владельца будет отключён, новый владелец получит доступ к этому ресторану.', action: 'Сохранить и сменить владельца' },
    };
    return map[dialog.kind];
  })();

  return (
    <div className="min-h-screen w-full bg-[#f7f8fa] px-4 py-5 text-slate-950 md:px-6 xl:px-8">
      <div className="w-full">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.025em]">Рестораны</h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500">{filtered.length} в списке с учётом фильтров</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button kind="export" onClick={() => exportCsv(filtered)} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> Экспорт
            </Button>
            <Button kind="primary" onClick={() => router.push('/layout-20/restaurants/new')} disabled={!canUpdate}>
              <Plus className="h-4 w-4" /> Добавить ресторан
            </Button>
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Обновить
            </Button>
          </div>
        </header>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Всего ресторанов" value={summary.total} note={`В архиве: ${summary.archived}`} icon={<Store className="h-5 w-5" />} />
          <SummaryCard label="В приложении" value={summary.visible} note="Видны клиентам" icon={<Eye className="h-5 w-5" />} tone="green" />
          <SummaryCard label="Принимают заказы" value={summary.accepting} note="Приём разрешён" icon={<UtensilsCrossed className="h-5 w-5" />} tone="green" />
          <SummaryCard label="Требуют решения" value={summary.attention} note={`Заблокировано: ${summary.blocked}`} icon={<ShieldAlert className="h-5 w-5" />} tone={summary.attention > 0 ? 'amber' : 'neutral'} />
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
          <div className="grid gap-2 xl:grid-cols-[minmax(320px,1fr)_190px_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-10`} placeholder="Поиск по названию, адресу, телефону или владельцу" />
            </div>
            <select value={moderationFilter} onChange={(event) => setModerationFilter(event.target.value as ModerationFilter)} className={inputClass}>
              <option value="all">Любая проверка</option>
              <option value="attention">Требуют решения</option>
              <option value="approved">Одобренные</option>
              <option value="blocked">Заблокированные</option>
              <option value="archived">Архив</option>
            </select>
            <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)} className={inputClass}>
              <option value="all">Любая публикация</option>
              <option value="visible">В приложении</option>
              <option value="hidden">Скрытые</option>
            </select>
            <select value={ordersFilter} onChange={(event) => setOrdersFilter(event.target.value as OrdersFilter)} className={inputClass}>
              <option value="all">Любой приём заказов</option>
              <option value="accepting">Принимают</option>
              <option value="paused">Остановлен</option>
            </select>
            <Button onClick={clearFilters}><RotateCcw className="h-4 w-4" /> Сбросить</Button>
          </div>
        </div>

        {error ? <div className="mb-4 flex items-start justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700"><span>{error}</span><button type="button" onClick={() => setError(null)}><X className="h-4 w-4" /></button></div> : null}
        {notice ? <div className="mb-4 flex items-start justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-700"><span>{notice}</span><button type="button" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button></div> : null}

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1320px] w-full table-fixed">
              <colgroup>
                <col className="w-[23%]" />
                <col className="w-[11%]" />
                <col className="w-[15%]" />
                <col className="w-[14%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500">
                  <th className="px-4 py-3">Ресторан</th>
                  <th className="px-4 py-3">Проверка</th>
                  <th className="px-4 py-3">Контакты</th>
                  <th className="px-4 py-3">Владелец</th>
                  <th className="px-4 py-3">Публикация</th>
                  <th className="px-4 py-3">Заказы</th>
                  <th className="px-4 py-3">Работа</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  [0, 1, 2, 3].map((item) => <tr key={item} className="border-b border-slate-100"><td colSpan={8} className="h-[72px] animate-pulse bg-slate-50/50" /></tr>)
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center"><div className="text-[16px] font-bold">Ничего не найдено</div><div className="mt-1 text-[13px] text-slate-400">Измените параметры поиска.</div></td></tr>
                ) : pageRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 text-[12px] text-slate-700 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          {row.coverImageUrl ? <img src={absoluteImage(row.coverImageUrl)} alt="" className="h-full w-full object-cover" /> : <Store className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2"><span className="truncate font-semibold text-slate-950">{restaurantName(row)}</span><Badge>{branchLabel(row)}</Badge></div>
                          <div className="mt-1 truncate text-[11px] text-slate-400">{row.address || 'Адрес не указан'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><Badge tone={moderationTone(row)}>{moderationLabel(row)}</Badge>{row.onboardingNote ? <div className="mt-1 truncate text-[10px] text-slate-400" title={row.onboardingNote}>{row.onboardingNote}</div> : null}</td>
                    <td className="px-4 py-3.5"><div className="font-medium text-slate-800">{row.phone || 'Телефон не указан'}</div><div className="mt-1 text-[11px] text-slate-400">{row.workingHours || 'График не указан'}</div></td>
                    <td className="px-4 py-3.5"><div className="truncate font-medium text-slate-800">{ownerName(row) || 'Не указан'}</div><div className="mt-1 truncate text-[11px] text-slate-400">{ownerPhone(row) || 'Телефон не указан'}</div></td>
                    <td className="px-4 py-3.5">{row.isInApp && !isArchived(row) ? <Badge tone="success">В приложении</Badge> : <Badge>Скрыт</Badge>}</td>
                    <td className="px-4 py-3.5">{row.isAcceptingOrders && !isArchived(row) ? <Badge tone="blue">Принимает</Badge> : <Badge>Остановлен</Badge>}</td>
                    <td className="px-4 py-3.5">{row.runtimeStatus === 'OPEN' && !isArchived(row) ? <span className="inline-flex items-center gap-2 font-medium text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Открыт</span> : <span className="inline-flex items-center gap-2 font-medium text-slate-500"><span className="h-2 w-2 rounded-full bg-slate-300" />Закрыт</span>}</td>
                    <td className="px-4 py-3.5 text-right"><button type="button" onClick={() => setActiveId(row.id)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">Управление</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <div className="text-[12px] text-slate-500">Страница {safePage} из {totalPages} · показано {pageRows.length} из {filtered.length}</div>
            <div className="flex gap-2">
              <Button disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /> Назад</Button>
              <Button disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Вперёд <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      {activeRow && editor ? (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/35" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveId(null); }}>
          <aside className="h-full w-full max-w-[720px] overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-4 px-6 py-5">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-[21px] font-bold">{restaurantName(activeRow)}</h2><Badge>{branchLabel(activeRow)}</Badge><Badge tone={moderationTone(activeRow)}>{moderationLabel(activeRow)}</Badge></div><p className="mt-1 text-[12px] text-slate-400">{activeRow.address || 'Адрес не указан'}</p></div>
                <button type="button" onClick={() => setActiveId(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-3 border-t border-slate-100 text-center">
                <div className="px-3 py-2.5"><div className="text-[10px] font-semibold uppercase text-slate-400">Публикация</div><div className="mt-1 text-[12px] font-semibold">{activeRow.isInApp ? 'В приложении' : 'Скрыт'}</div></div>
                <div className="border-l border-slate-100 px-3 py-2.5"><div className="text-[10px] font-semibold uppercase text-slate-400">Заказы</div><div className="mt-1 text-[12px] font-semibold">{activeRow.isAcceptingOrders ? 'Принимает' : 'Остановлен'}</div></div>
                <div className="border-l border-slate-100 px-3 py-2.5"><div className="text-[10px] font-semibold uppercase text-slate-400">Сейчас</div><div className={`mt-1 text-[12px] font-semibold ${activeRow.runtimeStatus === 'OPEN' ? 'text-emerald-700' : ''}`}>{activeRow.runtimeStatus === 'OPEN' ? 'Открыт' : 'Закрыт'}</div></div>
              </div>
            </div>

            {isArchived(activeRow) ? (
              <DrawerSection title="Ресторан в архиве" subtitle="История сохранена. Показ и приём заказов выключены.">
                <Button kind="primary" disabled={!canUpdate || busyId === activeRow.id} onClick={() => setDialog({ kind: 'restore', restaurantId: activeRow.id })}>Восстановить ресторан</Button>
              </DrawerSection>
            ) : (
              <>
                <DrawerSection title="Решение по ресторану" subtitle="Одобрение не включает показ клиентам и приём заказов автоматически.">
                  <div className="flex flex-wrap gap-2">
                    {!isApproved(activeRow) && !isBlocked(activeRow) ? <Button kind="success" disabled={!canUpdate || busyId === activeRow.id} onClick={() => void approve(activeRow)}><CheckCircle2 className="h-4 w-4" /> Одобрить</Button> : null}
                    {!isBlocked(activeRow) ? <Button disabled={!canUpdate || busyId === activeRow.id} onClick={() => { setReason(activeRow.onboardingNote ?? ''); setDialog({ kind: 'changes', restaurantId: activeRow.id }); }}>На доработку</Button> : null}
                    {!isBlocked(activeRow) ? <Button kind="danger" disabled={!canUpdate || busyId === activeRow.id} onClick={() => { setReason(activeRow.onboardingNote ?? ''); setDialog({ kind: 'reject', restaurantId: activeRow.id }); }}>Отклонить</Button> : null}
                    {!isBlocked(activeRow) ? <Button kind="danger" disabled={!canUpdate || busyId === activeRow.id} onClick={() => { setReason(activeRow.onboardingNote ?? ''); setDialog({ kind: 'block', restaurantId: activeRow.id }); }}><Ban className="h-4 w-4" /> Заблокировать</Button> : <Button disabled={!canUpdate || busyId === activeRow.id} onClick={() => setDialog({ kind: 'restore', restaurantId: activeRow.id })}>Снять блокировку</Button>}
                  </div>
                  {activeRow.onboardingNote ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900"><span className="font-semibold">Причина:</span> {activeRow.onboardingNote}</div> : null}
                </DrawerSection>

                <DrawerSection title="Публикация и работа" subtitle="Это три независимых состояния. Одно не включает другое автоматически.">
                  <ToggleRow title={activeRow.isInApp ? 'Показывается клиентам' : 'Скрыт от клиентов'} description="Определяет наличие ресторана в клиентском приложении." active={activeRow.isInApp === true} disabled={!canUpdate || busyId === activeRow.id} onClick={() => void toggleVisible(activeRow)} />
                  <ToggleRow title={activeRow.isAcceptingOrders ? 'Приём заказов включён' : 'Приём заказов остановлен'} description="Разрешает создание новых заказов после всех остальных проверок." active={activeRow.isAcceptingOrders === true} disabled={!canUpdate || busyId === activeRow.id} onClick={() => void toggleAccepting(activeRow)} />
                  <ToggleRow title={activeRow.status === 'OPEN' ? 'Работа разрешена' : 'Работа остановлена'} description="Ручное разрешение работы ресторана независимо от графика." active={activeRow.status === 'OPEN'} disabled={!canUpdate || busyId === activeRow.id} onClick={() => void toggleWork(activeRow)} />
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"><div><div className="text-[12px] font-semibold">По графику сейчас</div><div className="mt-0.5 text-[11px] text-slate-400">{activeRow.workingHours || 'График не указан'}</div></div><Badge tone={activeRow.runtimeStatus === 'OPEN' ? 'success' : 'neutral'}>{activeRow.runtimeStatus === 'OPEN' ? 'Открыт' : 'Закрыт'}</Badge></div>
                </DrawerSection>
              </>
            )}

            <DrawerSection title="Данные ресторана" subtitle="Поля разделены по смыслу. Изменения применяются только после сохранения.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Название на русском"><input className={inputClass} value={editor.nameRu} onChange={(event) => setEditor({ ...editor, nameRu: event.target.value })} disabled={!canUpdate} /></Field>
                <Field label="Название на казахском"><input className={inputClass} value={editor.nameKk} onChange={(event) => setEditor({ ...editor, nameKk: event.target.value })} disabled={!canUpdate} /></Field>
                <Field label="Телефон ресторана" hint="Контакт самого филиала"><input className={inputClass} value={editor.phone} onChange={(event) => setEditor({ ...editor, phone: event.target.value })} disabled={!canUpdate} /></Field>
                <Field label="Телефон владельца" hint="Определяет владельца и его доступ"><input className={inputClass} value={editor.ownerPhone} onChange={(event) => setEditor({ ...editor, ownerPhone: event.target.value })} disabled={!canUpdate} /></Field>
                <div className="sm:col-span-2"><Field label="Адрес"><input className={inputClass} value={editor.address} onChange={(event) => setEditor({ ...editor, address: event.target.value })} disabled={!canUpdate} /></Field></div>
                <div className="sm:col-span-2"><Field label="График работы" hint="Например: 09:00-23:00"><input className={inputClass} value={editor.workingHours} onChange={(event) => setEditor({ ...editor, workingHours: event.target.value })} disabled={!canUpdate} /></Field></div>
                <div className="sm:col-span-2"><Field label="Описание на русском"><textarea className={textareaClass} rows={3} value={editor.descriptionRu} onChange={(event) => setEditor({ ...editor, descriptionRu: event.target.value })} disabled={!canUpdate} /></Field></div>
                <div className="sm:col-span-2"><Field label="Описание на казахском"><textarea className={textareaClass} rows={3} value={editor.descriptionKk} onChange={(event) => setEditor({ ...editor, descriptionKk: event.target.value })} disabled={!canUpdate} /></Field></div>
              </div>
              <div className="mt-4 flex justify-end"><Button kind="primary" disabled={!canUpdate || busyId === activeRow.id} onClick={() => void saveEditor(activeRow)}><Save className="h-4 w-4" /> Сохранить данные</Button></div>
            </DrawerSection>

            <DrawerSection title="Обложка" subtitle="Изображение проверяется и безопасно обрабатывается перед сохранением.">
              <div className="flex items-center gap-4">
                <div className="flex h-[96px] w-[150px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">{activeRow.coverImageUrl ? <img src={absoluteImage(activeRow.coverImageUrl)} alt="Обложка ресторана" className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-slate-300" />}</div>
                <div><div className="text-[11px] text-slate-400">JPG, PNG или WebP · до 8 МБ</div><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void uploadCover(event.target.files?.[0] ?? null)} /><Button className="mt-3" disabled={!canUpdate || uploading} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> {uploading ? 'Обрабатываю' : 'Выбрать изображение'}</Button></div>
              </div>
            </DrawerSection>

            <DrawerSection title="Порядок показа" subtitle="Не влияет на решение по ресторану и приём заказов.">
              <ToggleRow title={activeRow.isPinned ? 'Ресторан закреплён' : 'Без закрепления'} description="Закрепление повышает приоритет в выдаче." active={activeRow.isPinned === true} disabled={!canUpdate || busyId === activeRow.id} onClick={() => void togglePinned(activeRow)} />
              <ToggleRow title={activeRow.useRandom ? 'Случайный порядок включён' : 'Случайный порядок выключен'} description="Используется только в поддерживаемых подборках." active={activeRow.useRandom === true} disabled={!canUpdate || busyId === activeRow.id} onClick={() => void patch(activeRow, { useRandom: activeRow.useRandom !== true }, activeRow.useRandom ? 'Случайный порядок выключен.' : 'Случайный порядок включён.')} />
              <div className="mt-3 max-w-[220px]"><Field label="Порядок показа"><input className={inputClass} value={editor.sortOrder} onChange={(event) => setEditor({ ...editor, sortOrder: event.target.value })} inputMode="numeric" disabled={!canUpdate} /></Field></div>
            </DrawerSection>

            <DrawerSection title="Разделы и филиалы">
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => router.push(`/layout-20/restaurants/${activeRow.id}`)}>Карточка</Button>
                <Button onClick={() => router.push(`/layout-20/restaurants/${activeRow.id}/menu`)}><UtensilsCrossed className="h-4 w-4" /> Меню</Button>
                <Button onClick={() => router.push(`/layout-20/orders?restaurantId=${encodeURIComponent(activeRow.id)}`)}>Заказы</Button>
                <Button onClick={() => router.push(`/layout-20/restaurants/${activeRow.id}/reviews`)}>Отзывы</Button>
                <Button className="col-span-2" disabled={!canUpdate} onClick={() => openBranch(activeRow)}><Plus className="h-4 w-4" /> Добавить филиал этому владельцу</Button>
              </div>
            </DrawerSection>

            {!isArchived(activeRow) ? (
              <DrawerSection title="Архив" subtitle="Ресторан не удаляется. Заказы и история сохраняются.">
                <Button kind="danger" disabled={!canUpdate || busyId === activeRow.id} onClick={() => setDialog({ kind: 'archive', restaurantId: activeRow.id })}><Archive className="h-4 w-4" /> Переместить в архив</Button>
              </DrawerSection>
            ) : null}
          </aside>
        </div>
      ) : null}

      {dialog && dialogCopy && dialogRow ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-[480px] rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4"><div><h3 className="text-[17px] font-bold">{dialogCopy.title}</h3><p className="mt-1 text-[12px] leading-5 text-slate-500">{dialogCopy.text}</p></div><button type="button" onClick={() => { setDialog(null); setReason(''); }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500"><X className="h-4 w-4" /></button></div>
            <div className="px-5 py-4">
              {dialogCopy.reason ? <Field label="Причина"><textarea className={textareaClass} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Укажите причину понятным текстом" /></Field> : null}
              <div className="mt-4 flex justify-end gap-2"><Button onClick={() => { setDialog(null); setReason(''); }}>Отмена</Button><Button kind={dialogCopy.danger ? 'danger' : 'primary'} onClick={() => void confirmDialog()}>{dialogCopy.action}</Button></div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
