import type {
  RestaurantAnalyticsOverview,
  RestaurantAnalyticsProductSort,
  RestaurantAnalyticsRange,
  RestaurantAnalyticsRestaurantSort,
  RestaurantAnalyticsTopProduct,
  RestaurantAnalyticsTopRestaurant,
} from "./restaurant-analytics.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function asNullableString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = asNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function toItemsArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!isRecord(value)) return [];

  const possibleKeys = ["items", "data", "restaurants", "products", "result"];
  for (const key of possibleKeys) {
    const item = value[key];
    if (Array.isArray(item)) return item as T[];
  }

  return [];
}

export function mapOverview(value: unknown): RestaurantAnalyticsOverview {
  const data = asObject(value);
  const conversion = asObject(data.conversion);
  const quality = asObject(data.quality);
  const analyticsQuality = asObject(data.analyticsQuality);
  const period = asObject(data.period);

  return {
    range: asString(data.range, "7d"),
    period: {
      start: asString(period.start),
      end: asString(period.end),
    },

    restaurantsCount: asNumber(data.restaurantsCount ?? data.activeRestaurants),
    productsCount: asNumber(data.productsCount),

    ordersCount: asNumber(data.ordersCount ?? data.totalOrders),
    deliveredOrdersCount: asNumber(data.deliveredOrdersCount),
    canceledOrdersCount: asNumber(data.canceledOrdersCount),

    revenue: asNumber(data.revenue ?? data.totalRevenue),
    avgCheck: asNumber(data.avgCheck ?? data.avgOrderValue),

    reviewsCount: asNumber(data.reviewsCount),
    badReviewsCount: asNumber(data.badReviewsCount),

    restaurantViews: asNumber(data.restaurantViews),
    productViews: asNumber(data.productViews),
    addToCartEvents: asNumber(data.addToCartEvents),
    checkoutStarts: asNumber(data.checkoutStarts),
    orderCreatedEvents: asNumber(data.orderCreatedEvents),

    analyticsQuality: {
      orderEventCoveragePct: asNumber(analyticsQuality.orderEventCoveragePct),
      orderFunnelTrusted: asBoolean(analyticsQuality.orderFunnelTrusted),
    },

    conversion: {
      viewToCart: asNumber(conversion.viewToCart),
      cartToCheckout: asNumber(conversion.cartToCheckout),
      checkoutToOrder: asNullableNumber(conversion.checkoutToOrder),
      restaurantViewToOrder: asNullableNumber(conversion.restaurantViewToOrder),
    },

    quality: {
      cancelRate: asNumber(quality.cancelRate),
      deliveredRate: asNumber(quality.deliveredRate),
      badReviewRate: asNumber(quality.badReviewRate),
    },
  };
}

export function mapTopRestaurant(
  value: unknown,
): RestaurantAnalyticsTopRestaurant {
  const data = asObject(value);

  return {
    restaurantId: asString(data.restaurantId ?? data.id),
    nameRu: asString(data.nameRu ?? data.name, "Без названия"),
    nameKk: asString(data.nameKk),
    coverImageUrl: asNullableString(data.coverImageUrl),

    ratingAvg: asNumber(data.ratingAvg),
    ratingCount: asNumber(data.ratingCount),

    ordersCount: asNumber(data.ordersCount ?? data.orders),
    deliveredCount: asNumber(data.deliveredCount),
    canceledCount: asNumber(data.canceledCount),

    revenue: asNumber(data.revenue ?? data.totalRevenue),
    avgCheck: asNumber(data.avgCheck),

    reviewsCount: asNumber(data.reviewsCount),
    badReviewsCount: asNumber(data.badReviewsCount),

    views: asNumber(data.views),
    clicks: asNumber(data.clicks),
    productViews: asNumber(data.productViews),
    addToCart: asNumber(data.addToCart),
    orderCreatedEvents: asNumber(data.orderCreatedEvents),
    orderEventCoveragePct: asNumber(data.orderEventCoveragePct),
    conversionTrusted: asBoolean(data.conversionTrusted),

    conversionRate: asNullableNumber(data.conversionRate),

    readyCount: asNumber(data.readyCount),
    readyOnTimeCount: asNumber(data.readyOnTimeCount),
    lateReadyCount: asNumber(data.lateReadyCount),
    readyOnTimeRate: asNumber(data.readyOnTimeRate),
    avgPrepMinutes: asNumber(data.avgPrepMinutes),
  };
}

export function mapTopProduct(value: unknown): RestaurantAnalyticsTopProduct {
  const data = asObject(value);

  return {
    productId: asString(data.productId ?? data.id),
    restaurantId: asString(data.restaurantId),
    restaurantNameRu: asString(data.restaurantNameRu, "Ресторан"),

    titleRu: asString(data.titleRu ?? data.title, "Без названия"),
    titleKk: asString(data.titleKk),
    imageUrl: asNullableString(data.imageUrl),

    price: asNumber(data.price),
    isAvailable: asBoolean(data.isAvailable),

    orderedQuantity: asNumber(data.orderedQuantity),
    ordersCount: asNumber(data.ordersCount ?? data.orders),
    revenue: asNumber(data.revenue),

    views: asNumber(data.views),
    clicks: asNumber(data.clicks),
    addToCart: asNumber(data.addToCart),
    removeFromCart: asNumber(data.removeFromCart),

    viewToCartRate: asNumber(data.viewToCartRate),
    cartToOrderRate: null,
  };
}

export function mapTopRestaurantsResponse(
  value: unknown,
): RestaurantAnalyticsTopRestaurant[] {
  return toItemsArray<unknown>(value)
    .map(mapTopRestaurant)
    .filter((item) => item.restaurantId);
}

export function mapTopProductsResponse(
  value: unknown,
): RestaurantAnalyticsTopProduct[] {
  return toItemsArray<unknown>(value)
    .map(mapTopProduct)
    .filter((item) => item.productId);
}

export function buildAnalyticsQuery(params: {
  range?: RestaurantAnalyticsRange;
  limit?: number;
  sort?: RestaurantAnalyticsRestaurantSort | RestaurantAnalyticsProductSort;
  prepSlaMinutes?: number;
  restaurantId?: string;
}): string {
  const query = new URLSearchParams();

  if (params.range) query.set("range", params.range);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sort) query.set("sort", params.sort);
  if (params.prepSlaMinutes) {
    query.set("prepSlaMinutes", String(params.prepSlaMinutes));
  }
  if (params.restaurantId) query.set("restaurantId", params.restaurantId);

  return query.toString();
}

export function formatInteger(value: number): string {
  return Number(value ?? 0).toLocaleString("ru-RU");
}

export function formatMoney(value: number): string {
  return `${Number(value ?? 0).toLocaleString("ru-RU")} ₸`;
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Нет данных";
  }

  return `${Number(value).toLocaleString("ru-RU", {
    maximumFractionDigits: 1,
  })}%`;
}

export function formatMinutes(value: number): string {
  const normalized = Number(value ?? 0);
  if (normalized <= 0) return "0 мин";

  return `${normalized.toLocaleString("ru-RU", {
    maximumFractionDigits: 1,
  })} мин`;
}

export function getAverageReadyOnTimeRate(
  restaurants: RestaurantAnalyticsTopRestaurant[],
): number {
  const numerator = restaurants.reduce(
    (sum, restaurant) => sum + restaurant.readyOnTimeCount,
    0,
  );
  const denominator = restaurants.reduce(
    (sum, restaurant) => sum + restaurant.readyCount,
    0,
  );

  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

export function mergeProblemRestaurants(
  lateRestaurants: RestaurantAnalyticsTopRestaurant[],
  canceledRestaurants: RestaurantAnalyticsTopRestaurant[],
): RestaurantAnalyticsTopRestaurant[] {
  const map = new Map<string, RestaurantAnalyticsTopRestaurant>();

  for (const restaurant of [...lateRestaurants, ...canceledRestaurants]) {
    if (!restaurant.restaurantId) continue;
    map.set(restaurant.restaurantId, restaurant);
  }

  return Array.from(map.values()).filter((restaurant) => {
    return (
      restaurant.lateReadyCount > 0 ||
      restaurant.canceledCount > 0 ||
      restaurant.badReviewsCount > 0 ||
      (restaurant.readyCount > 0 && restaurant.readyOnTimeRate < 80) ||
      restaurant.avgPrepMinutes >= 30
    );
  });
}
