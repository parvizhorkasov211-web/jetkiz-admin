'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { SearchFavoritesAnalyticsResponse } from './search-favorites.types';

type Props = {
  data: SearchFavoritesAnalyticsResponse;
};

export function SearchFavoritesFunnel({ data }: Props) {
  const max = Math.max(data.funnel.searches, 1);

  const rows = [
    { label: 'Поиски', value: data.funnel.searches },
    { label: 'С результатами', value: data.funnel.searchesWithResults },
    { label: 'С кликами', value: data.funnel.searchesWithClicks },
    { label: 'Клики', value: data.funnel.clicks },
    { label: 'Добавления в избранное', value: data.funnel.favorites },
  ];

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Воронка</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{row.label}</span>
              <span className="font-medium">{row.value}</span>
            </div>
            <Progress value={(row.value / max) * 100} />
          </div>
        ))}

        <div className="grid gap-3 pt-2 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-muted-foreground">Search → Result</div>
            <div className="text-lg font-semibold">{data.funnel.searchToResultRate}%</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-muted-foreground">Result → Click</div>
            <div className="text-lg font-semibold">{data.funnel.resultToClickRate}%</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-muted-foreground">Search → Click</div>
            <div className="text-lg font-semibold">{data.funnel.searchToClickRate}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}