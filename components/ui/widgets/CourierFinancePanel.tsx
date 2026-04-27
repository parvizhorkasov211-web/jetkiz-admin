"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";

type Summary = {
  courierUserId: string;
  balance: number;
  earned: number;
  paid: number;
  commission: number;
  ordersDelivered: number;
  generatedAt: string;
};

type LedgerItem = {
  id: string;
  createdAt: string;
  type: string;
  amount: number;
  comment?: string | null;
  orderId?: string | null;
  orderNumber?: number | null;
};

type LedgerResponse = {
  items?: LedgerItem[];
  total?: number;
};

type CourierFinancePanelProps = {
  courierId: string;
};

function fmtMoney(value: unknown): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return Math.round(amount).toLocaleString("ru-RU");
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("ru-RU");
  } catch {
    return value;
  }
}

function clampPct(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  const parsed = Math.round(Number(value));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.min(100, parsed));
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function normalizeLedger(response: LedgerResponse): LedgerItem[] {
  return Array.isArray(response.items) ? response.items : [];
}

function normalizeLedgerTotal(response: LedgerResponse): number {
  const total = Number(response.total ?? 0);

  if (!Number.isFinite(total)) {
    return 0;
  }

  return Math.max(0, total);
}

export function CourierFinancePanel({ courierId }: CourierFinancePanelProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [commissionPct, setCommissionPct] = useState("");

  const [payoutPeriodFrom, setPayoutPeriodFrom] = useState("");
  const [payoutPeriodTo, setPayoutPeriodTo] = useState("");
  const [payoutComment, setPayoutComment] = useState("");

  const [savingCommission, setSavingCommission] = useState(false);
  const [creatingPayout, setCreatingPayout] = useState(false);

  async function load() {
    if (!courierId) {
      return;
    }

    const [summaryResponse, ledgerResponse] = await Promise.all([
      apiFetch(`/couriers/${courierId}/finance/summary`) as Promise<Summary>,
      apiFetch(`/couriers/${courierId}/finance/ledger?page=1&limit=10`) as Promise<LedgerResponse>,
    ]);

    setSummary(summaryResponse);
    setLedger(normalizeLedger(ledgerResponse));
    setLedgerTotal(normalizeLedgerTotal(ledgerResponse));
  }

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);
        setError(null);
        setInfo(null);

        if (!courierId) {
          setSummary(null);
          setLedger([]);
          setLedgerTotal(0);
          return;
        }

        await load();
      } catch (loadError) {
        if (alive) {
          setError(getErrorMessage(loadError, "Ошибка загрузки финансов"));
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierId]);

  const cards = useMemo(() => {
    const balance = summary?.balance ?? 0;
    const earned = summary?.earned ?? 0;
    const paid = summary?.paid ?? 0;
    const commission = summary?.commission ?? 0;
    const ordersDelivered = summary?.ordersDelivered ?? 0;

    return [
      { label: "Баланс к выплате", value: fmtMoney(balance) },
      { label: "Начислено", value: fmtMoney(earned) },
      { label: "Выплачено", value: fmtMoney(paid) },
      { label: "Комиссия сервиса", value: fmtMoney(commission) },
      { label: "Доставлено", value: String(ordersDelivered) },
    ];
  }, [summary]);

  async function saveCommission() {
    if (!courierId) {
      return;
    }

    const trimmed = commissionPct.trim();
    let value: number | null = null;

    if (trimmed !== "") {
      value = clampPct(trimmed);

      if (value == null) {
        setError("Комиссия должна быть числом от 0 до 100 или пустым полем");
        return;
      }
    }

    try {
      setSavingCommission(true);
      setError(null);
      setInfo(null);

      await apiFetch(`/couriers/${courierId}/finance/commission`, {
        method: "PATCH",
        body: JSON.stringify({
          commissionPctOverride: trimmed === "" ? null : value,
        }),
      });

      setInfo("Комиссия сохранена");
      await load();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Ошибка сохранения комиссии"));
    } finally {
      setSavingCommission(false);
    }
  }

  async function createPayout() {
    if (!courierId) {
      return;
    }

    const periodFrom = payoutPeriodFrom.trim();
    const periodTo = payoutPeriodTo.trim();

    if (!periodFrom || !periodTo) {
      setError("Укажи период выплаты");
      return;
    }

    if (periodFrom > periodTo) {
      setError("Дата начала не может быть позже даты окончания");
      return;
    }

    try {
      setCreatingPayout(true);
      setError(null);
      setInfo(null);

      await apiFetch("/finance/courier-payouts", {
        method: "POST",
        body: JSON.stringify({
          courierUserId: courierId,
          periodFrom: new Date(`${periodFrom}T00:00:00.000Z`).toISOString(),
          periodTo: new Date(`${periodTo}T23:59:59.999Z`).toISOString(),
          note: payoutComment.trim() || null,
        }),
      });

      setInfo("Выплата создана");
      setPayoutPeriodFrom("");
      setPayoutPeriodTo("");
      setPayoutComment("");

      await load();
    } catch (createError) {
      setError(getErrorMessage(createError, "Ошибка создания выплаты"));
    } finally {
      setCreatingPayout(false);
    }
  }

  return (
    <div>
      <div className="mb-3 text-base font-semibold">Финансы</div>

      {error ? (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {info}
        </div>
      ) : null}

      {loading ? <div className="text-sm text-gray-600">Загрузка...</div> : null}

      {!loading ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {cards.map((card) => (
              <div key={card.label} className="rounded border p-3">
                <div className="text-xs text-gray-500">{card.label}</div>
                <div className="mt-1 text-lg font-semibold">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded border p-3">
            <div className="text-sm font-semibold">Комиссия сервиса override</div>

            <div className="mt-2 flex gap-2">
              <input
                className="w-24 rounded border px-3 py-2"
                value={commissionPct}
                onChange={(event) => setCommissionPct(event.target.value)}
                placeholder="15"
                inputMode="numeric"
              />

              <button
                className="rounded bg-black px-3 py-2 text-white disabled:opacity-60"
                onClick={saveCommission}
                disabled={savingCommission}
                type="button"
              >
                {savingCommission ? "Сохранение..." : "Сохранить"}
              </button>

              <button
                className="rounded border px-3 py-2 disabled:opacity-60"
                onClick={() => setCommissionPct("")}
                disabled={savingCommission}
                type="button"
              >
                Сбросить
              </button>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Пусто = использовать глобальную комиссию из FinanceConfig.
            </div>
          </div>

          <div className="mt-4 rounded border p-3">
            <div className="text-sm font-semibold">Сформировать выплату</div>

            <div className="mt-2 grid grid-cols-1 gap-2">
              <input
                className="rounded border px-3 py-2"
                type="date"
                value={payoutPeriodFrom}
                onChange={(event) => setPayoutPeriodFrom(event.target.value)}
              />

              <input
                className="rounded border px-3 py-2"
                type="date"
                value={payoutPeriodTo}
                onChange={(event) => setPayoutPeriodTo(event.target.value)}
              />

              <input
                className="rounded border px-3 py-2"
                value={payoutComment}
                onChange={(event) => setPayoutComment(event.target.value)}
                placeholder="Комментарий опционально"
              />

              <button
                className="rounded bg-black px-3 py-2 text-white disabled:opacity-60"
                onClick={createPayout}
                disabled={creatingPayout}
                type="button"
              >
                {creatingPayout ? "Создание..." : "Создать выплату"}
              </button>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Выплата создаётся через finance flow по периоду доставленных и ещё
              не выплаченных заказов.
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">История ledger</div>
              <div className="text-xs text-gray-500">
                записей: {ledger.length}/{ledgerTotal}
              </div>
            </div>

            {!ledger.length ? (
              <div className="text-sm text-gray-600">Нет операций</div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-3">Дата</th>
                      <th className="py-2 pr-3">Тип</th>
                      <th className="py-2 pr-3">Сумма</th>
                      <th className="py-2 pr-3">Заказ</th>
                    </tr>
                  </thead>

                  <tbody>
                    {ledger.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2 pr-3">{fmtDateTime(item.createdAt)}</td>

                        <td className="py-2 pr-3">{item.type}</td>

                        <td className="py-2 pr-3">
                          <span
                            className={
                              item.amount < 0 ? "text-red-600" : "text-green-700"
                            }
                          >
                            {item.amount < 0 ? "-" : "+"}
                            {fmtMoney(Math.abs(item.amount))}
                          </span>
                        </td>

                        <td className="py-2 pr-3">
                          {item.orderNumber != null
                            ? `#${item.orderNumber}`
                            : item.orderId ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
              Последнее обновление:{" "}
              {summary?.generatedAt ? fmtDateTime(summary.generatedAt) : "-"}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}