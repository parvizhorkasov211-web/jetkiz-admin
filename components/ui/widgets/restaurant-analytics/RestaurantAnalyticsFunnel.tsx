"use client";

import type { RestaurantAnalyticsOverview } from "./restaurant-analytics.types";
import {
  formatInteger,
  formatPercent,
} from "./restaurant-analytics.mappers";

type Props = {
  overview: RestaurantAnalyticsOverview | null;
};

type FunnelStep = {
  title: string;
  value: number;
  percent: number;
};

export function RestaurantAnalyticsFunnel({ overview }: Props) {
  const restaurantViews = overview?.restaurantViews ?? 0;
  const productViews = overview?.productViews ?? 0;
  const addToCart = overview?.addToCartEvents ?? 0;
  const checkout = overview?.checkoutStarts ?? 0;
  const orders = overview?.ordersCount ?? 0;

  const steps: FunnelStep[] = [
    {
      title: "Просмотры ресторанов",
      value: restaurantViews,
      percent: 100,
    },
    {
      title: "Просмотры товаров",
      value: productViews,
      percent: overview?.conversion.viewToCart ?? 0,
    },
    {
      title: "Добавили в корзину",
      value: addToCart,
      percent: overview?.conversion.viewToCart ?? 0,
    },
    {
      title: "Начали checkout",
      value: checkout,
      percent: overview?.conversion.cartToCheckout ?? 0,
    },
    {
      title: "Оформили заказ",
      value: orders,
      percent: overview?.conversion.checkoutToOrder ?? 0,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-950">
            Воронка ресторанов
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Просмотры → товар → корзина → checkout → заказ.
          </p>
        </div>

        <div className="rounded-xl bg-violet-50 px-3 py-2 text-right">
          <div className="text-xs text-violet-500">View → Order</div>
          <div className="text-sm font-bold text-violet-700">
            {formatPercent(overview?.conversion.restaurantViewToOrder ?? 0)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.title} className="grid gap-3 md:grid-cols-[180px_1fr_70px]">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {step.title}
              </div>
              <div className="text-xs text-slate-500">
                {formatInteger(step.value)}
              </div>
            </div>

            <div className="flex items-center">
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(step.percent, 100))}%`,
                  }}
                />
              </div>
            </div>

            <div className="text-right text-sm font-semibold text-slate-700">
              {formatPercent(step.percent)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}