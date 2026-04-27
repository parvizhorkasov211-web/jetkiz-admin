'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AnalyticsRange } from './search-favorites.types';

const OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: 'today', label: 'Сегодня' },
  { value: '7d', label: '7 дней' },
  { value: '14d', label: '14 дней' },
  { value: '30d', label: '30 дней' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
];

type Props = {
  value: AnalyticsRange;
  onChange: (value: AnalyticsRange) => void;
};

export function SearchFavoritesRangeSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as AnalyticsRange)}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}