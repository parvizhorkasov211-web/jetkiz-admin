'use client';

import type { SearchFavoritesAnalyticsResponse } from './search-favorites.types';
import { SearchFavoritesMetricCard } from './SearchFavoritesMetricCard';
import { SearchFavoritesFunnel } from './SearchFavoritesFunnel';
import {
  SearchFavoritesClickPositionsChart,
  SearchFavoritesEntityTypeChart,
} from './SearchFavoritesCharts';
import { SearchFavoritesTable } from './SearchFavoritesTables';

type Props = {
  data: SearchFavoritesAnalyticsResponse;
};

export function SearchFavoritesConversionsTab({ data }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SearchFavoritesMetricCard title="CTR" metric={data.clicks.ctr} suffix="%" />
        <SearchFavoritesMetricCard title="Поиски с кликами" metric={data.clicks.searchesWithClicks} />
        <SearchFavoritesMetricCard title="Без кликов" metric={data.clicks.noClickSearches} />
        <SearchFavoritesMetricCard
          title="Средняя первая позиция"
          value={data.clicks.averageFirstClickPosition ?? '—'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SearchFavoritesFunnel data={data} />
        <SearchFavoritesEntityTypeChart data={data} />
      </div>

      <SearchFavoritesClickPositionsChart data={data} />

      <div className="grid gap-4 xl:grid-cols-2">
        <SearchFavoritesTable
          title="Топ CTR"
          items={data.queries.topByCtr}
          columns={[
            { key: 'query', title: 'Запрос', render: (x) => x.displayQuery },
            { key: 'searches', title: 'Поиски', render: (x) => x.searches },
            { key: 'clicks', title: 'Клики', render: (x) => x.clicks },
            { key: 'ctr', title: 'CTR', render: (x) => `${x.ctr}%` },
          ]}
        />

        <SearchFavoritesTable
          title="Слабый CTR"
          items={data.queries.weakByCtr}
          columns={[
            { key: 'query', title: 'Запрос', render: (x) => x.displayQuery },
            { key: 'searches', title: 'Поиски', render: (x) => x.searches },
            { key: 'clicks', title: 'Клики', render: (x) => x.clicks },
            { key: 'ctr', title: 'CTR', render: (x) => `${x.ctr}%` },
          ]}
        />

        <SearchFavoritesTable
          title="Топ кликов по сущностям"
          items={data.entities.topClickedEntities}
          columns={[
            { key: 'title', title: 'Название', render: (x) => x.title ?? x.entityId },
            { key: 'type', title: 'Тип', render: (x) => x.entityType },
            { key: 'clicks', title: 'Клики', render: (x) => x.clicks },
            { key: 'users', title: 'Пользователи', render: (x) => x.uniqueUsers },
          ]}
        />

        <SearchFavoritesTable
          title="Топ кликов по товарам"
          items={data.entities.topClickedProducts}
          columns={[
            { key: 'title', title: 'Товар', render: (x) => x.title ?? x.productId },
            { key: 'restaurant', title: 'Ресторан', render: (x) => x.restaurantName ?? '—' },
            { key: 'clicks', title: 'Клики', render: (x) => x.clicks },
          ]}
        />
      </div>
    </div>
  );
}