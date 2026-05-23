"use client";

import Link from "next/link";
import {
  Download,
  FileCheck,
  Package,
  RefreshCw,
  Wallet,
} from "lucide-react";

import type { RestaurantAnalyticsRange } from "./restaurant-analytics.types";

type Props = {
  range: RestaurantAnalyticsRange;
  loading: boolean;
  onRangeChange: (range: RestaurantAnalyticsRange) => void;
  onRefresh: () => void;
  onExport: () => void;
};

const ranges: Array<{ value: RestaurantAnalyticsRange; label: string }> = [
  { value: "today", label: "Сегодня" },
  { value: "7d", label: "7 дней" },
  { value: "14d", label: "14 дней" },
  { value: "30d", label: "30 дней" },
  { value: "month", label: "Месяц" },
  { value: "year", label: "Год" },
];

export function RestaurantAnalyticsHeader({
  range,
  loading,
  onRangeChange,
  onRefresh,
  onExport,
}: Props) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Аналитика ресторанов
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Заказы, выручка, воронка, качество, топ ресторанов и товаров.
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

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </button>

        <Link
          href="/layout-20/restaurants/analytics/products"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Package className="h-4 w-4" />
          Товары
        </Link>

        <Link
          href="/layout-20/restaurants/analytics/quality"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <FileCheck className="h-4 w-4" />
          Качество
        </Link>

        <Link
          href="/layout-20/restaurants/analytics/finance"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Wallet className="h-4 w-4" />
          Финансы
        </Link>

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