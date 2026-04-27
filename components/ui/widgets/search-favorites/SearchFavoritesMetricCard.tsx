'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { MetricWithComparison } from './search-favorites.types';

type Props = {
  title: string;
  metric?: MetricWithComparison;
  value?: number | string | null;
  suffix?: string;
  subtitle?: string;
};

export function SearchFavoritesMetricCard({
  title,
  metric,
  value,
  suffix = '',
  subtitle,
}: Props) {
  const displayValue = metric ? metric.value : value ?? '—';
  const trend = metric?.trend;
  const change = metric?.changePercent ?? 0;

  return (
    <Card className="rounded-2xl border bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{title}</div>

        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="text-2xl font-semibold tracking-tight">
            {displayValue}
            {suffix}
          </div>

          {metric ? (
            <div
              className={[
                'rounded-full px-2 py-1 text-xs font-medium',
                trend === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : trend === 'down'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-slate-100 text-slate-600',
              ].join(' ')}
            >
              {change > 0 ? '+' : ''}
              {change}%
            </div>
          ) : null}
        </div>

        {subtitle ? (
          <div className="mt-2 text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}