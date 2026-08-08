"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, Package, Search, Store, X } from "lucide-react";
import { apiFetch, API_URL } from "@/lib/api";

type RuntimeStatus = "OPEN" | "CLOSED";

type PickerRestaurant = {
  id: string;
  nameRu: string;
  nameKk: string;
  productsCount: number;
  matchedProductsCount: number;
  runtimeStatus?: RuntimeStatus;
  isInApp?: boolean;
  isAcceptingOrders?: boolean;
  blockedAt?: string | null;
};

type PickerItem = {
  id: string;
  titleRu: string;
  titleKk: string;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  restaurantId: string;
  restaurantNameRu: string;
  restaurantNameKk: string;
  restaurantRuntimeStatus?: RuntimeStatus;
  restaurantIsInApp?: boolean;
  restaurantIsAcceptingOrders?: boolean;
  restaurantBlockedAt?: string | null;
};

type ProductsPickerResponse = {
  restaurants: PickerRestaurant[];
  items: PickerItem[];
};

type CategoryProductDraft = {
  productId: string;
  sortOrder: number;
  isActive: boolean;
  product: {
    id: string;
    titleRu: string;
    titleKk: string;
    price: number;
    imageUrl: string | null;
    isAvailable: boolean;
    restaurantId: string;
    restaurant: {
      id: string;
      nameRu: string;
      nameKk: string;
      runtimeStatus?: RuntimeStatus;
    };
  };
};

const API_BASE = API_URL;

function resolveImageUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

function toDraft(item: PickerItem, sortOrder: number): CategoryProductDraft {
  return {
    productId: item.id,
    sortOrder,
    isActive: true,
    product: {
      id: item.id,
      titleRu: item.titleRu,
      titleKk: item.titleKk,
      price: item.price,
      imageUrl: item.imageUrl || null,
      isAvailable: item.isAvailable,
      restaurantId: item.restaurantId,
      restaurant: {
        id: item.restaurantId,
        nameRu: item.restaurantNameRu,
        nameKk: item.restaurantNameKk,
        runtimeStatus: item.restaurantRuntimeStatus,
      },
    },
  };
}

function canPublish(item: PickerItem) {
  return (
    item.isAvailable === true &&
    item.restaurantRuntimeStatus !== "CLOSED" &&
    item.restaurantIsInApp !== false &&
    item.restaurantIsAcceptingOrders !== false &&
    !item.restaurantBlockedAt
  );
}

export default function ProductsPickerModal({
  categoryId,
  categoryTitle,
  existingProductIds,
  nextSortOrder,
  onClose,
  onApply,
}: {
  categoryId?: string;
  categoryTitle: string;
  existingProductIds: string[];
  nextSortOrder: number;
  onClose: () => void;
  onApply: (items: CategoryProductDraft[]) => void;
}) {
  const requestSeq = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [restaurants, setRestaurants] = useState<PickerRestaurant[]>([]);
  const [items, setItems] = useState<PickerItem[]>([]);
  const [selectedDrafts, setSelectedDrafts] = useState<Record<string, CategoryProductDraft>>({});

  const existingIds = useMemo(() => new Set(existingProductIds), [existingProductIds]);
  const selectedCount = Object.keys(selectedDrafts).length;

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);

      try {
        const search = new URLSearchParams();
        if (categoryId) search.set("categoryId", categoryId);
        if (query.trim()) search.set("q", query.trim());
        if (selectedRestaurantId) search.set("restaurantId", selectedRestaurantId);

        const data = await apiFetch<ProductsPickerResponse>(
          `/home-cms/admin/products-picker?${search.toString()}`,
        );

        if (seq !== requestSeq.current) return;
        setRestaurants(Array.isArray(data.restaurants) ? data.restaurants : []);
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (cause) {
        if (seq !== requestSeq.current) return;
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить список блюд");
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [categoryId, query, selectedRestaurantId]);

  function toggleItem(item: PickerItem) {
    if (existingIds.has(item.id) || !canPublish(item)) return;
    setSelectedDrafts((current) => {
      if (current[item.id]) {
        const next = { ...current };
        delete next[item.id];
        return next;
      }
      const sortOrder = nextSortOrder + Object.keys(current).length;
      return { ...current, [item.id]: toDraft(item, sortOrder) };
    });
  }

  function applySelection() {
    const payload = Object.values(selectedDrafts).map((item, index) => ({
      ...item,
      sortOrder: nextSortOrder + index,
    }));
    onApply(payload);
  }

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">Добавить блюда</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Категория: <span className="font-bold text-slate-800">{categoryTitle || "Без названия"}</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[1fr_280px_auto] lg:items-end">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Поиск по блюду или ресторану</span>
            <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 focus-within:border-slate-900"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Суши, бургер, ресторан..." className="h-full w-full bg-transparent text-sm outline-none" /></div>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Ресторан</span>
            <select value={selectedRestaurantId} onChange={(event) => setSelectedRestaurantId(event.target.value)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none"><option value="">Все рестораны</option>{restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.nameRu || restaurant.nameKk}</option>)}</select>
          </label>
          <div className="flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white">Новых выбрано: {selectedCount}</div>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_1fr]">
          <aside className="hidden overflow-auto border-r border-slate-200 bg-slate-50/70 p-3 lg:block">
            <button type="button" onClick={() => setSelectedRestaurantId("")} className={`mb-2 w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold ${selectedRestaurantId === "" ? "bg-slate-950 text-white" : "bg-white text-slate-800 hover:bg-slate-100"}`}>Все рестораны</button>
            <div className="space-y-2">
              {restaurants.map((restaurant) => {
                const active = selectedRestaurantId === restaurant.id;
                const closed = restaurant.runtimeStatus === "CLOSED";
                return (
                  <button key={restaurant.id} type="button" onClick={() => setSelectedRestaurantId(restaurant.id)} className={`w-full rounded-xl border px-3 py-2.5 text-left ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"}`}>
                    <div className="flex items-start gap-2"><Store className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} /><div className="min-w-0"><div className="truncate text-sm font-extrabold">{restaurant.nameRu || restaurant.nameKk}</div><div className={`mt-1 text-xs ${active ? "text-white/70" : "text-slate-500"}`}>{restaurant.productsCount} блюд{query.trim() ? ` · найдено ${restaurant.matchedProductsCount}` : ""}</div>{closed ? <div className={`mt-1 text-[11px] font-bold ${active ? "text-amber-200" : "text-amber-700"}`}>Сейчас закрыт</div> : null}</div></div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="min-h-0 overflow-auto p-4">
            {error ? <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}
            {loading ? (
              <div className="flex min-h-[360px] items-center justify-center"><div className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Загрузка блюд...</div></div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-slate-500"><Package className="mb-3 h-8 w-8 text-slate-300" /><div className="text-sm font-bold text-slate-700">Ничего не найдено</div><div className="mt-1 text-xs">Измени поиск или выбери другой ресторан</div></div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {items.map((item) => {
                  const existing = existingIds.has(item.id);
                  const selected = Boolean(selectedDrafts[item.id]);
                  const publishable = canPublish(item);
                  const disabled = existing || !publishable;
                  return (
                    <button key={item.id} type="button" disabled={disabled} onClick={() => toggleItem(item)} className={`relative rounded-xl border p-3 text-left transition ${existing ? "cursor-default border-amber-200 bg-amber-50/70" : selected ? "border-slate-950 bg-slate-950 text-white" : publishable ? "border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm" : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-75"}`}>
                      <div className="flex gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">{item.imageUrl ? <img src={resolveImageUrl(item.imageUrl)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><Package className="h-5 w-5" /></div>}</div>
                        <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-extrabold">{item.titleRu || item.titleKk || "Без названия"}</div><div className={`mt-0.5 truncate text-xs ${selected ? "text-white/70" : "text-slate-500"}`}>{item.restaurantNameRu || item.restaurantNameKk}</div></div><div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${existing ? "border-amber-300 bg-amber-100 text-amber-700" : selected ? "border-white/40 bg-white text-slate-950" : "border-slate-300 bg-white text-transparent"}`}><Check className="h-3.5 w-3.5" /></div></div>
                          <div className="mt-2 flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${selected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>{item.price} ₸</span>{existing ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">Уже в категории</span> : null}{!item.isAvailable ? <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-bold text-red-700">Блюдо недоступно</span> : null}{item.restaurantRuntimeStatus === "CLOSED" ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">Ресторан закрыт</span> : null}</div>
                          {!publishable && !existing ? <div className={`mt-2 flex items-start gap-1.5 text-[11px] font-semibold ${selected ? "text-white/80" : "text-slate-500"}`}><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />Сейчас это блюдо не попадёт в клиентское приложение, поэтому выбор отключён.</div> : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </main>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-medium text-slate-500">Выбор сохраняется при поиске и переключении ресторанов.</div>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700">Отмена</button><button type="button" onClick={applySelection} disabled={selectedCount === 0} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-40"><Check className="h-4 w-4" />Добавить выбранные ({selectedCount})</button></div>
        </div>
      </div>
    </div>
  );
}
