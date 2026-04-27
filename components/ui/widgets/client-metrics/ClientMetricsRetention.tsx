"use client";

import type { ClientRetentionItem } from "./types";

type Props = {
  items: ClientRetentionItem[];
};

export function ClientMetricsRetention({ items }: Props) {
  return (
    <section
      style={{
        background: "#FFFFFF",
        border: "1px solid #EEF2F7",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
      }}
    >
      <h2
        style={{
          margin: "0 0 18px",
          fontSize: 18,
          fontWeight: 800,
          color: "#111827",
        }}
      >
        Retention клиентов
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {items.length === 0 ? (
          <p style={{ margin: 0, color: "#94A3B8", fontSize: 14 }}>
            Нет данных retention
          </p>
        ) : (
          items.map((item) => (
            <div key={item.label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  color: "#374151",
                  fontSize: 14,
                }}
              >
                <span>{item.label}</span>
                <b>{item.value.toFixed(1)}%</b>
              </div>

              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: "#EEF2F7",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, item.value)}%`,
                    borderRadius: 999,
                    background: "#6366F1",
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}