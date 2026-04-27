'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Filter,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Users,
  X,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

type AdminRoleCode =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE'
  | 'SUPPORT'
  | 'DISPATCHER';

type AdminUser = {
  id: string;
  userId?: string;
  phone?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isActive?: boolean;
  deletedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  roles?: Array<{
    code?: string;
    name?: string;
  }>;
  roleCodes?: string[];
  user?: {
    phone?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
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
    label: 'SUPER_ADMIN',
    description: 'Полный доступ к системе',
  },
  {
    code: 'ADMIN',
    label: 'ADMIN',
    description: 'Основные разделы админки',
  },
  {
    code: 'FINANCE',
    label: 'FINANCE',
    description: 'Финансы и выплаты',
  },
  {
    code: 'SUPPORT',
    label: 'SUPPORT',
    description: 'Поддержка и отзывы',
  },
  {
    code: 'DISPATCHER',
    label: 'DISPATCHER',
    description: 'Заказы и диспетчеризация',
  },
];

const emptyForm: CreateAdminForm = {
  phone: '',
  password: '',
  firstName: '',
  lastName: '',
  email: '',
  roleCodes: ['ADMIN'],
};

function getAdminRoles(admin: AdminUser): string[] {
  if (Array.isArray(admin.roleCodes)) {
    return admin.roleCodes.filter(Boolean);
  }

  if (Array.isArray(admin.roles)) {
    return admin.roles
      .map((role) => role.code || role.name)
      .filter(Boolean) as string[];
  }

  return [];
}

function getAdminName(admin: AdminUser): string {
  const firstName = admin.firstName ?? admin.user?.firstName ?? '';
  const lastName = admin.lastName ?? admin.user?.lastName ?? '';
  const full = `${firstName} ${lastName}`.trim();

  return full || admin.phone || admin.user?.phone || 'Без имени';
}

function getAdminPhone(admin: AdminUser): string {
  return admin.phone ?? admin.user?.phone ?? '—';
}

function getAdminEmail(admin: AdminUser): string {
  return admin.email ?? admin.user?.email ?? '—';
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

function roleBadgeClass(role: string): string {
  if (role === 'SUPER_ADMIN') return 'bg-purple-100 text-purple-700';
  if (role === 'FINANCE') return 'bg-orange-100 text-orange-700';
  if (role === 'SUPPORT') return 'bg-pink-100 text-pink-700';
  if (role === 'DISPATCHER') return 'bg-cyan-100 text-cyan-700';
  return 'bg-blue-100 text-blue-700';
}

function normalizeAdminList(response: unknown): AdminUser[] {
  if (Array.isArray(response)) return response as AdminUser[];

  const data = response as any;

  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.admins)) return data.admins;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export default function RolesAndPermissionsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRoleCode>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>(
    'ALL',
  );
  const [includeInactive, setIncludeInactive] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  const [form, setForm] = useState<CreateAdminForm>(emptyForm);
  const [editRoleCodes, setEditRoleCodes] = useState<AdminRoleCode[]>([]);

  const filteredAdmins = useMemo(() => {
    const q = query.trim().toLowerCase();

    return admins.filter((admin) => {
      const roles = getAdminRoles(admin);
      const active = admin.isActive !== false && !admin.deletedAt;

      if (statusFilter === 'ACTIVE' && !active) return false;
      if (statusFilter === 'DISABLED' && active) return false;
      if (roleFilter !== 'ALL' && !roles.includes(roleFilter)) return false;

      if (!q) return true;

      const haystack = [
        getAdminName(admin),
        getAdminPhone(admin),
        getAdminEmail(admin),
        roles.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [admins, query, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = admins.filter((admin) => admin.isActive !== false && !admin.deletedAt);
    const disabled = admins.length - active.length;
    const superAdmins = admins.filter((admin) =>
      getAdminRoles(admin).includes('SUPER_ADMIN'),
    );

    return {
      total: admins.length,
      active: active.length,
      disabled,
      superAdmins: superAdmins.length,
      roles: ROLE_OPTIONS.length,
    };
  }, [admins]);

  async function loadAdmins() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch(
        `/admin/users?includeInactive=${includeInactive ? 'true' : 'false'}`,
        {
          cache: 'no-store',
        },
      );

      setAdmins(normalizeAdminList(response));
    } catch (e: any) {
      setError(e?.message || 'Не удалось загрузить администраторов');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
  }, [includeInactive]);

  function toggleFormRole(role: AdminRoleCode) {
    setForm((prev) => {
      const exists = prev.roleCodes.includes(role);
      const next = exists
        ? prev.roleCodes.filter((item) => item !== role)
        : [...prev.roleCodes, role];

      return {
        ...prev,
        roleCodes: next.length ? next : ['ADMIN'],
      };
    });
  }

  function toggleEditRole(role: AdminRoleCode) {
    setEditRoleCodes((prev) => {
      const exists = prev.includes(role);
      const next = exists
        ? prev.filter((item) => item !== role)
        : [...prev, role];

      return next.length ? next : ['ADMIN'];
    });
  }

  async function createAdmin() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!form.phone.trim()) {
        throw new Error('Телефон обязателен');
      }

      if (!form.password.trim()) {
        throw new Error('Пароль обязателен');
      }

      if (!form.roleCodes.length) {
        throw new Error('Выберите минимум одну роль');
      }

      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          phone: form.phone.trim(),
          password: form.password,
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          email: form.email.trim() || undefined,
          roleCodes: form.roleCodes,
        }),
      });

      setCreateOpen(false);
      setForm(emptyForm);
      setSuccess('Администратор создан');
      await loadAdmins();
    } catch (e: any) {
      setError(e?.message || 'Не удалось создать администратора');
    } finally {
      setSaving(false);
    }
  }

  function openRolesModal(admin: AdminUser) {
    setSelectedAdmin(admin);
    setEditRoleCodes(
      getAdminRoles(admin).filter((role): role is AdminRoleCode =>
        ROLE_OPTIONS.some((option) => option.code === role),
      ),
    );
    setRolesOpen(true);
  }

  async function saveRoles() {
    if (!selectedAdmin) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(`/admin/users/${selectedAdmin.id}/roles`, {
        method: 'PATCH',
        body: JSON.stringify({
          roleCodes: editRoleCodes,
        }),
      });

      setRolesOpen(false);
      setSelectedAdmin(null);
      setSuccess('Роли обновлены');
      await loadAdmins();
    } catch (e: any) {
      setError(e?.message || 'Не удалось обновить роли');
    } finally {
      setSaving(false);
    }
  }

  async function deactivateAdmin(admin: AdminUser) {
    if (!window.confirm(`Отключить администратора "${getAdminName(admin)}"?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(`/admin/users/${admin.id}/deactivate`, {
        method: 'POST',
      });

      setSuccess('Администратор отключён');
      await loadAdmins();
    } catch (e: any) {
      setError(e?.message || 'Не удалось отключить администратора');
    } finally {
      setSaving(false);
    }
  }

  async function reactivateAdmin(admin: AdminUser) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(`/admin/users/${admin.id}/reactivate`, {
        method: 'POST',
      });

      setSuccess('Администратор включён');
      await loadAdmins();
    } catch (e: any) {
      setError(e?.message || 'Не удалось включить администратора');
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const rows = [
      ['Имя', 'Телефон', 'Email', 'Роли', 'Статус', 'Последний вход', 'Создан'],
      ...filteredAdmins.map((admin) => [
        getAdminName(admin),
        getAdminPhone(admin),
        getAdminEmail(admin),
        getAdminRoles(admin).join(', '),
        admin.isActive !== false && !admin.deletedAt ? 'Активен' : 'Отключён',
        formatDate(admin.lastLoginAt),
        formatDate(admin.createdAt),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(';'),
      )
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `jetkiz-admins-${Date.now()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-7 text-slate-950">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
            <span>Главная</span>
            <span>›</span>
            <span>Управление</span>
            <span>›</span>
            <span className="font-medium text-slate-800">Роли и права</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">Роли и права</h1>
          <p className="mt-2 text-sm text-slate-500">
            Управление администраторами, ролями и доступами в системе
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Экспорт
          </button>

          <button
            onClick={loadAdmins}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>

          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Добавить админа
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={<Users className="h-6 w-6" />}
          title="Всего админов"
          value={stats.total}
          tone="blue"
        />
        <StatCard
          icon={<CheckCircle2 className="h-6 w-6" />}
          title="Активные"
          value={stats.active}
          tone="green"
        />
        <StatCard
          icon={<ShieldOff className="h-6 w-6" />}
          title="Отключённые"
          value={stats.disabled}
          tone="orange"
        />
        <StatCard
          icon={<ShieldCheck className="h-6 w-6" />}
          title="SUPER_ADMIN"
          value={stats.superAdmins}
          tone="purple"
        />
        <StatCard
          icon={<Shield className="h-6 w-6" />}
          title="Всего ролей"
          value={stats.roles}
          tone="indigo"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени, телефону или email..."
            className="h-11 min-w-[280px] flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-400"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-indigo-400"
          >
            <option value="ALL">Все роли</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role.code} value={role.code}>
                {role.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-indigo-400"
          >
            <option value="ALL">Все статусы</option>
            <option value="ACTIVE">Активные</option>
            <option value="DISABLED">Отключённые</option>
          </select>

          <button
            onClick={() => setIncludeInactive((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            {includeInactive ? 'Скрыть отключённых' : 'Показать отключённых'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-5 py-4">Админ</th>
                <th className="px-5 py-4">Телефон</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Роли</th>
                <th className="px-5 py-4">Статус</th>
                <th className="px-5 py-4">Последний вход</th>
                <th className="px-5 py-4">Создан</th>
                <th className="px-5 py-4 text-right">Действия</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    Загрузка...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    Администраторы не найдены
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const active = admin.isActive !== false && !admin.deletedAt;
                  const roles = getAdminRoles(admin);

                  return (
                    <tr
                      key={admin.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                            {getAdminName(admin).slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {getAdminName(admin)}
                            </div>
                            <div className="text-xs text-slate-500">
                              ID: {admin.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {getAdminPhone(admin)}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {getAdminEmail(admin)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex max-w-[260px] flex-wrap gap-1.5">
                          {roles.length ? (
                            roles.map((role) => (
                              <span
                                key={role}
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(
                                  role,
                                )}`}
                              >
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              active ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          {active ? 'Активен' : 'Отключён'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(admin.lastLoginAt)}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(admin.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openRolesModal(admin)}
                            disabled={saving}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Роли
                          </button>

                          {active ? (
                            <button
                              onClick={() => deactivateAdmin(admin)}
                              disabled={saving}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                              Отключить
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivateAdmin(admin)}
                              disabled={saving}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Включить
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
          <span>
            Показано {filteredAdmins.length} из {admins.length}
          </span>
          <span>Данные из /admin/users</span>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
        {ROLE_OPTIONS.map((role) => (
          <div
            key={role.code}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${roleBadgeClass(
                  role.code,
                )}`}
              >
                {role.label}
              </span>
              <Shield className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">{role.description}</p>
            <p className="mt-2 text-xs text-slate-500">
              Назначается администраторам через backend RBAC.
            </p>
          </div>
        ))}
      </section>

      {createOpen && (
        <Modal title="Добавить админа" onClose={() => setCreateOpen(false)}>
          <div className="space-y-4">
            <Input
              label="Телефон *"
              value={form.phone}
              onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
              placeholder="+7 700 000 00 00"
            />

            <Input
              label="Пароль *"
              value={form.password}
              onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
              placeholder="Минимум 6 символов"
              type="password"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Имя"
                value={form.firstName}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, firstName: value }))
                }
                placeholder="Введите имя"
              />

              <Input
                label="Фамилия"
                value={form.lastName}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, lastName: value }))
                }
                placeholder="Введите фамилию"
              />
            </div>

            <Input
              label="Email"
              value={form.email}
              onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
              placeholder="example@jetkiz.com"
            />

            <RoleCheckboxes
              value={form.roleCodes}
              onToggle={toggleFormRole}
            />

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setCreateOpen(false)}
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>

              <button
                onClick={createAdmin}
                disabled={saving}
                className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Создание...' : 'Создать админа'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {rolesOpen && selectedAdmin && (
        <Modal title={`Роли: ${getAdminName(selectedAdmin)}`} onClose={() => setRolesOpen(false)}>
          <div className="space-y-4">
            <RoleCheckboxes value={editRoleCodes} onToggle={toggleEditRole} />

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setRolesOpen(false)}
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>

              <button
                onClick={saveRoles}
                disabled={saving}
                className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить роли'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  tone: 'blue' | 'green' | 'orange' | 'purple' | 'indigo';
}) {
  const toneClass = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
        {icon}
      </div>
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-1 text-3xl font-bold text-slate-950">{value}</div>
      <div className="mt-3 text-xs font-semibold text-emerald-600">
        ↗ данные обновлены
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/35 p-6">
      <div className="h-full max-h-[860px] w-full max-w-[420px] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-400"
      />
    </label>
  );
}

function RoleCheckboxes({
  value,
  onToggle,
}: {
  value: AdminRoleCode[];
  onToggle: (role: AdminRoleCode) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700">Роли *</div>

      <div className="space-y-2">
        {ROLE_OPTIONS.map((role) => (
          <label
            key={role.code}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={value.includes(role.code)}
              onChange={() => onToggle(role.code)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
            />

            <div>
              <div className="text-sm font-bold text-slate-900">{role.label}</div>
              <div className="text-xs text-slate-500">{role.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}