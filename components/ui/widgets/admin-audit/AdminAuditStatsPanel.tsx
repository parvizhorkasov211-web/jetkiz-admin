"use client";

import {
  getActionLabel,
  getEntityTypeLabel,
  isInternalAuditAction,
} from "./admin-audit.labels";
import { formatInteger } from "./admin-audit.helpers";
import type { AuditStatsResponse } from "./admin-audit.types";

type StatsItem = {
  label: string;
  count: number;
};

type Props = {
  stats: AuditStatsResponse | null;
};

export function AdminAuditStatsPanel({ stats }: Props) {
  const byAction =
    stats?.byAction
      .filter((item) => !isInternalAuditAction(item.action))
      .map((item) => ({
        label: getActionLabel(item.action),
        count: item.count,
      })) ?? [];

  const byEntityType =
    stats?.byEntityType.map((item) => ({
      label: getEntityTypeLabel(item.entityType),
      count: item.count,
    })) ?? [];

  return (
    <div className="space-y-6">
      <StatsList title="Топ действий" items={byAction} />
      <StatsList title="Топ разделов" items={byEntityType} />
    </div>
  );
}

function StatsList({ title, items }: { title: string; items: StatsItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>

      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">Нет данных</div>
        ) : (
          items.slice(0, 10).map((item) => (
            <div key={item.label}>
              <div className="mb-2 flex items-start justify-between gap-3 text-sm">
                <div className="truncate font-semibold text-slate-700">
                  {item.label || "—"}
                </div>

                <span className="font-bold text-slate-950">
                  {formatInteger(item.count)}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600"
                  style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}