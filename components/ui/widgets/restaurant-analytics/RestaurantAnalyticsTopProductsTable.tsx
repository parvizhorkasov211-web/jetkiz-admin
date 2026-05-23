"use client";

import type { RestaurantAnalyticsTopProduct } from "./restaurant-analytics.types";
import {
  formatInteger,
  formatMoney,
  formatPercent,
} from "./restaurant-analytics.mappers";
import { RestaurantAnalyticsEmptyState } from "./RestaurantAnalyticsEmptyState";

type Props = {
  items: RestaurantAnalyticsTopProduct[];
};

export function RestaurantAnalyticsTopProductsTable({ items }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-950">Топ товаров</h2>
        <p className="mt-1 text-sm text-slate-500">
          Продажи, выручка, просмотры и конверсия в корзину.
        </p>
      </div>

      <div className="overflow-x-auto">
        {items.length === 0 ? (
          <div className="p-5">
            <RestaurantAnalyticsEmptyState />
          </div>
        ) : (
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Товар</th>
                <th className="px-5 py-4">Ресторан</th>
                <th className="px-5 py-4">Цена</th>
                <th className="px-5 py-4">Заказы</th>
                <th className="px-5 py-4">Продано</th>
                <th className="px-5 py-4">Выручка</th>
                <th className="px-5 py-4">Просмотры</th>
                <th className="px-5 py-4">Корзина</th>
                <th className="px-5 py-4">Remove</th>
                <th className="px-5 py-4">View → Cart</th>
                <th className="px-5 py-4">Cart → Order</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((product) => (
                <tr key={product.productId} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-950">
                      {product.titleRu}
                    </div>
                    <div className="text-xs text-slate-500">
                      ID: {product.productId.slice(0, 8)}
                    </div>
                  </td>

                  <td className="px-5 py-4">{product.restaurantNameRu}</td>
                  <td className="px-5 py-4">{formatMoney(product.price)}</td>
                  <td className="px-5 py-4">{formatInteger(product.ordersCount)}</td>
                  <td className="px-5 py-4">
                    {formatInteger(product.orderedQuantity)}
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {formatMoney(product.revenue)}
                  </td>
                  <td className="px-5 py-4">{formatInteger(product.views)}</td>
                  <td className="px-5 py-4">{formatInteger(product.addToCart)}</td>
                  <td className="px-5 py-4">
                    {formatInteger(product.removeFromCart)}
                  </td>
                  <td className="px-5 py-4">
                    {formatPercent(product.viewToCartRate)}
                  </td>
                  <td className="px-5 py-4">
                    {formatPercent(product.cartToOrderRate)}
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