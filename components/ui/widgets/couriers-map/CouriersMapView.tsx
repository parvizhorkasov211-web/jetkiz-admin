'use client';

import L from 'leaflet';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import type {
  CourierMapFilter,
  CourierMapPoint,
  CourierMapResponse,
  CourierMapStatus,
  CourierMapSummary,
} from './couriers-map.types';

const DEFAULT_CENTER: [number, number] = [52.9356, 70.1886];
const DEFAULT_ZOOM = 13;
const REFRESH_INTERVAL_MS = 10_000;

const EMPTY_SUMMARY: CourierMapSummary = {
  total: 0,
  online: 0,
  onlineIdle: 0,
  busy: 0,
  offline: 0,
  blocked: 0,
  staleOnline: 0,
  busyWithoutFreshLocation: 0,
  trackedNow: 0,
};

const FILTERS: Array<{ value: CourierMapFilter; label: string }> = [
  { value: 'ALL', label: 'Все на карте' },
  { value: 'ONLINE_IDLE', label: 'Свободны' },
  { value: 'BUSY', label: 'С заказом' },
];

const STATUS_META: Record<
  CourierMapStatus,
  {
    label: string;
    markerColor: string;
    markerBorder: string;
    badgeClassName: string;
  }
> = {
  ONLINE_IDLE: {
    label: 'На линии',
    markerColor: '#22c55e',
    markerBorder: '#15803d',
    badgeClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
  BUSY: {
    label: 'Выполняет заказ',
    markerColor: '#f59e0b',
    markerBorder: '#b45309',
    badgeClassName: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  },
  OFFLINE: {
    label: 'Офлайн',
    markerColor: '#94a3b8',
    markerBorder: '#64748b',
    badgeClassName: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  },
  BLOCKED: {
    label: 'Заблокирован',
    markerColor: '#ef4444',
    markerBorder: '#b91c1c',
    badgeClassName: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  },
};

function isValidPoint(
  point: CourierMapPoint,
): point is CourierMapPoint & { lat: number; lng: number } {
  return (
    typeof point.lat === 'number' &&
    Number.isFinite(point.lat) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    typeof point.lng === 'number' &&
    Number.isFinite(point.lng) &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

function createCourierIcon(status: CourierMapStatus): L.DivIcon {
  const meta = STATUS_META[status];

  return L.divIcon({
    className: 'jetkiz-courier-marker',
    html: `<div style="width:30px;height:30px;border-radius:9999px;background:${meta.markerColor};border:3px solid ${meta.markerBorder};box-shadow:0 10px 24px rgba(15,23,42,.25);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:9999px;background:#fff"></div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function formatRelativeTime(value: string | null): string {
  if (!value) return 'нет сигнала';

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'нет данных';

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds} сек назад`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;

  return `${Math.floor(hours / 24)} д назад`;
}

function resolveAvatarUrl(value: string | null): string | null {
  const avatar = String(value ?? '').trim();
  if (!avatar) return null;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  return `/api/proxy/${avatar.replace(/^\/+/, '')}`;
}

function CourierAvatar({ point, size = 42 }: { point: CourierMapPoint; size?: number }) {
  const src = resolveAvatarUrl(point.avatarUrl);
  const initials = [point.firstName, point.lastName]
    .filter(Boolean)
    .map((value) => value.trim().slice(0, 1).toUpperCase())
    .join('')
    .slice(0, 2) || 'К';

  if (src) {
    return (
      <img
        src={src}
        alt={point.name}
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-slate-200 object-cover"
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function FitMapOnce({
  points,
}: {
  points: Array<CourierMapPoint & { lat: number; lng: number }>;
}) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (fittedRef.current || points.length === 0) return;
    fittedRef.current = true;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }

    map.fitBounds(
      L.latLngBounds(points.map((point) => [point.lat, point.lng])),
      { padding: [48, 48], maxZoom: 15 },
    );
  }, [map, points]);

  return null;
}

function FocusSelected({
  point,
}: {
  point: (CourierMapPoint & { lat: number; lng: number }) | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!point) return;
    map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 15), {
      duration: 0.5,
    });
  }, [map, point]);

  return null;
}

async function readApiError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  if (!text) return `Ошибка загрузки карты: ${response.status}`;

  try {
    const parsed = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(', ');
    if (parsed.message) return parsed.message;
  } catch {
    // Return the original backend text below.
  }

  return text;
}

export default function CouriersMapView() {
  const [points, setPoints] = useState<CourierMapPoint[]>([]);
  const [summary, setSummary] = useState<CourierMapSummary>(EMPTY_SUMMARY);
  const [freshnessSeconds, setFreshnessSeconds] = useState(180);
  const [filter, setFilter] = useState<CourierMapFilter>('ALL');
  const [search, setSearch] = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);

  const loadMapPoints = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestSeq = ++requestSeqRef.current;

      try {
        if (mode === 'initial') setIsLoading(true);
        else setIsRefreshing(true);

        const response = await fetch('/api/proxy/couriers-map', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(await readApiError(response));

        const data = (await response.json()) as CourierMapResponse;
        if (requestSeq !== requestSeqRef.current) return;

        setPoints(Array.isArray(data?.points) ? data.points : []);
        setSummary(data?.summary ?? EMPTY_SUMMARY);
        setFreshnessSeconds(Number(data?.freshnessSeconds) || 180);
        setError(null);
        setLastUpdatedAt(data?.generatedAt ? new Date(data.generatedAt) : new Date());
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Не удалось загрузить карту курьеров',
        );
      } finally {
        if (requestSeq === requestSeqRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadMapPoints('initial');

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadMapPoints('refresh');
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, [loadMapPoints]);

  const validPoints = useMemo(() => points.filter(isValidPoint), [points]);

  const filteredPoints = useMemo(() => {
    const query = search.trim().toLowerCase();

    return validPoints.filter((point) => {
      const matchesFilter = filter === 'ALL' || point.status === filter;
      const matchesSearch =
        !query ||
        point.name.toLowerCase().includes(query) ||
        point.firstName.toLowerCase().includes(query) ||
        point.lastName.toLowerCase().includes(query) ||
        String(point.courierNumber ?? '').includes(query) ||
        String(point.phone ?? '').toLowerCase().includes(query) ||
        String(point.activeOrderNumber ?? '').includes(query) ||
        String(point.restaurantName ?? '').toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filter, search, validPoints]);

  const selectedCourier = useMemo(() => {
    if (!selectedCourierId) return null;
    return (
      validPoints.find((point) => point.courierUserId === selectedCourierId) ?? null
    );
  }, [selectedCourierId, validPoints]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Карта курьеров</h1>
          <p className="mt-1 text-sm text-slate-500">
            Текущее местоположение, статус и активная доставка. GPS-сигнал старше{' '}
            {freshnessSeconds} сек не считается актуальным.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void loadMapPoints('refresh')}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Обновить
          </button>
          <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
            Каждые 10 сек
            {lastUpdatedAt ? ` · ${lastUpdatedAt.toLocaleTimeString('ru-RU')}` : ''}
          </div>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-7">
        <StatCell label="Всего" value={summary.total} />
        <StatCell label="На линии" value={summary.online} />
        <StatCell label="Свободны" value={summary.onlineIdle} />
        <StatCell label="С заказом" value={summary.busy} />
        <StatCell label="Офлайн" value={summary.offline} />
        <StatCell label="Заблокированы" value={summary.blocked} />
        <StatCell label="На карте" value={summary.trackedNow} />
      </div>

      {summary.busyWithoutFreshLocation > 0 ? (
        <WarningBanner strong>
          У {summary.busyWithoutFreshLocation} курьер(ов) есть активный заказ, но нет
          свежего GPS-сигнала. Это требует проверки диспетчером.
        </WarningBanner>
      ) : null}

      {summary.staleOnline > 0 ? (
        <WarningBanner>
          У {summary.staleOnline} курьер(ов) включён статус «на линии», но свежий
          GPS-сигнал отсутствует. Они не считаются доступными для актуального
          местоположения.
        </WarningBanner>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-slate-950">Живая карта</div>
              <div className="mt-0.5 text-xs text-slate-500">
                Курьер с активной доставкой остаётся видимым при свежем GPS даже
                после переключения в офлайн.
              </div>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {filteredPoints.length} точек
            </div>
          </div>

          <div className="h-[680px]">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitMapOnce points={filteredPoints} />
              <FocusSelected point={selectedCourier} />

              {filteredPoints.map((point) => {
                const meta = STATUS_META[point.status];

                return (
                  <Marker
                    key={point.courierUserId}
                    position={[point.lat, point.lng]}
                    icon={createCourierIcon(point.status)}
                    eventHandlers={{
                      click: () => setSelectedCourierId(point.courierUserId),
                    }}
                  >
                    <Popup>
                      <div className="w-[310px] space-y-2 text-sm">
                        <div className="flex items-center gap-3">
                          <CourierAvatar point={point} size={44} />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-950">
                              {point.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              Курьер №{point.courierNumber ?? '—'}
                            </div>
                          </div>
                        </div>

                        <div className="text-slate-600">
                          Телефон: {point.phone ?? 'не указан'}
                        </div>
                        <div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.badgeClassName}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          Последний GPS: {formatRelativeTime(point.lastSeenAt)}
                        </div>
                        <div className="text-slate-600">
                          Последняя активность: {formatRelativeTime(point.lastActiveAt)}
                        </div>
                        <div className="text-slate-600">
                          Активных заказов: {point.activeOrdersCount}
                        </div>

                        {point.activeOrderNumber ? (
                          <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                            <div className="font-medium text-slate-950">
                              Заказ №{point.activeOrderNumber}
                            </div>
                            <div className="text-slate-600">
                              Статус: {point.activeOrderStatus ?? 'не указан'}
                            </div>
                            <div className="text-slate-600">
                              Ресторан: {point.restaurantName ?? 'не указан'}
                            </div>
                            <div className="text-slate-600">
                              Адрес ресторана: {point.restaurantAddress ?? 'не указан'}
                            </div>
                            {point.deliveryAddress ? (
                              <div className="text-slate-600">
                                Адрес клиента: {point.deliveryAddress}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                          Координаты: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                        </div>
                        <div className="flex gap-3 pt-1 text-xs">
                          <a
                            className="font-medium text-violet-700"
                            href={`/layout-20/couriers/${point.courierUserId}`}
                          >
                            Карточка курьера
                          </a>
                          {point.activeOrderId ? (
                            <a
                              className="font-medium text-violet-700"
                              href={`/layout-20/orders/${point.activeOrderId}`}
                            >
                              Открыть заказ
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="text-sm font-semibold text-slate-950">
              Курьеры с актуальным GPS
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    filter === item.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Имя, № курьера, телефон, заказ, ресторан"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </div>

          <div className="max-h-[680px] space-y-3 overflow-y-auto p-4">
            {isLoading ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Загрузка курьеров...
              </div>
            ) : null}

            {!isLoading && filteredPoints.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Нет курьеров с актуальными координатами по выбранному фильтру.
              </div>
            ) : null}

            {filteredPoints.map((point) => (
              <CourierListItem
                key={point.courierUserId}
                point={point}
                isSelected={selectedCourier?.courierUserId === point.courierUserId}
                onSelect={() => setSelectedCourierId(point.courierUserId)}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-slate-100 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function WarningBanner({
  children,
  strong = false,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
        strong
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function CourierListItem({
  point,
  isSelected,
  onSelect,
}: {
  point: CourierMapPoint & { lat: number; lng: number };
  isSelected: boolean;
  onSelect: () => void;
}) {
  const meta = STATUS_META[point.status];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        isSelected
          ? 'border-violet-300 bg-violet-50'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <CourierAvatar point={point} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-950">
                {point.name}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                №{point.courierNumber ?? '—'} · {point.phone ?? 'телефон не указан'}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${meta.badgeClassName}`}
            >
              {meta.label}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500">
            <div>GPS: {formatRelativeTime(point.lastSeenAt)}</div>
            <div>Активность: {formatRelativeTime(point.lastActiveAt)}</div>
            <div>Заказов: {point.activeOrdersCount}</div>
            <div>{point.locationFresh ? 'Сигнал актуален' : 'Сигнал устарел'}</div>
          </div>

          {point.activeOrderNumber ? (
            <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs text-slate-600">
              <div className="font-medium text-slate-950">
                Заказ №{point.activeOrderNumber}
              </div>
              <div className="mt-1">{point.restaurantName ?? 'Ресторан не указан'}</div>
              {point.deliveryAddress ? (
                <div className="mt-1 truncate">{point.deliveryAddress}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
