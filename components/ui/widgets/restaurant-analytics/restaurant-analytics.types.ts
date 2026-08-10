export type RestaurantAnalyticsRange =
  | "today"
  | "7d"
  | "14d"
  | "30d"
  | "month"
  | "year";

export type RestaurantAnalyticsRestaurantSort =
  | "orders"
  | "revenue"
  | "views"
  | "conversion"
  | "rating"
  | "reviews"
  | "on_time"
  | "late"
  | "canceled";

export type RestaurantAnalyticsProductSort =
  | "orders"
  | "revenue"
  | "views"
  | "cart"
  | "conversion";

export type RestaurantAnalyticsQuality = {
  orderEventCoveragePct: number;
  orderFunnelTrusted: boolean;
};

export type RestaurantAnalyticsOverview = {
  range: RestaurantAnalyticsRange | string;
  period?: {
    start?: string;
    end?: string;
  };

  restaurantsCount: number;
  productsCount: number;

  ordersCount: number;
  deliveredOrdersCount: number;
  canceledOrdersCount: number;

  revenue: number;
  avgCheck: number;

  reviewsCount: number;
  badReviewsCount: number;

  restaurantViews: number;
  productViews: number;
  addToCartEvents: number;
  checkoutStarts: number;
  orderCreatedEvents: number;

  analyticsQuality: RestaurantAnalyticsQuality;

  conversion: {
    viewToCart: number;
    cartToCheckout: number;
    checkoutToOrder: number | null;
    restaurantViewToOrder: number | null;
  };

  quality: {
    cancelRate: number;
    deliveredRate: number;
    badReviewRate: number;
  };
};

export type RestaurantAnalyticsTopRestaurant = {
  restaurantId: string;
  nameRu: string;
  nameKk: string;
  coverImageUrl: string | null;

  ratingAvg: number;
  ratingCount: number;

  ordersCount: number;
  deliveredCount: number;
  canceledCount: number;

  revenue: number;
  avgCheck: number;

  reviewsCount: number;
  badReviewsCount: number;

  views: number;
  clicks: number;
  productViews: number;
  addToCart: number;
  orderCreatedEvents: number;
  orderEventCoveragePct: number;
  conversionTrusted: boolean;

  conversionRate: number | null;

  readyCount: number;
  readyOnTimeCount: number;
  lateReadyCount: number;
  readyOnTimeRate: number;
  avgPrepMinutes: number;
};

export type RestaurantAnalyticsTopProduct = {
  productId: string;
  restaurantId: string;
  restaurantNameRu: string;

  titleRu: string;
  titleKk: string;
  imageUrl: string | null;

  price: number;
  isAvailable: boolean;

  orderedQuantity: number;
  ordersCount: number;
  revenue: number;

  views: number;
  clicks: number;
  addToCart: number;
  removeFromCart: number;

  viewToCartRate: number;
  /** Not available until server-side product order attribution is implemented. */
  cartToOrderRate: null;
};

export type RestaurantAnalyticsTopRestaurantsResponse = {
  range?: RestaurantAnalyticsRange | string;
  period?: {
    start?: string;
    end?: string;
  };
  items: RestaurantAnalyticsTopRestaurant[];
};

export type RestaurantAnalyticsTopProductsResponse = {
  range?: RestaurantAnalyticsRange | string;
  period?: {
    start?: string;
    end?: string;
  };
  restaurantId?: string | null;
  items: RestaurantAnalyticsTopProduct[];
};
