"use client";

import {
  Activity,
  CalendarPlus,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ClientMetricKpi } from "./types";

type Props = {
  items: ClientMetricKpi[];
};

const ICONS = [Users, Activity, CalendarPlus, ShoppingBag, TrendingUp, ReceiptText];

export function ClientMetricsKpiCards({ items }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
        gap: 16,
        marginBottom: 20,
      }}
    >
      {items.map((item, index) => {
        const Icon = ICONS[index] ?? Users;
        const trendColor =
          item.trend.direction === "down"
            ? "#DC2626"
            : item.trend.direction === "up"
              ? "#16A34A"
              : "#6B7280";

        return (
          <div
            key={item.key}
            style={{
              minHeight: 142,
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 18px 34px rgba(15,23,42,0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: "18px",
                    color: "#475569",
                    fontWeight: 600,
                  }}
                >
                  {item.title}
                </p>

                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 24,
                    lineHeight: "30px",
                    color: "#0F172A",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {item.value}
                </p>
              </div>

              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "#EEF2FF",
                  color: "#4F46E5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={19} />
              </div>
            </div>

            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  lineHeight: "18px",
                  color: trendColor,
                  fontWeight: 700,
                }}
              >
                {item.trend.value}
              </p>

              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 12,
                  lineHeight: "18px",
                  color: "#9CA3AF",
                  fontWeight: 500,
                }}
              >
                {item.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}