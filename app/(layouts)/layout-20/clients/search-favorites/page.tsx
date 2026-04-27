'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock3,
  Download,
  Heart,
  MousePointerClick,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import type {
  AnalyticsRange,
  MetricWithComparison,
  SearchFavoritesAnalyticsResponse,
} from '@/components/ui/widgets/search-favorites/search-favorites.types';

const RANGES: Array<{ value: AnalyticsRange; label: string }> = [
  { value: 'today', label: 'Сегодня' },
  { value: '7d', label: '7 дней' },
  { value: '14d', label: '14 дней' },
  { value: '30d', label: '30 дней' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
];

const MAIN_TABS = ['Обзор', 'Активность', 'Конверсии'] as const;
const SUB_TABS = ['Поиск', 'Клики', 'Избранное'] as const;

type MainTab = (typeof MAIN_TABS)[number];
type SubTab = (typeof SUB_TABS)[number];

const COLORS = ['#5B4BFF', '#22C55E', '#F97316', '#EC4899', '#8B5CF6'];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function n(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('ru-RU').format(value);
}

function metric(metric?: MetricWithComparison, suffix = '') {
  if (!metric) return '—';
  return `${n(metric.value)}${suffix}`;
}

function trend(metric?: MetricWithComparison) {
  if (!metric) return '0%';
  const sign = metric.changePercent > 0 ? '+' : '';
  return `${sign}${metric.changePercent}%`;
}

function trendClass(metric?: MetricWithComparison) {
  if (!metric) return 'bg-slate-100 text-slate-500';
  if (metric.trend === 'up') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (metric.trend === 'down') return 'bg-rose-50 text-rose-700 ring-rose-200';
  return 'bg-slate-100 text-slate-500 ring-slate-200';
}

function dateShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function dateFull(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[22px] border border-slate-300 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] ring-1 ring-white/70',
        className,
      )}
    >
      {children}
    </div>
  );
}

function KpiCard({
  title,
  metricValue,
  value,
  suffix = '',
  caption,
  icon,
  color,
}: {
  title: string;
  metricValue?: MetricWithComparison;
  value?: string | number | null;
  suffix?: string;
  caption?: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <Card className="group min-h-[168px] overflow-hidden p-5 transition duration-200 hover:-translate-y-1 hover:border-slate-400 hover:shadow-[0_22px_50px_rgba(15,23,42,0.14)]">
      <div className="flex items-start justify-between gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-black/5"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {icon}
        </div>

        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-black ring-1',
            trendClass(metricValue),
          )}
        >
          {trend(metricValue)}
        </span>
      </div>

      <div className="mt-5 text-[15px] font-extrabold leading-snug text-slate-700">
        {title}
      </div>

      <div className="mt-2 text-[34px] font-black leading-none tracking-[-0.04em] text-slate-950">
        {metricValue ? metric(metricValue, suffix) : `${value ?? '—'}${suffix}`}
      </div>

      {caption ? (
        <div className="mt-2 text-[13px] font-semibold text-slate-500">{caption}</div>
      ) : null}

      <div
        className="mt-5 h-1.5 rounded-full opacity-80 transition group-hover:opacity-100"
        style={{ backgroundColor: color }}
      />
    </Card>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <div className="h-8 w-1.5 rounded-full bg-[#5B4BFF]" />
      <div>
        <div className="text-[18px] font-black uppercase tracking-[0.04em] text-slate-950">
          {title}
        </div>
        <div className="mt-0.5 text-sm font-semibold text-slate-500">
          Ключевые показатели выбранного периода
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <h3 className="text-[21px] font-black tracking-[-0.02em] text-slate-950">
          {title}
        </h3>
      </div>
      <div className="h-[360px] p-5">{children}</div>
    </Card>
  );
}

function TableCard<T>({
  title,
  items,
  columns,
}: {
  title: string;
  items: T[];
  columns: Array<{ title: string; render: (item: T) => ReactNode }>;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <h3 className="text-[20px] font-black tracking-[-0.02em] text-slate-950">
          {title}
        </h3>
      </div>

      {items.length === 0 ? (
        <div className="p-6">
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 text-center text-sm font-bold text-slate-500">
            Нет данных
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                {columns.map((column) => (
                  <th key={column.title} className="px-6 py-4 font-black">
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 8).map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-slate-200 bg-white transition hover:bg-indigo-50/45"
                >
                  {columns.map((column) => (
                    <td key={column.title} className="px-6 py-4 font-semibold text-slate-700">
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
      <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
        {typeof label === 'string' ? dateFull(label) : label}
      </div>
      <div className="space-y-2">
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex min-w-[170px] justify-between gap-5 text-sm">
            <span className="font-semibold text-slate-600">{item.name}</span>
            <span className="font-black text-slate-950">{n(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 px-7 py-6">
      <div className="space-y-6">
        <Skeleton className="h-[190px] rounded-[24px]" />
        <div className="grid gap-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[170px] rounded-[22px]" />
          ))}
        </div>
        <Skeleton className="h-[430px] rounded-[22px]" />
      </div>
    </main>
  );
}

export default function SearchFavoritesPage() {
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [mainTab, setMainTab] = useState<MainTab>('Обзор');
  const [subTab, setSubTab] = useState<SubTab>('Поиск');
  const [data, setData] = useState<SearchFavoritesAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<SearchFavoritesAnalyticsResponse>(
        `/users/analytics/search-favorites?range=${range}`,
      );
      setData(response);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить аналитику');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodText = useMemo(() => {
    if (!data) return '';
    return `${dateShort(data.period.from)} — ${dateShort(data.period.to)}`;
  }, [data]);

  if (loading && !data) return <LoadingScreen />;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 px-7 py-6">
      <div className="space-y-7">
        <Card className="overflow-hidden border-slate-300">
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#5B4BFF] via-[#8B5CF6] to-[#EC4899]" />

            <div className="flex flex-col gap-7 px-8 py-8 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-5 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Главная</span>
                  <span>›</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Аналитика</span>
                  <span>›</span>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-[#5B4BFF]">
                    Поиск и избранное
                  </span>
                </div>

                <div className="flex items-start gap-5">
                  <div className="hidden h-16 w-16 items-center justify-center rounded-[22px] bg-[#5B4BFF] text-white shadow-[0_18px_34px_rgba(91,75,255,0.35)] md:flex">
                    <Search className="h-8 w-8" />
                  </div>

                  <div>
                    <h1 className="text-[44px] font-black leading-[0.95] tracking-[-0.055em] text-slate-950">
                      Поиск и избранное
                    </h1>

                    <p className="mt-3 max-w-3xl text-[17px] font-semibold leading-7 text-slate-600">
                      Аналитика клиентского интереса: поисковые запросы, клики, добавления в
                      избранное, сессии и конверсии.
                    </p>
                  </div>
                </div>

                {data ? (
                  <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-2">
                      Generated: {dateFull(data.generatedAt)}
                    </span>
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-2">
                      Timezone: {data.period.timezone}
                    </span>
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-2">
                      Period: {periodText}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={range}
                  onChange={(event) => setRange(event.target.value as AnalyticsRange)}
                  className="h-12 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
                >
                  {RANGES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <Button
                  variant="outline"
                  className="h-12 rounded-2xl border-slate-300 px-5 font-black shadow-sm"
                  disabled
                >
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт
                </Button>

                <Button
                  className="h-12 rounded-2xl bg-[#5B4BFF] px-6 font-black text-white shadow-[0_14px_26px_rgba(91,75,255,0.30)] hover:bg-[#4B3CF0]"
                  onClick={() => void load()}
                  disabled={loading}
                >
                  <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                  Обновить
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {error ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-sm font-black text-rose-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {data ? (
          <>
            <Card className="p-2">
              <div className="flex flex-wrap gap-2">
                {MAIN_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMainTab(tab)}
                    className={cn(
                      'min-w-[150px] rounded-2xl px-7 py-4 text-[15px] font-black transition',
                      mainTab === tab
                        ? 'bg-[#5B4BFF] text-white shadow-[0_14px_26px_rgba(91,75,255,0.30)]'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100',
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-2">
              <div className="flex flex-wrap gap-2">
                {SUB_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSubTab(tab)}
                    className={cn(
                      'rounded-2xl px-6 py-3 text-sm font-black transition',
                      subTab === tab
                        ? 'bg-indigo-50 text-[#5B4BFF] ring-2 ring-[#5B4BFF]/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </Card>

            <SectionTitle title="Основные метрики" />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
              <KpiCard
                title="Всего поисков"
                metricValue={data.summary.totalSearches}
                caption="за период"
                icon={<Search className="h-5 w-5" />}
                color="#3B82F6"
              />
              <KpiCard
                title="Уникальные пользователи"
                metricValue={data.summary.uniqueSearchUsers}
                caption="искали"
                icon={<Users className="h-5 w-5" />}
                color="#22C55E"
              />
              <KpiCard
                title="Уникальные сессии"
                metricValue={data.summary.uniqueSessions}
                caption="с поиском"
                icon={<Activity className="h-5 w-5" />}
                color="#8B5CF6"
              />
              <KpiCard
                title="Клики из поиска"
                metricValue={data.clicks.totalClicks}
                caption="всего кликов"
                icon={<MousePointerClick className="h-5 w-5" />}
                color="#F97316"
              />
              <KpiCard
                title="CTR поиска"
                metricValue={data.clicks.ctr}
                suffix="%"
                caption="клики / поиски"
                icon={<TrendingUp className="h-5 w-5" />}
                color="#5B4BFF"
              />
              <KpiCard
                title="Добавлений в избранное"
                metricValue={data.favorites.favoriteAddEvents}
                caption="за период"
                icon={<Heart className="h-5 w-5" />}
                color="#EC4899"
              />
            </div>

            <SectionTitle title="Качество поиска" />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
              <KpiCard
                title="Поиски с результатами"
                metricValue={data.summary.searchesWithResults}
                caption={`${data.funnel.searchToResultRate}% от всех`}
                icon={<Sparkles className="h-5 w-5" />}
                color="#22C55E"
              />
              <KpiCard
                title="Доля без результата"
                metricValue={data.summary.zeroResultRate}
                suffix="%"
                caption={`${n(data.summary.zeroResultSearches.value)} запросов`}
                icon={<AlertCircle className="h-5 w-5" />}
                color="#EF4444"
              />
              <KpiCard
                title="Среднее результатов"
                metricValue={data.summary.averageResultsCount}
                caption="на поиск"
                icon={<BarChart3 className="h-5 w-5" />}
                color="#3B82F6"
              />
              <KpiCard
                title="Медиана результатов"
                value={data.summary.medianResultsCount}
                caption="медиана"
                icon={<BarChart3 className="h-5 w-5" />}
                color="#8B5CF6"
              />
              <KpiCard
                title="Повторяющиеся запросы"
                metricValue={data.summary.repeatedQueries}
                caption="запроса"
                icon={<RefreshCw className="h-5 w-5" />}
                color="#F97316"
              />
              <KpiCard
                title="Поисков на пользователя"
                value={data.summary.searchesPerUser}
                caption="среднее"
                icon={<Users className="h-5 w-5" />}
                color="#8B5CF6"
              />
              <KpiCard
                title="Поисков на сессию"
                value={data.summary.searchesPerSession}
                caption="среднее"
                icon={<Activity className="h-5 w-5" />}
                color="#22C55E"
              />
              <KpiCard
                title="Пиковый час поиска"
                value={
                  data.summary.peakSearchHour.hour === null
                    ? '—'
                    : `${data.summary.peakSearchHour.hour}:00`
                }
                caption="макс активность"
                icon={<Clock3 className="h-5 w-5" />}
                color="#8B5CF6"
              />
            </div>

            {mainTab === 'Обзор' ? (
              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <ChartCard title="Поиски по времени">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.timeSeries.points}>
                      <defs>
                        <linearGradient id="searches" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5B4BFF" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#5B4BFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#CBD5E1" strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="bucketStart"
                        tickFormatter={dateShort}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="searches"
                        name="Поиски"
                        stroke="#5B4BFF"
                        fill="url(#searches)"
                        strokeWidth={4}
                        activeDot={{ r: 8 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Клики по типам">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.clicks.byEntityType}
                        dataKey="count"
                        nameKey="entityType"
                        innerRadius={78}
                        outerRadius={118}
                        paddingAngle={4}
                      >
                        {data.clicks.byEntityType.map((entry, index) => (
                          <Cell key={entry.entityType} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            ) : null}

            {mainTab === 'Активность' ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard title="Пользователи и сессии">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.timeSeries.points}>
                      <CartesianGrid stroke="#CBD5E1" strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="bucketStart"
                        tickFormatter={dateShort}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="uniqueUsers"
                        name="Пользователи"
                        stroke="#8B5CF6"
                        fill="#8B5CF6"
                        fillOpacity={0.14}
                        strokeWidth={4}
                      />
                      <Area
                        type="monotone"
                        dataKey="uniqueSessions"
                        name="Сессии"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.14}
                        strokeWidth={4}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Платформы">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.summary.topPlatforms}>
                      <CartesianGrid stroke="#CBD5E1" strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="platform"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Поиски" fill="#8B5CF6" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            ) : null}

            {mainTab === 'Конверсии' ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard title="Позиции клика">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.clicks.byPosition}>
                      <CartesianGrid stroke="#CBD5E1" strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="position"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Клики" fill="#F97316" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <Card className="overflow-hidden">
                  <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
                    <h3 className="text-[21px] font-black tracking-[-0.02em] text-slate-950">
                      Воронка поиска
                    </h3>
                  </div>

                  <div className="p-6">
                    {[
                      ['Поиски', data.funnel.searches, '#5B4BFF'],
                      ['С результатами', data.funnel.searchesWithResults, '#22C55E'],
                      ['С кликами', data.funnel.searchesWithClicks, '#F97316'],
                      ['Добавления в избранное', data.funnel.favorites, '#EC4899'],
                    ].map(([label, rawValue, color]) => {
                      const value = Number(rawValue);
                      const max = Math.max(data.funnel.searches, 1);

                      return (
                        <div key={String(label)} className="mb-6 last:mb-0">
                          <div className="mb-3 flex justify-between text-sm">
                            <span className="font-black text-slate-700">{label}</span>
                            <span className="text-lg font-black text-slate-950">{n(value)}</span>
                          </div>
                          <div className="h-4 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                            <div
                              className="h-full rounded-full shadow-sm"
                              style={{
                                width: `${Math.max((value / max) * 100, 2)}%`,
                                backgroundColor: String(color),
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-2">
              <TableCard
                title="Топ запросов по объёму"
                items={data.queries.topByVolume}
                columns={[
                  {
                    title: 'Запрос',
                    render: (x: any) => (
                      <span className="font-black text-slate-950">{x.displayQuery}</span>
                    ),
                  },
                  { title: 'Поиски', render: (x: any) => n(x.searches) },
                  { title: 'Пользователи', render: (x: any) => n(x.uniqueUsers) },
                  { title: 'Avg', render: (x: any) => n(x.avgResultsCount) },
                ]}
              />

              <TableCard
                title="Запросы без результата"
                items={data.queries.zeroResult}
                columns={[
                  {
                    title: 'Запрос',
                    render: (x: any) => (
                      <span className="font-black text-slate-950">{x.displayQuery}</span>
                    ),
                  },
                  { title: 'Поиски', render: (x: any) => n(x.searches) },
                  { title: 'Последний', render: (x: any) => dateFull(x.lastSearchedAt) },
                ]}
              />

              <TableCard
                title="Топ избранных ресторанов"
                items={data.entities.topFavoriteRestaurants}
                columns={[
                  {
                    title: 'Ресторан',
                    render: (x: any) => (
                      <span className="font-black text-slate-950">
                        {x.name ?? x.restaurantId}
                      </span>
                    ),
                  },
                  { title: 'Избранное', render: (x: any) => n(x.favorites) },
                  { title: 'Пользователи', render: (x: any) => n(x.uniqueUsers) },
                ]}
              />

              <TableCard
                title="Топ избранных товаров"
                items={data.entities.topFavoriteProducts}
                columns={[
                  {
                    title: 'Товар',
                    render: (x: any) => (
                      <span className="font-black text-slate-950">{x.title ?? x.productId}</span>
                    ),
                  },
                  { title: 'Ресторан', render: (x: any) => x.restaurantName ?? '—' },
                  { title: 'Избранное', render: (x: any) => n(x.favorites) },
                ]}
              />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}