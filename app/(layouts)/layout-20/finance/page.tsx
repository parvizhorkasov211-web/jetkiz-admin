"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";

type FinanceConfig = {
  id: string;
  clientDeliveryFeeDefault: number;
  clientDeliveryFeeWeather: number;
  courierPayoutDefault: number;
  courierPayoutWeather: number;
  courierCommissionPctDefault: number;
  restaurantCommissionPctDefault: number;
  weatherEnabled: boolean;
};

type FinanceConfigResponse = {
  config?: FinanceConfig;
};

function toStr(value: unknown) {
  return value == null ? "" : String(value);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function parseRequiredMoney(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Поле "${label}" обязательно`);

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Поле "${label}" должно быть числом`);
  }
  if (parsed < 0) {
    throw new Error(`Поле "${label}" не может быть меньше 0`);
  }

  return Math.round(parsed);
}

function parseRequiredPercent(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Поле "${label}" обязательно`);

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`Поле "${label}" должно быть целым процентом`);
  }
  if (parsed < 0 || parsed > 100) {
    throw new Error(`Поле "${label}" должно быть от 0 до 100`);
  }

  return parsed;
}

function resolveFinanceConfig(json: FinanceConfigResponse | FinanceConfig): FinanceConfig {
  if ("config" in json && json.config) return json.config;
  return json as FinanceConfig;
}

function formatMoney(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("ru-RU")} ₸`;
}

function numberOrNull(value: string) {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [clientDeliveryFeeDefault, setClientDeliveryFeeDefault] = useState("");
  const [clientDeliveryFeeWeather, setClientDeliveryFeeWeather] = useState("");
  const [courierPayoutDefault, setCourierPayoutDefault] = useState("");
  const [courierPayoutWeather, setCourierPayoutWeather] = useState("");
  const [courierCommissionPctDefault, setCourierCommissionPctDefault] = useState("");
  const [restaurantCommissionPctDefault, setRestaurantCommissionPctDefault] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const json = (await apiFetch("/restaurants/finance/config", {
        method: "GET",
        cache: "no-store",
      })) as FinanceConfigResponse | FinanceConfig;

      const cfg = resolveFinanceConfig(json);
      setWeatherEnabled(Boolean(cfg.weatherEnabled));
      setClientDeliveryFeeDefault(toStr(cfg.clientDeliveryFeeDefault));
      setClientDeliveryFeeWeather(toStr(cfg.clientDeliveryFeeWeather));
      setCourierPayoutDefault(toStr(cfg.courierPayoutDefault));
      setCourierPayoutWeather(toStr(cfg.courierPayoutWeather));
      setCourierCommissionPctDefault(toStr(cfg.courierCommissionPctDefault));
      setRestaurantCommissionPctDefault(toStr(cfg.restaurantCommissionPctDefault));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Ошибка загрузки финансовых настроек"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activeDeliveryFee = useMemo(
    () =>
      numberOrNull(
        weatherEnabled ? clientDeliveryFeeWeather : clientDeliveryFeeDefault,
      ),
    [weatherEnabled, clientDeliveryFeeDefault, clientDeliveryFeeWeather],
  );

  const activeCourierGross = useMemo(
    () =>
      numberOrNull(weatherEnabled ? courierPayoutWeather : courierPayoutDefault),
    [weatherEnabled, courierPayoutDefault, courierPayoutWeather],
  );

  const courierCommissionPct = numberOrNull(courierCommissionPctDefault);
  const estimatedCourierCommission =
    activeCourierGross != null && courierCommissionPct != null
      ? Math.round((activeCourierGross * courierCommissionPct) / 100)
      : null;
  const estimatedCourierNet =
    activeCourierGross != null && estimatedCourierCommission != null
      ? Math.max(0, activeCourierGross - estimatedCourierCommission)
      : null;
  const estimatedDeliveryMargin =
    activeDeliveryFee != null && estimatedCourierNet != null
      ? activeDeliveryFee - estimatedCourierNet
      : null;

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      setInfo(null);

      const payload = {
        weatherEnabled,
        clientDeliveryFeeDefault: parseRequiredMoney(
          clientDeliveryFeeDefault,
          "Доставка для клиента (обычно)",
        ),
        clientDeliveryFeeWeather: parseRequiredMoney(
          clientDeliveryFeeWeather,
          "Доставка для клиента (погода / пик)",
        ),
        courierPayoutDefault: parseRequiredMoney(
          courierPayoutDefault,
          "База курьера до комиссии (обычно)",
        ),
        courierPayoutWeather: parseRequiredMoney(
          courierPayoutWeather,
          "База курьера до комиссии (погода / пик)",
        ),
        courierCommissionPctDefault: parseRequiredPercent(
          courierCommissionPctDefault,
          "Комиссия JETKIZ с курьера",
        ),
        restaurantCommissionPctDefault: parseRequiredPercent(
          restaurantCommissionPctDefault,
          "Комиссия JETKIZ с ресторана",
        ),
      };

      await apiFetch("/restaurants/finance/config", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setInfo("Финансовые настройки сохранены");
      await load();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Ошибка сохранения финансовых настроек"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-600">Загрузка финансовых настроек…</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
            Финансовые настройки
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
            Здесь задаются глобальные тарифы доставки и комиссии. Индивидуальные
            настройки ресторана и бонусы курьера имеют отдельный приоритет и не
            изменяются на этой странице.
          </p>
        </div>

        <button
          className="rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={save}
          disabled={saving}
          type="button"
        >
          {saving ? "Сохранение…" : "Сохранить настройки"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {info}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-base font-semibold text-gray-950">Обычный режим</div>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Используется, когда режим «Погода / пик» выключен.
          </p>

          <label className="mt-5 block text-sm font-medium text-gray-700">
            Доставка для клиента, ₸
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            value={clientDeliveryFeeDefault}
            onChange={(event) => setClientDeliveryFeeDefault(event.target.value)}
            inputMode="numeric"
          />

          <label className="mt-4 block text-sm font-medium text-gray-700">
            База курьера до комиссии, ₸
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            value={courierPayoutDefault}
            onChange={(event) => setCourierPayoutDefault(event.target.value)}
            inputMode="numeric"
          />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-gray-950">Погода / пик</div>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                При включении эти суммы заменяют обычные глобальные значения.
              </p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={weatherEnabled}
                onChange={(event) => setWeatherEnabled(event.target.checked)}
              />
              Включён
            </label>
          </div>

          <label className="mt-5 block text-sm font-medium text-gray-700">
            Доставка для клиента, ₸
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            value={clientDeliveryFeeWeather}
            onChange={(event) => setClientDeliveryFeeWeather(event.target.value)}
            inputMode="numeric"
          />

          <label className="mt-4 block text-sm font-medium text-gray-700">
            База курьера до комиссии, ₸
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            value={courierPayoutWeather}
            onChange={(event) => setCourierPayoutWeather(event.target.value)}
            inputMode="numeric"
          />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-base font-semibold text-gray-950">Комиссии JETKIZ</div>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Это глобальные значения по умолчанию. Старые доставленные заказы не
            должны пересчитываться после их изменения.
          </p>

          <label className="mt-5 block text-sm font-medium text-gray-700">
            Комиссия с курьера, %
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            value={courierCommissionPctDefault}
            onChange={(event) => setCourierCommissionPctDefault(event.target.value)}
            inputMode="numeric"
          />

          <label className="mt-4 block text-sm font-medium text-gray-700">
            Комиссия с ресторана, %
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            value={restaurantCommissionPctDefault}
            onChange={(event) => setRestaurantCommissionPctDefault(event.target.value)}
            inputMode="numeric"
          />
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-semibold text-gray-950">
              Проверка текущей экономики доставки
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Предварительный расчёт без индивидуального бонуса курьера и без промокодов.
            </div>
          </div>
          <div className="text-xs font-medium text-gray-500">
            Активный режим: {weatherEnabled ? "Погода / пик" : "Обычный"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Metric label="Клиент платит за доставку" value={formatMoney(activeDeliveryFee)} />
          <Metric label="База курьера" value={formatMoney(activeCourierGross)} />
          <Metric label="Комиссия с курьера" value={formatMoney(estimatedCourierCommission)} />
          <Metric label="Курьеру до бонуса" value={formatMoney(estimatedCourierNet)} />
          <Metric
            label="Маржа доставки до промо"
            value={formatMoney(estimatedDeliveryMargin)}
            warning={estimatedDeliveryMargin != null && estimatedDeliveryMargin < 0}
          />
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Клиентские скидки уменьшают результат JETKIZ, а индивидуальный бонус курьера
          увеличивает выплату курьеру. Поэтому фактическая маржа конкретного заказа может
          быть ниже показанной здесь.
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs leading-4 text-gray-500">{label}</div>
      <div
        className={`mt-2 text-lg font-semibold ${
          warning ? "text-red-600" : "text-gray-950"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
