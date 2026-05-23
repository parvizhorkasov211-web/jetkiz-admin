"use client";

import type { RestaurantAnalyticsTopRestaurant } from "./restaurant-analytics.types";
import {
  formatInteger,
  formatMinutes,
  formatMoney,
  formatPercent,
} from "./restaurant-analytics.mappers";
import { RestaurantAnalyticsEmptyState } from "./RestaurantAnalyticsEmptyState";

type Props = {
  items: RestaurantAnalyticsTopRestaurant[];
  onOpenRestaurant: (restaurantId: string) => void;
};

export function RestaurantAnalyticsTopRestaurantsTable({
  items,
  onOpenRestaurant,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-950">Топ ресторанов</h2>
        <p className="mt-1 text-sm text-slate-500">
          Заказы, выручка, конверсия, скорость кухни и отзывы.
        </p>
      </div>

      <div className="overflow-x-auto">
        {items.length === 0 ? (
          <div className="p-5">
            <RestaurantAnalyticsEmptyState />
          </div>
        ) : (
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Ресторан</th>
                <th className="px-5 py-4">Рейтинг</th>
                <th className="px-5 py-4">Заказы</th>
                <th className="px-5 py-4">Доставлено</th>
                <th className="px-5 py-4">Отменено</th>
                <th className="px-5 py-4">Выручка</th>
                <th className="px-5 py-4">Средний чек</th>
                <th className="px-5 py-4">Конверсия</th>
                <th className="px-5 py-4">On-time</th>
                <th className="px-5 py-4">Avg prep</th>
                <th className="px-5 py-4">Плохие отзывы</th>
                <th className="px-5 py-4 text-right">Действие</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((restaurant) => (
                <tr
                  key={restaurant.restaurantId}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-950">
                      {restaurant.nameRu}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatInteger(restaurant.views)} просмотров
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-900">
                      {restaurant.ratingAvg.toLocaleString("ru-RU", {
                        maximumFractionDigits: 1,
                      })}
                    </span>
                    <span className="text-xs text-slate-500">
                      {" "}
                      / {formatInteger(restaurant.ratingCount)}
                    </span>
                  </td>

                  <td className="px-5 py-4 font-medium">
                    {formatInteger(restaurant.ordersCount)}
                  </td>

                  <td className="px-5 py-4">
                    {formatInteger(restaurant.deliveredCount)}
                  </td>

                  <td className="px-5 py-4">
                    {formatInteger(restaurant.canceledCount)}
                  </td>

                  <td className="px-5 py-4 font-semibold">
                    {formatMoney(restaurant.revenue)}
                  </td>

                  <td className="px-5 py-4">
                    {formatMoney(restaurant.avgCheck)}
                  </td>

                  <td className="px-5 py-4">
                    {formatPercent(restaurant.conversionRate)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={
                        restaurant.readyOnTimeRate >= 85
                          ? "text-emerald-600"
                          : restaurant.readyOnTimeRate >= 70
                            ? "text-orange-600"
                            : "text-rose-600"
                      }
                    >
                      {formatPercent(restaurant.readyOnTimeRate)}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {formatMinutes(restaurant.avgPrepMinutes)}
                  </td>

                  <td className="px-5 py-4">
                    {formatInteger(restaurant.badReviewsCount)}
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}