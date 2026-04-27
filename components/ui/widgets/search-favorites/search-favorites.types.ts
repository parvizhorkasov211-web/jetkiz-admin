export type AnalyticsRange = 'today' | '7d' | '14d' | '30d' | 'month' | 'year';
export type Trend = 'up' | 'down' | 'flat';

export type MetricWithComparison = {
  value: number;
  previousValue: number;
  changePercent: number;
  trend: Trend;
};

export type MissingValue = {
  value: 'missing';
  reason: string;
};

export type ClientPlatform = 'IOS' | 'ANDROID' | 'WEB' | 'UNKNOWN';
export type AnalyticsEntityType = 'restaurant' | 'product' | 'category' | 'unknown';

export type SearchFavoritesAnalyticsResponse = {
  range: AnalyticsRange;
  generatedAt: string;
  period: {
    from: string;
    to: string;
    timezone: string;
    bucket: 'hour' | 'day';
  };
  previousPeriod: {
    from: string;
    to: string;
  };
  summary: {
    totalSearches: MetricWithComparison;
    uniqueSearchUsers: MetricWithComparison;
    anonymousSearches: MetricWithComparison;
    uniqueSessions: MetricWithComparison;
    searchesWithResults: MetricWithComparison;
    zeroResultSearches: MetricWithComparison;
    zeroResultRate: MetricWithComparison;
    averageResultsCount: MetricWithComparison;
    medianResultsCount: number | null;
    repeatedQueries: MetricWithComparison;
    searchesPerUser: number | null;
    searchesPerSession: number | null;
    peakSearchHour: { hour: number | null; searches: number };
    topSources: Array<{ source: string; count: number; percent: number }>;
    topPlatforms: Array<{ platform: ClientPlatform; count: number; percent: number }>;
    topAppVersions: Array<{ appVersion: string; count: number; percent: number }>;
    deviceCoverage: {
      withDeviceId: number;
      withoutDeviceId: number;
      percentWithDeviceId: number;
    };
  };
  clicks: {
    totalClicks: MetricWithComparison;
    uniqueClickUsers: MetricWithComparison;
    searchesWithClicks: MetricWithComparison;
    ctr: MetricWithComparison;
    averageClicksPerSearch: MetricWithComparison;
    averageFirstClickPosition: number | null;
    noClickSearches: MetricWithComparison;
    byEntityType: Array<{ entityType: AnalyticsEntityType; count: number; percent: number }>;
    byPosition: Array<{ position: number; count: number; percent: number }>;
  };
  favorites: {
    currentFavoriteRestaurants: MetricWithComparison;
    currentFavoriteProducts: MetricWithComparison;
    totalCurrentFavorites: MetricWithComparison;
    favoriteAddEvents: MetricWithComparison;
    favoriteRemoveEvents: MetricWithComparison;
    netFavoriteGrowth: MetricWithComparison;
    uniqueUsersWithFavorites: MetricWithComparison;
    favoriteChurn: number | null;
  };
  sessions: {
    totalRelatedEvents: MetricWithComparison;
    uniqueSessions: MetricWithComparison;
    anonymousSessions: MetricWithComparison;
    eventsPerSession: number | null;
    searchSessions: number;
    clickSessions: number;
    favoriteSessions: MissingValue;
    sessionsWithSearchOnly: number;
    sessionsWithSearchAndClick: number;
    sessionsWithFavorite: MissingValue;
    platformSplit: Array<{ platform: ClientPlatform; sessions: number; percent: number }>;
    sourceSplit: Array<{ source: string; sessions: number; percent: number }>;
    funnel: {
      searchSessions: number;
      clickSessions: number;
      favoriteSessions: MissingValue;
    };
  };
  funnel: {
    searches: number;
    searchesWithResults: number;
    searchesWithClicks: number;
    clicks: number;
    favorites: number;
    searchToResultRate: number;
    resultToClickRate: number;
    searchToClickRate: number;
    clickToFavoriteRate: MissingValue;
    searchToFavoriteRate: MissingValue;
  };
  queries: {
    topByVolume: Array<any>;
    topByCtr: Array<any>;
    weakByCtr: Array<any>;
    zeroResult: Array<any>;
    highResultsLowClicks: Array<any>;
    lowResultsHighClicks: Array<any>;
    repeated: Array<any>;
    recent: Array<any>;
  };
  entities: {
    topClickedEntities: Array<any>;
    topClickedRestaurants: Array<any>;
    topClickedProducts: Array<any>;
    topClickedCategories: Array<any>;
    topFavoriteRestaurants: Array<any>;
    topFavoriteProducts: Array<any>;
    clickedNotFavorited: MissingValue;
    favoritedNeverClicked: MissingValue;
    restaurantsWithHighSearchInterest: MissingValue;
    productsWithHighSearchInterest: MissingValue;
  };
  timeSeries: {
    points: Array<{
      bucketStart: string;
      searches: number;
      clicks: number;
      favorites: number;
      favoriteAdds: number;
      favoriteRemoves: number;
      zeroResults: number;
      uniqueUsers: number;
      uniqueSessions: number;
      ctr: number;
    }>;
  };
  recentEvents: Array<any>;
  limits: {
    topQueries: number;
    topEntities: number;
    recentEvents: number;
    timeSeriesPoints: number;
  };
};