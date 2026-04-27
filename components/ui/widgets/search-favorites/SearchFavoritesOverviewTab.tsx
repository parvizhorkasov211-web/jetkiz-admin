'use client';

import type { SearchFavoritesAnalyticsResponse } from './search-favorites.types';
import { SearchFavoritesMetricCard } from './SearchFavoritesMetricCard';
import { SearchFavoritesTable } from './SearchFavoritesTables';

type Props = {
  data: SearchFavoritesAnalyticsResponse;
};

export function SearchFavoritesOverviewTab({ data }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SearchFavoritesMetricCard
          title="Поиски с результатами"
          metric={data.summary.searchesWithResults}
        />
        <SearchFavoritesMetricCard
          title="Среднее результатов"
          metric={data.summary.averageResultsCount}
        />
        <SearchFavoritesMetricCard
          title="Медиана результатов"
          value={data.summary.medianResultsCount ?? '—'}
        />
        <SearchFavoritesMetricCard
          title="Повторные запросы"
          metric={data.summary.repeatedQueries}
        />
        <SearchFavoritesMetricCard
          title="Поисков / пользователь"
          value={data.summary.searchesPerUser ?? '—'}
        />
        <SearchFavoritesMetricCard
          title="Поисков / сессия"
          value={data.summary.searchesPerSession ?? '—'}
        />
        <SearchFavoritesMetricCard
          title="Пиковый час"
          value={data.summary.peakSearchHour.hour ?? '—'}
          subtitle={`${data.summary.peakSearchHour.searches} поисков`}
        />
        <SearchFavoritesMetricCard
          title="Device coverage"
          value={data.summary.deviceCoverage.percentWithDeviceId}
          suffix="%"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SearchFavoritesTable
          title="Топ запросов по объёму"
          items={data.queries.topByVolume}
          columns={[
            { key: 'query', title: 'Запрос', render: (x) => x.displayQuery },
            { key: 'searches', title: 'Поиски', render: (x) => x.searches },
            { key: 'users', title: 'Пользователи', render: (x) => x.uniqueUsers },
            { key: 'avg', title: 'Avg results', render: (x) => x.avgResultsCount },
          ]}
        />

        <SearchFavoritesTable
          title="Запросы без результата"
          items={data.queries.zeroResult}
          columns={[
            { key: 'query', title: 'Запрос', render: (x) => x.displayQuery },
            { key: 'searches', title: 'Поиски', render: (x) => x.searches },
            {
              key: 'last',
              title: 'Последний',
              render: (x) => new Date(x.lastSearchedAt).toLocaleString('ru-RU'),
            },
          ]}
        />

        <SearchFavoritesTable
          title="Топ избранных ресторанов"
          items={data.entities.topFavoriteRestaurants}
          columns={[
            { key: 'name', title: 'Ресторан', render: (x) => x.name ?? x.restaurantId },
            { key: 'favorites', title: 'Избранное', render: (x) => x.favorites },
            { key: 'users', title: 'Пользователи', render: (x) => x.uniqueUsers },
          ]}
        />

        <SearchFavoritesTable
          title="Топ избранных товаров"
          items={data.entities.topFavoriteProducts}
          columns={[
            { key: 'title', title: 'Товар', render: (x) => x.title ?? x.productId },
            { key: 'restaurant', title: 'Ресторан', render: (x) => x.restaurantName ?? '—' },
            { key: 'favorites', title: 'Избранное', render: (x) => x.favorites },
          ]}
        />
      </div>
    </div>
  );
}