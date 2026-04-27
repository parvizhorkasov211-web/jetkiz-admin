'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { MissingValue, SearchFavoritesAnalyticsResponse } from './search-favorites.types';

type Props = {
  data: SearchFavoritesAnalyticsResponse;
};

function MissingCard({ title, value }: { title: string; value: MissingValue }) {
  return (
    <Alert className="rounded-2xl border-amber-200 bg-amber-50">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-sm">{value.reason}</AlertDescription>
    </Alert>
  );
}

export function SearchFavoritesDataQuality({ data }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Качество данных</h2>
        <p className="text-sm text-muted-foreground">
          Эти метрики честно недоступны из текущих логов и не должны подменяться фейковыми значениями.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <MissingCard title="Click → Favorite rate" value={data.funnel.clickToFavoriteRate} />
        <MissingCard title="Search → Favorite rate" value={data.funnel.searchToFavoriteRate} />
        <MissingCard title="Favorite sessions" value={data.sessions.favoriteSessions} />
        <MissingCard title="Sessions with favorite" value={data.sessions.sessionsWithFavorite} />
        <MissingCard title="Clicked but not favorited" value={data.entities.clickedNotFavorited} />
        <MissingCard title="Favorited never clicked" value={data.entities.favoritedNeverClicked} />
        <MissingCard title="Restaurant search interest" value={data.entities.restaurantsWithHighSearchInterest} />
        <MissingCard title="Product search interest" value={data.entities.productsWithHighSearchInterest} />
      </div>
    </div>
  );
}