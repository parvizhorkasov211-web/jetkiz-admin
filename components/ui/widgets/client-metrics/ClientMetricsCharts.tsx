"use client";

import type { ClientActivityPoint, ClientDevicePlatform } from "./types";

type Props = {
  activity: ClientActivityPoint[];
  devices: ClientDevicePlatform[];
};

const CHART_WIDTH = 760;
const CHART_HEIGHT = 260;
const PADDING_LEFT = 56;
const PADDING_RIGHT = 22;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 38;

const PLOT_WIDTH = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
  });
}

function formatTooltipDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(Number(value) || 0);
}

function getPoint(index: number, value: number, length: number, maxValue: number) {
  const x =
    PADDING_LEFT +
    (length <= 1 ? PLOT_WIDTH / 2 : (index / (length - 1)) * PLOT_WIDTH);

  const y =
    PADDING_TOP +
    PLOT_HEIGHT -
    (maxValue <= 0 ? 0 : (value / maxValue) * PLOT_HEIGHT);

  return { x, y };
}

function buildPath(values: number[], maxValue: number) {
  if (values.length === 0) return "";

  return values
    .map((value, index) => {
      const point = getPoint(index, value, values.length, maxValue);
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    })
    .join(" ");
}

function niceMax(value: number) {
  if (value <= 5) return 5;
  if (value <= 10) return 10;
  if (value <= 50) return 50;
  if (value <= 100) return 100;

  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / magnitude) * magnitude;
}

export function ClientMetricsCharts({ activity, devices }: Props) {
  const prepared = activity.slice(-14);

  const activeValues = prepared.map((item) => item.activeClients ?? 0);
  const newValues = prepared.map((item) => item.newClients ?? 0);
  const maxValue = niceMax(Math.max(1, ...activeValues, ...newValues));

  const activePath = buildPath(activeValues, maxValue);
  const newPath = buildPath(newValues, maxValue);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: Math.round(maxValue * (1 - ratio)),
    y: PADDING_TOP + PLOT_HEIGHT * ratio,
  }));

  const totalDevices = devices.reduce((sum, item) => sum + item.count, 0);

  const lastPoint = prepared[prepared.length - 1];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: 16,
        marginBottom: 16,
      }}
    >
      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 18,
          padding: 22,
          boxShadow: "0 18px 36px rgba(15,23,42,0.08)",
          minHeight: 352,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 14,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                lineHeight: "28px",
                fontWeight: 900,
                color: "#0F172A",
                letterSpacing: "-0.02em",
              }}
            >
              Активность клиентов
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                color: "#475569",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Активные и новые клиенты по выбранному периоду
            </p>
          </div>

          <div
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 12,
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            <span style={{ color: "#2563EB" }}>● Активные</span>
            <span style={{ color: "#16A34A" }}>● Новые</span>
          </div>
        </div>

        {prepared.length === 0 ? (
          <div
            style={{
              height: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748B",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Нет данных активности
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              style={{
                width: "100%",
                height: 290,
                display: "block",
              }}
            >
              {yTicks.map((tick) => (
                <g key={tick.y}>
                  <line
                    x1={PADDING_LEFT}
                    x2={CHART_WIDTH - PADDING_RIGHT}
                    y1={tick.y}
                    y2={tick.y}
                    stroke="#E2E8F0"
                    strokeWidth="1"
                    strokeDasharray="4 5"
                  />
                  <text
                    x={PADDING_LEFT - 12}
                    y={tick.y + 4}
                    textAnchor="end"
                    fontSize="12"
                    fontWeight="700"
                    fill="#64748B"
                  >
                    {formatNumber(tick.value)}
                  </text>
                </g>
              ))}

              {prepared.map((item, index) => {
                const point = getPoint(index, 0, prepared.length, maxValue);

                return (
                  <g key={item.bucketStart}>
                    <line
                      x1={point.x}
                      x2={point.x}
                      y1={PADDING_TOP}
                      y2={PADDING_TOP + PLOT_HEIGHT}
                      stroke="#EEF2F7"
                      strokeWidth="1"
                    />
                    <text
                      x={point.x}
                      y={CHART_HEIGHT - 10}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="700"
                      fill="#64748B"
                    >
                      {formatDateLabel(item.bucketStart)}
                    </text>
                  </g>
                );
              })}

              <path
                d={activePath}
                fill="none"
                stroke="#2563EB"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d={newPath}
                fill="none"
                stroke="#16A34A"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {prepared.map((item, index) => {
                const activePoint = getPoint(
                  index,
                  item.activeClients ?? 0,
                  prepared.length,
                  maxValue,
                );
                const newPoint = getPoint(
                  index,
                  item.newClients ?? 0,
                  prepared.length,
                  maxValue,
                );

                return (
                  <g key={`${item.bucketStart}-points`}>
                    <circle
                      cx={activePoint.x}
                      cy={activePoint.y}
                      r="5"
                      fill="#FFFFFF"
                      stroke="#2563EB"
                      strokeWidth="3"
                    />
                    <circle
                      cx={newPoint.x}
                      cy={newPoint.y}
                      r="5"
                      fill="#FFFFFF"
                      stroke="#16A34A"
                      strokeWidth="3"
                    />
                  </g>
                );
              })}
            </svg>

            {lastPoint && (
              <div
                style={{
                  position: "absolute",
                  right: 18,
                  top: 16,
                  minWidth: 190,
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: 14,
                  padding: 12,
                  boxShadow: "0 16px 32px rgba(15,23,42,0.12)",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#0F172A",
                    marginBottom: 8,
                  }}
                >
                  {formatTooltipDate(lastPoint.bucketStart)}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    color: "#2563EB",
                    fontSize: 12,
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                >
                  <span>Активные клиенты</span>
                  <b>{formatNumber(lastPoint.activeClients ?? 0)}</b>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    color: "#16A34A",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <span>Новые клиенты</span>
                  <b>{formatNumber(lastPoint.newClients ?? 0)}</b>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 18,
          padding: 22,
          boxShadow: "0 18px 36px rgba(15,23,42,0.08)",
          minHeight: 352,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            lineHeight: "28px",
            fontWeight: 900,
            color: "#0F172A",
            letterSpacing: "-0.02em",
          }}
        >
          Клиенты по устройствам
        </h2>

        <div
          style={{
            width: 176,
            height: 176,
            borderRadius: "50%",
            margin: "28px auto 22px",
            background:
              totalDevices > 0
                ? "conic-gradient(#16A34A 0 62%, #4F46E5 62% 94%, #F59E0B 94% 99%, #94A3B8 99% 100%)"
                : "conic-gradient(#16A34A 0 62%, #2563EB 62% 94%, #F59E0B 94% 99%, #CBD5E1 99% 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.04)",
          }}
        >
          <div
            style={{
              width: 106,
              height: 106,
              borderRadius: "50%",
              background: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#0F172A",
              fontWeight: 900,
              boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
            }}
          >
            <span style={{ fontSize: 24, lineHeight: "28px" }}>
              {formatNumber(totalDevices)}
            </span>
            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 800 }}>
              устройств
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {devices.length === 0 ? (
            <div
              style={{
                color: "#64748B",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Нет данных устройств
            </div>
          ) : (
            devices.map((item, index) => {
              const colors = ["#16A34A", "#4F46E5", "#F59E0B", "#94A3B8"];
              const color = colors[index] ?? "#64748B";

              return (
                <div
                  key={item.platform}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    fontSize: 14,
                    color: "#0F172A",
                    fontWeight: 800,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: color,
                        display: "inline-block",
                      }}
                    />
                    {item.platform}
                  </span>
                  <span>{item.pct.toFixed(1)}%</span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}