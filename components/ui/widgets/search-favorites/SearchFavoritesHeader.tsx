'use client';

import { Button } from '@/components/ui/button';
import type { AnalyticsRange, SearchFavoritesAnalyticsResponse } from './search-favorites.types';
import { SearchFavoritesRangeSelect } from './SearchFavoritesRangeSelect';

type Props = {
  data: SearchFavoritesAnalyticsResponse | null;
  range: AnalyticsRange;
  loading: boolean;
  onRangeChange: (range: AnalyticsRange) => void;
  onRefresh: () => void;
};

export function SearchFavoritesHeader({
  data,
  range,
  loading,
  onRangeChange,
  onRefresh,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Поиск и избранное</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Аналитика клиентского интереса: поиск, клики, избранное и сессии
        </p>

        {data ? (
          <div className="mt-2 text-xs text-muted-foreground">
            Generated at: {new Date(data.generatedAt).toLocaleString('ru-RU')} · Timezone:{' '}
            {data.period.timezone}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchFavoritesRangeSelect value={range} onChange={onRangeChange} />

        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          Обновить
        </Button>

        <Button variant="outline" disabled>
          Экспорт
        </Button>
      </div>
    </div>
  );
}