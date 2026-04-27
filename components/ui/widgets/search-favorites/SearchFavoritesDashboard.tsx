'use client';

import { useCallback, useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';

import { SearchFavoritesHeader } from './SearchFavoritesHeader';
import { SearchFavoritesKpiGrid } from './SearchFavoritesKpiGrid';
import { SearchFavoritesTabs } from './SearchFavoritesTabs';
import type {
  AnalyticsRange,
  SearchFavoritesAnalyticsResponse,
} from './search-favorites.types';

function SearchFavoritesLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[128px] rounded-2xl" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-[136px] rounded-2xl" />
        ))}
      </div>

      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}

export function SearchFavoritesDashboard() {
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [data, setData] = useState<SearchFavoritesAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (selectedRange: AnalyticsRange) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<SearchFavoritesAnalyticsResponse>(
        `/users/analytics/search-favorites?range=${selectedRange}`,
      );

      setData(response);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить аналитику');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(range);
  }, [range, loadData]);

  return (
    <div className="space-y-5">
      <SearchFavoritesHeader
        data={data}
        range={range}
        loading={loading}
        onRangeChange={setRange}
        onRefresh={() => void loadData(range)}
      />

      {loading ? <SearchFavoritesLoading /> : null}

      {!loading && error ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTitle>Не удалось загрузить экран</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error && data ? (
        <>
          <SearchFavoritesKpiGrid data={data} />
          <SearchFavoritesTabs data={data} />
        </>
      ) : null}
    </div>
  );
}