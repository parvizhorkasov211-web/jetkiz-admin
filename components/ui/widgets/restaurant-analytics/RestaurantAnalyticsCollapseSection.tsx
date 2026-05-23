"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  right?: ReactNode;
};

export function RestaurantAnalyticsCollapseSection({
  title,
  description,
  collapsed,
  onToggle,
  children,
  right,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 border-b border-slate-200 p-5 text-left"
      >
        <div>
          <h3 className="font-bold text-slate-950">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {right}
          <ChevronDown
            className={`h-5 w-5 text-slate-500 transition-transform ${
              collapsed ? "" : "rotate-180"
            }`}
          />
        </div>
      </button>

      {!collapsed ? <div className="p-5">{children}</div> : null}
    </div>
  );
}