"use client";

import { X, Wallet, Clock, CheckCircle2, PackageCheck, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import type { CourierMetricsPeriod } from "./CourierMetricsPeriodSelect";

type Props = {
  courierUserId: string | null;
  period: CourierMetricsPeriod;
  open: boolean;
  onClose: () => void;
};

type CourierDetails = {
  courier: {
    courierUserId: string;
    courierNumber: number | null;
    fullName: string;
    isOnline: boolean;
    blocked: boolean;
    sleeping: boolean;
    lastActiveAt: string | null;
  };
  totals: {
    createdOrders: number;
    delivered: number;
    canceled: number;
    rejected: number;
    completionRatePct: number;
    cancelRatePct: number;
    rejectRatePct: number;
  };
  speed: {
    avgAssignToPickupMin: number;
    avgPickupToDeliveryMin: number;
    avgAssignToDeliveryMin: number;
    onTimeRatePct: number;
    lateRatePct: number;
    lateCount: number;
    avgLateMinutes: number;
    maxLateMinutes: number;
  };
  finance: {
    gross: number;
    commission: number;
    net: number;
    bonus: number;
    paidOut: number;
    payoutDue: number;
    avgNetPerDelivered: number;
  };
  recentOrders: Array<{
    orderId: string;
    orderNumber: number | null;
    status: string;
    total: number;
    net: number;
    createdAt: string;
    deliveredAt: string | null;
    onTime: boolean | null;
    lateMinutes: number;
  }>;
};

function money(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value || 0) + " ₸";
}

function date(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 14,
        padding: 14,
        background: "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ color: "#64748B", fontSize: 12, fontWeight: 750 }}>
            {title}
          </div>
          <div
            style={{
              marginTop: 6,
              color: "#0F172A",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            {value}
          </div>
        </div>
        <div style={{ color: "#6366F1" }}>{icon}</div>
      </div>
    </div>
  );
}

export function CourierMetricsCourierDrawer({
  courierUserId,
  period,
  open,
  onClose,
}: Props) {
  const [data, setData] = useState<CourierDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let alive = true;

    const load = async () => {
      if (!courierUserId) {
        setData(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(
          `/couriers/metrics/by-courier?courierUserId=${encodeURIComponent(courierUserId)}&range=${period}&recentLimit=10`
        );

        if (alive) {
          setData(response as CourierDetails);
        }
      } catch {
        if (alive) {
          setData(null);
          setError("Не удалось загрузить аналитику курьера");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [open, courierUserId, period]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.32)",
          zIndex: 200,
        }}
      />

      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 520,
          maxWidth: "100vw",
          height: "100vh",
          background: "#F8FAFC",
          zIndex: 201,
          boxShadow: "-24px 0 60px rgba(15,23,42,0.22)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "#FFFFFF",
            borderBottom: "1px solid #E5E7EB",
            padding: 20,
            zIndex: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: "#0F172A",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              Аналитика курьера
            </h2>
            <p style={{ margin: "6px 0 0", color: "#64748B", fontWeight: 650 }}>
              Подробные метрики за выбранный период
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              background: "#FFFFFF",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {!courierUserId && !loading && (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 16,
                padding: 20,
                fontWeight: 800,
                color: "#475569",
              }}
            >
              Не выбран курьер
            </div>
          )}

          {loading && (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 16,
                padding: 20,
                fontWeight: 800,
              }}
            >
              Загружаем аналитику...
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #FECACA",
                borderRadius: 16,
                padding: 20,
                fontWeight: 800,
                color: "#B91C1C",
              }}
            >
              {error}
            </div>
          )}

          {!loading && data && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <section
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 18,
                  padding: 18,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900, color: "#0F172A" }}>
                  {data.courier.fullName || "Курьер"}
                </div>
                <div style={{ marginTop: 4, color: "#64748B", fontWeight: 700 }}>
                  #{data.courier.courierNumber ?? "—"} · Последняя активность:{" "}
                  {date(data.courier.lastActiveAt)}
                </div>
              </section>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <StatCard title="Доставлено" value={data.totals.delivered} icon={<PackageCheck size={22} />} />
                <StatCard title="Выполнение" value={`${data.totals.completionRatePct}%`} icon={<CheckCircle2 size={22} />} />
                <StatCard title="Вовремя" value={`${data.speed.onTimeRatePct}%`} icon={<Clock size={22} />} />
                <StatCard title="Опозданий" value={data.speed.lateCount} icon={<AlertTriangle size={22} />} />
              </div>

              <section
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 18,
                  padding: 18,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                  Деньги
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginTop: 14,
                  }}
                >
                  <StatCard title="Начислено" value={money(data.finance.gross)} icon={<Wallet size={22} />} />
                  <StatCard title="Курьеру чистыми" value={money(data.finance.net)} icon={<Wallet size={22} />} />
                  <StatCard title="Выплачено" value={money(data.finance.paidOut)} icon={<Wallet size={22} />} />
                  <StatCard title="К выплате" value={money(data.finance.payoutDue)} icon={<Wallet size={22} />} />
                </div>
              </section>

              <section
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 18,
                  padding: 18,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                  Скорость
                </h3>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <div>Назначение → Забрал: <b>{data.speed.avgAssignToPickupMin} мин.</b></div>
                  <div>Забрал → Доставил: <b>{data.speed.avgPickupToDeliveryMin} мин.</b></div>
                  <div>Назначение → Доставил: <b>{data.speed.avgAssignToDeliveryMin} мин.</b></div>
                  <div>Среднее опоздание: <b>{data.speed.avgLateMinutes} мин.</b></div>
                  <div>Максимальное опоздание: <b>{data.speed.maxLateMinutes} мин.</b></div>
                </div>
              </section>

              <section
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 18,
                  padding: 18,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                  Последние заказы
                </h3>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {data.recentOrders.length === 0 && (
                    <div style={{ color: "#64748B", fontWeight: 700 }}>
                      Заказов пока нет
                    </div>
                  )}

                  {data.recentOrders.map((order) => (
                    <div
                      key={order.orderId}
                      style={{
                        border: "1px solid #E5E7EB",
                        borderRadius: 12,
                        padding: 12,
                        background: "#F8FAFC",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <b>Заказ #{order.orderNumber ?? "—"}</b>
                        <b>{money(order.net)}</b>
                      </div>
                      <div style={{ marginTop: 5, color: "#64748B", fontSize: 13 }}>
                        {order.status} · создан: {date(order.createdAt)} · доставлен:{" "}
                        {date(order.deliveredAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
