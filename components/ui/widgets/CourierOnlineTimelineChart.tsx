"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";

// ApexCharts нельзя SSR, поэтому dynamic
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type Point = {
  ts: string;
  online: number;
};

type ApiResp = {
  period: {
    from: string;
    to: string;
  };
  bucket: "hour" | "day";
  points: Point[];
  generatedAt: string;
};

type CourierOnlineTimelineChartProps = {
  bucket?: "hour" | "day";
  daysBack?: number;
  refreshMs?: number;
  title?: string;
};

function toShortLabel(tsIso: string, bucket: "hour" | "day") {
  const date = new Date(tsIso);

  if (bucket === "day") {
    return date.toLocaleDateString("ru-RU");
  }

  return date.toLocaleString("ru-RU", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function CourierOnlineTimelineChart(props: CourierOnlineTimelineChartProps) {
  const bucket = props.bucket ?? "hour";
  const daysBack = props.daysBack ?? 7;
  const refreshMs = props.refreshMs ?? 30_000;
  const title = props.title ?? "Онлайн курьеры по времени";

  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const to = new Date();
    const from = new Date(to.getTime() - daysBack * 86_400_000);

    const query = new URLSearchParams();
    query.set("bucket", bucket);
    query.set("from", from.toISOString());
    query.set("to", to.toISOString());

    const response = (await apiFetch(
      `/couriers/metrics/online-timeline?${query.toString()}`,
    )) as ApiResp;

    setData(response);
  }

  useEffect(() => {
    let alive = true;

    async function runInitialLoad() {
      try {
        setLoading(true);
        setErr(null);
        await load();
      } catch (error) {
        if (alive) {
          setErr(getErrorMessage(error, "Ошибка загрузки графика"));
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void runInitialLoad();

    const timerId = window.setInterval(() => {
      void load().catch(() => {
        // Автообновление не должно ломать страницу.
      });
    }, refreshMs);

    return () => {
      alive = false;
      window.clearInterval(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, daysBack, refreshMs]);

  const series = useMemo(() => {
    const points = data?.points ?? [];

    return [
      {
        name: "Онлайн",
        data: points.map((point) => [
          new Date(point.ts).getTime(),
          point.online,
        ]) as Array<[number, number]>,
      },
    ];
  }, [data]);

  const categories = useMemo(() => {
    const points = data?.points ?? [];

    return points.map((point) => toShortLabel(point.ts, bucket));
  }, [data, bucket]);

  const maxY = useMemo(() => {
    const points = data?.points ?? [];
    let max = 0;

    for (const point of points) {
      if (point.online > max) {
        max = point.online;
      }
    }

    return Math.max(max, 5);
  }, [data]);

  const options = useMemo(() => {
    return {
      chart: {
        type: "area",
        height: 260,
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth",
        width: 2,
      },
      fill: {
        type: "gradient",
        gradient: {
          opacityFrom: 0.25,
          opacityTo: 0.02,
        },
      },
      grid: {
        strokeDashArray: 4,
        padding: {
          left: 8,
          right: 8,
          top: 8,
          bottom: 0,
        },
      },
      xaxis: {
        type: "datetime",
        labels: {
          show: true,
        },
        tooltip: {
          enabled: false,
        },
      },
      yaxis: {
        min: 0,
        max: maxY,
        tickAmount: 4,
        labels: {
          formatter: (value: number) => `${Math.round(value)}`,
        },
      },
      tooltip: {
        x: {
          format: bucket === "day" ? "dd.MM.yyyy" : "dd.MM.yyyy HH:mm",
        },
      },
      markers: {
        size: 0,
      },
    } as const;
  }, [bucket, maxY]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <div className="text-base font-semibold text-slate-900">{title}</div>

          <div className="mt-1 text-sm text-slate-500">
            {data ? (
              <>
                Период:{" "}
                <b className="text-slate-900">
                  {new Date(data.period.from).toLocaleDateString("ru-RU")} —{" "}
                  {new Date(data.period.to).toLocaleDateString("ru-RU")}
                </b>
                {" · "}
                Bucket: <b className="text-slate-900">{data.bucket}</b>
              </>
            ) : (
              "—"
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500">
          {data?.generatedAt
            ? `обновлено: ${new Date(data.generatedAt).toLocaleTimeString(
                "ru-RU",
              )}`
            : ""}
        </div>
      </div>

      <div className="px-5 pb-5">
        {err ? (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {err}
          </div>
        ) : null}

        {loading ? <div className="text-sm text-slate-500">Загрузка…</div> : null}

        {!loading && (data?.points?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Нет данных для графика
          </div>
        ) : null}

        {!loading && (data?.points?.length ?? 0) > 0 ? (
          <ReactApexChart
            options={options as any}
            series={series as any}
            type="area"
            height={260}
          />
        ) : null}

        <div className="mt-2 hidden text-xs text-slate-400">
          {categories.slice(-8).join(" · ")}
        </div>
      </div>
    </div>
  );
}