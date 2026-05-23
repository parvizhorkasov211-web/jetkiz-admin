"use client";

import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
};

export function AdminAuditKpiCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
}: Props) {
  const styles = {
    default: "bg-violet-50 text-violet-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-orange-50 text-orange-600",
    danger: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{title}</div>

          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </div>

          <div className="mt-2 text-xs text-slate-500">{description}</div>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}