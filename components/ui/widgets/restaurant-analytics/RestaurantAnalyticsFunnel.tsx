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
  percent: number | null;
  hint?: string;
};

export function RestaurantAnalyticsFunnel({ overview }: Props) {
  const restaurantViews = overview?.restaurantViews ?? 0;
  const productViews = overview?.productViews ?? 0;
  const addToCart = overview?.addToCartEvents ?? 0;
  const checkout = overview?.checkoutStarts ?? 0;
  const orderCreatedEvents = overview?.orderCreatedEvents ?? 0;
  const trusted = overview?.analyticsQuality.orderFunnelTrusted ?? false;

  const steps: FunnelStep[] = [
    {
      title: "Просмотры ресторанов",
      value: restaurantViews,
      percent: 100,
    },
    {
      title: "Просмотры товаров",
      value: productViews,
      percent: null,
      hint: "Один посетитель может открыть несколько товаров",
    },
    {
      title: "Добавили в корзину",
      value: addToCart,
      percent: overview?.conversion.viewToCart ?? 0,
      hint: "От просмотров товаров",
    },
    {
      title: "Начали оформление",
      value: checkout,
      percent: overview?.conversion.cartToCheckout ?? 0,
      hint: "От добавлений в корзину",
    },
    {
      title: "Событие оформления заказа",
      value: orderCreatedEvents,
      percent: overview?.conversion.checkoutToOrder ?? null,
      hint: trusted
        ? "События подтверждены достаточным покрытием серверных заказов"
        : "Нет надёжного покрытия события ORDER_CREATED — процент скрыт",
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
            Показатели строятся только из сопоставимых событий. Ненадёжные
            коэффициенты не заменяются нулём.
          </p>
        </div>

        <div
          className={`rounded-xl px-3 py-2 text-right ${
            trusted ? "bg-violet-50" : "bg-amber-50"
          }`}
        >
          <div className={trusted ? "text-xs text-violet-500" : "text-xs text-amber-600"}>
            Просмотр → заказ
          </div>
          <div
            className={
              trusted
                ? "text-sm font-bold text-violet-700"
                : "text-sm font-bold text-amber-700"
            }
          >
            {formatPercent(overview?.conversion.restaurantViewToOrder ?? null)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step) => {
          const width =
            step.percent == null
              ? 0
              : Math.max(0, Math.min(step.percent, 100));

          return (
            <div
              key={step.title}
              className="grid gap-3 md:grid-cols-[210px_1fr_88px]"
            >
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  {step.title}
                </div>
                <div className="text-xs text-slate-500">
                  {formatInteger(step.value)}
                </div>
                {step.hint ? (
                  <div className="mt-1 text-[11px] leading-4 text-slate-400">
                    {step.hint}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center">
                {step.percent == null ? (
                  <div className="h-3 w-full rounded-full bg-slate-100" />
                ) : (
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-600 transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="text-right text-sm font-semibold text-slate-700">
                {formatPercent(step.percent)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
