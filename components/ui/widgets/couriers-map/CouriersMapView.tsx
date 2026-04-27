'use client';

import L from 'leaflet';
import { RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import type {
  CourierMapFilter,
  CourierMapPoint,
  CourierMapStatus,
} from './couriers-map.types';

const DEFAULT_CENTER: [number, number] = [52.9356, 70.1886];
const DEFAULT_ZOOM = 13;
const REFRESH_INTERVAL_MS = 15_000;

const FILTERS: Array<{ value: CourierMapFilter; label: string }> = [
  { value: 'ALL', label: 'Все' },
  { value: 'ONLINE_IDLE', label: 'На линии' },
  { value: 'BUSY', label: 'Заняты' },
  { value: 'OFFLINE', label: 'Офлайн' },
  { value: 'BLOCKED', label: 'Заблокированы' },
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
    label: 'Занят',
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

function isValidPoint(point: CourierMapPoint): point is CourierMapPoint & {
  lat: number;
  lng: number;
} {
  return (
    typeof point.lat === 'number' &&
    Number.isFinite(point.lat) &&
    typeof point.lng === 'number' &&
    Number.isFinite(point.lng)
  );
}

function createCourierIcon(status: CourierMapStatus): L.DivIcon {
  const meta = STATUS_META[status];

  return L.divIcon({
    className: 'jetkiz-courier-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 9999px;
        background: ${meta.markerColor};
        border: 3px solid ${meta.markerBorder};
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: white;
          opacity: 0.95;
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function formatRelativeTime(value: string | null): string {
  if (!value) {
    return 'нет данных';
  }

  const date = new Date(value);
  const timestamp = date.getTime();

  if (!Number.isFinite(timestamp)) {
    return 'нет данных';
  }

  const diffMs = Date.now() - timestamp;
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'только что';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} мин назад`;
  }

  if (diffHours < 24) {
    return `${diffHours} ч назад`;
  }

  return `${diffDays} д назад`;
}

function FitMapOnce({ points }: { points: Array<CourierMapPoint & { lat: number; lng: number }> }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (fittedRef.current || points.length === 0) {
      return;
    }

    fittedRef.current = true;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, {
      padding: [48, 48],
      maxZoom: 15,
    });
  }, [map, points]);

  return null;
}

export default function CouriersMapView() {
  const [points, setPoints] = useState<CourierMapPoint[]>([]);
  const [filter, setFilter] = useState<CourierMapFilter>('ALL');
  const [search, setSearch] = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadMapPoints = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    const controller = new AbortController();

    try {
      if (mode === 'initial') {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const response = await fetch('/api/proxy/couriers-map', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Ошибка загрузки карты: ${response.status}`);
      }

      const data = (await response.json()) as CourierMapPoint[];

      setPoints(Array.isArray(data) ? data : []);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Не удалось загрузить карту курьеров';

      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }

    return () => controller.abort();
  }, []);

  useEffect(() => {
    void loadMapPoints('initial');

    const intervalId = window.setInterval(() => {
      void loadMapPoints('refresh');
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [loadMapPoints]);

  const validPoints = useMemo(() => points.filter(isValidPoint), [points]);

  const counts = useMemo(() => {
    return {
      online: points.filter((point) => point.isOnline && point.status !== 'BLOCKED').length,
      busy: points.filter((point) => point.status === 'BUSY').length,
      offline: points.filter((point) => point.status === 'OFFLINE').length,
      blocked: points.filter((point) => point.status === 'BLOCKED').length,
    };
  }, [points]);

  const filteredPoints = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return validPoints.filter((point) => {
      const matchesFilter = filter === 'ALL' || point.status === filter;

      const matchesSearch =
        !normalizedSearch ||
        point.name.toLowerCase().includes(normalizedSearch) ||
        String(point.phone ?? '').toLowerCase().includes(normalizedSearch) ||
        String(point.activeOrderNumber ?? '').includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [filter, search, validPoints]);

  const selectedCourier = useMemo(() => {
    if (!selectedCourierId) {
      return null;
    }

    return validPoints.find((point) => point.courierUserId === selectedCourierId) ?? null;
  }, [selectedCourierId, validPoints]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Карта курьеров</h1>
          <p className="mt-1 text-sm text-slate-500">
            Текущее местоположение, статус и активный заказ курьера
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void loadMapPoints('refresh')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Автообновление: 15 сек
          </button>

          {lastUpdatedAt ? (
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
              Обновлено: {lastUpdatedAt.toLocaleTimeString('ru-RU')}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard label="На линии" value={counts.online} className="bg-emerald-50 text-emerald-700" />
        <StatusCard label="Заняты" value={counts.busy} className="bg-amber-50 text-amber-700" />
        <StatusCard label="Офлайн" value={counts.offline} className="bg-slate-100 text-slate-600" />
        <StatusCard label="Заблокированы" value={counts.blocked} className="bg-red-50 text-red-700" />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-slate-950">Живая карта</div>
              <div className="mt-0.5 text-xs text-slate-500">
                Показаны только курьеры с координатами
              </div>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {filteredPoints.length} на карте
            </div>
          </div>

          <div className="h-[640px]">
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
                      <div className="w-[260px] space-y-2 text-sm">
                        <div className="font-semibold text-slate-950">
                          Курьер: {point.name}
                        </div>
                        <div className="text-slate-600">Телефон: {point.phone ?? 'не указан'}</div>
                        <div>
                          Статус:{' '}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.badgeClassName}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          Последняя активность: {formatRelativeTime(point.lastSeenAt)}
                        </div>

                        {point.activeOrderNumber ? (
                          <div className="mt-3 border-t border-slate-100 pt-3">
                            <div className="font-medium text-slate-950">
                              Заказ: №{point.activeOrderNumber}
                            </div>
                            <div className="text-slate-600">
                              Статус заказа: {point.activeOrderStatus ?? 'не указан'}
                            </div>
                            <div className="text-slate-600">
                              Ресторан: {point.restaurantName ?? 'не указан'}
                            </div>
                            <div className="text-slate-600">
                              Адрес: {point.deliveryAddress ?? 'не указан'}
                            </div>
                          </div>
                        ) : null}

                        <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                          Координаты: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="text-sm font-semibold text-slate-950">Курьеры</div>

            <div className="mt-4 flex flex-wrap gap-2">
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
                placeholder="Поиск по имени, телефону, заказу"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </div>

          <div className="max-h-[640px] space-y-3 overflow-y-auto p-4">
            {isLoading ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Загрузка курьеров...
              </div>
            ) : null}

            {!isLoading && filteredPoints.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Курьеры не найдены
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

function StatusCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex rounded-xl px-3 py-1 text-xs font-medium ${className}`}>
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
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
        <div
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: meta.markerColor }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="truncate text-sm font-semibold text-slate-950">
                {point.name}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {point.phone ?? 'телефон не указан'}
              </div>
            </div>

            <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${meta.badgeClassName}`}>
              {meta.label}
            </span>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Последний сигнал: {formatRelativeTime(point.lastSeenAt)}
          </div>

          {point.activeOrderNumber ? (
            <div className="mt-3 rounded-xl bg-white/70 p-3 text-xs text-slate-600">
              <div className="font-medium text-slate-950">Заказ №{point.activeOrderNumber}</div>
              <div className="mt-1">Статус: {point.activeOrderStatus ?? 'не указан'}</div>
              <div>Ресторан: {point.restaurantName ?? 'не указан'}</div>
              <div>Адрес: {point.deliveryAddress ?? 'не указан'}</div>
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}