"use client";

import {
  BarChart3,
  CheckCircle2,
  Eye,
  MessageSquare,
  Package,
  Receipt,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Wallet,
  XCircle,
} from "lucide-react";

import type { RestaurantAnalyticsOverview } from "./restaurant-analytics.types";
import {
  formatInteger,
  formatMoney,
  formatPercent,
} from "./restaurant-analytics.mappers";
import { RestaurantAnalyticsKpiCard } from "./RestaurantAnalyticsKpiCard";

type Props = {
  overview: RestaurantAnalyticsOverview | null;
  onTimeRate: number;
};

export function RestaurantAnalyticsKpiGrid({ overview, onTimeRate }: Props) {
  const data = overview;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <RestaurantAnalyticsKpiCard
        title="Всего заказов"
        value={formatInteger(data?.ordersCount ?? 0)}
        description="Все созданные заказы за период"
        icon={ShoppingBag}
      />

      <RestaurantAnalyticsKpiCard
        title="Доставлено"
        value={formatInteger(data?.deliveredOrdersCount ?? 0)}
        description={`Delivered rate: ${formatPercent(
          data?.quality.deliveredRate ?? 0,
        )}`}
        icon={CheckCircle2}
        tone="success"
      />

      <RestaurantAnalyticsKpiCard
        title="Отменено / отклонено"
        value={formatInteger(data?.canceledOrdersCount ?? 0)}
        description={`Cancel rate: ${formatPercent(
          data?.quality.cancelRate ?? 0,
        )}`}
        icon={XCircle}
        tone="danger"
      />

      <RestaurantAnalyticsKpiCard
        title="Выручка"
        value={formatMoney(data?.revenue ?? 0)}
        description="Gross revenue по доставленным заказам"
        icon={Wallet}
      />

      <RestaurantAnalyticsKpiCard
        title="Средний чек"
        value={formatMoney(data?.avgCheck ?? 0)}
        description="Средняя сумма доставленного заказа"
        icon={Receipt}
      />

      <RestaurantAnalyticsKpiCard
        title="Рестораны"
        value={formatInteger(data?.restaurantsCount ?? 0)}
        description="Активные рестораны в приложении"
        icon={Store}
      />

      <RestaurantAnalyticsKpiCard
        title="Товары"
        value={formatInteger(data?.productsCount ?? 0)}
        description="Доступные товары"
        icon={UtensilsCrossed}
      />

      <RestaurantAnalyticsKpiCard
        title="Отзывы"
        value={formatInteger(data?.reviewsCount ?? 0)}
        description={`Плохие отзывы: ${formatInteger(
          data?.badReviewsCount ?? 0,
        )}`}
        icon={MessageSquare}
      />

      <RestaurantAnalyticsKpiCard
        title="Просмотры ресторанов"
        value={formatInteger(data?.restaurantViews ?? 0)}
        description="RESTAURANT_VIEW events"
        icon={Eye}
      />

      <RestaurantAnalyticsKpiCard
        title="Просмотры товаров"
        value={formatInteger(data?.productViews ?? 0)}
        description="PRODUCT_VIEW events"
        icon={Package}
      />

      <RestaurantAnalyticsKpiCard
        title="View → Order"
        value={formatPercent(data?.conversion.restaurantViewToOrder ?? 0)}
        description="Конверсия просмотра ресторана в заказ"
        icon={BarChart3}
      />

      <RestaurantAnalyticsKpiCard
        title="On-time готовки"
        value={formatPercent(onTimeRate)}
        description="Средний ready on-time по топ-ресторанам"
        icon={CheckCircle2}
        tone="success"
      />
    </div>
  );
}