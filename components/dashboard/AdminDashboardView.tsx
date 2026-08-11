"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  Store,
  TimerReset,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

type AnyRecord = Record<string, any>;

type LoadState = {
  orders: AnyRecord[];
  couriers: AnyRecord[];
  restaurants: AnyRecord[];
};

function unwrapList(value: unknown): AnyRecord[] {
  if (Array.isArray(value)) return value as AnyRecord[];
  if (value && typeof value === "object") {
    const source = value as AnyRecord;
    for (const key of ["items", "data", "orders", "couriers", "restaurants"]) {
      if (Array.isArray(source[key])) return source[key] as AnyRecord[];
    }
  }
  return [];
}

function todayKey(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Almaty" });
}

const ACTIVE_ORDER_STATUSES = new Set([
  "CREATED",
  "ACCEPTED",
  "COOKING",
  "READY",
  "ON_THE_WAY",
]);

export default function AdminDashboardView() {
  const [state, setState] = useState<LoadState>({
    orders: [],
    couriers: [],
    restaurants: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [orders, couriers, restaurants] = await Promise.allSettled([
      apiFetch("/orders?page=1&limit=100", { cache: "no-store" }),
      apiFetch("/couriers?page=1&limit=100", { cache: "no-store" }),
      apiFetch("/restaurants?page=1&limit=100", { cache: "no-store" }),
    ]);

    const next = {
      orders: orders.status === "fulfilled" ? unwrapList(orders.value) : [],
      couriers: couriers.status === "fulfilled" ? unwrapList(couriers.value) : [],
      restaurants:
        restaurants.status === "fulfilled" ? unwrapList(restaurants.value) : [],
    };

    setState(next);
    if (
      orders.status === "rejected" &&
      couriers.status === "rejected" &&
      restaurants.status === "rejected"
    ) {
      setError("Не удалось получить оперативные данные. Проверьте API и авторизацию.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    const activeOrders = state.orders.filter((order) =>
      ACTIVE_ORDER_STATUSES.has(String(order.status ?? "")),
    );
    const readyWithoutCourier = state.orders.filter(
      (order) =>
        String(order.status ?? "") === "READY" &&
        !order.courierId &&
        !order.courier,
    );
    const onlineCouriers = state.couriers.filter(
      (courier) =>
        (courier.isOnline === true || courier.online === true) &&
        !courier.blockedAt,
    );
    const busyCouriers = state.couriers.filter(
      (courier) =>
        courier.activeOrder ||
        courier.activeOrderId ||
        String(courier.status ?? "").toUpperCase() === "BUSY",
    );
    const openRestaurants = state.restaurants.filter(
      (restaurant) =>
        String(restaurant.status ?? "").toUpperCase() === "OPEN" &&
        restaurant.isInApp !== false,
    );
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Almaty",
    });
    const deliveredToday = state.orders.filter(
      (order) =>
        String(order.status ?? "") === "DELIVERED" &&
        todayKey(order.deliveredAt ?? order.updatedAt) === today,
    );

    return {
      activeOrders: activeOrders.length,
      readyWithoutCourier: readyWithoutCourier.length,
      onlineCouriers: onlineCouriers.length,
      busyCouriers: busyCouriers.length,
      openRestaurants: openRestaurants.length,
      deliveredToday: deliveredToday.length,
    };
  }, [state]);

  const cards = [
    { title: "Активные заказы", value: metrics.activeOrders, icon: ShoppingBag, href: "/layout-20/orders" },
    { title: "Готовы без курьера", value: metrics.readyWithoutCourier, icon: AlertTriangle, href: "/layout-20/orders", critical: metrics.readyWithoutCourier > 0 },
    { title: "Курьеры онлайн", value: metrics.onlineCouriers, icon: Bike, href: "/layout-20/couriers" },
    { title: "Курьеры заняты", value: metrics.busyCouriers, icon: TimerReset, href: "/layout-20/couriers" },
    { title: "Открытые рестораны", value: metrics.openRestaurants, icon: Store, href: "/layout-20/restaurants" },
    { title: "Доставлено сегодня", value: metrics.deliveredToday, icon: CheckCircle2, href: "/layout-20/orders" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Обзор JETKIZ</h1>
            <p className="mt-1 text-sm text-slate-500">
              Оперативное состояние заказов, курьеров и ресторанов.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className={`rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
                  card.critical ? "border-amber-300" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-500">{card.title}</div>
                    <div className="mt-2 text-3xl font-bold">{loading ? "—" : card.value}</div>
                  </div>
                  <div className={`grid h-11 w-11 place-items-center rounded-xl ${card.critical ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link href="/layout-20/orders" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm">
            <div className="font-semibold">Управление заказами</div>
            <div className="mt-1 text-sm text-slate-500">Статусы, назначение курьера, история заказа.</div>
          </Link>
          <Link href="/layout-20/couriers/map" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm">
            <div className="font-semibold">Карта курьеров</div>
            <div className="mt-1 text-sm text-slate-500">Онлайн-курьеры и текущее распределение.</div>
          </Link>
          <Link href="/layout-20/audit" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm">
            <div className="font-semibold">Журнал действий</div>
            <div className="mt-1 text-sm text-slate-500">Контроль критических изменений в админке.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
