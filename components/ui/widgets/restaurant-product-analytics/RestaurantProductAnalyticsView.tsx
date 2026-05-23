"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Download,
  Eye,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingDown,
  Wallet,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

import type {
  RestaurantAnalyticsProductSort,
  RestaurantAnalyticsRange,
  RestaurantAnalyticsTopProduct,
} from "@/components/ui/widgets/restaurant-analytics/restaurant-analytics.types";

import {
  buildAnalyticsQuery,
  formatInteger,
  formatMoney,
  formatPercent,
  mapTopProductsResponse,
} from "@/components/ui/widgets/restaurant-analytics/restaurant-analytics.mappers";

import { RestaurantAnalyticsEmptyState } from "@/components/ui/widgets/restaurant-analytics/RestaurantAnalyticsEmptyState";
import { RestaurantAnalyticsErrorState } from "@/components/ui/widgets/restaurant-analytics/RestaurantAnalyticsErrorState";
import { RestaurantAnalyticsSkeleton } from "@/components/ui/widgets/restaurant-analytics/RestaurantAnalyticsSkeleton";
import { RestaurantProductAnalyticsKpiCard } from "./RestaurantProductAnalyticsKpiCard";
import { RestaurantProductAnalyticsDrawer } from "./RestaurantProductAnalyticsDrawer";

const ranges: Array<{ value: RestaurantAnalyticsRange; label: string }> = [
  { value: "today", label: "Сегодня" },
  { value: "7d", label: "7 дней" },
  { value: "14d", label: "14 дней" },
  { value: "30d", label: "30 дней" },
  { value: "month", label: "Месяц" },
  { value: "year", label: "Год" },
];

const sortOptions: Array<{
  value: RestaurantAnalyticsProductSort;
  label: string;
}> = [
  { value: "revenue", label: "Выручка" },
  { value: "orders", label: "Заказы" },
  { value: "views", label: "Просмотры" },
  { value: "cart", label: "Корзина" },
  { value: "conversion", label: "Конверсия" },
];

const limits = [10, 20, 50, 100];

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function getProblemReason(product: RestaurantAnalyticsTopProduct): string {
  if (product.views >= 10 && product.addToCart === 0) {
    return "Много просмотров, нет корзины";
  }

  if (product.addToCart >= 5 && product.ordersCount === 0) {
    return "Добавляют в корзину, но не заказывают";
  }

  if (product.removeFromCart > 0) {
    return "Удаляют из корзины";
  }

  if (product.viewToCartRate > 0 && product.viewToCartRate < 5) {
    return "Низкая View → Cart";
  }

  return "Проверить";
}

export function RestaurantProductAnalyticsView() {
  const [range, setRange] = useState<RestaurantAnalyticsRange>("7d");
  const [sort, setSort] = useState<RestaurantAnalyticsProductSort>("revenue");
  const [limit, setLimit] = useState(20);

  const [productSearch, setProductSearch] = useState("");
  const [restaurantSearch, setRestaurantSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<RestaurantAnalyticsTopProduct[]>([]);
  const [selectedProduct, setSelectedProduct] =
    useState<RestaurantAnalyticsTopProduct | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await Promise.allSettled([
      apiFetch(
        `/restaurant-analytics/admin/top-products?${buildAnalyticsQuery({
          range,
          limit,
          sort,
        })}`,
      ),
    ]);

    const [productsRes] = result;

    if (productsRes.status === "fulfilled") {
      setProducts(mapTopProductsResponse(productsRes.value));
    } else {
      setError("Backend не вернул аналитику товаров.");
      setProducts([]);
    }

    setLoading(false);
  }, [range, sort, limit]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const productQuery = normalizeSearch(productSearch);
    const restaurantQuery = normalizeSearch(restaurantSearch);

    return products.filter((product) => {
      const productText = [
        product.titleRu,
        product.titleKk,
        product.productId,
      ]
        .join(" ")
        .toLowerCase();

      const restaurantText = [product.restaurantNameRu, product.restaurantId]
        .join(" ")
        .toLowerCase();

      const productMatches = productQuery
        ? productText.includes(productQuery)
        : true;

      const restaurantMatches = restaurantQuery
        ? restaurantText.includes(restaurantQuery)
        : true;

      return productMatches && restaurantMatches;
    });
  }, [products, productSearch, restaurantSearch]);

  const stats = useMemo(() => {
    const totalRevenue = filteredProducts.reduce(
      (sum, item) => sum + item.revenue,
      0,
    );

    const totalOrders = filteredProducts.reduce(
      (sum, item) => sum + item.ordersCount,
      0,
    );

    const totalQuantity = filteredProducts.reduce(
      (sum, item) => sum + item.orderedQuantity,
      0,
    );

    const totalViews = filteredProducts.reduce(
      (sum, item) => sum + item.views,
      0,
    );

    const totalAddToCart = filteredProducts.reduce(
      (sum, item) => sum + item.addToCart,
      0,
    );

    const totalRemove = filteredProducts.reduce(
      (sum, item) => sum + item.removeFromCart,
      0,
    );

    const avgPrice =
      filteredProducts.length > 0
        ? filteredProducts.reduce((sum, item) => sum + item.price, 0) /
          filteredProducts.length
        : 0;

    const viewToCartRate =
      totalViews > 0 ? (totalAddToCart / totalViews) * 100 : 0;

    const cartToOrderRate =
      totalAddToCart > 0 ? (totalOrders / totalAddToCart) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      totalQuantity,
      totalViews,
      totalAddToCart,
      totalRemove,
      avgPrice,
      viewToCartRate,
      cartToOrderRate,
    };
  }, [filteredProducts]);

  const problemProducts = useMemo(() => {
    return filteredProducts.filter((product) => {
      return (
        (product.views >= 10 && product.addToCart === 0) ||
        (product.addToCart >= 5 && product.ordersCount === 0) ||
        product.removeFromCart > 0 ||
        (product.viewToCartRate > 0 && product.viewToCartRate < 5)
      );
    });
  }, [filteredProducts]);

  function exportCsv() {
    const rows = [
      [
        "productId",
        "titleRu",
        "restaurantId",
        "restaurantNameRu",
        "price",
        "ordersCount",
        "orderedQuantity",
        "revenue",
        "views",
        "addToCart",
        "removeFromCart",
        "viewToCartRate",
        "cartToOrderRate",
      ],
      ...filteredProducts.map((product) => [
        product.productId,
        product.titleRu,
        product.restaurantId,
        product.restaurantNameRu,
        product.price,
        product.ordersCount,
        product.orderedQuantity,
        product.revenue,
        product.views,
        product.addToCart,
        product.removeFromCart,
        product.viewToCartRate,
        product.cartToOrderRate,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `restaurant-products-analytics-${range}-${sort}-${limit}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ProductAnalyticsHeader
          range={range}
          sort={sort}
          limit={limit}
          loading={loading}
          onRangeChange={setRange}
          onSortChange={setSort}
          onLimitChange={setLimit}
          onRefresh={loadData}
          onExport={exportCsv}
        />

        <RestaurantAnalyticsSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ProductAnalyticsHeader
        range={range}
        sort={sort}
        limit={limit}
        loading={loading}
        onRangeChange={setRange}
        onSortChange={setSort}
        onLimitChange={setLimit}
        onRefresh={loadData}
        onExport={exportCsv}
      />

      <div className="space-y-6 p-6">
        {error ? (
          <RestaurantAnalyticsErrorState message={error} onRetry={loadData} />
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RestaurantProductAnalyticsKpiCard
            title="Товары"
            value={formatInteger(filteredProducts.length)}
            description={`Загружено: ${formatInteger(products.length)}`}
            icon={Package}
          />

          <RestaurantProductAnalyticsKpiCard
            title="Выручка"
            value={formatMoney(stats.totalRevenue)}
            description="Gross revenue по товарам"
            icon={Wallet}
          />

          <RestaurantProductAnalyticsKpiCard
            title="Заказы"
            value={formatInteger(stats.totalOrders)}
            description={`Продано штук: ${formatInteger(stats.totalQuantity)}`}
            icon={Package}
          />

          <RestaurantProductAnalyticsKpiCard
            title="Средняя цена"
            value={formatMoney(stats.avgPrice)}
            description="Средняя цена в выборке"
            icon={Wallet}
          />

          <RestaurantProductAnalyticsKpiCard
            title="Просмотры"
            value={formatInteger(stats.totalViews)}
            description="PRODUCT_VIEW events"
            icon={Eye}
          />

          <RestaurantProductAnalyticsKpiCard
            title="Добавили в корзину"
            value={formatInteger(stats.totalAddToCart)}
            description={`View → Cart: ${formatPercent(stats.viewToCartRate)}`}
            icon={ShoppingCart}
          />

          <RestaurantProductAnalyticsKpiCard
            title="Remove from cart"
            value={formatInteger(stats.totalRemove)}
            description="Удаления из корзины"
            icon={TrendingDown}
            tone={stats.totalRemove > 0 ? "warning" : "default"}
          />

          <RestaurantProductAnalyticsKpiCard
            title="Cart → Order"
            value={formatPercent(stats.cartToOrderRate)}
            description="Конверсия корзины в заказ"
            icon={BarChart3}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Поиск товара
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={productSearch}
                  disabled={loading}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Название товара..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Поиск ресторана
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={restaurantSearch}
                  disabled={loading}
                  onChange={(event) => setRestaurantSearch(event.target.value)}
                  placeholder="Название ресторана..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        </div>

        <TopRevenueBars
          products={filteredProducts}
          onOpenProduct={setSelectedProduct}
        />

        <ProblemProducts
          products={problemProducts}
          onOpenProduct={setSelectedProduct}
        />

        <ProductsTable
          products={filteredProducts}
          onOpenProduct={setSelectedProduct}
        />
      </div>

      <RestaurantProductAnalyticsDrawer
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}

function ProductAnalyticsHeader({
  range,
  sort,
  limit,
  loading,
  onRangeChange,
  onSortChange,
  onLimitChange,
  onRefresh,
  onExport,
}: {
  range: RestaurantAnalyticsRange;
  sort: RestaurantAnalyticsProductSort;
  limit: number;
  loading: boolean;
  onRangeChange: (value: RestaurantAnalyticsRange) => void;
  onSortChange: (value: RestaurantAnalyticsProductSort) => void;
  onLimitChange: (value: number) => void;
  onRefresh: () => void;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="mb-2">
          <Link
            href="/layout-20/restaurants/analytics"
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 transition hover:text-violet-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Рестораны
          </Link>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Аналитика товаров
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Продажи, выручка, просмотры, корзина и конверсии товаров ресторанов.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={range}
          disabled={loading}
          onChange={(event) =>
            onRangeChange(event.target.value as RestaurantAnalyticsRange)
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ranges.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          disabled={loading}
          onChange={(event) =>
            onSortChange(event.target.value as RestaurantAnalyticsProductSort)
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sortOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={limit}
          disabled={loading}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {limits.map((item) => (
            <option key={item} value={item}>
              {item} записей
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </button>

        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          <Download className="h-4 w-4" />
          Экспорт
        </button>
      </div>
    </div>
  );
}

function TopRevenueBars({
  products,
  onOpenProduct,
}: {
  products: RestaurantAnalyticsTopProduct[];
  onOpenProduct: (product: RestaurantAnalyticsTopProduct) => void;
}) {
  const items = products.slice(0, 8);
  const maxRevenue = Math.max(1, ...items.map((item) => item.revenue));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-950">
        Топ товаров по выручке
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Самые денежные позиции в выбранном периоде.
      </p>

      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <RestaurantAnalyticsEmptyState />
        ) : (
          items.map((product) => (
            <button
              key={product.productId}
              type="button"
              onClick={() => onOpenProduct(product)}
              className="block w-full rounded-xl p-2 text-left transition hover:bg-slate-50"
            >
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold text-slate-950">
                    {product.titleRu}
                  </div>
                  <div className="text-xs text-slate-500">
                    {product.restaurantNameRu} •{" "}
                    {formatInteger(product.orderedQuantity)} шт
                  </div>
                </div>

                <div className="font-bold text-slate-950">
                  {formatMoney(product.revenue)}
                </div>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600"
                  style={{
                    width: `${Math.max(
                      3,
                      (product.revenue / maxRevenue) * 100,
                    )}%`,
                  }}
                />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ProblemProducts({
  products,
  onOpenProduct,
}: {
  products: RestaurantAnalyticsTopProduct[];
  onOpenProduct: (product: RestaurantAnalyticsTopProduct) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-950">
          Проблемные товары
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Товары с плохой конверсией, удалениями из корзины или нулевыми
          заказами.
        </p>
      </div>

      <div className="p-5">
        {products.length === 0 ? (
          <RestaurantAnalyticsEmptyState
            title="Проблемных товаров нет"
            description="За выбранный период явные проблемные товары не найдены."
          />
        ) : (
          <div className="space-y-3">
            {products.slice(0, 10).map((product) => (
              <button
                key={product.productId}
                type="button"
                onClick={() => onOpenProduct(product)}
                className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-950">
                      {product.titleRu}
                    </span>
                    <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                      {getProblemReason(product)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>{product.restaurantNameRu}</span>
                    <span>Views: {formatInteger(product.views)}</span>
                    <span>Cart: {formatInteger(product.addToCart)}</span>
                    <span>Orders: {formatInteger(product.ordersCount)}</span>
                    <span>Remove: {formatInteger(product.removeFromCart)}</span>
                  </div>
                </div>

                <div className="font-bold text-slate-950">
                  {formatMoney(product.revenue)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductsTable({
  products,
  onOpenProduct,
}: {
  products: RestaurantAnalyticsTopProduct[];
  onOpenProduct: (product: RestaurantAnalyticsTopProduct) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-950">Товары</h2>
        <p className="mt-1 text-sm text-slate-500">
          Продажи, выручка, просмотры и конверсия товаров.
        </p>
      </div>

      <div className="overflow-x-auto">
        {products.length === 0 ? (
          <div className="p-5">
            <RestaurantAnalyticsEmptyState />
          </div>
        ) : (
          <table className="w-full min-w-[1100px] text-left text-sm">
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
                <th className="px-5 py-4 text-right">Действие</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr
                  key={product.productId}
                  className="transition hover:bg-slate-50"
                >
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

                  <td className="px-5 py-4">
                    {formatInteger(product.ordersCount)}
                  </td>

                  <td className="px-5 py-4">
                    {formatInteger(product.orderedQuantity)}
                  </td>

                  <td className="px-5 py-4 font-semibold">
                    {formatMoney(product.revenue)}
                  </td>

                  <td className="px-5 py-4">
                    {formatInteger(product.views)}
                  </td>

                  <td className="px-5 py-4">
                    {formatInteger(product.addToCart)}
                  </td>

                  <td className="px-5 py-4">
                    {formatInteger(product.removeFromCart)}
                  </td>

                  <td className="px-5 py-4">
                    {formatPercent(product.viewToCartRate)}
                  </td>

                  <td className="px-5 py-4">
                    {formatPercent(product.cartToOrderRate)}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenProduct(product)}
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