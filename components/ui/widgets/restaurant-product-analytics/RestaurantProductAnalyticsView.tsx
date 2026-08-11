"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
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

const ranges: Array<{ value: RestaurantAnalyticsRange; label: string }> = [
  { value: "today", label: "Сегодня" },
  { value: "7d", label: "7 дней" },
  { value: "14d", label: "14 дней" },
  { value: "30d", label: "30 дней" },
  { value: "month", label: "Этот месяц" },
  { value: "year", label: "Этот год" },
];

const sortOptions: Array<{ value: RestaurantAnalyticsProductSort; label: string }> = [
  { value: "revenue", label: "По выручке" },
  { value: "orders", label: "По заказам" },
  { value: "views", label: "По просмотрам" },
  { value: "cart", label: "По добавлениям в корзину" },
  { value: "conversion", label: "По конверсии в корзину" },
];

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function productName(product: RestaurantAnalyticsTopProduct) {
  return product.titleRu?.trim() || product.titleKk?.trim() || "Товар без названия";
}

function problemLabel(product: RestaurantAnalyticsTopProduct) {
  if (!product.isAvailable) return "Снят с продажи";
  if (product.views >= 10 && product.addToCart === 0) return "Смотрят, но не добавляют";
  if (product.addToCart >= 5 && product.ordersCount === 0) return "Добавляют, но не покупают";
  if (product.removeFromCart >= Math.max(3, product.addToCart * 0.5)) return "Часто убирают из корзины";
  if (product.views >= 20 && product.viewToCartRate < 5) return "Низкий интерес после просмотра";
  return null;
}

function exportCsv(products: RestaurantAnalyticsTopProduct[]) {
  const rows = [
    ["Товар", "Ресторан", "Цена", "Заказов", "Продано", "Выручка", "Просмотров", "Добавили в корзину", "Убрали из корзины", "Из просмотра в корзину", "Доступен"],
    ...products.map((item) => [
      productName(item),
      item.restaurantNameRu,
      item.price,
      item.ordersCount,
      item.orderedQuantity,
      item.revenue,
      item.views,
      item.addToCart,
      item.removeFromCart,
      item.viewToCartRate,
      item.isAvailable ? "Да" : "Нет",
    ]),
  ];
  const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = rows.map((row) => row.map(quote).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "prodazhi-tovarov.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function Kpi({ title, value, note, icon }: { title: string; value: string; note: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-slate-500">{title}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
          <div className="mt-1 text-xs text-slate-400">{note}</div>
        </div>
        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">{icon}</div>
      </div>
    </div>
  );
}

export function RestaurantProductAnalyticsView() {
  const [range, setRange] = useState<RestaurantAnalyticsRange>("7d");
  const [sort, setSort] = useState<RestaurantAnalyticsProductSort>("revenue");
  const [products, setProducts] = useState<RestaurantAnalyticsTopProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/restaurant-analytics/admin/top-products?${buildAnalyticsQuery({ range, limit: 100, sort })}`,
      );
      setProducts(mapTopProductsResponse(response));
    } catch {
      setProducts([]);
      setError("Не удалось загрузить продажи товаров. Повторите попытку.");
    } finally {
      setLoading(false);
    }
  }, [range, sort]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const productQuery = normalizeSearch(productSearch);
    const restaurantQuery = normalizeSearch(restaurantSearch);
    return products.filter((product) => {
      const productMatches = !productQuery || [product.titleRu, product.titleKk].join(" ").toLowerCase().includes(productQuery);
      const restaurantMatches = !restaurantQuery || String(product.restaurantNameRu ?? "").toLowerCase().includes(restaurantQuery);
      return productMatches && restaurantMatches;
    });
  }, [products, productSearch, restaurantSearch]);

  const stats = useMemo(() => {
    const revenue = filtered.reduce((sum, item) => sum + item.revenue, 0);
    const orders = filtered.reduce((sum, item) => sum + item.ordersCount, 0);
    const quantity = filtered.reduce((sum, item) => sum + item.orderedQuantity, 0);
    const views = filtered.reduce((sum, item) => sum + item.views, 0);
    const cart = filtered.reduce((sum, item) => sum + item.addToCart, 0);
    const removed = filtered.reduce((sum, item) => sum + item.removeFromCart, 0);
    const viewToCart = views > 0 ? (cart / views) * 100 : 0;
    const problems = filtered.filter((item) => problemLabel(item)).length;
    return { revenue, orders, quantity, views, cart, removed, viewToCart, problems };
  }, [filtered]);

  const sortedProblems = useMemo(
    () => filtered.filter((item) => problemLabel(item)).slice(0, 20),
    [filtered],
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <Link href="/layout-20/restaurants/analytics" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-violet-600">
              <ArrowLeft className="h-4 w-4" /> Работа ресторанов
            </Link>
            <h1 className="text-2xl font-bold">Продажи товаров</h1>
            <p className="mt-1 text-sm text-slate-500">Что продаётся, что смотрят и на каких товарах теряется интерес клиента.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={range} onChange={(e) => setRange(e.target.value as RestaurantAnalyticsRange)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
              {ranges.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as RestaurantAnalyticsProductSort)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
              {sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <button onClick={() => void loadData()} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold"><RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} />Обновить</button>
            <button onClick={() => exportCsv(filtered)} disabled={filtered.length === 0} className="h-10 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-40"><Download className="mr-2 inline h-4 w-4" />Экспорт</button>
          </div>
        </header>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi title="Выручка" value={formatMoney(stats.revenue)} note="По проданным товарам" icon={<Wallet className="h-5 w-5" />} />
          <Kpi title="Заказы с товарами" value={formatInteger(stats.orders)} note={`Продано единиц: ${formatInteger(stats.quantity)}`} icon={<Package className="h-5 w-5" />} />
          <Kpi title="Просмотры товаров" value={formatInteger(stats.views)} note={`Добавили в корзину: ${formatInteger(stats.cart)}`} icon={<Eye className="h-5 w-5" />} />
          <Kpi title="Из просмотра в корзину" value={formatPercent(stats.viewToCart)} note={`Требуют внимания: ${formatInteger(stats.problems)}`} icon={<ShoppingCart className="h-5 w-5" />} />
        </section>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-2">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Найти товар" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm" /></label>
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={restaurantSearch} onChange={(e) => setRestaurantSearch(e.target.value)} placeholder="Найти ресторан" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm" /></label>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-bold">Товары</h2><p className="mt-1 text-xs text-slate-500">Показано {filtered.length} позиций</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Товар</th><th className="px-4 py-3">Ресторан</th><th className="px-4 py-3 text-right">Цена</th><th className="px-4 py-3 text-right">Продано</th><th className="px-4 py-3 text-right">Выручка</th><th className="px-4 py-3 text-right">Просмотры</th><th className="px-4 py-3 text-right">В корзину</th><th className="px-4 py-3">Состояние</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((product) => { const problem = problemLabel(product); return <tr key={product.productId} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold">{productName(product)}</td><td className="px-4 py-3 text-slate-600">{product.restaurantNameRu || "—"}</td><td className="px-4 py-3 text-right">{formatMoney(product.price)}</td><td className="px-4 py-3 text-right">{formatInteger(product.orderedQuantity)}</td><td className="px-4 py-3 text-right font-semibold">{formatMoney(product.revenue)}</td><td className="px-4 py-3 text-right">{formatInteger(product.views)}</td><td className="px-4 py-3 text-right">{formatInteger(product.addToCart)} <span className="text-xs text-slate-400">({formatPercent(product.viewToCartRate)})</span></td><td className="px-4 py-3">{problem ? <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">{problem}</span> : <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Без проблем</span>}</td></tr>; })}
                {!loading && filtered.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">Нет данных за выбранный период</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        {sortedProblems.length > 0 ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 font-bold text-amber-900"><TrendingDown className="h-5 w-5" />Что требует внимания</div><div className="mt-3 grid gap-2 lg:grid-cols-2">{sortedProblems.map((product) => <div key={product.productId} className="rounded-lg border border-amber-200 bg-white px-3 py-2"><div className="font-semibold">{productName(product)}</div><div className="mt-1 text-xs text-amber-800">{problemLabel(product)}</div></div>)}</div></section> : null}

        <p className="text-xs text-slate-400">Переход из корзины в заказ по конкретному товару не показывается, пока сервер не сможет надёжно связать покупку с конкретным событием корзины.</p>
      </div>
    </main>
  );
}
