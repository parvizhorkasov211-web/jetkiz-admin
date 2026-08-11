'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type PromoType = 'PERCENT' | 'FIXED' | 'FREE_DELIVERY';

type PromoCode = {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  minOrderAmount?: number | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  perUserLimit?: number | null;
  maxDiscountAmount?: number | null;
  firstOrderOnly?: boolean | null;
  restaurantId?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
};

type FormState = {
  code: string;
  type: PromoType;
  value: string;
  minOrderAmount: string;
  usageLimit: string;
  perUserLimit: string;
  maxDiscountAmount: string;
  startsAt: string;
  expiresAt: string;
  firstOrderOnly: boolean;
  restaurantId: string;
  isActive: boolean;
  autoGenerate: boolean;
};

const initialForm: FormState = {
  code: '',
  type: 'PERCENT',
  value: '',
  minOrderAmount: '',
  usageLimit: '',
  perUserLimit: '1',
  maxDiscountAmount: '',
  startsAt: '',
  expiresAt: '',
  firstOrderOnly: false,
  restaurantId: '',
  isActive: true,
  autoGenerate: false,
};

const typeLabels: Record<PromoType, string> = {
  PERCENT: 'Процентная скидка',
  FIXED: 'Скидка в тенге',
  FREE_DELIVERY: 'Бесплатная доставка',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function PromocodesPage() {
  const [items, setItems] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function loadPromoCodes() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/promo-codes', { method: 'GET', cache: 'no-store' });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(getErrorMessage(e, 'Не удалось загрузить промокоды'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPromoCodes();
  }, []);

  function handleInputChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    const checked = 'checked' in e.target ? e.target.checked : false;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const value = form.type === 'FREE_DELIVERY' ? 0 : Number(form.value);
      const usageLimit = form.usageLimit ? Number(form.usageLimit) : undefined;
      const perUserLimit = form.perUserLimit ? Number(form.perUserLimit) : undefined;

      if (!Number.isInteger(value) || value < 0) {
        throw new Error('Значение скидки должно быть целым числом не меньше 0');
      }
      if (form.type === 'PERCENT' && value > 100) {
        throw new Error('Процент скидки не может быть больше 100');
      }
      if (usageLimit !== undefined && usageLimit < 1) {
        throw new Error('Общий лимит должен быть не меньше 1');
      }
      if (perUserLimit !== undefined && perUserLimit < 1) {
        throw new Error('Лимит на клиента должен быть не меньше 1');
      }
      if (usageLimit !== undefined && perUserLimit !== undefined && perUserLimit > usageLimit) {
        throw new Error('Лимит на клиента не может превышать общий лимит');
      }
      if (form.startsAt && form.expiresAt && new Date(form.expiresAt) <= new Date(form.startsAt)) {
        throw new Error('Дата окончания должна быть позже даты начала');
      }

      await apiFetch('/promo-codes', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code.trim() || undefined,
          type: form.type,
          value,
          isActive: form.isActive,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
          usageLimit,
          perUserLimit,
          minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
          maxDiscountAmount:
            form.type !== 'FREE_DELIVERY' && form.maxDiscountAmount
              ? Number(form.maxDiscountAmount)
              : undefined,
          firstOrderOnly: form.firstOrderOnly,
          restaurantId: form.restaurantId.trim() || undefined,
          autoGenerate: form.autoGenerate,
        }),
      });

      setForm(initialForm);
      setShowCreateForm(false);
      await loadPromoCodes();
    } catch (e) {
      setError(getErrorMessage(e, 'Не удалось создать промокод'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(promoId: string) {
    try {
      setActionLoadingId(promoId);
      setError(null);
      await apiFetch(`/promo-codes/${promoId}/toggle`, { method: 'PATCH' });
      await loadPromoCodes();
    } catch (e) {
      setError(getErrorMessage(e, 'Не удалось изменить промокод'));
    } finally {
      setActionLoadingId(null);
    }
  }

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.code.localeCompare(b.code)),
    [items],
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Промокоды</h1>
            <p className="mt-1 text-sm text-slate-500">Скидки, ограничения и срок действия акций.</p>
          </div>
          <button type="button" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" onClick={() => setShowCreateForm((prev) => !prev)}>
            {showCreateForm ? 'Закрыть' : 'Создать промокод'}
          </button>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Финансирование скидки:</strong> промокоды уменьшают сумму для клиента, но не уменьшают выплату ресторану. Стоимость скидки несёт JETKIZ.
        </div>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : null}

        {showCreateForm ? (
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Код">
              <input name="code" value={form.code} onChange={handleInputChange} placeholder="WELCOME20" className="input" disabled={form.autoGenerate} />
            </Field>
            <Field label="Тип скидки">
              <select name="type" value={form.type} onChange={handleInputChange} className="input">
                {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label={form.type === 'PERCENT' ? 'Процент скидки' : form.type === 'FIXED' ? 'Скидка, ₸' : 'Значение'}>
              <input name="value" type="number" min="0" max={form.type === 'PERCENT' ? 100 : undefined} value={form.type === 'FREE_DELIVERY' ? '0' : form.value} onChange={handleInputChange} disabled={form.type === 'FREE_DELIVERY'} className="input" />
            </Field>
            <Field label="Минимальная сумма заказа, ₸"><input name="minOrderAmount" type="number" min="0" value={form.minOrderAmount} onChange={handleInputChange} className="input" /></Field>
            <Field label="Общий лимит"><input name="usageLimit" type="number" min="1" value={form.usageLimit} onChange={handleInputChange} className="input" /></Field>
            <Field label="Лимит на клиента"><input name="perUserLimit" type="number" min="1" value={form.perUserLimit} onChange={handleInputChange} className="input" /></Field>
            <Field label="Максимальная скидка, ₸"><input name="maxDiscountAmount" type="number" min="0" value={form.maxDiscountAmount} onChange={handleInputChange} disabled={form.type === 'FREE_DELIVERY'} className="input" /></Field>
            <Field label="Ресторан (UUID, необязательно)"><input name="restaurantId" value={form.restaurantId} onChange={handleInputChange} placeholder="Для акции одного ресторана" className="input" /></Field>
            <Field label="Начало"><input name="startsAt" type="datetime-local" value={form.startsAt} onChange={handleInputChange} className="input" /></Field>
            <Field label="Окончание"><input name="expiresAt" type="datetime-local" value={form.expiresAt} onChange={handleInputChange} className="input" /></Field>

            <div className="flex flex-wrap gap-5 md:col-span-2 xl:col-span-3">
              <Checkbox id="isActive" label="Активен" checked={form.isActive} onChange={handleInputChange} />
              <Checkbox id="firstOrderOnly" label="Только первый заказ" checked={form.firstOrderOnly} onChange={handleInputChange} />
              <Checkbox id="autoGenerate" label="Сгенерировать код автоматически" checked={form.autoGenerate} onChange={handleInputChange} />
            </div>

            <div className="flex gap-3 md:col-span-2 xl:col-span-3">
              <button type="submit" disabled={submitting} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Сохраняем...' : 'Сохранить'}</button>
              <button type="button" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold" onClick={() => { setForm(initialForm); setShowCreateForm(false); }}>Отмена</button>
            </div>
          </form>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="p-3">Код</th><th className="p-3">Тип</th><th className="p-3">Скидка</th><th className="p-3">Использовано</th><th className="p-3">На клиента</th><th className="p-3">Период</th><th className="p-3">Статус</th><th className="p-3">Действие</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={8} className="p-8 text-center text-slate-500">Загрузка...</td></tr> : null}
                {!loading && sortedItems.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-slate-500">Промокодов пока нет</td></tr> : null}
                {!loading && sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-semibold">{item.code}</td>
                    <td className="p-3">{typeLabels[item.type]}</td>
                    <td className="p-3">{item.type === 'PERCENT' ? `${item.value}%` : item.type === 'FIXED' ? `${item.value.toLocaleString('ru-RU')} ₸` : 'Доставка'}</td>
                    <td className="p-3">{item.usedCount ?? 0}{item.usageLimit ? ` / ${item.usageLimit}` : ''}</td>
                    <td className="p-3">{item.perUserLimit ?? '—'}</td>
                    <td className="p-3 whitespace-nowrap">{formatDate(item.startsAt)} — {formatDate(item.expiresAt)}</td>
                    <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.isActive ? 'Активен' : 'Выключен'}</span></td>
                    <td className="p-3"><button type="button" disabled={actionLoadingId === item.id} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-50" onClick={() => void handleToggle(item.id)}>{actionLoadingId === item.id ? 'Сохраняем...' : item.isActive ? 'Выключить' : 'Включить'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style jsx>{`.input{width:100%;border:1px solid rgb(226 232 240);border-radius:.75rem;padding:.625rem .75rem;outline:none;background:white}.input:focus{border-color:rgb(100 116 139)}.input:disabled{background:rgb(248 250 252);color:rgb(148 163 184)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold">{label}</span>{children}</label>;
}

function Checkbox({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="flex items-center gap-2 text-sm font-medium"><input id={id} name={id} type="checkbox" checked={checked} onChange={onChange} />{label}</label>;
}
