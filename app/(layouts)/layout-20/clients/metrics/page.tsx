"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ClientMetricsHeader } from "@/components/ui/widgets/client-metrics/ClientMetricsHeader";
import { ClientMetricsKpiCards } from "@/components/ui/widgets/client-metrics/ClientMetricsKpiCards";
import { ClientMetricsCharts } from "@/components/ui/widgets/client-metrics/ClientMetricsCharts";
import { ClientMetricsAnalytics } from "@/components/ui/widgets/client-metrics/ClientMetricsAnalytics";
import { ClientMetricsRetention } from "@/components/ui/widgets/client-metrics/ClientMetricsRetention";
import { ClientMetricsTable } from "@/components/ui/widgets/client-metrics/ClientMetricsTable";
import type {
  ClientActivityPoint,
  ClientDevicePlatform,
  ClientEventStat,
  ClientLanguageStat,
  ClientMetricKpi,
  ClientMetricsPeriod,
  ClientMetricsSummary,
  ClientMetricsTableItem,
  ClientRetentionItem,
} from "@/components/ui/widgets/client-metrics/types";

type RealtimeResponse = {
  summary: ClientMetricsSummary;
};

type ActivityResponse = {
  points?: ClientActivityPoint[];
};

type DevicesResponse = {
  platforms?: ClientDevicePlatform[];
};

type LanguagesResponse = {
  languages?: ClientLanguageStat[];
};

type EventsResponse = {
  topEvents?: ClientEventStat[];
};

type RetentionResponse = {
  cohorts?: Array<{
    d1?: number;
    d7?: number;
    d30?: number;
  }>;
};

type ListResponse = {
  items?: ClientMetricsTableItem[];
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
};

const EMPTY_SUMMARY: ClientMetricsSummary = {
  totalClients: 0,
  activeToday: 0,
  newThisWeek: 0,
  totalOrders: 0,
  avgOrdersPerClient: 0,
  totalRevenue: 0,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(Number(value) || 0);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(Number(value) || 0)} ₸`;
}

export default function ClientMetricsPage() {
  const [period, setPeriod] = useState<ClientMetricsPeriod>("7d");
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [summary, setSummary] = useState<ClientMetricsSummary>(EMPTY_SUMMARY);
  const [activity, setActivity] = useState<ClientActivityPoint[]>([]);
  const [devices, setDevices] = useState<ClientDevicePlatform[]>([]);
  const [languages, setLanguages] = useState<ClientLanguageStat[]>([]);
  const [events, setEvents] = useState<ClientEventStat[]>([]);
  const [retention, setRetention] = useState<ClientRetentionItem[]>([]);
  const [clients, setClients] = useState<ClientMetricsTableItem[]>([]);
  const [totalClients, setTotalClients] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [
        realtimeResult,
        activityResult,
        devicesResult,
        languagesResult,
        eventsResult,
        retentionResult,
        listResult,
      ] = await Promise.allSettled([
        apiFetch<RealtimeResponse>("/client-metrics/realtime"),
        apiFetch<ActivityResponse>(`/client-metrics/activity?range=${period}`),
        apiFetch<DevicesResponse>("/client-metrics/devices"),
        apiFetch<LanguagesResponse>("/client-metrics/languages"),
        apiFetch<EventsResponse>(`/client-metrics/events?range=${period}`),
        apiFetch<RetentionResponse>("/client-metrics/retention"),
        apiFetch<ListResponse>(
          `/client-metrics/list?page=1&limit=25&q=${encodeURIComponent(q)}`,
        ),
      ]);

      if (realtimeResult.status === "fulfilled") {
        setSummary(realtimeResult.value.summary ?? EMPTY_SUMMARY);
      }

      if (activityResult.status === "fulfilled") {
        setActivity(activityResult.value.points ?? []);
      }

      if (devicesResult.status === "fulfilled") {
        setDevices(devicesResult.value.platforms ?? []);
      }

      if (languagesResult.status === "fulfilled") {
        setLanguages(languagesResult.value.languages ?? []);
      }

      if (eventsResult.status === "fulfilled") {
        setEvents(eventsResult.value.topEvents ?? []);
      }

      if (retentionResult.status === "fulfilled") {
        const first = retentionResult.value.cohorts?.[0];

        setRetention([
          { label: "День 1", value: first?.d1 ?? 0 },
          { label: "День 7", value: first?.d7 ?? 0 },
          { label: "День 30", value: first?.d30 ?? 0 },
        ]);
      }

      if (listResult.status === "fulfilled") {
        setClients(listResult.value.items ?? []);
        setTotalClients(listResult.value.meta?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [period, q]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function exportClients() {
    const response = await fetch(
      `/api/proxy/client-metrics/export?q=${encodeURIComponent(q)}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.error("Client metrics export failed", response.status);
      return;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = `client-metrics-${Date.now()}.xlsx`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(objectUrl);
  }

  const kpis = useMemo<ClientMetricKpi[]>(
    () => [
      {
        key: "totalClients",
        title: "Всего клиентов",
        value: formatNumber(summary.totalClients),
        subtitle: "клиентов в базе",
        trend: { value: "реальные данные", direction: "neutral" },
      },
      {
        key: "activeToday",
        title: "Активные сегодня",
        value: formatNumber(summary.activeToday),
        subtitle: "открывали приложение",
        trend: { value: "по lastActiveAt", direction: "neutral" },
      },
      {
        key: "newThisWeek",
        title: "Новые за неделю",
        value: formatNumber(summary.newThisWeek),
        subtitle: "новые регистрации",
        trend: { value: "за последние 7 дней", direction: "neutral" },
      },
      {
        key: "totalOrders",
        title: "Всего заказов",
        value: formatNumber(summary.totalOrders),
        subtitle: "за всё время",
        trend: { value: "из базы заказов", direction: "neutral" },
      },
      {
        key: "avgOrdersPerClient",
        title: "Ср. заказов",
        value: formatDecimal(summary.avgOrdersPerClient),
        subtitle: "на одного клиента",
        trend: { value: "расчёт backend", direction: "neutral" },
      },
      {
        key: "totalRevenue",
        title: "Сумма заказов",
        value: formatMoney(summary.totalRevenue),
        subtitle: "DELIVERED заказы",
        trend: { value: "оборот клиентов", direction: "neutral" },
      },
    ],
    [summary],
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F1F5F9",
        padding: 24,
      }}
    >
      <ClientMetricsHeader
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={loadData}
        loading={loading}
      />

      <ClientMetricsKpiCards items={kpis} />

      <ClientMetricsCharts activity={activity} devices={devices} />

      <ClientMetricsAnalytics
        languages={languages}
        events={events}
        averages={{
          avgOrdersPerClient: summary.avgOrdersPerClient,
          avgCheck:
            summary.totalOrders > 0
              ? summary.totalRevenue / summary.totalOrders
              : 0,
          totalRevenue: summary.totalRevenue,
        }}
      />

      <ClientMetricsRetention items={retention} />

      <ClientMetricsTable
        items={clients}
        total={totalClients}
        page={1}
        limit={25}
        q={q}
        onSearch={setQ}
        onExport={exportClients}
      />
    </main>
  );
}