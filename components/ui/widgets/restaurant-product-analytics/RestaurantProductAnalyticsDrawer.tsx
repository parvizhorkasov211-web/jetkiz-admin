"use client";

import {
  BarChart3,
  ExternalLink,
  Package,
  ShoppingCart,
  Store,
  Wallet,
  X,
} from "lucide-react";

import type { RestaurantAnalyticsTopProduct } from "@/components/ui/widgets/restaurant-analytics/restaurant-analytics.types";
import {
  formatInteger,
  formatMoney,
  formatPercent,
} from "@/components/ui/widgets/restaurant-analytics/restaurant-analytics.mappers";

type Props = {
  product: RestaurantAnalyticsTopProduct | null;
  onClose: () => void;
};

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description?: string;
  icon: typeof Package;
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

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function RestaurantProductAnalyticsDrawer({ product, onClose }: Props) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-[760px] overflow-y-auto bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                {product.titleRu}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {product.restaurantNameRu} • аналитика товара
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/layout-20/restaurants/${product.restaurantId}`;
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                Ресторан
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
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <MetricCard
              title="Цена"
              value={formatMoney(product.price)}
              description="Текущая цена товара"
              icon={Wallet}
            />

            <MetricCard
              title="Выручка"
              value={formatMoney(product.revenue)}
              description="Gross revenue по товару"
              icon={BarChart3}
            />

            <MetricCard
              title="Заказы"
              value={formatInteger(product.ordersCount)}
              description={`Продано штук: ${formatInteger(
                product.orderedQuantity,
              )}`}
              icon={Package}
            />

            <MetricCard
              title="Просмотры"
              value={formatInteger(product.views)}
              description={`Клики: ${formatInteger(product.clicks)}`}
              icon={Store}
            />

            <MetricCard
              title="Корзина"
              value={formatInteger(product.addToCart)}
              description={`Remove: ${formatInteger(product.removeFromCart)}`}
              icon={ShoppingCart}
            />

            <MetricCard
              title="Конверсия"
              value={formatPercent(product.viewToCartRate)}
              description={`Cart → Order: ${formatPercent(
                product.cartToOrderRate,
              )}`}
              icon={BarChart3}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-950">Воронка товара</h3>
            <p className="mt-1 text-sm text-slate-500">
              Просмотры → корзина → заказ.
            </p>

            <div className="mt-5 space-y-4">
              <FunnelRow
                title="Просмотры"
                value={product.views}
                percent={100}
              />
              <FunnelRow
                title="Добавили в корзину"
                value={product.addToCart}
                percent={product.viewToCartRate}
              />
              <FunnelRow
                title="Заказы"
                value={product.ordersCount}
                percent={product.cartToOrderRate}
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function FunnelRow({
  title,
  value,
  percent,
}: {
  title: string;
  value: number;
  percent: number;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[160px_1fr_70px]">
      <div>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">{formatInteger(value)}</div>
      </div>

      <div className="flex items-center">
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600"
            style={{
              width: `${Math.max(0, Math.min(percent, 100))}%`,
            }}
          />
        </div>
      </div>

      <div className="text-right text-sm font-semibold text-slate-700">
        {formatPercent(percent)}
      </div>
    </div>
  );
}