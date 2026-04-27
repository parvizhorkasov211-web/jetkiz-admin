"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  BarChart3,
  Bike,
  CheckCircle2,
  Clock,
  Filter,
  Moon,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  Target,
  UserCheck,
  UserX,
  Wallet,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import {
  CourierMetricsPeriod,
  CourierMetricsPeriodSelect,
} from "@/components/ui/widgets/courier-metrics/CourierMetricsPeriodSelect";
import { CourierMetricsCourierDrawer } from "@/components/ui/widgets/courier-metrics/CourierMetricsCourierDrawer";
import { CourierMetricsExportButton } from "@/components/ui/widgets/courier-metrics/CourierMetricsExportButton";

type CourierStatusTab =
  | "ALL"
  | "ONLINE_IDLE"
  | "BUSY"
  | "OFFLINE"
  | "BLOCKED"
  | "SLEEPING";

type CourierOperationalStatus = "ONLINE_IDLE" | "BUSY" | "OFFLINE";

type CourierRealtimeItem = {
  courierUserId?: string | null;
  userId?: string | null;
  id?: string | null;
  courierNumber: number | null;
  firstName: string;
  lastName: string;
  fullName: string;
  isOnline: boolean;
  blocked: boolean;
  blockReason: string | null;
  sleeping: boolean;
  inactive: boolean;
  operationalStatus: CourierOperationalStatus;
  activeOrdersCount: number;
  activeOrdersByStatus: Record<string, number>;
  todayDelivered: number;
  todayGross: number;
  todayCommission: number;
  todayNet: number;
  todayBonus: number;
  todayOnTimeRatePct: number;
  todayLateCount: number;
  currentIdleMinutes: number | null;
  lastSeenAt: string | null;
  lastActiveAt: string | null;
  lastAssignedAt: string | null;
  lastDeliveredAt: string | null;
  createdAt: string;
};

type RealtimeResponse = {
  summary: {
    totalCouriers: number;
    onlineIdle: number;
    busy: number;
    offline: number;
    blocked: number;
    sleeping: number;
    inactive: number;
    activeOrders: number;
    unassignedOrders: number;
    readyWithoutCourier: number;
    deliveredToday: number;
    grossToday: number;
    commissionToday: number;
    netToday: number;
    bonusToday: number;
    lateDeliveriesToday: number;
    onTimeRateTodayPct: number;
  };
  items: CourierRealtimeItem[];
  generatedAt: string;
  timezone: string;
};

type StatusListResponse = {
  tab: CourierStatusTab;
  limit: number;
  total: number;
  items: CourierRealtimeItem[];
  generatedAt: string;
  timezone: string;
};

type TimelineResponse = {
  period: {
    from: string;
    to: string;
    timezone: string;
    bucket: "hour" | "day";
  };
  points: Array<{
    bucketStart: string;
    online: number;
  }>;
  generatedAt: string;
};

type OnlineSeriesResponse = {
  range: "day" | "week" | "month";
  period: {
    from: string;
    to: string;
    timezone: string;
  };
  points: Array<{
    bucketStart: string;
    seenUnique: number;
    activeUnique: number;
  }>;
  generatedAt: string;
};

const TABS: Array<{ key: CourierStatusTab; label: string }> = [
  { key: "ALL", label: "Все" },
  { key: "ONLINE_IDLE", label: "На линии без заказа" },
  { key: "BUSY", label: "Заняты" },
  { key: "OFFLINE", label: "Офлайн" },
  { key: "BLOCKED", label: "Заблокированы" },
  { key: "SLEEPING", label: "Спящие" },
];

const statusLabel: Record<string, string> = {
  ONLINE_IDLE: "На линии",
  BUSY: "На заказе",
  OFFLINE: "Офлайн",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value || 0) + " ₸";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRelative(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const min = Math.max(0, Math.floor(diffMs / 60000));

  if (min < 1) return "только что";
  if (min < 60) return `${min} мин. назад`;

  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч. ${min % 60} мин. назад`;

  const days = Math.floor(hours / 24);
  return `${days} дн. назад`;
}

function formatIdle(minutes: number | null) {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${minutes} мин.`;

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${h} ч. ${m} мин.`;
}

function getCourierId(item: any): string {
  return String(
    item?.courierUserId ??
      item?.userId ??
      item?.id ??
      item?.courier?.userId ??
      item?.user?.id ??
      ""
  ).trim();
}

function getCourierStatus(item: CourierRealtimeItem) {
  if (item.blocked) return "Заблокирован";
  if (item.sleeping) return "Спящий";
  return statusLabel[item.operationalStatus] ?? item.operationalStatus;
}

function getStatusStyle(item: CourierRealtimeItem) {
  if (item.blocked) {
    return {
      color: "#DC2626",
      background: "#FEE2E2",
    };
  }

  if (item.sleeping) {
    return {
      color: "#7C3AED",
      background: "#EDE9FE",
    };
  }

  if (item.operationalStatus === "BUSY") {
    return {
      color: "#EA580C",
      background: "#FFEDD5",
    };
  }

  if (item.operationalStatus === "ONLINE_IDLE") {
    return {
      color: "#16A34A",
      background: "#DCFCE7",
    };
  }

  return {
    color: "#475569",
    background: "#E2E8F0",
  };
}

function KpiCard({
  title,
  value,
  hint,
  tone,
  icon,
}: {
  title: string;
  value: string | number;
  hint: string;
  tone: "green" | "orange" | "gray" | "red" | "purple" | "blue" | "yellow";
  icon: React.ReactNode;
}) {
  const palette = {
    green: { text: "#16A34A", bg: "#DCFCE7" },
    orange: { text: "#EA580C", bg: "#FFEDD5" },
    gray: { text: "#475569", bg: "#E2E8F0" },
    red: { text: "#DC2626", bg: "#FEE2E2" },
    purple: { text: "#7C3AED", bg: "#EDE9FE" },
    blue: { text: "#2563EB", bg: "#DBEAFE" },
    yellow: { text: "#D97706", bg: "#FEF3C7" },
  }[tone];

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 16,
        padding: 18,
        minHeight: 112,
        boxShadow: "0 8px 22px rgba(15,23,42,0.04)",
        display: "flex",
        justifyContent: "space-between",
        gap: 14,
      }}
    >
      <div>
        <div
          style={{
            color: "#475569",
            fontSize: 13,
            fontWeight: 700,
            lineHeight: "18px",
            marginBottom: 8,
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: "#0F172A",
            fontSize: 28,
            fontWeight: 850,
            lineHeight: "32px",
            letterSpacing: "-0.03em",
          }}
        >
          {value}
        </div>

        <div
          style={{
            color: "#64748B",
            fontSize: 12,
            fontWeight: 600,
            marginTop: 7,
          }}
        >
          {hint}
        </div>
      </div>

      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: palette.bg,
          color: palette.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

function LineChart({
  points,
}: {
  points: Array<{ bucketStart: string; online: number }>;
}) {
  const width = 680;
  const height = 230;
  const padding = 28;
  const max = Math.max(10, ...points.map((p) => p.online));

  const coords = points.map((p, i) => {
    const x =
      padding +
      (points.length <= 1
        ? 0
        : (i / (points.length - 1)) * (width - padding * 2));
    const y =
      height - padding - (p.online / max) * (height - padding * 2);

    return { x, y };
  });

  const path = coords
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
      {[0, 1, 2, 3].map((i) => {
        const y = padding + i * ((height - padding * 2) / 3);
        return (
          <line
            key={i}
            x1={padding}
            x2={width - padding}
            y1={y}
            y2={y}
            stroke="#E5E7EB"
            strokeDasharray="4 4"
          />
        );
      })}

      <path d={path} fill="none" stroke="#16A34A" strokeWidth="4" />

      {coords.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#16A34A" />
      ))}

      <text x={padding} y={height - 4} fill="#94A3B8" fontSize="12">
        начало периода
      </text>
      <text
        x={width - padding}
        y={height - 4}
        fill="#94A3B8"
        fontSize="12"
        textAnchor="end"
      >
        сейчас
      </text>
    </svg>
  );
}

function BarChart({
  points,
}: {
  points: Array<{ bucketStart: string; seenUnique: number; activeUnique: number }>;
}) {
  const width = 560;
  const height = 230;
  const padding = 30;
  const max = Math.max(
    10,
    ...points.flatMap((p) => [p.seenUnique, p.activeUnique])
  );

  const barGroupWidth = (width - padding * 2) / Math.max(points.length, 1);
  const barWidth = Math.min(18, barGroupWidth / 4);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
      {[0, 1, 2, 3].map((i) => {
        const y = padding + i * ((height - padding * 2) / 3);
        return (
          <line
            key={i}
            x1={padding}
            x2={width - padding}
            y1={y}
            y2={y}
            stroke="#E5E7EB"
            strokeDasharray="4 4"
          />
        );
      })}

      {points.map((p, i) => {
        const x = padding + i * barGroupWidth + barGroupWidth / 2;
        const seenH = (p.seenUnique / max) * (height - padding * 2);
        const activeH = (p.activeUnique / max) * (height - padding * 2);

        return (
          <g key={p.bucketStart}>
            <rect
              x={x - barWidth - 3}
              y={height - padding - seenH}
              width={barWidth}
              height={seenH}
              rx={5}
              fill="#2563EB"
            />
            <rect
              x={x + 3}
              y={height - padding - activeH}
              width={barWidth}
              height={activeH}
              rx={5}
              fill="#16A34A"
            />
            <text
              x={x}
              y={height - 7}
              fill="#94A3B8"
              fontSize="11"
              textAnchor="middle"
            >
              {new Intl.DateTimeFormat("ru-RU", {
                day: "2-digit",
                month: "short",
              }).format(new Date(p.bucketStart))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function CourierMetricsPage() {
  const [realtime, setRealtime] = useState<RealtimeResponse | null>(null);
  const [statusList, setStatusList] = useState<StatusListResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [series, setSeries] = useState<OnlineSeriesResponse | null>(null);

  const [tab, setTab] = useState<CourierStatusTab>("ALL");
  const [period, setPeriod] = useState<CourierMetricsPeriod>("today");
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
  async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const [realtimeResult, statusResult, timelineResult, seriesResult] =
        await Promise.allSettled([
          apiFetch("/couriers/metrics/realtime") as Promise<RealtimeResponse>,
          apiFetch(`/couriers/metrics/status-list?tab=${tab}&limit=100`) as Promise<StatusListResponse>,
          apiFetch(`/couriers/metrics/online-timeline?range=${period}&bucket=hour`) as Promise<TimelineResponse>,
          apiFetch(`/couriers/metrics/online-series?range=${period}`) as Promise<OnlineSeriesResponse>,
        ]);

      if (realtimeResult.status === "fulfilled") {
        setRealtime(realtimeResult.value);
      }

      if (statusResult.status === "fulfilled") {
        setStatusList(statusResult.value);
      }

      if (timelineResult.status === "fulfilled") {
        setTimeline(timelineResult.value);
      } else {
        setTimeline(null);
      }

      if (seriesResult.status === "fulfilled") {
        setSeries(seriesResult.value);
      } else {
        setSeries(null);
      }

      if (
        realtimeResult.status === "rejected" &&
        statusResult.status === "rejected"
      ) {
        setError("Не удалось загрузить основные метрики курьеров");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить метрики курьеров"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  [tab, period]
);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadData(true);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const items = statusList?.items ?? [];

    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const courierId = (getCourierId(item) ?? "").toLowerCase();
      return (
        item.fullName.toLowerCase().includes(q) ||
        String(item.courierNumber ?? "").includes(q) ||
        courierId.includes(q)
      );
    });
  }, [statusList, search]);

  const summary = realtime?.summary;

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 18,
            padding: 24,
            color: "#475569",
            fontWeight: 700,
          }}
        >
          Загружаем метрики курьеров...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 18,
            padding: 24,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            Нет доступа к метрикам
          </h3>
          <p style={{ marginTop: 8, color: "#64748B" }}>
            Проверьте admin-сессию и backend endpoint `/couriers/metrics/*`.
          </p>
          <button
            onClick={() => loadData(false)}
            style={{
              height: 40,
              padding: "0 16px",
              borderRadius: 10,
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              fontWeight: 700,
            }}
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
            padding: "0 24px 32px",
        background: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      <div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    alignItems: "center",
    marginBottom: 18,
  }}
>
  <button
    onClick={() => loadData(true)}
    style={{
      height: 40,
      padding: "0 14px",
      borderRadius: 10,
      border: "1px solid #E5E7EB",
      background: "#FFFFFF",
      color: "#0F172A",
      fontSize: 13,
      fontWeight: 750,
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    <RefreshCw
      size={16}
      style={{
        animation: refreshing ? "spin 1s linear infinite" : undefined,
      }}
    />
    Автообновление: 15 сек
  </button>

  <CourierMetricsPeriodSelect
    value={period}
    onChange={(value) => {
      setPeriod(value);
    }}
  />
</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <KpiCard title="На линии без заказа" value={summary?.onlineIdle ?? 0} hint="ONLINE_IDLE" tone="green" icon={<UserCheck size={22} />} />
        <KpiCard title="Заняты" value={summary?.busy ?? 0} hint="BUSY" tone="orange" icon={<Bike size={22} />} />
        <KpiCard title="Офлайн" value={summary?.offline ?? 0} hint="OFFLINE" tone="gray" icon={<UserX size={22} />} />
        <KpiCard title="Заблокированы" value={summary?.blocked ?? 0} hint="blockedAt" tone="red" icon={<Ban size={22} />} />
        <KpiCard title="Спящие 14+ дней" value={summary?.sleeping ?? 0} hint="lastActiveAt" tone="purple" icon={<Moon size={22} />} />
        <KpiCard title="Активные заказы" value={summary?.activeOrders ?? 0} hint="ACCEPTED / READY / ON_THE_WAY" tone="blue" icon={<ShoppingBag size={22} />} />
        <KpiCard title="Готовы без курьера" value={summary?.readyWithoutCourier ?? 0} hint="READY без courierId" tone="yellow" icon={<Clock size={22} />} />
        <KpiCard title="Заказы без курьера" value={summary?.unassignedOrders ?? 0} hint="активные без courierId" tone="yellow" icon={<PackageCheck size={22} />} />
        <KpiCard title="Доставлено сегодня" value={summary?.deliveredToday ?? 0} hint="DELIVERED сегодня" tone="green" icon={<CheckCircle2 size={22} />} />
        <KpiCard title="Заработок сегодня" value={formatMoney(summary?.netToday ?? 0)} hint="net courier earnings" tone="green" icon={<Wallet size={22} />} />
        <KpiCard title="Опоздания сегодня" value={summary?.lateDeliveriesToday ?? 0} hint="deliveredAt > promisedAt" tone="red" icon={<Clock size={22} />} />
        <KpiCard title="Вовремя доставлено" value={`${summary?.onTimeRateTodayPct ?? 0}%`} hint="on-time rate" tone="blue" icon={<Target size={22} />} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.25fr 1fr",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 18,
            padding: 18,
            boxShadow: "0 8px 22px rgba(15,23,42,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850 }}>
              Онлайн курьеры по времени
            </h3>
            <span style={{ color: "#64748B", fontSize: 13, fontWeight: 700 }}>
              Сегодня · по часам
            </span>
          </div>
          <LineChart points={timeline?.points ?? []} />
        </section>

        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 18,
            padding: 18,
            boxShadow: "0 8px 22px rgba(15,23,42,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850 }}>
              Активность курьеров
            </h3>
            <span style={{ color: "#64748B", fontSize: 13, fontWeight: 700 }}>
              7 дней
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 12,
              color: "#64748B",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <span>■ Были замечены</span>
            <span style={{ color: "#16A34A" }}>■ Были активны</span>
          </div>

          <BarChart points={series?.points ?? []} />
        </section>
      </div>

      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: 18,
          boxShadow: "0 8px 22px rgba(15,23,42,0.04)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TABS.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                style={{
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: 0,
                  background: tab === item.key ? "#EEF2FF" : "transparent",
                  color: tab === item.key ? "#4F46E5" : "#475569",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                height: 38,
                width: 240,
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 12px",
              }}
            >
              <Search size={16} color="#94A3B8" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск курьера..."
                style={{
                  border: 0,
                  outline: "none",
                  flex: 1,
                  fontSize: 13,
                  color: "#0F172A",
                }}
              />
            </div>

            <button
              style={{
                height: 38,
                padding: "0 13px",
                borderRadius: 10,
                border: "1px solid #E5E7EB",
                background: "#FFFFFF",
                fontWeight: 750,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Filter size={16} />
              Фильтры
            </button>

            <CourierMetricsExportButton
              tab={tab}
              range={period}
              search={search}
              disabled={refreshing}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {[
                  "Курьер",
                  "Статус",
                  "Активные заказы",
                  "Доставил сегодня",
                  "Заработал сегодня",
                  "Без заказа",
                  "Последняя активность",
                  "Действия",
                ].map((head) => (
                  <th
                    key={head}
                    style={{
                      padding: "13px 18px",
                      textAlign: "left",
                      color: "#475569",
                      fontSize: 12,
                      fontWeight: 850,
                      textTransform: "uppercase",
                      borderBottom: "1px solid #E5E7EB",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item) => {
                const courierId = getCourierId(item);
                const status = getStatusStyle(item);

                return (
                  <tr key={courierId ?? `${item.fullName}-${item.courierNumber ?? "unknown"}`}>
                    <td
                      style={{
                        padding: "15px 18px",
                        borderBottom: "1px solid #F1F5F9",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: "#6366F1",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 850,
                          }}
                        >
                          {(item.firstName?.[0] ?? "К").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 850, color: "#0F172A" }}>
                            {item.fullName || "Без имени"}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 650 }}>
                            #{item.courierNumber ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9" }}>
                      <span
                        style={{
                          color: status.color,
                          background: status.background,
                          borderRadius: 999,
                          padding: "5px 10px",
                          fontSize: 12,
                          fontWeight: 850,
                        }}
                      >
                        {getCourierStatus(item)}
                      </span>
                    </td>

                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 800 }}>
                      {item.activeOrdersCount}
                    </td>

                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 800 }}>
                      {item.todayDelivered}
                    </td>

                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 850 }}>
                      {formatMoney(item.todayNet)}
                    </td>

                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", color: "#475569", fontWeight: 700 }}>
                      {formatIdle(item.currentIdleMinutes)}
                    </td>

                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9" }}>
                      <div style={{ color: "#0F172A", fontWeight: 800 }}>
                        {formatRelative(item.lastActiveAt)}
                      </div>
                      <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 650 }}>
                        {formatDateTime(item.lastActiveAt)}
                      </div>
                    </td>

                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link
                          href={courierId ? `/layout-20/couriers/${courierId}` : "#"}
                          style={{
                            height: 34,
                            padding: "0 12px",
                            borderRadius: 9,
                            border: "1px solid #C4B5FD",
                            color: "#4F46E5",
                            display: "inline-flex",
                            alignItems: "center",
                            textDecoration: "none",
                            fontSize: 13,
                            fontWeight: 850,
                          }}
                        >
                          Открыть
                        </Link>

                        <button
                          onClick={() => {
                            if (!courierId) return;
                            setSelectedCourierId(courierId);
                          }}
                          style={{
                            height: 34,
                            padding: "0 12px",
                            borderRadius: 9,
                            border: "1px solid #E5E7EB",
                            background: "#FFFFFF",
                            color: "#0F172A",
                            fontSize: 13,
                            fontWeight: 850,
                          }}
                        >
                          Аналитика
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: "#64748B",
                      fontWeight: 700,
                    }}
                  >
                    Курьеры не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            color: "#64748B",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <span>
            Показано {filteredItems.length} из {statusList?.total ?? 0} курьеров
          </span>
          <span>
            Часовой пояс: {realtime?.timezone ?? "Asia/Almaty"} · Обновлено:{" "}
            {formatDateTime(realtime?.generatedAt)}
          </span>
        </div>
      </section>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <CourierMetricsCourierDrawer
        open={Boolean(selectedCourierId)}
        courierUserId={selectedCourierId}
        period={period}
        onClose={() => setSelectedCourierId(null)}
      />
    </div>
  );
}
