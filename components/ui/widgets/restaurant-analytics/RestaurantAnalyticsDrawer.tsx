"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Clock,
  ExternalLink,
  Package,
  RefreshCw,
  Star,
  Store,
  Wallet,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

import type {
  RestaurantAnalyticsRange,
  RestaurantAnalyticsTopProduct,
} from "./restaurant-analytics.types";

import {
  buildAnalyticsQuery,
  formatInteger,
  formatMinutes,
  formatMoney,
  formatPercent,
  mapTopProductsResponse,
} from "./restaurant-analytics.mappers";

import { RestaurantAnalyticsEmptyState } from "./RestaurantAnalyticsEmptyState";
import { RestaurantAnalyticsCollapseSection } from "./RestaurantAnalyticsCollapseSection";

type Props = {
  open: boolean;
  restaurantId: string | null;
  range: RestaurantAnalyticsRange;
  onClose: () => void;
};

type DrawerTab = "overview" | "quality" | "products" | "orders" | "finance" | "reviews";

type SectionId =
  | "overviewMain"
  | "qualityMain"
  | "daily"
  | "products"
  | "orders"
  | "finance"
  | "reviews";

type RestaurantSummary = {
  restaurant?: {
    id?: string;
    nameRu?: string;
    nameKk?: string;
    coverImageUrl?: string | null;
    ratingAvg?: number;
    ratingCount?: number;
    status?: string;
    isInApp?: boolean;
    isAcceptingOrders?: boolean;
  };
  ordersCount?: number;
  deliveredOrdersCount?: number;
  revenue?: number;
  avgCheck?: number;
  views?: number;
  productViews?: number;
  addToCart?: number;
  reviewsCount?: number;
  conversion?: {
    restaurantViewToOrder?: number;
    productViewToCart?: number;
  };
};

type RestaurantQuality = {
  totalOrders?: number;
  acceptedOrders?: number;
  readyOrders?: number;
  deliveredOrders?: number;
  canceledOrders?: number;
  rejectedOrders?: number;
  readyOnTime?: number;
  readyLate?: number;
  readyOnTimeRate?: number;
  lateReadyRate?: number;
  cancelRate?: number;
  rejectRate?: number;
  avgAcceptMinutes?: number;
  avgPrepMinutes?: number;
  avgCourierWaitMinutes?: number;
  maxPrepMinutes?: number;
  reviewsCount?: number;
  avgRating?: number;
  badReviews?: number;
  goodReviews?: number;
  badReviewRate?: number;
  goodReviewRate?: number;
};

type RestaurantDetail = {
  restaurantId?: string;
  summary?: RestaurantSummary;
  quality?: RestaurantQuality;
  topProducts?: RestaurantAnalyticsTopProduct[];
};

type DailyMetric = {
  date: string;
  orders: number;
  delivered: number;
  canceled: number;
  revenue: number;
};

type RecentOrder = {
  id: string;
  number?: number | string;
  status?: string;
  total?: number;
  createdAt?: string;
};

type PayoutRow = {
  id: string;
  status?: string;
  payoutAmount?: number;
  commissionAmount?: number;
  ordersCount?: number;
  periodFrom?: string;
  periodTo?: string;
};

type ReviewRow = {
  id: string;
  rating?: number;
  text?: string;
  createdAt?: string;
};

type MenuStats = {
  productsCount: number;
  availableCount: number;
  unavailableCount: number;
};

const tabs: Array<{ id: DrawerTab; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "quality", label: "Качество" },
  { id: "products", label: "Товары" },
  { id: "orders", label: "Заказы" },
  { id: "finance", label: "Финансы" },
  { id: "reviews", label: "Отзывы" },
];

const sectionIds: SectionId[] = [
  "overviewMain",
  "qualityMain",
  "daily",
  "products",
  "orders",
  "finance",
  "reviews",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (!isRecord(value)) return [];

  const possibleKeys = [
    "items",
    "data",
    "result",
    "orders",
    "reviews",
    "products",
    "daily",
    "series",
    "categories",
  ];

  for (const key of possibleKeys) {
    const item = value[key];
    if (Array.isArray(item)) return item;
  }

  return [];
}

function extractProductsFromMenu(value: unknown): unknown[] {
  const directProducts = toArray(asRecord(value).products);
  if (directProducts.length > 0) return directProducts;

  const rootArray = toArray(value);
  if (rootArray.length > 0) {
    const nestedProducts = rootArray.flatMap((item) => {
      const row = asRecord(item);
      return toArray(row.products);
    });

    if (nestedProducts.length > 0) return nestedProducts;

    return rootArray;
  }

  const categories = toArray(asRecord(value).categories);
  if (categories.length === 0) return [];

  return categories.flatMap((category) => {
    const row = asRecord(category);
    return toArray(row.products);
  });
}

function mapDetail(value: unknown): RestaurantDetail {
  const data = asRecord(value);
  const summary = asRecord(data.summary);
  const restaurant = asRecord(summary.restaurant);
  const conversion = asRecord(summary.conversion);
  const quality = asRecord(data.quality);

  return {
    restaurantId: asString(data.restaurantId),
    summary: {
      restaurant: {
        id: asString(restaurant.id),
        nameRu: asString(restaurant.nameRu ?? restaurant.name, "Ресторан"),
        nameKk: asString(restaurant.nameKk),
        coverImageUrl:
          typeof restaurant.coverImageUrl === "string"
            ? restaurant.coverImageUrl
            : null,
        ratingAvg: asNumber(restaurant.ratingAvg),
        ratingCount: asNumber(restaurant.ratingCount),
        status: asString(restaurant.status),
        isInApp:
          typeof restaurant.isInApp === "boolean"
            ? restaurant.isInApp
            : undefined,
        isAcceptingOrders:
          typeof restaurant.isAcceptingOrders === "boolean"
            ? restaurant.isAcceptingOrders
            : undefined,
      },
      ordersCount: asNumber(summary.ordersCount),
      deliveredOrdersCount: asNumber(summary.deliveredOrdersCount),
      revenue: asNumber(summary.revenue),
      avgCheck: asNumber(summary.avgCheck),
      views: asNumber(summary.views),
      productViews: asNumber(summary.productViews),
      addToCart: asNumber(summary.addToCart),
      reviewsCount: asNumber(summary.reviewsCount),
      conversion: {
        restaurantViewToOrder: asNumber(conversion.restaurantViewToOrder),
        productViewToCart: asNumber(conversion.productViewToCart),
      },
    },
    quality: {
      totalOrders: asNumber(quality.totalOrders),
      acceptedOrders: asNumber(quality.acceptedOrders),
      readyOrders: asNumber(quality.readyOrders),
      deliveredOrders: asNumber(quality.deliveredOrders),
      canceledOrders: asNumber(quality.canceledOrders),
      rejectedOrders: asNumber(quality.rejectedOrders),
      readyOnTime: asNumber(quality.readyOnTime),
      readyLate: asNumber(quality.readyLate),
      readyOnTimeRate: asNumber(quality.readyOnTimeRate),
      lateReadyRate: asNumber(quality.lateReadyRate),
      cancelRate: asNumber(quality.cancelRate),
      rejectRate: asNumber(quality.rejectRate),
      avgAcceptMinutes: asNumber(quality.avgAcceptMinutes),
      avgPrepMinutes: asNumber(quality.avgPrepMinutes),
      avgCourierWaitMinutes: asNumber(quality.avgCourierWaitMinutes),
      maxPrepMinutes: asNumber(quality.maxPrepMinutes),
      reviewsCount: asNumber(quality.reviewsCount),
      avgRating: asNumber(quality.avgRating),
      badReviews: asNumber(quality.badReviews),
      goodReviews: asNumber(quality.goodReviews),
      badReviewRate: asNumber(quality.badReviewRate),
      goodReviewRate: asNumber(quality.goodReviewRate),
    },
    topProducts: mapTopProductsResponse(data.topProducts),
  };
}

function mapDailyMetrics(value: unknown): DailyMetric[] {
  const data = asRecord(value);

  const rawItems =
    toArray(data.daily).length > 0
      ? toArray(data.daily)
      : toArray(data.series).length > 0
        ? toArray(data.series)
        : toArray(data.items).length > 0
          ? toArray(data.items)
          : toArray(value);

  return rawItems.map((item) => {
    const row = asRecord(item);

    return {
      date: asString(row.date ?? row.day ?? row.bucket),
      orders: asNumber(row.orders ?? row.ordersCount),
      delivered: asNumber(row.delivered ?? row.deliveredCount),
      canceled: asNumber(row.canceled ?? row.canceledCount),
      revenue: asNumber(row.revenue ?? row.totalRevenue),
    };
  });
}

function mapRecentOrders(value: unknown): RecentOrder[] {
  const data = asRecord(value);

  const rawItems =
    toArray(data.recentOrders).length > 0
      ? toArray(data.recentOrders)
      : toArray(data.orders).length > 0
        ? toArray(data.orders)
        : [];

  return rawItems.map((item, index) => {
    const row = asRecord(item);

    return {
      id: asString(row.id, String(index)),
      number: asString(row.number),
      status: asString(row.status),
      total: asNumber(row.total),
      createdAt: asString(row.createdAt),
    };
  });
}

function mapPayouts(value: unknown): PayoutRow[] {
  return toArray(value).map((item, index) => {
    const row = asRecord(item);

    return {
      id: asString(row.id, String(index)),
      status: asString(row.status),
      payoutAmount: asNumber(row.payoutAmount),
      commissionAmount: asNumber(row.commissionAmount),
      ordersCount: asNumber(row.ordersCount),
      periodFrom: asString(row.periodFrom),
      periodTo: asString(row.periodTo),
    };
  });
}

function mapReviews(value: unknown): ReviewRow[] {
  return toArray(value).map((item, index) => {
    const row = asRecord(item);

    return {
      id: asString(row.id, String(index)),
      rating: asNumber(row.rating),
      text: asString(row.text),
      createdAt: asString(row.createdAt),
    };
  });
}

function mapMenuStats(value: unknown): MenuStats {
  const products = extractProductsFromMenu(value);

  let availableCount = 0;
  let unavailableCount = 0;

  for (const product of products) {
    const row = asRecord(product);

    if (row.isAvailable === false) {
      unavailableCount += 1;
    } else {
      availableCount += 1;
    }
  }

  return {
    productsCount: products.length,
    availableCount,
    unavailableCount,
  };
}

function formatDate(value?: string): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("ru-RU");
}

function getStatusLabel(status?: string): string {
  if (!status) return "—";

  const map: Record<string, string> = {
    OPEN: "Открыт",
    CLOSED: "Закрыт",

    CREATED: "Создан",
    ACCEPTED: "Принят",
    COOKING: "Готовится",
    READY: "Готов",
    ON_THE_WAY: "В пути",
    DELIVERED: "Доставлен",
    CANCELED: "Отменён",
    REJECTED: "Отклонён",

    PENDING: "Ожидает",
    PAID: "Оплачен",
  };

  return map[status] ?? status;
}

function DrawerMetricCard({
  title,
  value,
  description,
  icon: Icon,
  danger,
}: {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-500">{title}</div>
          <div className="mt-1 text-xl font-bold text-slate-950">{value}</div>
          {description ? (
            <div className="mt-1 text-xs text-slate-500">{description}</div>
          ) : null}
        </div>

        <div
          className={
            danger
              ? "flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"
              : "flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"
          }
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={`font-semibold ${
          tone === "success"
            ? "text-emerald-600"
            : tone === "danger"
              ? "text-rose-600"
              : "text-slate-950"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function RestaurantAnalyticsDrawer({
  open,
  restaurantId,
  range,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<SectionId, boolean>
  >({
    overviewMain: false,
    qualityMain: false,
    daily: false,
    products: false,
    orders: false,
    finance: false,
    reviews: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<RestaurantDetail | null>(null);
  const [topProducts, setTopProducts] = useState<RestaurantAnalyticsTopProduct[]>(
    [],
  );
  const [daily, setDaily] = useState<DailyMetric[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [menuStats, setMenuStats] = useState<MenuStats | null>(null);

  function toggleSection(id: SectionId) {
    setCollapsedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function collapseAll() {
    setCollapsedSections(
      sectionIds.reduce(
        (acc, id) => ({
          ...acc,
          [id]: true,
        }),
        {} as Record<SectionId, boolean>,
      ),
    );
  }

  function expandAll() {
    setCollapsedSections(
      sectionIds.reduce(
        (acc, id) => ({
          ...acc,
          [id]: false,
        }),
        {} as Record<SectionId, boolean>,
      ),
    );
  }

  const loadData = useCallback(async () => {
    if (!restaurantId) return;

    setLoading(true);
    setError(null);

    const detailQuery = buildAnalyticsQuery({
      range,
      prepSlaMinutes: 30,
    });

    const productsQuery = buildAnalyticsQuery({
      range,
      limit: 10,
      sort: "revenue",
    });

    const [
      detailRes,
      topProductsRes,
      metricsRes,
      payoutsRes,
      reviewsRes,
      menuRes,
    ] = await Promise.allSettled([
      apiFetch(
        `/restaurant-analytics/admin/restaurants/${restaurantId}?${detailQuery}`,
      ),
      apiFetch(
        `/restaurant-analytics/admin/restaurants/${restaurantId}/top-products?${productsQuery}`,
      ),
      apiFetch(`/restaurants/${restaurantId}/metrics`),
      apiFetch(`/finance/restaurant-payouts?restaurantId=${restaurantId}`),
      apiFetch(`/restaurants/${restaurantId}/reviews`),
      apiFetch(`/restaurants/${restaurantId}/menu/manage?includeUnavailable=1`),
    ]);

    if (detailRes.status === "fulfilled") {
      const mappedDetail = mapDetail(detailRes.value);
      setDetail(mappedDetail);

      if (mappedDetail.topProducts?.length) {
        setTopProducts(mappedDetail.topProducts);
      }
    } else {
      setError("Не удалось загрузить карточку ресторана.");
      setDetail(null);
    }

    if (topProductsRes.status === "fulfilled") {
      setTopProducts(mapTopProductsResponse(topProductsRes.value));
    } else if (detailRes.status !== "fulfilled") {
      setTopProducts([]);
    }

    if (metricsRes.status === "fulfilled") {
      setDaily(mapDailyMetrics(metricsRes.value));
      setRecentOrders(mapRecentOrders(metricsRes.value));
    } else {
      setDaily([]);
      setRecentOrders([]);
    }

    if (payoutsRes.status === "fulfilled") {
      setPayouts(mapPayouts(payoutsRes.value));
    } else {
      setPayouts([]);
    }

    if (reviewsRes.status === "fulfilled") {
      setReviews(mapReviews(reviewsRes.value));
    } else {
      setReviews([]);
    }

    if (menuRes.status === "fulfilled") {
      setMenuStats(mapMenuStats(menuRes.value));
    } else {
      setMenuStats(null);
    }

    setLoading(false);
  }, [restaurantId, range]);

  useEffect(() => {
    if (!open) return;

    setActiveTab("overview");
    void loadData();
  }, [open, loadData]);

  const summary = detail?.summary;
  const restaurant = summary?.restaurant;
  const quality = detail?.quality;

  const maxDailyRevenue = useMemo(() => {
    return Math.max(1, ...daily.map((item) => item.revenue));
  }, [daily]);

  const maxDailyOrders = useMemo(() => {
    return Math.max(1, ...daily.map((item) => item.orders));
  }, [daily]);

  if (!open || !restaurantId) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-[920px] overflow-y-auto bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-950">
                    {restaurant?.nameRu ?? "Аналитика ресторана"}
                  </h2>

                  {restaurant?.status ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {getStatusLabel(restaurant.status)}
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Детальная аналитика, качество, товары, выплаты и отзывы.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={collapseAll}
                  className="hidden h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:inline-flex md:items-center"
                >
                  Свернуть всё
                </button>

                <button
                  type="button"
                  onClick={expandAll}
                  className="hidden h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:inline-flex md:items-center"
                >
                  Развернуть всё
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/layout-20/restaurants/${restaurantId}`;
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Профиль
                </button>

                <button
                  type="button"
                  onClick={loadData}
                  disabled={loading}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Обновить
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2 md:hidden">
              <button
                type="button"
                onClick={collapseAll}
                className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                Свернуть всё
              </button>

              <button
                type="button"
                onClick={expandAll}
                className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                Развернуть всё
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {loading && !detail ? (
            <div className="space-y-4">
              <div className="h-28 animate-pulse rounded-2xl bg-white" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-28 animate-pulse rounded-2xl bg-white" />
                <div className="h-28 animate-pulse rounded-2xl bg-white" />
              </div>
              <div className="h-80 animate-pulse rounded-2xl bg-white" />
            </div>
          ) : (
            <>
              {activeTab === "overview" ? (
                <div className="space-y-5">
                  <RestaurantAnalyticsCollapseSection
                    title="Обзор ресторана"
                    description="Заказы, выручка, рейтинг, просмотры и базовая конверсия."
                    collapsed={collapsedSections.overviewMain}
                    onToggle={() => toggleSection("overviewMain")}
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <DrawerMetricCard
                        title="Заказы"
                        value={formatInteger(summary?.ordersCount ?? 0)}
                        description={`Доставлено: ${formatInteger(
                          summary?.deliveredOrdersCount ?? 0,
                        )}`}
                        icon={Store}
                      />

                      <DrawerMetricCard
                        title="Выручка"
                        value={formatMoney(summary?.revenue ?? 0)}
                        description="Gross revenue"
                        icon={Wallet}
                      />

                      <DrawerMetricCard
                        title="Средний чек"
                        value={formatMoney(summary?.avgCheck ?? 0)}
                        description="По доставленным заказам"
                        icon={BarChart3}
                      />

                      <DrawerMetricCard
                        title="Рейтинг"
                        value={`${(restaurant?.ratingAvg ?? 0).toLocaleString(
                          "ru-RU",
                          { maximumFractionDigits: 1 },
                        )}`}
                        description={`${formatInteger(
                          restaurant?.ratingCount ?? 0,
                        )} оценок`}
                        icon={Star}
                      />

                      <DrawerMetricCard
                        title="Просмотры"
                        value={formatInteger(summary?.views ?? 0)}
                        description={`Товары: ${formatInteger(
                          summary?.productViews ?? 0,
                        )}`}
                        icon={Package}
                      />

                      <DrawerMetricCard
                        title="Корзина"
                        value={formatInteger(summary?.addToCart ?? 0)}
                        description={`Product → Cart: ${formatPercent(
                          summary?.conversion?.productViewToCart ?? 0,
                        )}`}
                        icon={Package}
                      />

                      <DrawerMetricCard
                        title="On-time готовки"
                        value={
                          quality?.readyOrders && quality.readyOrders > 0
                            ? formatPercent(quality.readyOnTimeRate ?? 0)
                            : "—"
                        }
                        description={`Late: ${formatInteger(
                          quality?.readyLate ?? 0,
                        )}`}
                        icon={Clock}
                        danger={
                          Boolean(quality?.readyOrders) &&
                          Number(quality?.readyOnTimeRate ?? 0) < 80
                        }
                      />

                      <DrawerMetricCard
                        title="Cancel / Reject"
                        value={`${formatPercent(
                          quality?.cancelRate ?? 0,
                        )} / ${formatPercent(quality?.rejectRate ?? 0)}`}
                        description={`Отмен: ${formatInteger(
                          quality?.canceledOrders ?? 0,
                        )}`}
                        icon={AlertTriangle}
                        danger
                      />
                    </div>
                  </RestaurantAnalyticsCollapseSection>

                  <RestaurantAnalyticsCollapseSection
                    title="Динамика по дням"
                    description="Заказы и выручка по ресторану."
                    collapsed={collapsedSections.daily}
                    onToggle={() => toggleSection("daily")}
                  >
                    {daily.length === 0 ? (
                      <RestaurantAnalyticsEmptyState
                        title="Нет daily-данных"
                        description="Backend не вернул daily metrics для выбранного ресторана."
                      />
                    ) : (
                      <div className="space-y-4">
                        {daily.slice(-10).map((item) => (
                          <div key={item.date}>
                            <div className="mb-2 flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-700">
                                {formatDate(item.date)}
                              </span>
                              <span className="font-semibold text-slate-950">
                                {formatInteger(item.orders)} заказов •{" "}
                                {formatMoney(item.revenue)}
                              </span>
                            </div>

                            <div className="grid grid-cols-[1fr_1fr] gap-2">
                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-violet-600"
                                  style={{
                                    width: `${Math.max(
                                      3,
                                      (item.revenue / maxDailyRevenue) * 100,
                                    )}%`,
                                  }}
                                />
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-emerald-500"
                                  style={{
                                    width: `${Math.max(
                                      3,
                                      (item.orders / maxDailyOrders) * 100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </RestaurantAnalyticsCollapseSection>
                </div>
              ) : null}

              {activeTab === "quality" ? (
                <RestaurantAnalyticsCollapseSection
                  title="Качество"
                  description="Скорость принятия, готовки, ожидание курьера, отмены и отзывы."
                  collapsed={collapsedSections.qualityMain}
                  onToggle={() => toggleSection("qualityMain")}
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h3 className="font-bold text-slate-950">
                        Качество кухни
                      </h3>
                      <div className="mt-4 space-y-3">
                        <DetailRow
                          label="Avg accept"
                          value={formatMinutes(quality?.avgAcceptMinutes ?? 0)}
                        />
                        <DetailRow
                          label="Avg prep"
                          value={formatMinutes(quality?.avgPrepMinutes ?? 0)}
                        />
                        <DetailRow
                          label="Courier wait"
                          value={formatMinutes(
                            quality?.avgCourierWaitMinutes ?? 0,
                          )}
                        />
                        <DetailRow
                          label="Max prep"
                          value={formatMinutes(quality?.maxPrepMinutes ?? 0)}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h3 className="font-bold text-slate-950">Статусы</h3>
                      <div className="mt-4 space-y-3">
                        <DetailRow
                          label="Всего заказов"
                          value={formatInteger(quality?.totalOrders ?? 0)}
                        />
                        <DetailRow
                          label="Ready"
                          value={formatInteger(quality?.readyOrders ?? 0)}
                        />
                        <DetailRow
                          label="Delivered"
                          value={formatInteger(quality?.deliveredOrders ?? 0)}
                          tone="success"
                        />
                        <DetailRow
                          label="Canceled"
                          value={formatInteger(quality?.canceledOrders ?? 0)}
                          tone="danger"
                        />
                        <DetailRow
                          label="Rejected"
                          value={formatInteger(quality?.rejectedOrders ?? 0)}
                          tone="danger"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h3 className="font-bold text-slate-950">Отзывы</h3>
                      <div className="mt-4 space-y-3">
                        <DetailRow
                          label="Всего"
                          value={formatInteger(quality?.reviewsCount ?? 0)}
                        />
                        <DetailRow
                          label="Средний рейтинг"
                          value={(quality?.avgRating ?? 0).toLocaleString(
                            "ru-RU",
                            { maximumFractionDigits: 1 },
                          )}
                        />
                        <DetailRow
                          label="Хорошие"
                          value={formatInteger(quality?.goodReviews ?? 0)}
                          tone="success"
                        />
                        <DetailRow
                          label="Плохие"
                          value={formatInteger(quality?.badReviews ?? 0)}
                          tone="danger"
                        />
                        <DetailRow
                          label="Bad review rate"
                          value={formatPercent(quality?.badReviewRate ?? 0)}
                          tone="danger"
                        />
                      </div>
                    </div>
                  </div>
                </RestaurantAnalyticsCollapseSection>
              ) : null}

              {activeTab === "products" ? (
                <RestaurantAnalyticsCollapseSection
                  title="Товары ресторана"
                  description="Топ товаров, продажи, выручка и конверсия в корзину."
                  collapsed={collapsedSections.products}
                  onToggle={() => toggleSection("products")}
                  right={
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                      {formatInteger(topProducts.length)}
                    </span>
                  }
                >
                  {topProducts.length === 0 ? (
                    <RestaurantAnalyticsEmptyState />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-5 py-4">Товар</th>
                            <th className="px-5 py-4">Цена</th>
                            <th className="px-5 py-4">Заказы</th>
                            <th className="px-5 py-4">Продано</th>
                            <th className="px-5 py-4">Выручка</th>
                            <th className="px-5 py-4">View → Cart</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {topProducts.slice(0, 12).map((product) => (
                            <tr key={product.productId}>
                              <td className="px-5 py-4 font-semibold">
                                {product.titleRu}
                              </td>
                              <td className="px-5 py-4">
                                {formatMoney(product.price)}
                              </td>
                              <td className="px-5 py-4">
                                {formatInteger(product.ordersCount)}
                              </td>
                              <td className="px-5 py-4">
                                {formatInteger(product.orderedQuantity)}
                              </td>
                              <td className="px-5 py-4 font-semibold">
                                {formatMoney(product.revenue)}
                              </td>
                              <td className="px-5 py-4">
                                {formatPercent(product.viewToCartRate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </RestaurantAnalyticsCollapseSection>
              ) : null}

              {activeTab === "orders" ? (
                <RestaurantAnalyticsCollapseSection
                  title="Последние заказы"
                  description="Последние заказы ресторана из metrics endpoint."
                  collapsed={collapsedSections.orders}
                  onToggle={() => toggleSection("orders")}
                  right={
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                      {formatInteger(recentOrders.length)}
                    </span>
                  }
                >
                  {recentOrders.length === 0 ? (
                    <RestaurantAnalyticsEmptyState />
                  ) : (
                    <div className="space-y-3">
                      {recentOrders.slice(0, 12).map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm"
                        >
                          <div>
                            <div className="font-semibold text-slate-950">
                              Заказ #{order.number || order.id.slice(0, 8)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDate(order.createdAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatMoney(order.total ?? 0)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {getStatusLabel(order.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </RestaurantAnalyticsCollapseSection>
              ) : null}

              {activeTab === "finance" ? (
                <RestaurantAnalyticsCollapseSection
                  title="Выплаты"
                  description="Payout, комиссия и периоды выплат ресторана."
                  collapsed={collapsedSections.finance}
                  onToggle={() => toggleSection("finance")}
                  right={
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                      {formatInteger(payouts.length)}
                    </span>
                  }
                >
                  {payouts.length === 0 ? (
                    <RestaurantAnalyticsEmptyState />
                  ) : (
                    <div className="space-y-3">
                      {payouts.slice(0, 12).map((payout) => (
                        <div
                          key={payout.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm"
                        >
                          <div>
                            <div className="font-semibold text-slate-950">
                              {getStatusLabel(payout.status)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDate(payout.periodFrom)} —{" "}
                              {formatDate(payout.periodTo)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatMoney(payout.payoutAmount ?? 0)}
                            </div>
                            <div className="text-xs text-slate-500">
                              Комиссия:{" "}
                              {formatMoney(payout.commissionAmount ?? 0)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </RestaurantAnalyticsCollapseSection>
              ) : null}

              {activeTab === "reviews" ? (
                <RestaurantAnalyticsCollapseSection
                  title="Отзывы"
                  description="Последние отзывы ресторана."
                  collapsed={collapsedSections.reviews}
                  onToggle={() => toggleSection("reviews")}
                  right={
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                      {formatInteger(reviews.length)}
                    </span>
                  }
                >
                  {reviews.length === 0 ? (
                    <RestaurantAnalyticsEmptyState />
                  ) : (
                    <div className="space-y-3">
                      {reviews.slice(0, 12).map((review) => (
                        <div
                          key={review.id}
                          className="rounded-xl border border-slate-200 p-4 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-slate-950">
                              Оценка: {review.rating ?? 0}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDate(review.createdAt)}
                            </div>
                          </div>
                          {review.text ? (
                            <div className="mt-2 text-slate-600">
                              {review.text}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </RestaurantAnalyticsCollapseSection>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}