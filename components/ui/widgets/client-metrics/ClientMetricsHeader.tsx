"use client";

import { RefreshCcw } from "lucide-react";
import type { ClientMetricsPeriod } from "./types";

type Props = {
  period: ClientMetricsPeriod;
  onPeriodChange: (period: ClientMetricsPeriod) => void;
  onRefresh: () => void;
  loading?: boolean;
};

const PERIODS: Array<{ label: string; value: ClientMetricsPeriod }> = [
  { label: "Сегодня", value: "today" },
  { label: "7 дней", value: "7d" },
  { label: "14 дней", value: "14d" },
  { label: "30 дней", value: "30d" },
  { label: "Месяц", value: "month" },
  { label: "Год", value: "year" },
];

export function ClientMetricsHeader({
  period,
  onPeriodChange,
  onRefresh,
  loading,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 24,
        marginBottom: 24,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            lineHeight: "36px",
            fontWeight: 800,
            color: "#111827",
          }}
        >
          Метрики клиентов
        </h1>

        <p
          style={{
            margin: "6px 0 0",
            fontSize: 14,
            lineHeight: "22px",
            color: "#6B7280",
          }}
        >
          Аналитика клиентов: активность, заказы, устройства, retention и поведение.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <select
          value={period}
          onChange={(event) =>
            onPeriodChange(event.target.value as ClientMetricsPeriod)
          }
          style={{
            height: 40,
            border: "1px solid #E5E7EB",
            borderRadius: 10,
            padding: "0 12px",
            background: "#FFFFFF",
            color: "#111827",
            fontSize: 14,
            fontWeight: 600,
            outline: "none",
          }}
        >
          {PERIODS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            height: 40,
            border: "none",
            borderRadius: 10,
            padding: "0 14px",
            background: "#6366F1",
            color: "#FFFFFF",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.72 : 1,
            boxShadow: "0 10px 18px rgba(99,102,241,0.22)",
          }}
        >
          <RefreshCcw size={16} />
          Обновить
        </button>
      </div>
    </div>
  );
}