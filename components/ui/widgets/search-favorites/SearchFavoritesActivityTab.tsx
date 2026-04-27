'use client';

import type { SearchFavoritesAnalyticsResponse } from './search-favorites.types';
import { SearchFavoritesMetricCard } from './SearchFavoritesMetricCard';
import {
  SearchFavoritesActivityChart,
  SearchFavoritesUsersChart,
} from './SearchFavoritesCharts';
import { SearchFavoritesRecentEvents } from './SearchFavoritesRecentEvents';
import { SearchFavoritesTable } from './SearchFavoritesTables';

type Props = {
  data: SearchFavoritesAnalyticsResponse;
};

export function SearchFavoritesActivityTab({ data }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SearchFavoritesMetricCard title="События" metric={data.sessions.totalRelatedEvents} />
        <SearchFavoritesMetricCard title="Сессии" metric={data.sessions.uniqueSessions} />
        <SearchFavoritesMetricCard title="Анонимные сессии" metric={data.sessions.anonymousSessions} />
        <SearchFavoritesMetricCard title="Событий / сессия" value={data.sessions.eventsPerSession ?? '—'} />
        <SearchFavoritesMetricCard title="Search sessions" value={data.sessions.searchSessions} />
        <SearchFavoritesMetricCard title="Click sessions" value={data.sessions.clickSessions} />
        <SearchFavoritesMetricCard title="Search only" value={data.sessions.sessionsWithSearchOnly} />
        <SearchFavoritesMetricCard title="Search + click" value={data.sessions.sessionsWithSearchAndClick} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SearchFavoritesActivityChart data={data} />
        <SearchFavoritesUsersChart data={data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SearchFavoritesTable
          title="Платформы"
          items={data.summary.topPlatforms}
          columns={[
            { key: 'platform', title: 'Платформа', render: (x) => x.platform },
            { key: 'count', title: 'Поиски', render: (x) => x.count },
            { key: 'percent', title: '%', render: (x) => `${x.percent}%` },
          ]}
        />

        <SearchFavoritesTable
          title="Источники"
          items={data.summary.topSources}
          columns={[
            { key: 'source', title: 'Источник', render: (x) => x.source },
            { key: 'count', title: 'Поиски', render: (x) => x.count },
            { key: 'percent', title: '%', render: (x) => `${x.percent}%` },
          ]}
        />
      </div>

      <SearchFavoritesRecentEvents data={data} />
    </div>
  );
}