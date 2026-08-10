"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBasket,
  Store,
  Star,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import {
  buildAnalyticsQuery,
  formatInteger,
  formatMinutes,
  formatMoney,
  formatPercent,
  mapOverview,
  mapTopProductsResponse,
  mapTopRestaurantsResponse,
} from "./restaurant-analytics.mappers";
import type {
  RestaurantAnalyticsOverview,
  RestaurantAnalyticsRange,
  RestaurantAnalyticsTopProduct,
  RestaurantAnalyticsTopRestaurant,
} from "./restaurant-analytics.types";

const RANGE_OPTIONS: Array<{ value: RestaurantAnalyticsRange; label: string }> = [
  { value: "today", label: "Сегодня" },
  { value: "7d", label: "7 дней" },
  { value: "14d", label: "14 дней" },
  { value: "30d", label: "30 дней" },
  { value: "month", label: "Этот месяц" },
  { value: "year", label: "Этот год" },
];

type LoadState = {
  overview: RestaurantAnalyticsOverview | null;
  restaurants: RestaurantAnalyticsTopRestaurant[];
  products: RestaurantAnalyticsTopProduct[];
};

const EMPTY_STATE: LoadState = {
  overview: null,
  restaurants: [],
  products: [],
};

function cardClass() {
  return "rounded-2xl border border-slate-200 bg-white shadow-sm";
}

function Kpi({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`${cardClass()} flex min-h-[110px] items-start justify-between gap-4 p-4`}>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {value}
        </div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{hint}</div>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </div>
    </div>
  );
}

function formatPeriod(overview: RestaurantAnalyticsOverview | null) {
  const start = overview?.period?.start;
  const end = overview?.period?.end;
  if (!start || !end) return "";

  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return "";
  }

  return `${formatter.format(startDate)} — ${formatter.format(endDate)}`;
}

function safeName(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export default function RestaurantAnalyticsView() {
  const [range, setRange] = useState<RestaurantAnalyticsRange>("7d");
  const [data, setData] = useState<LoadState>(EMPTY_STATE);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const seq = ++requestSeqRef.current;

      try {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const common = buildAnalyticsQuery({ range });
        const [overviewResult, restaurantsResult, productsResult] =
          await Promise.allSettled([
            apiFetch(`/restaurant-analytics/admin/overview?${common}`),
            apiFetch(
              `/restaurant-analytics/admin/top-restaurants?${buildAnalyticsQuery({
                range,
                limit: 50,
                sort: "orders",
                prepSlaMinutes: 30,
              })}`,
            ),
            apiFetch(
              `/restaurant-analytics/admin/top-products?${buildAnalyticsQuery({
                range,
                limit: 50,
                sort: "orders",
              })}`,
            ),
          ]);

        if (seq !== requestSeqRef.current) return;

        if (overviewResult.status === "rejected") {
          throw overviewResult.reason;
        }

        setData({
          overview: mapOverview(overviewResult.value),
          restaurants:
            restaurantsResult.status === "fulfilled"
              ? mapTopRestaurantsResponse(restaurantsResult.value)
              : [],
          products:
            productsResult.status === "fulfilled"
              ? mapTopProductsResponse(productsResult.value)
              : [],
        });

        if (
          restaurantsResult.status === "rejected" ||
          productsResult.status === "rejected"
        ) {
          setError(
            "Основные показатели загружены, но часть таблиц временно недоступна.",
          );
        }
      } catch (loadError) {
        if (seq !== requestSeqRef.current) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить аналитику ресторанов",
        );
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [range],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [load]);

  const normalizedSearch = search.trim().toLowerCase();

  const restaurants = useMemo(() => {
    if (!normalizedSearch) return data.restaurants;
    return data.restaurants.filter((restaurant) =>
      [restaurant.nameRu, restaurant.nameKk]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [data.restaurants, normalizedSearch]);

  const products = useMemo(() => {
    if (!normalizedSearch) return data.products;
    return data.products.filter((product) =>
      [product.titleRu, product.titleKk, product.restaurantNameRu]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [data.products, normalizedSearch]);

  const problemRestaurants = useMemo(
    () =>
      data.restaurants
        .filter(
          (restaurant) =>
            restaurant.canceledCount > 0 ||
            restaurant.lateReadyCount > 0 ||
            restaurant.badReviewsCount > 0 ||
            (restaurant.readyCount > 0 && restaurant.readyOnTimeRate < 80),
        )
        .sort((a, b) => {
          const aScore =
            a.canceledCount + a.lateReadyCount + a.badReviewsCount * 2;
          const bScore =
            b.canceledCount + b.lateReadyCount + b.badReviewsCount * 2;
          return bScore - aScore;
        })
        .slice(0, 10),
    [data.restaurants],
  );

  const overview = data.overview;
  const orderFunnelTrusted = overview?.analyticsQuality.orderFunnelTrusted ?? false;

  if (loading && !overview) {
    return (
      <div className="p-6">
        <div className={`${cardClass()} p-6 text-sm font-medium text-slate-500`}>
          Загружаем аналитику ресторанов...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Аналитика ресторанов
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Заказы, качество приготовления, отзывы и поведение клиентов. Ненадёжные
            коэффициенты не заменяются искусственным нулём.
          </p>
          {formatPeriod(overview) ? (
            <div className="mt-2 text-xs font-medium text-slate-400">
              Период: {formatPeriod(overview)} · Asia/Almaty
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(event) =>
              setRange(event.target.value as RestaurantAnalyticsRange)
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Обновить
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      {!orderFunnelTrusted && (overview?.ordersCount ?? 0) > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">
              Воронка оформления заказов пока неполная
            </div>
            <div className="mt-1 text-amber-800">
              События оформления покрывают примерно{" "}
              {formatPercent(overview?.analyticsQuality.orderEventCoveragePct ?? 0)}{" "}
              от серверных заказов. Поэтому конверсия «просмотр → заказ» и
              «оформление → заказ» скрыта, а не показана как ложный процент.
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi
          label="Рестораны в приложении"
          value={formatInteger(overview?.restaurantsCount ?? 0)}
          hint="Одобрены, опубликованы и не заблокированы"
          icon={<Store className="h-5 w-5" />}
        />
        <Kpi
          label="Заказы"
          value={formatInteger(overview?.ordersCount ?? 0)}
          hint="Созданы за выбранный период"
          icon={<ShoppingBasket className="h-5 w-5" />}
        />
        <Kpi
          label="Доставлено"
          value={formatInteger(overview?.deliveredOrdersCount ?? 0)}
          hint={`Успешно: ${formatPercent(overview?.quality.deliveredRate ?? 0)}`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <Kpi
          label="Отменено / отклонено"
          value={formatInteger(overview?.canceledOrdersCount ?? 0)}
          hint={`Доля: ${formatPercent(overview?.quality.cancelRate ?? 0)}`}
          icon={<XCircle className="h-5 w-5" />}
        />
        <Kpi
          label="Отзывы"
          value={formatInteger(overview?.reviewsCount ?? 0)}
          hint={`Низкие оценки: ${formatPercent(overview?.quality.badReviewRate ?? 0)}`}
          icon={<Star className="h-5 w-5" />}
        />
        <Kpi
          label="Средний чек"
          value={formatMoney(overview?.avgCheck ?? 0)}
          hint="Формула финансов не изменялась"
          icon={<PackageCheck className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <section className={`${cardClass()} p-5`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Поведение клиентов
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                События приложения. Проценты считаются только между сопоставимыми
                этапами.
              </p>
            </div>
            <Eye className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricRow
              label="Просмотры ресторанов"
              value={formatInteger(overview?.restaurantViews ?? 0)}
            />
            <MetricRow
              label="Просмотры товаров"
              value={formatInteger(overview?.productViews ?? 0)}
            />
            <MetricRow
              label="Добавили в корзину"
              value={formatInteger(overview?.addToCartEvents ?? 0)}
              sub={`Просмотр товара → корзина: ${formatPercent(
                overview?.conversion.viewToCart ?? 0,
              )}`}
            />
            <MetricRow
              label="Начали оформление"
              value={formatInteger(overview?.checkoutStarts ?? 0)}
              sub={`Корзина → оформление: ${formatPercent(
                overview?.conversion.cartToCheckout ?? 0,
              )}`}
            />
            <MetricRow
              label="События создания заказа"
              value={formatInteger(overview?.orderCreatedEvents ?? 0)}
              sub={`Оформление → заказ: ${formatPercent(
                overview?.conversion.checkoutToOrder ?? null,
              )}`}
            />
            <MetricRow
              label="Просмотр ресторана → заказ"
              value={formatPercent(
                overview?.conversion.restaurantViewToOrder ?? null,
              )}
              sub={
                orderFunnelTrusted
                  ? "Данные подтверждены покрытием серверных заказов"
                  : "Недостаточно надёжных событий для расчёта"
              }
            />
          </div>
        </section>

        <section className={`${cardClass()} p-5`}>
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Рестораны, требующие внимания
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Отмена заказа, задержка приготовления или низкие отзывы.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {problemRestaurants.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                За выбранный период критичных сигналов не найдено.
              </div>
            ) : (
              problemRestaurants.map((restaurant) => (
                <Link
                  key={restaurant.restaurantId}
                  href={`/layout-20/restaurants/${restaurant.restaurantId}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {safeName(restaurant.nameRu, "Ресторан")}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Отменено: {restaurant.canceledCount} · Задержек: {restaurant.lateReadyCount} · Низких отзывов: {restaurant.badReviewsCount}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-500">
                    <div>Вовремя</div>
                    <div className="font-semibold text-slate-800">
                      {formatPercent(restaurant.readyOnTimeRate)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="relative max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по ресторану или товару"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <section className={`${cardClass()} overflow-hidden`}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">
            Рестораны
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Операционные показатели без внутренних идентификаторов в интерфейсе.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <Th>Ресторан</Th>
                <Th>Заказы</Th>
                <Th>Доставлено</Th>
                <Th>Отменено</Th>
                <Th>Приготовление</Th>
                <Th>Вовремя</Th>
                <Th>Просмотры</Th>
                <Th>Просмотр → заказ</Th>
                <Th>Рейтинг</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {restaurants.map((restaurant) => (
                <tr key={restaurant.restaurantId} className="border-t border-slate-100">
                  <Td>
                    <div className="font-semibold text-slate-900">
                      {safeName(restaurant.nameRu, "Ресторан")}
                    </div>
                    {restaurant.nameKk ? (
                      <div className="mt-0.5 text-xs text-slate-400">
                        {restaurant.nameKk}
                      </div>
                    ) : null}
                  </Td>
                  <Td strong>{formatInteger(restaurant.ordersCount)}</Td>
                  <Td>{formatInteger(restaurant.deliveredCount)}</Td>
                  <Td>{formatInteger(restaurant.canceledCount)}</Td>
                  <Td>{formatMinutes(restaurant.avgPrepMinutes)}</Td>
                  <Td>{formatPercent(restaurant.readyOnTimeRate)}</Td>
                  <Td>{formatInteger(restaurant.views)}</Td>
                  <Td>
                    <div>{formatPercent(restaurant.conversionRate)}</div>
                    {!restaurant.conversionTrusted && restaurant.ordersCount > 0 ? (
                      <div className="mt-1 text-[11px] text-amber-600">
                        Недостаточно событий
                      </div>
                    ) : null}
                  </Td>
                  <Td>
                    {restaurant.ratingAvg > 0
                      ? `${restaurant.ratingAvg.toFixed(1)} · ${restaurant.ratingCount}`
                      : "Нет оценок"}
                  </Td>
                  <Td>
                    <Link
                      href={`/layout-20/restaurants/${restaurant.restaurantId}`}
                      className="whitespace-nowrap text-xs font-semibold text-violet-700 hover:text-violet-900"
                    >
                      Открыть
                    </Link>
                  </Td>
                </tr>
              ))}
              {restaurants.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-sm text-slate-500">
                    Рестораны не найдены
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${cardClass()} overflow-hidden`}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">
            Товары
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Продажи и взаимодействия. Конверсия «корзина → заказ» намеренно не
            показывается, пока заказ не атрибутируется к товару серверным событием.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <Th>Товар</Th>
                <Th>Ресторан</Th>
                <Th>Заказано</Th>
                <Th>Заказов</Th>
                <Th>Просмотры</Th>
                <Th>В корзину</Th>
                <Th>Просмотр → корзина</Th>
                <Th>Доступность</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.productId} className="border-t border-slate-100">
                  <Td>
                    <div className="font-semibold text-slate-900">
                      {safeName(product.titleRu, "Товар")}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {formatMoney(product.price)}
                    </div>
                  </Td>
                  <Td>{safeName(product.restaurantNameRu, "Ресторан")}</Td>
                  <Td strong>{formatInteger(product.orderedQuantity)}</Td>
                  <Td>{formatInteger(product.ordersCount)}</Td>
                  <Td>{formatInteger(product.views)}</Td>
                  <Td>{formatInteger(product.addToCart)}</Td>
                  <Td>{formatPercent(product.viewToCartRate)}</Td>
                  <Td>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        product.isAvailable
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {product.isAvailable ? "Доступен" : "Сейчас недоступен"}
                    </span>
                  </Td>
                </tr>
              ))}
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-500">
                    Товары не найдены
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-950">{value}</div>
      {sub ? <div className="mt-1 text-xs leading-5 text-slate-500">{sub}</div> : null}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-3">{children}</th>;
}

function Td({
  children,
  strong = false,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap px-5 py-3.5 ${
        strong ? "font-semibold text-slate-900" : "text-slate-600"
      }`}
    >
      {children}
    </td>
  );
}
