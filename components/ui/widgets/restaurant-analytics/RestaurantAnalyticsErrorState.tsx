"use client";

import { RefreshCw } from "lucide-react";

type Props = {
  message: string;
  onRetry: () => void;
};

export function RestaurantAnalyticsErrorState({ message, onRetry }: Props) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
      <div className="text-base font-bold text-rose-700">
        Не удалось загрузить аналитику
      </div>
      <div className="mt-2 text-sm text-rose-600">{message}</div>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700"
      >
        <RefreshCw className="h-4 w-4" />
        Повторить
      </button>
    </div>
  );
}