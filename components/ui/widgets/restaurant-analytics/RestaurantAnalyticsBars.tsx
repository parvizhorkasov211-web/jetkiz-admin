"use client";

import type {
  RestaurantAnalyticsTopProduct,
  RestaurantAnalyticsTopRestaurant,
} from "./restaurant-analytics.types";
import { formatInteger, formatMoney } from "./restaurant-analytics.mappers";

type Props = {
  restaurants: RestaurantAnalyticsTopRestaurant[];
  products: RestaurantAnalyticsTopProduct[];
};

export function RestaurantAnalyticsBars({ restaurants, products }: Props) {
  const restaurantItems = restaurants.slice(0, 6);
  const productItems = products.slice(0, 6);

  const maxRestaurantRevenue = Math.max(
    1,
    ...restaurantItems.map((item) => item.revenue),
  );

  const maxProductRevenue = Math.max(
    1,
    ...productItems.map((item) => item.revenue),
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-950">
          Топ ресторанов по выручке
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Gross revenue по доставленным заказам.
        </p>

        <div className="mt-5 space-y-4">
          {restaurantItems.map((restaurant) => (
            <div key={restaurant.restaurantId}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">
                  {restaurant.nameRu}
                </span>
                <span className="font-semibold text-slate-950">
                  {formatMoney(restaurant.revenue)}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600"
                  style={{
                    width: `${Math.max(
                      3,
                      (restaurant.revenue / maxRestaurantRevenue) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}

          {restaurantItems.length === 0 ? (
            <div className="text-sm text-slate-400">Нет данных</div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-950">
          Топ товаров по выручке
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Продажи и конверсия блюд.
        </p>

        <div className="mt-5 space-y-4">
          {productItems.map((product) => (
            <div key={product.productId}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">
                  {product.titleRu}
                </span>
                <span className="font-semibold text-slate-950">
                  {formatMoney(product.revenue)}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600"
                  style={{
                    width: `${Math.max(
                      3,
                      (product.revenue / maxProductRevenue) * 100,
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {formatInteger(product.orderedQuantity)} шт •{" "}
                {product.restaurantNameRu}
              </div>
            </div>
          ))}

          {productItems.length === 0 ? (
            <div className="text-sm text-slate-400">Нет данных</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}