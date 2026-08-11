"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

import type {
  RestaurantAnalyticsOverview,
  RestaurantAnalyticsProductSort,
  RestaurantAnalyticsRange,
  RestaurantAnalyticsRestaurantSort,
  RestaurantAnalyticsTopProduct,
  RestaurantAnalyticsTopRestaurant,
} from "./restaurant-analytics.types";

import {
  buildAnalyticsQuery,
  getAverageReadyOnTimeRate,
  mapOverview,
  mapTopProductsResponse,
  mapTopRestaurantsResponse,
  mergeProblemRestaurants,
} from "./restaurant-analytics.mappers";

import { RestaurantAnalyticsBars } from "./RestaurantAnalyticsBars";
import { RestaurantAnalyticsDrawer } from "./RestaurantAnalyticsDrawer";
import { RestaurantAnalyticsErrorState } from "./RestaurantAnalyticsErrorState";
import { RestaurantAnalyticsFunnel } from "./RestaurantAnalyticsFunnel";
import { RestaurantAnalyticsHeader } from "./RestaurantAnalyticsHeader";
import { RestaurantAnalyticsKpiGrid } from "./RestaurantAnalyticsKpiGrid";
import { RestaurantAnalyticsProblemRestaurants } from "./RestaurantAnalyticsProblemRestaurants";
import { RestaurantAnalyticsSearchLimitBar } from "./RestaurantAnalyticsSearchLimitBar";
import { RestaurantAnalyticsSkeleton } from "./RestaurantAnalyticsSkeleton";
import { RestaurantAnalyticsSortBar } from "./RestaurantAnalyticsSortBar";
import { RestaurantAnalyticsTopProductsTable } from "./RestaurantAnalyticsTopProductsTable";
import { RestaurantAnalyticsTopRestaurantsTable } from "./RestaurantAnalyticsTopRestaurantsTable";

const restaurantSortOptions: Array<{
  value: RestaurantAnalyticsRestaurantSort;
  label: string;
}> = [
  { value: "revenue", label: "Выручка" },
  { value: "orders", label: "Заказы" },
  { value: "views", label: "Просмотры" },
  { value: "conversion", label: "Конверсия" },
  { value: "rating", label: "Рейтинг" },
  { value: "reviews", label: "Отзывы" },
  { value: "on_time", label: "Вовремя" },
  { value: "late", label: "Опоздания" },
  { value: "canceled", label: "Отмены" },
];

const productSortOptions: Array<{
  value: RestaurantAnalyticsProductSort;
  label: string;
}> = [
  { value: "revenue", label: "Выручка" },
  { value: "orders", label: "Заказы" },
  { value: "views", label: "Просмотры" },
  { value: "cart", label: "Корзина" },
  { value: "conversion", label: "Конверсия" },
];

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function rejectedReason(result: PromiseSettledResult<unknown>): string | null {
  if (result.status !== "rejected") return null;
  return result.reason instanceof Error ? result.reason.message : null;
}

export function RestaurantAnalyticsView() {
  const [range, setRange] = useState<RestaurantAnalyticsRange>("7d");
  const [restaurantSort, setRestaurantSort] =
    useState<RestaurantAnalyticsRestaurantSort>("revenue");
  const [productSort, setProductSort] =
    useState<RestaurantAnalyticsProductSort>("revenue");
  const [limit, setLimit] = useState(20);
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [overview, setOverview] = useState<RestaurantAnalyticsOverview | null>(null);
  const [topRestaurants, setTopRestaurants] = useState<RestaurantAnalyticsTopRestaurant[]>([]);
  const [topProducts, setTopProducts] = useState<RestaurantAnalyticsTopProduct[]>([]);
  const [lateRestaurants, setLateRestaurants] = useState<RestaurantAnalyticsTopRestaurant[]>([]);
  const [canceledRestaurants, setCanceledRestaurants] = useState<RestaurantAnalyticsTopRestaurant[]>([]);
  const requestIdRef = useRef(0);

  const prepSlaMinutes = 30;

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const [overviewRes, restaurantsRes, productsRes, lateRes, canceledRes] =
        await Promise.allSettled([
          apiFetch(
            `/restaurant-analytics/admin/overview?${buildAnalyticsQuery({ range })}`,
          ),
          apiFetch(
            `/restaurant-analytics/admin/top-restaurants?${buildAnalyticsQuery({
              range,
              limit,
              sort: restaurantSort,
              prepSlaMinutes,
            })}`,
          ),
          apiFetch(
            `/restaurant-analytics/admin/top-products?${buildAnalyticsQuery({
              range,
              limit,
              sort: productSort,
            })}`,
          ),
          apiFetch(
            `/restaurant-analytics/admin/top-restaurants?${buildAnalyticsQuery({
              range,
              limit: 10,
              sort: "late",
              prepSlaMinutes,
            })}`,
          ),
          apiFetch(
            `/restaurant-analytics/admin/top-restaurants?${buildAnalyticsQuery({
              range,
              limit: 10,
              sort: "canceled",
              prepSlaMinutes,
            })}`,
          ),
        ]);

      if (requestId !== requestIdRef.current) return;

      try {
        setOverview(
          overviewRes.status === "fulfilled" ? mapOverview(overviewRes.value) : null,
        );
        setTopRestaurants(
          restaurantsRes.status === "fulfilled"
            ? mapTopRestaurantsResponse(restaurantsRes.value)
            : [],
        );
        setTopProducts(
          productsRes.status === "fulfilled"
            ? mapTopProductsResponse(productsRes.value)
            : [],
        );
        setLateRestaurants(
          lateRes.status === "fulfilled"
            ? mapTopRestaurantsResponse(lateRes.value)
            : [],
        );
        setCanceledRestaurants(
          canceledRes.status === "fulfilled"
            ? mapTopRestaurantsResponse(canceledRes.value)
            : [],
        );
      } catch {
        setOverview(null);
        setTopRestaurants([]);
        setTopProducts([]);
        setLateRestaurants([]);
        setCanceledRestaurants([]);
        setError("Backend вернул данные аналитики в неожиданном формате.");
        return;
      }

      const coreFailures = [overviewRes, restaurantsRes, productsRes].filter(
        (result) => result.status === "rejected",
      );
      const secondaryFailures = [lateRes, canceledRes].filter(
        (result) => result.status === "rejected",
      );

      if (coreFailures.length === 3) {
        const message = rejectedReason(coreFailures[0]);
        setError(message || "Не удалось загрузить аналитику ресторанов.");
      } else if (coreFailures.length > 0 || secondaryFailures.length > 0) {
        setError(
          "Часть аналитики временно недоступна. Показаны только данные, полученные для текущего периода.",
        );
      }
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setOverview(null);
      setTopRestaurants([]);
      setTopProducts([]);
      setLateRestaurants([]);
      setCanceledRestaurants([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить аналитику ресторанов.",
      );
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [range, restaurantSort, productSort, limit]);

  useEffect(() => {
    void loadData();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadData]);

  const filteredRestaurants = useMemo(() => {
    const search = normalizeSearch(restaurantSearch);
    if (!search) return topRestaurants;

    return topRestaurants.filter((restaurant) =>
      [restaurant.nameRu, restaurant.nameKk, restaurant.restaurantId]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [topRestaurants, restaurantSearch]);

  const filteredProducts = useMemo(() => {
    const search = normalizeSearch(productSearch);
    if (!search) return topProducts;

    return topProducts.filter((product) =>
      [
        product.titleRu,
        product.titleKk,
        product.restaurantNameRu,
        product.productId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [topProducts, productSearch]);

  const problemRestaurants = useMemo(
    () => mergeProblemRestaurants(lateRestaurants, canceledRestaurants),
    [lateRestaurants, canceledRestaurants],
  );

  const onTimeRate = useMemo(
    () => getAverageReadyOnTimeRate(topRestaurants),
    [topRestaurants],
  );

  function openRestaurant(restaurantId: string) {
    if (restaurantId) setSelectedRestaurantId(restaurantId);
  }

  function exportCsv() {
    const rows = [
      [
        "restaurantId",
        "nameRu",
        "ordersCount",
        "deliveredCount",
        "canceledCount",
        "revenue",
        "avgCheck",
        "conversionRate",
        "readyOnTimeRate",
        "avgPrepMinutes",
        "badReviewsCount",
      ],
      ...filteredRestaurants.map((restaurant) => [
        restaurant.restaurantId,
        restaurant.nameRu,
        restaurant.ordersCount,
        restaurant.deliveredCount,
        restaurant.canceledCount,
        restaurant.revenue,
        restaurant.avgCheck,
        restaurant.conversionRate,
        restaurant.readyOnTimeRate,
        restaurant.avgPrepMinutes,
        restaurant.badReviewsCount,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `restaurant-analytics-${range}-${restaurantSort}-${limit}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading && !overview && topRestaurants.length === 0 && topProducts.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <RestaurantAnalyticsHeader
          range={range}
          loading={loading}
          onRangeChange={setRange}
          onRefresh={loadData}
          onExport={exportCsv}
        />
        <RestaurantAnalyticsSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <RestaurantAnalyticsHeader
        range={range}
        loading={loading}
        onRangeChange={setRange}
        onRefresh={loadData}
        onExport={exportCsv}
      />

      <div className="space-y-6 p-6">
        {error ? (
          <RestaurantAnalyticsErrorState message={error} onRetry={loadData} />
        ) : null}

        <RestaurantAnalyticsKpiGrid overview={overview} onTimeRate={onTimeRate} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
          <RestaurantAnalyticsFunnel overview={overview} />
          <RestaurantAnalyticsBars
            restaurants={filteredRestaurants}
            products={filteredProducts}
          />
        </div>

        <RestaurantAnalyticsProblemRestaurants
          items={problemRestaurants}
          onOpenRestaurant={openRestaurant}
        />

        <RestaurantAnalyticsSearchLimitBar
          restaurantSearch={restaurantSearch}
          productSearch={productSearch}
          limit={limit}
          loading={loading}
          onRestaurantSearchChange={setRestaurantSearch}
          onProductSearchChange={setProductSearch}
          onLimitChange={setLimit}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RestaurantAnalyticsSortBar
            title="Сортировка ресторанов"
            description={`Показано: ${filteredRestaurants.length} из ${topRestaurants.length}`}
            value={restaurantSort}
            options={restaurantSortOptions}
            loading={loading}
            onChange={setRestaurantSort}
          />

          <RestaurantAnalyticsSortBar
            title="Сортировка товаров"
            description={`Показано: ${filteredProducts.length} из ${topProducts.length}`}
            value={productSort}
            options={productSortOptions}
            loading={loading}
            onChange={setProductSort}
          />
        </div>

        <RestaurantAnalyticsTopRestaurantsTable
          items={filteredRestaurants}
          onOpenRestaurant={openRestaurant}
        />
        <RestaurantAnalyticsTopProductsTable items={filteredProducts} />
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
