"use client";

type Props = {
  title?: string;
  description?: string;
};

export function RestaurantAnalyticsEmptyState({
  title = "Нет данных",
  description = "За выбранный период данные отсутствуют.",
}: Props) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{description}</div>
    </div>
  );
}