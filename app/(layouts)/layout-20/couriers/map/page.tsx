'use client';

import 'leaflet/dist/leaflet.css';

import dynamic from 'next/dynamic';

const CouriersMapView = dynamic(
  () =>
    import('../../../../../components/ui/widgets/couriers-map/CouriersMapView'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        Загрузка карты курьеров...
      </div>
    ),
  },
);

export default function CouriersMapPage() {
  return <CouriersMapView />;
}