'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SearchFavoritesAnalyticsResponse } from './search-favorites.types';
import { SearchFavoritesActivityTab } from './SearchFavoritesActivityTab';
import { SearchFavoritesConversionsTab } from './SearchFavoritesConversionsTab';
import { SearchFavoritesDataQuality } from './SearchFavoritesDataQuality';
import { SearchFavoritesOverviewTab } from './SearchFavoritesOverviewTab';

type Props = {
  data: SearchFavoritesAnalyticsResponse;
};

export function SearchFavoritesTabs({ data }: Props) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Обзор</TabsTrigger>
        <TabsTrigger value="activity">Активность</TabsTrigger>
        <TabsTrigger value="conversions">Конверсии</TabsTrigger>
        <TabsTrigger value="quality">Качество данных</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <SearchFavoritesOverviewTab data={data} />
      </TabsContent>

      <TabsContent value="activity">
        <SearchFavoritesActivityTab data={data} />
      </TabsContent>

      <TabsContent value="conversions">
        <SearchFavoritesConversionsTab data={data} />
      </TabsContent>

      <TabsContent value="quality">
        <SearchFavoritesDataQuality data={data} />
      </TabsContent>
    </Tabs>
  );
}