"use client";

import { Download, Filter, Search } from "lucide-react";
import type { ClientMetricsTableItem } from "./types";

type Props = {
  items: ClientMetricsTableItem[];
  total: number;
  page: number;
  limit: number;
  q: string;
  onSearch: (q: string) => void;
  onExport: () => void;
};

function fullName(item: ClientMetricsTableItem) {
  const name = [item.firstName, item.lastName].filter(Boolean).join(" ");
  return name || item.name || "Без имени";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function money(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(Number(value) || 0)} ₸`;
}

function date(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deviceBadges(count: number) {
  if (!count || count <= 0) return <span style={mutedText}>—</span>;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <span style={{ ...badge, background: "#DCFCE7", color: "#15803D" }}>
        Android
      </span>
      {count > 1 && (
        <span style={{ ...badge, background: "#E0E7FF", color: "#4338CA" }}>
          iOS
        </span>
      )}
    </div>
  );
}

export function ClientMetricsTable({
  items,
  total,
  page,
  limit,
  q,
  onSearch,
  onExport,
}: Props) {
  return (
    <section
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 18px 36px rgba(15,23,42,0.08)",
      }}
    >
      <div
        style={{
          padding: "20px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 900,
            color: "#0F172A",
            letterSpacing: "-0.02em",
          }}
        >
          Клиенты ({new Intl.NumberFormat("ru-RU").format(total)})
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 380,
              height: 42,
              border: "1px solid #CBD5E1",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              gap: 9,
              background: "#FFFFFF",
            }}
          >
            <Search size={17} color="#64748B" />
            <input
              value={q}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Поиск по имени, телефону или email..."
              style={{
                border: "none",
                outline: "none",
                width: "100%",
                fontSize: 14,
                color: "#0F172A",
                fontWeight: 600,
              }}
            />
          </div>

          <button type="button" style={toolbarButton}>
            <Filter size={16} />
            Фильтры
          </button>

          <button type="button" style={toolbarButton} onClick={onExport}>
            <Download size={16} />
            Экспорт
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1180,
          }}
        >
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              <th style={thStyle}>
                <input type="checkbox" />
              </th>
              {[
                "Клиент",
                "Телефон",
                "Email",
                "Устройства",
                "Заказов",
                "Сумма заказов",
                "Последний заказ",
                "Последняя активность",
                "Регистрация",
                "Избранное",
              ].map((head) => (
                <th key={head} style={thStyle}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  style={{
                    padding: 44,
                    textAlign: "center",
                    color: "#64748B",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Клиенты не найдены
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const name = fullName(item);
                const favCount =
                  (item.favoriteRestaurantsCount ?? 0) +
                  (item.favoriteProductsCount ?? 0);

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderTop: "1px solid #E2E8F0",
                      background: "#FFFFFF",
                    }}
                  >
                    <td style={tdStyle}>
                      <input type="checkbox" />
                    </td>

                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 14,
                            background:
                              "linear-gradient(135deg,#7C3AED,#6366F1)",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            fontSize: 13,
                            boxShadow: "0 8px 18px rgba(99,102,241,0.28)",
                          }}
                        >
                          {initials(name)}
                        </div>

                        <div>
                          <div
                            style={{
                              color: "#0F172A",
                              fontWeight: 900,
                              fontSize: 14,
                            }}
                          >
                            {name}
                          </div>
                          <div
                            style={{
                              color: "#64748B",
                              fontSize: 12,
                              fontWeight: 700,
                              marginTop: 2,
                            }}
                          >
                            {item.segment || "CLIENT"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={tdStyle}>{item.phone || "—"}</td>
                    <td style={tdStyle}>{item.email || "—"}</td>
                    <td style={tdStyle}>
                      {deviceBadges(item.devicesCount ?? 0)}
                    </td>
                    <td style={tdStrong}>{item.ordersCount ?? 0}</td>
                    <td style={tdStrong}>{money(item.totalSpent ?? 0)}</td>
                    <td style={tdStyle}>{date(item.lastOrderAt)}</td>
                    <td style={tdStyle}>{date(item.lastActiveAt)}</td>
                    <td style={tdStyle}>{date(item.createdAt)}</td>
                    <td style={tdStrong}>{favCount}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          padding: "16px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#475569",
          fontSize: 13,
          fontWeight: 700,
          borderTop: "1px solid #E2E8F0",
          background: "#FFFFFF",
        }}
      >
        <span>
          Показать по <b>{limit}</b>
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((number) => (
            <button
              key={number}
              type="button"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                background: number === page ? "#6366F1" : "#FFFFFF",
                color: number === page ? "#FFFFFF" : "#0F172A",
                fontWeight: 900,
              }}
            >
              {number}
            </button>
          ))}
        </div>

        <span>Всего: {new Intl.NumberFormat("ru-RU").format(total)}</span>
      </div>
    </section>
  );
}

const thStyle: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "left",
  fontSize: 12,
  color: "#334155",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "16px",
  fontSize: 14,
  color: "#334155",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const tdStrong: React.CSSProperties = {
  ...tdStyle,
  color: "#0F172A",
  fontWeight: 900,
};

const toolbarButton: React.CSSProperties = {
  height: 42,
  border: "1px solid #CBD5E1",
  borderRadius: 12,
  padding: "0 14px",
  background: "#FFFFFF",
  color: "#334155",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const badge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 24,
  borderRadius: 999,
  padding: "0 9px",
  fontSize: 12,
  fontWeight: 900,
};

const mutedText: React.CSSProperties = {
  color: "#94A3B8",
  fontWeight: 800,
};