"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Bike,
  CheckCircle2,
  Clock,
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
  courierUserId: string;
  courierNumber: number | null;
  firstName: string;
  lastName: string;
  fullName: string;
  isOnline: boolean;
  reportedOnline: boolean;
  locationFresh: boolean;
  locationAgeSec: number | null;
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
    staleOnline: number;
    busyWithoutFreshLocation: number;
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
  points: Array<{ bucketStart: string; online: number }>;
  generatedAt: string;
};

type OnlineSeriesResponse = {
  range: CourierMetricsPeriod;
  period: {
    from: string;
    to: string;
    timezone: string;
  };
  points: Array<{
    bucketStart: string;
    wentOnlineUnique: number;
    deliveredUnique: number;
  }>;
  generatedAt: string;
};

const TABS: Array<{ key: CourierStatusTab; label: string }> = [
  { key: "ALL", label: "Все" },
  { key: "ONLINE_IDLE", label: "На линии без заказа" },
  { key: "BUSY", label: "С заказом" },
  { key: "OFFLINE", label: "Офлайн" },
  { key: "BLOCKED", label: "Заблокированы" },
  { key: "SLEEPING", label: "Не работали 14+ дней" },
];

const statusLabel: Record<CourierOperationalStatus, string> = {
  ONLINE_IDLE: "На линии",
  BUSY: "Выполняет заказ",
  OFFLINE: "Офлайн",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value || 0) + " ₸";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelative(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";

  const min = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин. назад`;

  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч. ${min % 60} мин. назад`;
  return `${Math.floor(hours / 24)} дн. назад`;
}

function formatIdle(minutes: number | null) {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${minutes} мин.`;
  return `${Math.floor(minutes / 60)} ч. ${minutes % 60} мин.`;
}

function getCourierStatus(item: CourierRealtimeItem) {
  if (item.blocked) return "Заблокирован";
  if (item.inactive) return "Отключён";
  if (item.sleeping && item.operationalStatus === "OFFLINE") return "Давно не работал";
  return statusLabel[item.operationalStatus];
}

function getStatusStyle(item: CourierRealtimeItem) {
  if (item.blocked || item.inactive) {
    return { color: "#DC2626", background: "#FEE2E2" };
  }
  if (item.sleeping && item.operationalStatus === "OFFLINE") {
    return { color: "#7C3AED", background: "#EDE9FE" };
  }
  if (item.operationalStatus === "BUSY") {
    return { color: "#EA580C", background: "#FFEDD5" };
  }
  if (item.operationalStatus === "ONLINE_IDLE") {
    return { color: "#16A34A", background: "#DCFCE7" };
  }
  return { color: "#475569", background: "#E2E8F0" };
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
    <div style={{ background: "#FFF", border: "1px solid #E5E7EB", borderRadius: 16, padding: 18, minHeight: 112, boxShadow: "0 8px 22px rgba(15,23,42,.04)", display: "flex", justifyContent: "space-between", gap: 14 }}>
      <div>
        <div style={{ color: "#475569", fontSize: 13, fontWeight: 700, lineHeight: "18px", marginBottom: 8 }}>{title}</div>
        <div style={{ color: "#0F172A", fontSize: 28, fontWeight: 850, lineHeight: "32px", letterSpacing: "-.03em" }}>{value}</div>
        <div style={{ color: "#64748B", fontSize: 12, fontWeight: 600, marginTop: 7 }}>{hint}</div>
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: palette.bg, color: palette.text, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
    </div>
  );
}

function LineChart({ points }: { points: Array<{ bucketStart: string; online: number }> }) {
  const width = 680;
  const height = 230;
  const padding = 28;
  const max = Math.max(1, ...points.map((p) => p.online));
  const coords = points.map((p, i) => ({
    x: padding + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (width - padding * 2)),
    y: height - padding - (p.online / max) * (height - padding * 2),
  }));
  const path = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
      {[0, 1, 2, 3].map((i) => {
        const y = padding + i * ((height - padding * 2) / 3);
        return <line key={i} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#E5E7EB" strokeDasharray="4 4" />;
      })}
      {points.length > 0 ? <path d={path} fill="none" stroke="#16A34A" strokeWidth="4" /> : null}
      {coords.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#16A34A" />)}
    </svg>
  );
}

function BarChart({ points }: { points: Array<{ bucketStart: string; wentOnlineUnique: number; deliveredUnique: number }> }) {
  const width = 560;
  const height = 230;
  const padding = 30;
  const max = Math.max(1, ...points.flatMap((p) => [p.wentOnlineUnique, p.deliveredUnique]));
  const barGroupWidth = (width - padding * 2) / Math.max(points.length, 1);
  const barWidth = Math.min(18, barGroupWidth / 4);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
      {[0, 1, 2, 3].map((i) => {
        const y = padding + i * ((height - padding * 2) / 3);
        return <line key={i} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#E5E7EB" strokeDasharray="4 4" />;
      })}
      {points.map((p, i) => {
        const x = padding + i * barGroupWidth + barGroupWidth / 2;
        const onlineH = (p.wentOnlineUnique / max) * (height - padding * 2);
        const deliveredH = (p.deliveredUnique / max) * (height - padding * 2);
        return (
          <g key={p.bucketStart}>
            <rect x={x - barWidth - 3} y={height - padding - onlineH} width={barWidth} height={onlineH} rx={5} fill="#2563EB" />
            <rect x={x + 3} y={height - padding - deliveredH} width={barWidth} height={deliveredH} rx={5} fill="#16A34A" />
            <text x={x} y={height - 7} fill="#94A3B8" fontSize="11" textAnchor="middle">
              {new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(new Date(p.bucketStart))}
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
  const requestSeqRef = useRef(0);

  const loadData = useCallback(async (silent = false) => {
    const requestSeq = ++requestSeqRef.current;
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setError(null);

      const bucket = period === "today" ? "hour" : "day";
      const [realtimeResult, statusResult, timelineResult, seriesResult] = await Promise.allSettled([
        apiFetch("/couriers/metrics/realtime") as Promise<RealtimeResponse>,
        apiFetch(`/couriers/metrics/status-list?tab=${tab}&limit=100`) as Promise<StatusListResponse>,
        apiFetch(`/couriers/metrics/online-timeline?range=${period}&bucket=${bucket}`) as Promise<TimelineResponse>,
        apiFetch(`/couriers/metrics/online-series?range=${period}`) as Promise<OnlineSeriesResponse>,
      ]);

      if (requestSeq !== requestSeqRef.current) return;

      if (realtimeResult.status === "fulfilled") setRealtime(realtimeResult.value);
      if (statusResult.status === "fulfilled") setStatusList(statusResult.value);
      if (timelineResult.status === "fulfilled") setTimeline(timelineResult.value);
      else setTimeline(null);
      if (seriesResult.status === "fulfilled") setSeries(seriesResult.value);
      else setSeries(null);

      if (realtimeResult.status === "rejected" && statusResult.status === "rejected") {
        setError("Не удалось загрузить основные показатели курьеров");
      }
    } catch (err) {
      if (requestSeq !== requestSeqRef.current) return;
      setError(err instanceof Error ? err.message : "Не удалось загрузить аналитику курьеров");
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [tab, period]);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadData(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const items = statusList?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.fullName, item.firstName, item.lastName, String(item.courierNumber ?? "")]
        .some((value) => value.toLowerCase().includes(q)),
    );
  }, [statusList, search]);

  const summary = realtime?.summary;

  if (loading) {
    return <div style={{ padding: 24 }}><div style={{ background: "#FFF", border: "1px solid #E5E7EB", borderRadius: 18, padding: 24, color: "#475569", fontWeight: 700 }}>Загружаем аналитику курьеров...</div></div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: "#FFF", border: "1px solid #E5E7EB", borderRadius: 18, padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Не удалось загрузить аналитику</h3>
          <p style={{ marginTop: 8, color: "#64748B" }}>Проверьте права администратора и доступность сервера.</p>
          <button onClick={() => void loadData(false)} style={{ height: 40, padding: "0 16px", borderRadius: 10, border: "1px solid #CBD5E1", background: "#FFF", fontWeight: 700 }}>Повторить</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 24px 32px", background: "#F8FAFC", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center", marginBottom: 18 }}>
        <button onClick={() => void loadData(true)} disabled={refreshing} style={{ height: 40, padding: "0 14px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#FFF", color: "#0F172A", fontSize: 13, fontWeight: 750, display: "flex", alignItems: "center", gap: 8 }}>
          <RefreshCw size={16} style={{ animation: refreshing ? "spin 1s linear infinite" : undefined }} />
          Обновить
        </button>
        <CourierMetricsPeriodSelect value={period} onChange={setPeriod} />
      </div>

      {(summary?.busyWithoutFreshLocation ?? 0) > 0 ? (
        <div style={{ marginBottom: 12, display: "flex", gap: 10, alignItems: "flex-start", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", borderRadius: 14, padding: "12px 14px", fontSize: 13, fontWeight: 700 }}>
          <AlertTriangle size={18} />
          У {summary?.busyWithoutFreshLocation} курьер(ов) есть активный заказ, но нет свежего GPS. Проверьте их на карте.
        </div>
      ) : null}

      {(summary?.staleOnline ?? 0) > 0 ? (
        <div style={{ marginBottom: 18, display: "flex", gap: 10, alignItems: "flex-start", border: "1px solid #FCD34D", background: "#FFFBEB", color: "#92400E", borderRadius: 14, padding: "12px 14px", fontSize: 13, fontWeight: 700 }}>
          <AlertTriangle size={18} />
          У {summary?.staleOnline} курьер(ов) включён статус «на линии», но актуальный GPS не подтверждён. Они не считаются свободными онлайн.
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
        <KpiCard title="Свободны на линии" value={summary?.onlineIdle ?? 0} hint="свежий GPS, без заказа" tone="green" icon={<UserCheck size={22} />} />
        <KpiCard title="С заказом" value={summary?.busy ?? 0} hint="есть активная доставка" tone="orange" icon={<Bike size={22} />} />
        <KpiCard title="Офлайн" value={summary?.offline ?? 0} hint="не подтверждены на линии" tone="gray" icon={<UserX size={22} />} />
        <KpiCard title="Заблокированы" value={summary?.blocked ?? 0} hint="недоступны для работы" tone="red" icon={<Ban size={22} />} />
        <KpiCard title="Не работали 14+ дней" value={summary?.sleeping ?? 0} hint="по последней активности" tone="purple" icon={<Moon size={22} />} />
        <KpiCard title="Активные заказы" value={summary?.activeOrders ?? 0} hint="в работе у курьеров" tone="blue" icon={<ShoppingBag size={22} />} />
        <KpiCard title="Готовы без курьера" value={summary?.readyWithoutCourier ?? 0} hint="готовы к выдаче, но не назначены" tone="yellow" icon={<Clock size={22} />} />
        <KpiCard title="Заказы без курьера" value={summary?.unassignedOrders ?? 0} hint="активные доставки без назначения" tone="yellow" icon={<PackageCheck size={22} />} />
        <KpiCard title="Доставлено сегодня" value={summary?.deliveredToday ?? 0} hint="завершённые доставки" tone="green" icon={<CheckCircle2 size={22} />} />
        <KpiCard title="Заработок сегодня" value={formatMoney(summary?.netToday ?? 0)} hint="расчёт финансов не изменялся" tone="green" icon={<Wallet size={22} />} />
        <KpiCard title="Опоздания сегодня" value={summary?.lateDeliveriesToday ?? 0} hint="позже обещанного времени" tone="red" icon={<Clock size={22} />} />
        <KpiCard title="Доставлено вовремя" value={`${summary?.onTimeRateTodayPct ?? 0}%`} hint="по завершённым доставкам" tone="blue" icon={<Target size={22} />} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 16, marginBottom: 18 }}>
        <section style={{ background: "#FFF", border: "1px solid #E5E7EB", borderRadius: 18, padding: 18, boxShadow: "0 8px 22px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850 }}>Курьеры со включённой линией</h3>
            <span style={{ color: "#64748B", fontSize: 13, fontWeight: 700 }}>{period === "today" ? "по часам" : "по дням"}</span>
          </div>
          <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: 12 }}>История строится по фактическим переключениям статуса, а не по текущему профилю.</p>
          <LineChart points={timeline?.points ?? []} />
        </section>

        <section style={{ background: "#FFF", border: "1px solid #E5E7EB", borderRadius: 18, padding: 18, boxShadow: "0 8px 22px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850 }}>Фактическая активность</h3>
            <span style={{ color: "#64748B", fontSize: 13, fontWeight: 700 }}>за выбранный период</span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, color: "#64748B", fontSize: 12, fontWeight: 700 }}>
            <span style={{ color: "#2563EB" }}>■ Выходили на линию</span>
            <span style={{ color: "#16A34A" }}>■ Выполняли доставку</span>
          </div>
          <BarChart points={series?.points ?? []} />
        </section>
      </div>

      <section style={{ background: "#FFF", border: "1px solid #E5E7EB", borderRadius: 18, boxShadow: "0 8px 22px rgba(15,23,42,.04)", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TABS.map((item) => (
              <button key={item.key} onClick={() => setTab(item.key)} style={{ height: 36, padding: "0 12px", borderRadius: 10, border: 0, background: tab === item.key ? "#EEF2FF" : "transparent", color: tab === item.key ? "#4F46E5" : "#475569", fontSize: 13, fontWeight: 800 }}>{item.label}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ height: 38, width: 260, border: "1px solid #E5E7EB", borderRadius: 10, display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
              <Search size={16} color="#94A3B8" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Имя или номер курьера" style={{ border: 0, outline: "none", flex: 1, fontSize: 13, color: "#0F172A" }} />
            </div>
            <CourierMetricsExportButton tab={tab} range={period} search={search} disabled={refreshing} />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Курьер", "Статус", "GPS", "Активные заказы", "Доставил сегодня", "Заработал сегодня", "Без заказа", "Последняя активность", "Действия"].map((head) => (
                  <th key={head} style={{ padding: "13px 18px", textAlign: "left", color: "#475569", fontSize: 12, fontWeight: 850, textTransform: "uppercase", borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap" }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const courierId = item.courierUserId;
                const status = getStatusStyle(item);
                return (
                  <tr key={courierId}>
                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#6366F1", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 850 }}>{(item.firstName?.[0] ?? "К").toUpperCase()}</div>
                        <div><div style={{ fontWeight: 850, color: "#0F172A" }}>{item.fullName || "Без имени"}</div><div style={{ fontSize: 12, color: "#64748B", fontWeight: 650 }}>№{item.courierNumber ?? "—"}</div></div>
                      </div>
                    </td>
                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9" }}><span style={{ color: status.color, background: status.background, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 850 }}>{getCourierStatus(item)}</span></td>
                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9" }}>
                      <div style={{ color: item.locationFresh ? "#16A34A" : item.reportedOnline ? "#DC2626" : "#64748B", fontWeight: 800 }}>{item.locationFresh ? "Актуален" : item.reportedOnline ? "Нет свежего сигнала" : "—"}</div>
                      <div style={{ color: "#94A3B8", fontSize: 12 }}>{formatRelative(item.lastSeenAt)}</div>
                    </td>
                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 800 }}>{item.activeOrdersCount}</td>
                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 800 }}>{item.todayDelivered}</td>
                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 850 }}>{formatMoney(item.todayNet)}</td>
                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", color: "#475569", fontWeight: 700 }}>{formatIdle(item.currentIdleMinutes)}</td>
                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9" }}><div style={{ color: "#0F172A", fontWeight: 800 }}>{formatRelative(item.lastActiveAt)}</div><div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 650 }}>{formatDateTime(item.lastActiveAt)}</div></td>
                    <td style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link href={`/layout-20/couriers/${courierId}`} style={{ height: 34, padding: "0 12px", borderRadius: 9, border: "1px solid #C4B5FD", color: "#4F46E5", display: "inline-flex", alignItems: "center", textDecoration: "none", fontSize: 13, fontWeight: 850 }}>Открыть</Link>
                        <button onClick={() => setSelectedCourierId(courierId)} style={{ height: 34, padding: "0 12px", borderRadius: 9, border: "1px solid #E5E7EB", background: "#FFF", color: "#0F172A", fontSize: 13, fontWeight: 850 }}>Аналитика</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 ? <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "#64748B", fontWeight: 700 }}>Курьеры не найдены</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: 13, fontWeight: 700 }}>
          <span>Показано {filteredItems.length} из {statusList?.total ?? 0} курьеров</span>
          <span>Часовой пояс: {realtime?.timezone ?? "Asia/Almaty"} · Обновлено: {formatDateTime(realtime?.generatedAt)}</span>
        </div>
      </section>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <CourierMetricsCourierDrawer open={Boolean(selectedCourierId)} courierUserId={selectedCourierId} period={period} onClose={() => setSelectedCourierId(null)} />
    </div>
  );
}
