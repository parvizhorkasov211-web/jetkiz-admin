"use client";

import type { RestaurantAnalyticsTopRestaurant } from "./restaurant-analytics.types";
import {
  formatInteger,
  formatMinutes,
  formatPercent,
} from "./restaurant-analytics.mappers";
import { RestaurantAnalyticsEmptyState } from "./RestaurantAnalyticsEmptyState";

type Props = {
  items: RestaurantAnalyticsTopRestaurant[];
  onOpenRestaurant: (restaurantId: string) => void;
};

function getProblemLabel(restaurant: RestaurantAnalyticsTopRestaurant): string {
  if (restaurant.canceledCount > 0) return "Отмены";
  if (restaurant.lateReadyCount > 0) return "Опоздания кухни";
  if (restaurant.avgPrepMinutes >= 30) return "Долгая готовка";
  if (restaurant.badReviewsCount > 0) return "Плохие отзывы";
  if (restaurant.readyOnTimeRate > 0 && restaurant.readyOnTimeRate < 80) {
    return "Низкий on-time";
  }

  return "Проверить";
}

export function RestaurantAnalyticsProblemRestaurants({
  items,
  onOpenRestaurant,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-950">
          Проблемные рестораны
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Отмены, опоздания, долгая готовка и плохие отзывы.
        </p>
      </div>

      <div className="p-5">
        {items.length === 0 ? (
          <RestaurantAnalyticsEmptyState
            title="Критичных проблем нет"
            description="За выбранный период явные проблемные рестораны не найдены."
          />
        ) : (
          <div className="space-y-3">
            {items.slice(0, 8).map((restaurant) => (
              <div
                key={restaurant.restaurantId}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-950">
                      {restaurant.nameRu}
                    </span>
                    <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                      {getProblemLabel(restaurant)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>Отмены: {formatInteger(restaurant.canceledCount)}</span>
                    <span>Late: {formatInteger(restaurant.lateReadyCount)}</span>
                    <span>On-time: {formatPercent(restaurant.readyOnTimeRate)}</span>
                    <span>Prep: {formatMinutes(restaurant.avgPrepMinutes)}</span>
                    <span>Плохие отзывы: {formatInteger(restaurant.badReviewsCount)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenRestaurant(restaurant.restaurantId)}
                  className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                  Открыть
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}