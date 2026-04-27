'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SearchFavoritesAnalyticsResponse } from './search-favorites.types';

type Props = {
  data: SearchFavoritesAnalyticsResponse;
};

export function SearchFavoritesRecentEvents({ data }: Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Последние события</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.recentEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Нет событий
          </div>
        ) : (
          data.recentEvents.slice(0, 12).map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{event.type}</Badge>
                  <span className="font-medium">{event.label}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  userId: {event.userId ?? 'anonymous'} · sessionId:{' '}
                  {event.sessionId ?? 'missing'}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {new Date(event.createdAt).toLocaleString('ru-RU')}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}