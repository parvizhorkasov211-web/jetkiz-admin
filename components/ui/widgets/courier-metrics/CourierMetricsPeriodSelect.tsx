"use client";

import { CalendarDays, ChevronDown } from "lucide-react";

export type CourierMetricsPeriod =
  | "today"
  | "7d"
  | "14d"
  | "30d"
  | "month"
  | "year";

const PERIOD_LABELS: Record<CourierMetricsPeriod, string> = {
  today: "Сегодня",
  "7d": "7 дней",
  "14d": "14 дней",
  "30d": "30 дней",
  month: "Месяц",
  year: "Год",
};

type Props = {
  value: CourierMetricsPeriod;
  onChange: (value: CourierMetricsPeriod) => void;
};

export function CourierMetricsPeriodSelect({ value, onChange }: Props) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CourierMetricsPeriod)}
        style={{
          height: 40,
          minWidth: 150,
          padding: "0 38px 0 38px",
          borderRadius: 10,
          border: "1px solid #E5E7EB",
          background: "#FFFFFF",
          color: "#0F172A",
          fontSize: 13,
          fontWeight: 800,
          appearance: "none",
          outline: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(15,23,42,0.03)",
        }}
      >
        {Object.entries(PERIOD_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            Период: {label}
          </option>
        ))}
      </select>

      <CalendarDays
        size={16}
        style={{
          position: "absolute",
          left: 14,
          top: 12,
          color: "#64748B",
          pointerEvents: "none",
        }}
      />

      <ChevronDown
        size={16}
        style={{
          position: "absolute",
          right: 13,
          top: 12,
          color: "#64748B",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export function getCourierMetricsPeriodLabel(value: CourierMetricsPeriod) {
  return PERIOD_LABELS[value];
}