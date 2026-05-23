"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  value: ReactNode;
  description?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
};

const toneClassName = {
  default: "bg-violet-50 text-violet-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-orange-50 text-orange-600",
  danger: "bg-rose-50 text-rose-600",
};

export function RestaurantAnalyticsKpiCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <div className="text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </div>
          {description ? (
            <div className="text-xs text-slate-500">{description}</div>
          ) : null}
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClassName[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}