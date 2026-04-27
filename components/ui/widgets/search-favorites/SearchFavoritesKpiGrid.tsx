'use client';

import type { SearchFavoritesAnalyticsResponse } from './search-favorites.types';
import { SearchFavoritesMetricCard } from './SearchFavoritesMetricCard';

type Props = {
  data: SearchFavoritesAnalyticsResponse;
};

export function SearchFavoritesKpiGrid({ data }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SearchFavoritesMetricCard
        title="Поиски"
        metric={data.summary.totalSearches}
        subtitle="Всего поисковых запросов"
      />
      <SearchFavoritesMetricCard
        title="Клики"
        metric={data.clicks.totalClicks}
        subtitle="Клики по результатам поиска"
      />
      <SearchFavoritesMetricCard
        title="CTR"
        metric={data.clicks.ctr}
        suffix="%"
        subtitle="Поиски, завершившиеся кликом"
      />
      <SearchFavoritesMetricCard
        title="Без результата"
        metric={data.summary.zeroResultRate}
        suffix="%"
        subtitle="Доля пустой выдачи"
      />
      <SearchFavoritesMetricCard
        title="Избранное"
        metric={data.favorites.totalCurrentFavorites}
        subtitle="Текущее избранное"
      />
      <SearchFavoritesMetricCard
        title="Добавления"
        metric={data.favorites.favoriteAddEvents}
        subtitle="Добавлено за период"
      />
      <SearchFavoritesMetricCard
        title="Сессии"
        metric={data.summary.uniqueSessions}
        subtitle="Уникальные search-сессии"
      />
      <SearchFavoritesMetricCard
        title="Пользователи"
        metric={data.summary.uniqueSearchUsers}
        subtitle="Уникальные пользователи поиска"
      />
    </div>
  );
}