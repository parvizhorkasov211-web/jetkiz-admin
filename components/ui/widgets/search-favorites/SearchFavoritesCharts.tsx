'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SearchFavoritesAnalyticsResponse } from './search-favorites.types';

type Props = {
  data: SearchFavoritesAnalyticsResponse;
};

export function SearchFavoritesActivityChart({ data }: Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Активность по времени</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.timeSeries.points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="bucketStart"
              tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU')}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => new Date(String(value)).toLocaleString('ru-RU')}
            />
            <Line type="monotone" dataKey="searches" name="Поиски" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="clicks" name="Клики" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="favorites" name="Избранное" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="zeroResults" name="Без результата" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function SearchFavoritesUsersChart({ data }: Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Пользователи и сессии</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.timeSeries.points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="bucketStart"
              tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU')}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => new Date(String(value)).toLocaleString('ru-RU')}
            />
            <Line type="monotone" dataKey="uniqueUsers" name="Пользователи" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="uniqueSessions" name="Сессии" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function SearchFavoritesClickPositionsChart({ data }: Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Позиции кликов</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.clicks.byPosition}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="position" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" name="Клики" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function SearchFavoritesEntityTypeChart({ data }: Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Клики по типам</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.clicks.byEntityType}
              dataKey="count"
              nameKey="entityType"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={3}
            >
              {data.clicks.byEntityType.map((entry, index) => (
                <Cell key={entry.entityType} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}