"use client";

import type { ClientEventStat, ClientLanguageStat } from "./types";

type Props = {
  languages: ClientLanguageStat[];
  events: ClientEventStat[];
  averages: {
    avgOrdersPerClient: number;
    avgCheck: number;
    totalRevenue: number;
  };
};

function money(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(Number(value) || 0)} ₸`;
}

export function ClientMetricsAnalytics({ languages, events, averages }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 16,
        marginBottom: 16,
      }}
    >
      <section style={cardStyle}>
        <h2 style={titleStyle}>Языки приложения</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {languages.length === 0 ? (
            <p style={emptyStyle}>Нет данных языков</p>
          ) : (
            languages.map((item) => (
              <div key={item.language}>
                <div style={rowStyle}>
                  <span>{item.language}</span>
                  <b>{item.pct.toFixed(1)}%</b>
                </div>
                <div style={barBgStyle}>
                  <div style={{ ...barStyle, width: `${item.pct}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>Топ событий</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {events.length === 0 ? (
            <p style={emptyStyle}>Нет событий за период</p>
          ) : (
            events.slice(0, 6).map((item) => (
              <div key={item.eventName}>
                <div style={rowStyle}>
                  <span>{item.eventName}</span>
                  <b>{new Intl.NumberFormat("ru-RU").format(item.count)}</b>
                </div>
                <div style={barBgStyle}>
                  <div
                    style={{
                      ...barStyle,
                      width: `${Math.min(100, item.count / Math.max(1, events[0].count) * 100)}%`,
                      background: "#A78BFA",
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>Средние показатели</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={rowStyle}>
            <span>Заказы на клиента</span>
            <b>{averages.avgOrdersPerClient.toFixed(2)}</b>
          </div>
          <div style={rowStyle}>
            <span>Средний чек</span>
            <b>{money(averages.avgCheck)}</b>
          </div>
          <div style={rowStyle}>
            <span>Сумма заказов</span>
            <b>{money(averages.totalRevenue)}</b>
          </div>
        </div>
      </section>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #EEF2F7",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 17,
  fontWeight: 800,
  color: "#111827",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  fontSize: 14,
  color: "#374151",
};

const barBgStyle: React.CSSProperties = {
  height: 6,
  borderRadius: 999,
  background: "#EEF2F7",
  overflow: "hidden",
  marginTop: 8,
};

const barStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "#2563EB",
};

const emptyStyle: React.CSSProperties = {
  margin: 0,
  color: "#94A3B8",
  fontSize: 14,
};