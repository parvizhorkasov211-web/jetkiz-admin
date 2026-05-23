"use client";

import { Search } from "lucide-react";

type Props = {
  restaurantSearch: string;
  productSearch: string;
  limit: number;
  loading?: boolean;
  onRestaurantSearchChange: (value: string) => void;
  onProductSearchChange: (value: string) => void;
  onLimitChange: (value: number) => void;
};

const limits = [10, 20, 50, 100];

export function RestaurantAnalyticsSearchLimitBar({
  restaurantSearch,
  productSearch,
  limit,
  loading,
  onRestaurantSearchChange,
  onProductSearchChange,
  onLimitChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_180px]">
        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Поиск ресторана
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={restaurantSearch}
              disabled={loading}
              onChange={(event) =>
                onRestaurantSearchChange(event.target.value)
              }
              placeholder="Название ресторана..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Поиск товара
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={productSearch}
              disabled={loading}
              onChange={(event) => onProductSearchChange(event.target.value)}
              placeholder="Название товара..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Лимит
          </label>

          <select
            value={limit}
            disabled={loading}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {limits.map((item) => (
              <option key={item} value={item}>
                {item} записей
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}