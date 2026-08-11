'use client';

import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/api';

type AdminRoleCode =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE'
  | 'SUPPORT'
  | 'DISPATCHER';

type AdminUser = {
  id: string;
  isActive?: boolean;
  deletedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  activeRoleCodes?: string[];
  roles?: Array<{
    code?: string;
    name?: string;
    revokedAt?: string | null;
    expiresAt?: string | null;
  }>;
  user?: {
    id?: string;
    phone?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
};

type CurrentAdmin = {
  roleCodes?: string[];
  activeRoleCodes?: string[];
};

type CreateAdminForm = {
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  roleCodes: AdminRoleCode[];
};

const ROLE_OPTIONS: Array<{
  code: AdminRoleCode;
  label: string;
  description: string;
}> = [
  {
    code: 'SUPER_ADMIN',
    label: 'Супер-администратор',
    description: 'Полный доступ, сотрудники, безопасность и критичные настройки.',
  },
  {
    code: 'ADMIN',
    label: 'Администратор',
    description: 'Операционное управление основными разделами JETKIZ.',
  },
  {
    code: 'FINANCE',
    label: 'Финансовый администратор',
    description: 'Финансы, выплаты, комиссии и финансовые отчёты.',
  },
  {
    code: 'SUPPORT',
    label: 'Специалист поддержки',
    description: 'Клиенты, отзывы, обращения и поддержка пользователей.',
  },
  {
    code: 'DISPATCHER',
    label: 'Диспетчер',
    description: 'Заказы, курьеры и оперативная диспетчеризация.',
  },
];

const EMPTY_FORM: CreateAdminForm = {
  phone: '',
  password: '',
  firstName: '',
  lastName: '',
  email: '',
  roleCodes: ['ADMIN'],
};

function roleLabel(code: string): string {
  return ROLE_OPTIONS.find((item) => item.code === code)?.label ?? code;
}

function getRoles(admin: AdminUser): string[] {
  if (Array.isArray(admin.activeRoleCodes) && admin.activeRoleCodes.length > 0) {
    return admin.activeRoleCodes;
  }

  return (admin.roles ?? [])
    .filter((item) => !item.revokedAt)
    .map((item) => item.code || item.name || '')
    .filter(Boolean);
}

function getName(admin: AdminUser): string {
  const full = [admin.user?.firstName, admin.user?.lastName]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ');

  return full || admin.user?.phone || 'Без имени';
}

function getPosition(admin: AdminUser): string {
  const roles = getRoles(admin);
  if (!roles.length) return 'Должность не назначена';
  return roles.map(roleLabel).join(', ');
}

function formatDate(value?: string | null): string {
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

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function normalizeAdminList(value: unknown): AdminUser[] {
  if (Array.isArray(value)) return value as AdminUser[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as AdminUser[];
    if (Array.isArray(record.admins)) return record.admins as AdminUser[];
  }
  return [];
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createPasswordVisible, setCreatePasswordVisible] = useState(false);
  const [form, setForm] = useState<CreateAdminForm>(EMPTY_FORM);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    phone: string;
    password: string;
  } | null>(null);

  const [rolesAdmin, setRolesAdmin] = useState<AdminUser | null>(null);
  const [editRoleCodes, setEditRoleCodes] = useState<AdminRoleCode[]>([]);

  const [passwordAdmin, setPasswordAdmin] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [adminsResult, meResult] = await Promise.allSettled([
        apiFetch('/admin/users?includeInactive=true', { cache: 'no-store' }),
        apiFetch('/admin/auth/me', { cache: 'no-store' }),
      ]);

      if (adminsResult.status !== 'fulfilled') {
        throw adminsResult.reason;
      }

      setAdmins(normalizeAdminList(adminsResult.value));
      setCurrentAdmin(
        meResult.status === 'fulfilled' && meResult.value && typeof meResult.value === 'object'
          ? (meResult.value as CurrentAdmin)
          : null,
      );
    } catch (loadError) {
      setAdmins([]);
      setError(getErrorMessage(loadError, 'Не удалось загрузить сотрудников'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currentRoleCodes = [
    ...(currentAdmin?.roleCodes ?? []),
    ...(currentAdmin?.activeRoleCodes ?? []),
  ];
  const isSuperAdmin = currentRoleCodes.includes('SUPER_ADMIN');

  const filteredAdmins = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return admins;

    return admins.filter((admin) =>
      [
        getName(admin),
        admin.user?.phone,
        admin.user?.email,
        getPosition(admin),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [admins, query]);

  const stats = useMemo(() => {
    const active = admins.filter((admin) => admin.isActive !== false && !admin.deletedAt);
    return {
      total: admins.length,
      active: active.length,
      disabled: admins.length - active.length,
      superAdmins: admins.filter((admin) => getRoles(admin).includes('SUPER_ADMIN')).length,
    };
  }, [admins]);

  function toggleCreateRole(code: AdminRoleCode) {
    setForm((previous) => {
      const exists = previous.roleCodes.includes(code);
      const next = exists
        ? previous.roleCodes.filter((item) => item !== code)
        : [...previous.roleCodes, code];
      return { ...previous, roleCodes: next.length ? next : ['ADMIN'] };
    });
  }

  function openRoles(admin: AdminUser) {
    setRolesAdmin(admin);
    setEditRoleCodes(
      getRoles(admin).filter((code): code is AdminRoleCode =>
        ROLE_OPTIONS.some((item) => item.code === code),
      ),
    );
  }

  function toggleEditRole(code: AdminRoleCode) {
    setEditRoleCodes((previous) => {
      const exists = previous.includes(code);
      const next = exists
        ? previous.filter((item) => item !== code)
        : [...previous, code];
      return next.length ? next : ['ADMIN'];
    });
  }

  async function createAdmin() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!form.phone.trim()) throw new Error('Укажите телефон сотрудника');
      if (!form.firstName.trim()) throw new Error('Укажите имя сотрудника');
      if (!form.password.trim()) throw new Error('Укажите пароль');
      if (!form.roleCodes.length) throw new Error('Выберите должность');

      const passwordSnapshot = form.password;
      const phoneSnapshot = form.phone.trim();
      const nameSnapshot = [form.firstName.trim(), form.lastName.trim()]
        .filter(Boolean)
        .join(' ');

      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          phone: phoneSnapshot,
          password: passwordSnapshot,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim() || undefined,
          email: form.email.trim() || undefined,
          roleCodes: form.roleCodes,
        }),
      });

      setCreatedCredentials({
        name: nameSnapshot,
        phone: phoneSnapshot,
        password: passwordSnapshot,
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setCreatePasswordVisible(false);
      setSuccess('Сотрудник создан. Сохраните его данные для первого входа.');
      await load();
    } catch (createError) {
      setError(getErrorMessage(createError, 'Не удалось создать сотрудника'));
    } finally {
      setSaving(false);
    }
  }

  async function saveRoles() {
    if (!rolesAdmin) return;
    setSaving(true);
    setError(null);

    try {
      await apiFetch(`/admin/users/${rolesAdmin.id}/roles`, {
        method: 'PATCH',
        body: JSON.stringify({ roleCodes: editRoleCodes }),
      });
      setRolesAdmin(null);
      setSuccess('Должность и права обновлены');
      await load();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Не удалось изменить права'));
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!passwordAdmin) return;
    setSaving(true);
    setError(null);

    try {
      if (!newPassword.trim()) throw new Error('Введите новый пароль');

      await apiFetch(`/admin/users/${passwordAdmin.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      });

      const targetName = getName(passwordAdmin);
      const targetPhone = passwordAdmin.user?.phone ?? '—';
      setCreatedCredentials({
        name: targetName,
        phone: targetPhone,
        password: newPassword,
      });
      setPasswordAdmin(null);
      setNewPassword('');
      setNewPasswordVisible(false);
      setSuccess('Пароль изменён. Все старые сессии этого сотрудника завершены.');
    } catch (passwordError) {
      setError(getErrorMessage(passwordError, 'Не удалось изменить пароль'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(admin: AdminUser) {
    const active = admin.isActive !== false && !admin.deletedAt;
    if (!window.confirm(`${active ? 'Отключить' : 'Включить'} сотрудника «${getName(admin)}»?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/admin/users/${admin.id}/${active ? 'deactivate' : 'reactivate'}`, {
        method: 'POST',
      });
      setSuccess(active ? 'Сотрудник отключён' : 'Сотрудник включён');
      await load();
    } catch (toggleError) {
      setError(getErrorMessage(toggleError, 'Не удалось изменить статус сотрудника'));
    } finally {
      setSaving(false);
    }
  }

  async function copyCredentials() {
    if (!createdCredentials) return;
    const text = `${createdCredentials.name}\nТелефон: ${createdCredentials.phone}\nПароль: ${createdCredentials.password}`;
    await navigator.clipboard.writeText(text);
    setSuccess('Данные для входа скопированы');
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Сотрудники и доступ</h1>
            <p className="mt-1 text-sm text-slate-500">
              Создание сотрудников, должности, права и безопасность учётных записей.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Добавить сотрудника
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {success}
          </div>
        ) : null}

        {createdCredentials ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-bold text-amber-950">Данные для входа</div>
                <div className="mt-1 text-sm text-amber-800">
                  {createdCredentials.name} · {createdCredentials.phone}
                </div>
                <div className="mt-3 rounded-lg bg-white px-3 py-2 font-mono text-sm text-slate-950">
                  {createdCredentials.password}
                </div>
                <p className="mt-2 text-xs text-amber-800">
                  Пароли хранятся на сервере только в виде хеша. Этот пароль доступен здесь только пока открыта текущая страница.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void copyCredentials()}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900"
                >
                  <Copy className="h-4 w-4" /> Копировать
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedCredentials(null)}
                  className="h-9 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900"
                >
                  Скрыть
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Stat title="Всего сотрудников" value={stats.total} icon={<Users className="h-5 w-5" />} />
          <Stat title="Активные" value={stats.active} icon={<CheckCircle2 className="h-5 w-5" />} />
          <Stat title="Отключённые" value={stats.disabled} icon={<ShieldOff className="h-5 w-5" />} />
          <Stat title="Супер-администраторы" value={stats.superAdmins} icon={<ShieldCheck className="h-5 w-5" />} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по имени, телефону, почте или должности"
              className="h-11 w-full max-w-xl rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-400"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Сотрудник</th>
                  <th className="px-4 py-3">Должность</th>
                  <th className="px-4 py-3">Телефон</th>
                  <th className="px-4 py-3">Почта</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Последний вход</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Загрузка...</td></tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Сотрудники не найдены</td></tr>
                ) : filteredAdmins.map((admin) => {
                  const active = admin.isActive !== false && !admin.deletedAt;
                  return (
                    <tr key={admin.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-950">{getName(admin)}</div>
                        <div className="text-xs text-slate-400">Добавлен {formatDate(admin.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{getPosition(admin)}</td>
                      <td className="px-4 py-3 text-slate-600">{admin.user?.phone || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{admin.user?.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {active ? 'Активен' : 'Отключён'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(admin.lastLoginAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openRoles(admin)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50"
                          >
                            <UserCog className="h-4 w-4" /> Доступ
                          </button>
                          {isSuperAdmin ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordAdmin(admin);
                                setNewPassword('');
                                setNewPasswordVisible(false);
                              }}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200 px-3 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                            >
                              <KeyRound className="h-4 w-4" /> Пароль
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void toggleActive(admin)}
                            className={`h-9 rounded-lg border px-3 text-xs font-semibold ${active ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                          >
                            {active ? 'Отключить' : 'Включить'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {createOpen ? (
        <Modal title="Новый сотрудник" onClose={() => setCreateOpen(false)}>
          <div className="space-y-4">
            <Input label="Имя *" value={form.firstName} onChange={(value) => setForm((previous) => ({ ...previous, firstName: value }))} />
            <Input label="Фамилия" value={form.lastName} onChange={(value) => setForm((previous) => ({ ...previous, lastName: value }))} />
            <Input label="Телефон *" value={form.phone} onChange={(value) => setForm((previous) => ({ ...previous, phone: value }))} placeholder="+7 700 000 00 00" />
            <Input label="Почта" value={form.email} onChange={(value) => setForm((previous) => ({ ...previous, email: value }))} placeholder="name@jetkiz.asia" />
            <PasswordInput
              label="Пароль *"
              value={form.password}
              visible={createPasswordVisible}
              onToggle={() => setCreatePasswordVisible((value) => !value)}
              onChange={(value) => setForm((previous) => ({ ...previous, password: value }))}
            />
            <RolePicker value={form.roleCodes} onToggle={toggleCreateRole} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Отмена</button>
              <button type="button" disabled={saving} onClick={() => void createAdmin()} className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? 'Создание...' : 'Создать сотрудника'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {rolesAdmin ? (
        <Modal title={`Доступ: ${getName(rolesAdmin)}`} onClose={() => setRolesAdmin(null)}>
          <RolePicker value={editRoleCodes} onToggle={toggleEditRole} />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setRolesAdmin(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Отмена</button>
            <button type="button" disabled={saving} onClick={() => void saveRoles()} className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Сохранить</button>
          </div>
        </Modal>
      ) : null}

      {passwordAdmin ? (
        <Modal title={`Пароль: ${getName(passwordAdmin)}`} onClose={() => setPasswordAdmin(null)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Текущий пароль нельзя получить с сервера: он хранится только в виде защищённого хеша. Супер-администратор может задать новый пароль и увидеть его до закрытия страницы.
            </div>
            <PasswordInput
              label="Новый пароль"
              value={newPassword}
              visible={newPasswordVisible}
              onToggle={() => setNewPasswordVisible((value) => !value)}
              onChange={setNewPassword}
            />
            <p className="text-xs text-slate-500">После изменения все активные сессии сотрудника будут завершены.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPasswordAdmin(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Отмена</button>
              <button type="button" disabled={saving} onClick={() => void resetPassword()} className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? 'Изменение...' : 'Изменить пароль'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function Stat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
        </div>
        <div className="rounded-xl bg-violet-50 p-3 text-violet-700">{icon}</div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/35 p-5" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400" />
    </label>
  );
}

function PasswordInput({ label, value, visible, onToggle, onChange }: { label: string; value: string; visible: boolean; onToggle: () => void; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <div className="relative">
        <input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} autoComplete="new-password" className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-11 text-sm outline-none focus:border-violet-400" />
        <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function RolePicker({ value, onToggle }: { value: AdminRoleCode[]; onToggle: (code: AdminRoleCode) => void }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700">Должность и доступ *</div>
      <div className="space-y-2">
        {ROLE_OPTIONS.map((role) => (
          <label key={role.code} className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
            <input type="checkbox" checked={value.includes(role.code)} onChange={() => onToggle(role.code)} className="mt-1 h-4 w-4" />
            <div>
              <div className="text-sm font-semibold text-slate-900">{role.label}</div>
              <div className="mt-0.5 text-xs leading-5 text-slate-500">{role.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
