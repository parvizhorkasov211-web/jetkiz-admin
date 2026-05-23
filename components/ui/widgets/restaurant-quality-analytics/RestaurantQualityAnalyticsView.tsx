"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
  Search,
  Star,
  Timer,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

import type {
  RestaurantAnalyticsRange,
  RestaurantAnalyticsRestaurantSort,
  RestaurantAnalyticsTopRestaurant,
} from "@/components/ui/widgets/restaurant-analytics/restaurant-analytics.types";

import {
  buildAnalyticsQuery,
  formatInteger,
  formatMinutes,
  formatMoney,
  formatPercent,
  mapTopRestaurantsResponse,
} from "@/components/ui/widgets/restaurant-analytics/restaurant-analytics.mappers";

import { RestaurantAnalyticsDrawer } from "@/components/ui/widgets/restaurant-analytics/RestaurantAnalyticsDrawer";
import { RestaurantAnalyticsEmptyState } from "@/components/ui/widgets/restaurant-analytics/RestaurantAnalyticsEmptyState";
import { RestaurantAnalyticsErrorState } from "@/components/ui/widgets/restaurant-analytics/RestaurantAnalyticsErrorState";
import { RestaurantAnalyticsKpiCard } from "@/components/ui/widgets/restaurant-analytics/RestaurantAnalyticsKpiCard";
import { RestaurantAnalyticsSkeleton } from "@/components/ui/widgets/restaurant-analytics/RestaurantAnalyticsSkeleton";

const ranges: Array<{ value: RestaurantAnalyticsRange; label: string }> = [
  { value: "today", label: "Сегодня" },
  { value: "7d", label: "7 дней" },
  { value: "14d", label: "14 дней" },
  { value: "30d", label: "30 дней" },
  { value: "month", label: "Месяц" },
  { value: "year", label: "Год" },
];

const sortOptions: Array<{
  value: RestaurantAnalyticsRestaurantSort;
  label: string;
}> = [
  { value: "late", label: "Опоздания" },
  { value: "canceled", label: "Отмены" },
  { value: "on_time", label: "On-time" },
  { value: "reviews", label: "Отзывы" },
  { value: "rating", label: "Рейтинг" },
  { value: "orders", label: "Заказы" },
  { value: "revenue", label: "Выручка" },
];

const limits = [10, 20, 50, 100];

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function getCancelRate(restaurant: RestaurantAnalyticsTopRestaurant): number {
  if (!restaurant.ordersCount) return 0;
  return (restaurant.canceledCount / restaurant.ordersCount) * 100;
}

function getBadReviewRate(restaurant: RestaurantAnalyticsTopRestaurant): number {
  if (!restaurant.reviewsCount) return 0;
  return (restaurant.badReviewsCount / restaurant.reviewsCount) * 100;
}

function getQualityScore(restaurant: RestaurantAnalyticsTopRestaurant): number {
  let score = 100;

  score -= getCancelRate(restaurant) * 1.4;
  score -= getBadReviewRate(restaurant) * 1.2;
  score -= restaurant.lateReadyCount * 2;

  if (restaurant.readyOnTimeRate > 0) {
    score -= Math.max(0, 90 - restaurant.readyOnTimeRate);
  }

  if (restaurant.avgPrepMinutes > 20) {
    score -= (restaurant.avgPrepMinutes - 20) * 1.2;
  }

  return Math.max(0, Math.min(100, score));
}

function getOverallQualityScore(params: {
  cancelRate: number;
  avgOnTime: number;
  avgPrep: number;
  prepSlaMinutes: number;
  criticalCount: number;
  totalRestaurants: number;
}): number {
  if (!params.totalRestaurants) return 0;

  let score = 100;

  score -= params.cancelRate * 1.4;

  if (params.avgOnTime > 0) {
    score -= Math.max(0, 90 - params.avgOnTime);
  }

  if (params.avgPrep > params.prepSlaMinutes) {
    score -= (params.avgPrep - params.prepSlaMinutes) * 1.2;
  }

  score -= params.criticalCount * 5;

  return Math.max(0, Math.min(100, score));
}

function getScoreColor(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 65) return "bg-orange-500";
  return "bg-rose-500";
}

function getQualityStatus(restaurant: RestaurantAnalyticsTopRestaurant): {
  label: string;
  className: string;
} {
  const score = getQualityScore(restaurant);

  if (score >= 85) {
    return {
      label: "Хорошо",
      className: "bg-emerald-50 text-emerald-700",
    };
  }

  if (score >= 65) {
    return {
      label: "Проверить",
      className: "bg-orange-50 text-orange-700",
    };
  }

  return {
    label: "Проблема",
    className: "bg-rose-50 text-rose-700",
  };
}

function getMainProblem(restaurant: RestaurantAnalyticsTopRestaurant): string {
  const cancelRate = getCancelRate(restaurant);
  const badReviewRate = getBadReviewRate(restaurant);

  if (cancelRate >= 10) return "Высокие отмены";
  if (restaurant.lateReadyCount > 0) return "Опоздания кухни";
  if (restaurant.readyOnTimeRate > 0 && restaurant.readyOnTimeRate < 80) {
    return "Низкий on-time";
  }
  if (restaurant.avgPrepMinutes >= 30) return "Долгая готовка";
  if (badReviewRate >= 20) return "Плохие отзывы";

  return "Без критики";
}

function mergeRestaurants(
  groups: RestaurantAnalyticsTopRestaurant[][],
): RestaurantAnalyticsTopRestaurant[] {
  const map = new Map<string, RestaurantAnalyticsTopRestaurant>();

  for (const group of groups) {
    for (const restaurant of group) {
      if (!restaurant.restaurantId) continue;
      map.set(restaurant.restaurantId, restaurant);
    }
  }

  return Array.from(map.values());
}

export function RestaurantQualityAnalyticsView() {
  const [range, setRange] = useState<RestaurantAnalyticsRange>("7d");
  const [sort, setSort] = useState<RestaurantAnalyticsRestaurantSort>("late");
  const [limit, setLimit] = useState(20);
  const [prepSlaMinutes, setPrepSlaMinutes] = useState(30);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [restaurants, setRestaurants] = useState<
    RestaurantAnalyticsTopRestaurant[]
  >([]);
  const [lateRestaurants, setLateRestaurants] = useState<
    RestaurantAnalyticsTopRestaurant[]
  >([]);
  const [canceledRestaurants, setCanceledRestaurants] = useState<
    RestaurantAnalyticsTopRestaurant[]
  >([]);
  const [reviewRestaurants, setReviewRestaurants] = useState<
    RestaurantAnalyticsTopRestaurant[]
  >([]);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(
    null,
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [mainRes, lateRes, canceledRes, reviewsRes] =
      await Promise.allSettled([
        apiFetch(
          `/restaurant-analytics/admin/top-restaurants?${buildAnalyticsQuery({
            range,
            limit,
            sort,
            prepSlaMinutes,
          })}`,
        ),
        apiFetch(
          `/restaurant-analytics/admin/top-restaurants?${buildAnalyticsQuery({
            range,
            limit,
            sort: "late",
            prepSlaMinutes,
          })}`,
        ),
        apiFetch(
          `/restaurant-analytics/admin/top-restaurants?${buildAnalyticsQuery({
            range,
            limit,
            sort: "canceled",
            prepSlaMinutes,
          })}`,
        ),
        apiFetch(
          `/restaurant-analytics/admin/top-restaurants?${buildAnalyticsQuery({
            range,
            limit,
            sort: "reviews",
            prepSlaMinutes,
          })}`,
        ),
      ]);

    if (mainRes.status === "fulfilled") {
      setRestaurants(mapTopRestaurantsResponse(mainRes.value));
    } else {
      setRestaurants([]);
      setError("Backend не вернул аналитику качества ресторанов.");
    }

    if (lateRes.status === "fulfilled") {
      setLateRestaurants(mapTopRestaurantsResponse(lateRes.value));
    } else {
      setLateRestaurants([]);
    }

    if (canceledRes.status === "fulfilled") {
      setCanceledRestaurants(mapTopRestaurantsResponse(canceledRes.value));
    } else {
      setCanceledRestaurants([]);
    }

    if (reviewsRes.status === "fulfilled") {
      setReviewRestaurants(mapTopRestaurantsResponse(reviewsRes.value));
    } else {
      setReviewRestaurants([]);
    }

    setLoading(false);
  }, [range, limit, sort, prepSlaMinutes]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const mergedQualityRestaurants = useMemo(() => {
    return mergeRestaurants([
      restaurants,
      lateRestaurants,
      canceledRestaurants,
      reviewRestaurants,
    ]);
  }, [restaurants, lateRestaurants, canceledRestaurants, reviewRestaurants]);

  const filteredRestaurants = useMemo(() => {
    const query = normalizeSearch(search);

    if (!query) return restaurants;

    return restaurants.filter((restaurant) =>
      [restaurant.nameRu, restaurant.nameKk, restaurant.restaurantId]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [restaurants, search]);

  const criticalRestaurants = useMemo(() => {
    return mergedQualityRestaurants.filter((restaurant) => {
      return (
        getCancelRate(restaurant) >= 10 ||
        restaurant.lateReadyCount > 0 ||
        restaurant.avgPrepMinutes >= prepSlaMinutes ||
        restaurant.badReviewsCount > 0 ||
        (restaurant.readyOnTimeRate > 0 && restaurant.readyOnTimeRate < 80)
      );
    });
  }, [mergedQualityRestaurants, prepSlaMinutes]);

  const stats = useMemo(() => {
    const source = mergedQualityRestaurants;

    const totalOrders = source.reduce(
      (sum, restaurant) => sum + restaurant.ordersCount,
      0,
    );
    const totalCanceled = source.reduce(
      (sum, restaurant) => sum + restaurant.canceledCount,
      0,
    );
    const totalLate = source.reduce(
      (sum, restaurant) => sum + restaurant.lateReadyCount,
      0,
    );
    const totalBadReviews = source.reduce(
      (sum, restaurant) => sum + restaurant.badReviewsCount,
      0,
    );

    const onTimeValues = source
      .map((restaurant) => restaurant.readyOnTimeRate)
      .filter((value) => Number.isFinite(value) && value > 0);

    const prepValues = source
      .map((restaurant) => restaurant.avgPrepMinutes)
      .filter((value) => Number.isFinite(value) && value > 0);

    const avgOnTime =
      onTimeValues.length > 0
        ? onTimeValues.reduce((sum, value) => sum + value, 0) /
          onTimeValues.length
        : 0;

    const avgPrep =
      prepValues.length > 0
        ? prepValues.reduce((sum, value) => sum + value, 0) / prepValues.length
        : 0;

    const cancelRate = totalOrders > 0 ? (totalCanceled / totalOrders) * 100 : 0;

    return {
      totalRestaurants: source.length,
      criticalCount: criticalRestaurants.length,
      totalOrders,
      totalCanceled,
      totalLate,
      totalBadReviews,
      avgOnTime,
      avgPrep,
      cancelRate,
    };
  }, [mergedQualityRestaurants, criticalRestaurants]);

  const overallQualityScore = useMemo(() => {
    return getOverallQualityScore({
      cancelRate: stats.cancelRate,
      avgOnTime: stats.avgOnTime,
      avgPrep: stats.avgPrep,
      prepSlaMinutes,
      criticalCount: stats.criticalCount,
      totalRestaurants: stats.totalRestaurants,
    });
  }, [stats, prepSlaMinutes]);

  function exportCsv() {
    const rows = [
      [
        "restaurantId",
        "nameRu",
        "ordersCount",
        "canceledCount",
        "cancelRate",
        "lateReadyCount",
        "readyOnTimeRate",
        "avgPrepMinutes",
        "reviewsCount",
        "badReviewsCount",
        "badReviewRate",
        "qualityScore",
        "mainProblem",
      ],
      ...filteredRestaurants.map((restaurant) => [
        restaurant.restaurantId,
        restaurant.nameRu,
        restaurant.ordersCount,
        restaurant.canceledCount,
        getCancelRate(restaurant),
        restaurant.lateReadyCount,
        restaurant.readyOnTimeRate,
        restaurant.avgPrepMinutes,
        restaurant.reviewsCount,
        restaurant.badReviewsCount,
        getBadReviewRate(restaurant),
        getQualityScore(restaurant),
        getMainProblem(restaurant),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `restaurant-quality-${range}-${sort}-${limit}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  if (loading && restaurants.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <QualityHeader
          range={range}
          sort={sort}
          limit={limit}
          prepSlaMinutes={prepSlaMinutes}
          loading={loading}
          onRangeChange={setRange}
          onSortChange={setSort}
          onLimitChange={setLimit}
          onPrepSlaMinutesChange={setPrepSlaMinutes}
          onRefresh={loadData}
          onExport={exportCsv}
        />
        <RestaurantAnalyticsSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <QualityHeader
        range={range}
        sort={sort}
        limit={limit}
        prepSlaMinutes={prepSlaMinutes}
        loading={loading}
        onRangeChange={setRange}
        onSortChange={setSort}
        onLimitChange={setLimit}
        onPrepSlaMinutesChange={setPrepSlaMinutes}
        onRefresh={loadData}
        onExport={exportCsv}
      />

      <div className="space-y-6 p-6">
        {error ? (
          <RestaurantAnalyticsErrorState message={error} onRetry={loadData} />
        ) : null}

        <QualityHero
          score={overallQualityScore}
          totalRestaurants={stats.totalRestaurants}
          criticalCount={stats.criticalCount}
          cancelRate={stats.cancelRate}
          avgOnTime={stats.avgOnTime}
          avgPrep={stats.avgPrep}
          prepSlaMinutes={prepSlaMinutes}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RestaurantAnalyticsKpiCard
            title="Рестораны"
            value={formatInteger(stats.totalRestaurants)}
            description={`Критичных: ${formatInteger(stats.criticalCount)}`}
            icon={UtensilsCrossed}
          />

          <RestaurantAnalyticsKpiCard
            title="Cancel rate"
            value={formatPercent(stats.cancelRate)}
            description={`Отмен: ${formatInteger(stats.totalCanceled)}`}
            icon={XCircle}
            tone={stats.cancelRate >= 10 ? "danger" : "default"}
          />

          <RestaurantAnalyticsKpiCard
            title="On-time готовки"
            value={stats.avgOnTime > 0 ? formatPercent(stats.avgOnTime) : "—"}
            description={`Late count: ${formatInteger(stats.totalLate)}`}
            icon={Clock}
            tone={stats.avgOnTime >= 85 ? "success" : "warning"}
          />

          <RestaurantAnalyticsKpiCard
            title="Avg prep time"
            value={formatMinutes(stats.avgPrep)}
            description={`SLA: ${prepSlaMinutes} мин`}
            icon={Timer}
            tone={stats.avgPrep >= prepSlaMinutes ? "warning" : "default"}
          />

          <RestaurantAnalyticsKpiCard
            title="Плохие отзывы"
            value={formatInteger(stats.totalBadReviews)}
            description="Отзывы с низкой оценкой"
            icon={Star}
            tone={stats.totalBadReviews > 0 ? "warning" : "default"}
          />

          <RestaurantAnalyticsKpiCard
            title="Опоздания кухни"
            value={formatInteger(stats.totalLate)}
            description="lateReadyCount"
            icon={AlertTriangle}
            tone={stats.totalLate > 0 ? "danger" : "default"}
          />

          <RestaurantAnalyticsKpiCard
            title="Всего заказов"
            value={formatInteger(stats.totalOrders)}
            description="По выбранной выборке"
            icon={UtensilsCrossed}
          />

          <RestaurantAnalyticsKpiCard
            title="Критичные"
            value={formatInteger(stats.criticalCount)}
            description="Требуют проверки оператора"
            icon={AlertTriangle}
            tone={stats.criticalCount > 0 ? "danger" : "success"}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Поиск ресторана
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  disabled={loading}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Название ресторана..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Найдено
              </label>
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                {formatInteger(filteredRestaurants.length)} из{" "}
                {formatInteger(restaurants.length)}
              </div>
            </div>
          </div>
        </div>

        <CriticalRestaurantsBlock
          restaurants={criticalRestaurants}
          onOpenRestaurant={setSelectedRestaurantId}
        />

        <QualityLeadersBlock
          restaurants={filteredRestaurants}
          onOpenRestaurant={setSelectedRestaurantId}
        />
      </div>

      <RestaurantAnalyticsDrawer
        open={Boolean(selectedRestaurantId)}
        restaurantId={selectedRestaurantId}
        range={range}
        onClose={() => setSelectedRestaurantId(null)}
      />
    </div>
  );
}

function QualityHero({
  score,
  totalRestaurants,
  criticalCount,
  cancelRate,
  avgOnTime,
  avgPrep,
  prepSlaMinutes,
}: {
  score: number;
  totalRestaurants: number;
  criticalCount: number;
  cancelRate: number;
  avgOnTime: number;
  avgPrep: number;
  prepSlaMinutes: number;
}) {
  const status =
    criticalCount > 0
      ? "Требуется контроль"
      : "Система в норме";
  const roundedScore = Math.round(score);

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-950 to-violet-700 p-6 text-white shadow-xl shadow-violet-950/20">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-violet-100">
            Quality Control Center
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-4">
            <div>
              <div className="text-sm font-medium text-violet-100">
                Quality score
              </div>
              <div className="mt-1 text-6xl font-bold leading-none tracking-tight">
                {roundedScore}
              </div>
            </div>
            <div
              className={`mb-2 rounded-full px-3 py-1 text-sm font-semibold text-white ${getScoreColor(
                score,
              )}`}
            >
              {status}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:min-w-[620px]">
          <QualityHeroMetric
            label="Рестораны"
            value={formatInteger(totalRestaurants)}
          />
          <QualityHeroMetric
            label="Критичные"
            value={formatInteger(criticalCount)}
          />
          <QualityHeroMetric
            label="Cancel rate"
            value={formatPercent(cancelRate)}
          />
          <QualityHeroMetric
            label="On-time"
            value={avgOnTime > 0 ? formatPercent(avgOnTime) : "—"}
          />
          <QualityHeroMetric label="Avg prep" value={formatMinutes(avgPrep)} />
          <QualityHeroMetric label="SLA" value={`${prepSlaMinutes} мин`} />
        </div>
      </div>
    </section>
  );
}

function QualityHeroMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <div className="text-xs font-medium uppercase tracking-wide text-violet-100">
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function QualityHeader({
  range,
  sort,
  limit,
  prepSlaMinutes,
  loading,
  onRangeChange,
  onSortChange,
  onLimitChange,
  onPrepSlaMinutesChange,
  onRefresh,
  onExport,
}: {
  range: RestaurantAnalyticsRange;
  sort: RestaurantAnalyticsRestaurantSort;
  limit: number;
  prepSlaMinutes: number;
  loading: boolean;
  onRangeChange: (value: RestaurantAnalyticsRange) => void;
  onSortChange: (value: RestaurantAnalyticsRestaurantSort) => void;
  onLimitChange: (value: number) => void;
  onPrepSlaMinutesChange: (value: number) => void;
  onRefresh: () => void;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="mb-2">
          <Link
            href="/layout-20/restaurants/analytics"
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 transition hover:text-violet-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Рестораны
          </Link>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Качество ресторанов
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Отмены, опоздания кухни, on-time, скорость приготовления и плохие
          отзывы.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={range}
          disabled={loading}
          onChange={(event) =>
            onRangeChange(event.target.value as RestaurantAnalyticsRange)
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ranges.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          disabled={loading}
          onChange={(event) =>
            onSortChange(event.target.value as RestaurantAnalyticsRestaurantSort)
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sortOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={limit}
          disabled={loading}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {limits.map((item) => (
            <option key={item} value={item}>
              {item} записей
            </option>
          ))}
        </select>

        <select
          value={prepSlaMinutes}
          disabled={loading}
          onChange={(event) =>
            onPrepSlaMinutesChange(Number(event.target.value))
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value={20}>SLA 20 мин</option>
          <option value={30}>SLA 30 мин</option>
          <option value={40}>SLA 40 мин</option>
          <option value={60}>SLA 60 мин</option>
        </select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </button>

        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          <Download className="h-4 w-4" />
          Экспорт
        </button>
      </div>
    </div>
  );
}

function CriticalRestaurantsBlock({
  restaurants,
  onOpenRestaurant,
}: {
  restaurants: RestaurantAnalyticsTopRestaurant[];
  onOpenRestaurant: (restaurantId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-950">
          Критичные рестораны
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Рестораны, которые требуют внимания оператора.
        </p>
      </div>

      <div className="p-5">
        {restaurants.length === 0 ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-950">
                  Критичных ресторанов нет
                </h3>
                <p className="mt-1 text-sm text-emerald-700">
                  За выбранный период явных проблем качества не найдено.
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
              Операционный статус: нормально
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {restaurants.slice(0, 12).map((restaurant) => {
              const score = getQualityScore(restaurant);
              const qualityStatus = getQualityStatus(restaurant);

              return (
                <button
                  key={restaurant.restaurantId}
                  type="button"
                  onClick={() => onOpenRestaurant(restaurant.restaurantId)}
                  className="rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-violet-50/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">
                        {restaurant.nameRu}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {getMainProblem(restaurant)}
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${qualityStatus.className}`}
                    >
                      {qualityStatus.label}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-500">
                        Quality score
                      </span>
                      <span className="font-bold text-slate-950">
                        {Math.round(score)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${getScoreColor(score)}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500 md:grid-cols-4">
                    <div>
                      <span className="block">Cancel</span>
                      <b className="text-slate-950">
                        {formatPercent(getCancelRate(restaurant))}
                      </b>
                    </div>
                    <div>
                      <span className="block">Late</span>
                      <b className="text-slate-950">
                        {formatInteger(restaurant.lateReadyCount)}
                      </b>
                    </div>
                    <div>
                      <span className="block">On-time</span>
                      <b className="text-slate-950">
                        {restaurant.readyOnTimeRate > 0
                          ? formatPercent(restaurant.readyOnTimeRate)
                          : "—"}
                      </b>
                    </div>
                    <div>
                      <span className="block">Prep</span>
                      <b className="text-slate-950">
                        {formatMinutes(restaurant.avgPrepMinutes)}
                      </b>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function QualityLeadersBlock({
  restaurants,
  onOpenRestaurant,
}: {
  restaurants: RestaurantAnalyticsTopRestaurant[];
  onOpenRestaurant: (restaurantId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-950">
          Таблица качества ресторанов
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Отмены, опоздания, on-time, готовка, отзывы и quality score.
        </p>
      </div>

      <div className="overflow-x-auto">
        {restaurants.length === 0 ? (
          <div className="p-5">
            <RestaurantAnalyticsEmptyState />
          </div>
        ) : (
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Ресторан</th>
                <th className="px-5 py-4">Статус</th>
                <th className="px-5 py-4">Score</th>
                <th className="px-5 py-4">Заказы</th>
                <th className="px-5 py-4">Отмены</th>
                <th className="px-5 py-4">Cancel rate</th>
                <th className="px-5 py-4">Late</th>
                <th className="px-5 py-4">On-time</th>
                <th className="px-5 py-4">Avg prep</th>
                <th className="px-5 py-4">Отзывы</th>
                <th className="px-5 py-4">Плохие</th>
                <th className="px-5 py-4">Выручка</th>
                <th className="px-5 py-4 text-right">Действие</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {restaurants.map((restaurant) => {
                const qualityStatus = getQualityStatus(restaurant);
                const score = getQualityScore(restaurant);

                return (
                  <tr
                    key={restaurant.restaurantId}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-950">
                        {restaurant.nameRu}
                      </div>
                      <div className="text-xs text-slate-500">
                        {getMainProblem(restaurant)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${qualityStatus.className}`}
                      >
                        {qualityStatus.label}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {score.toLocaleString("ru-RU", {
                        maximumFractionDigits: 0,
                      })}
                    </td>

                    <td className="px-5 py-4">
                      {formatInteger(restaurant.ordersCount)}
                    </td>

                    <td className="px-5 py-4">
                      {formatInteger(restaurant.canceledCount)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          getCancelRate(restaurant) >= 10
                            ? "font-semibold text-rose-600"
                            : "text-slate-700"
                        }
                      >
                        {formatPercent(getCancelRate(restaurant))}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          restaurant.lateReadyCount > 0
                            ? "font-semibold text-rose-600"
                            : "text-slate-700"
                        }
                      >
                        {formatInteger(restaurant.lateReadyCount)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {restaurant.readyOnTimeRate > 0 ? (
                        <span
                          className={
                            restaurant.readyOnTimeRate >= 85
                              ? "font-semibold text-emerald-600"
                              : restaurant.readyOnTimeRate >= 70
                                ? "font-semibold text-orange-600"
                                : "font-semibold text-rose-600"
                          }
                        >
                          {formatPercent(restaurant.readyOnTimeRate)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {formatMinutes(restaurant.avgPrepMinutes)}
                    </td>

                    <td className="px-5 py-4">
                      {formatInteger(restaurant.reviewsCount)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          restaurant.badReviewsCount > 0
                            ? "font-semibold text-rose-600"
                            : "text-slate-700"
                        }
                      >
                        {formatInteger(restaurant.badReviewsCount)}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {formatMoney(restaurant.revenue)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenRestaurant(restaurant.restaurantId)}
                        className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                      >
                        Открыть
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
