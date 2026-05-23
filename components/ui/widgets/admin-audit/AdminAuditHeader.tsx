"use client";

import { Download, RefreshCw } from "lucide-react";

type Props = {
  loading: boolean;
  exportUrl: string;
  onRefresh: () => void;
};

export function AdminAuditHeader({ loading, exportUrl, onRefresh }: Props) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="mb-2 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
          Журнал администраторов
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Журнал действий
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Понятная история: кто из администраторов, когда и что сделал.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </button>

        <a
          href={exportUrl}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          <Download className="h-4 w-4" />
          Экспорт CSV
        </a>
      </div>
    </div>
  );
}