"use client";

type SortOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  title: string;
  description?: string;
  value: T;
  options: SortOption<T>[];
  loading?: boolean;
  onChange: (value: T) => void;
};

export function RestaurantAnalyticsSortBar<T extends string>({
  title,
  description,
  value,
  options,
  loading,
  onChange,
}: Props<T>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-950">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={loading}
              onClick={() => onChange(option.value)}
              className={`h-9 rounded-xl px-3 text-xs font-semibold transition ${
                value === option.value
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}