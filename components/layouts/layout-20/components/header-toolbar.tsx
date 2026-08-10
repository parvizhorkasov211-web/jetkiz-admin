"use client";

import { ClipboardList, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { useLayout } from "./context";

type ApiCollectionResponse<T> =
  | T[]
  | {
      items?: T[];
      data?: T[];
    };

type ExportCourier = {
  id?: string;
  number?: number | null;
  name?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  iin?: string | null;
  addressText?: string | null;
  status?: string | null;
  activeOrdersCount?: number | null;
  personalFeeOverride?: number | null;
  payoutBonusAdd?: number | null;
  courierCommissionPctOverride?: number | null;
  user?: {
    phone?: string | null;
  } | null;
  courierProfile?: {
    courierCommissionPctOverride?: number | null;
  } | null;
};

type ExportRestaurant = {
  id?: string;
  nameRu?: string | null;
  nameKk?: string | null;
  status?: string | null;
  address?: string | null;
  phone?: string | null;
  commissionPct?: number | null;
};

type AdminLike = {
  roleCodes?: string[];
  roles?: string[];
  permissionCodes?: string[];
  permissions?: string[];
} | null;

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function hasPermission(admin: AdminLike, permission: string): boolean {
  const roles = [...list(admin?.roleCodes), ...list(admin?.roles)];
  const permissions = [
    ...list(admin?.permissionCodes),
    ...list(admin?.permissions),
  ];

  return (
    roles.includes("SUPER_ADMIN") ||
    permissions.includes("admin.full_access") ||
    permissions.includes(permission)
  );
}

function normalizeCollection<T>(data: ApiCollectionResponse<T>): T[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.items)) {
    return data.items;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}

function buildCourierName(courier: ExportCourier): string {
  const fullName = String(courier.fullName ?? "").trim();

  if (fullName) {
    return fullName;
  }

  const directName = String(courier.name ?? "").trim();

  if (directName) {
    return directName;
  }

  return [courier.firstName, courier.lastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function HeaderToolbar() {
  const { isMobile } = useLayout();
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminLike>(null);

  const isCouriersPage = pathname === "/layout-20/couriers";
  const isCouriersNewPage = pathname === "/layout-20/couriers/new";

  const isRestaurantsPage = pathname === "/layout-20/restaurants";
  const isRestaurantsNewPage = pathname === "/layout-20/restaurants/new";

  useEffect(() => {
    void getSession().then((session) => setAdmin(session.admin));
  }, []);

  const canCreateCourier =
    hasPermission(admin, "couriers.update") &&
    hasPermission(admin, "couriers.sensitive_read");
  const canExportCouriers = hasPermission(admin, "couriers.export");

  const handleAddClick = () => {
    if (isCouriersPage) {
      router.push("/layout-20/couriers/new");
      return;
    }

    if (isRestaurantsPage) {
      router.push("/layout-20/restaurants/new");
    }
  };

  const exportCouriers = async () => {
    if (!canExportCouriers) return;

    const data = (await apiFetch("/couriers/export")) as ApiCollectionResponse<ExportCourier>;
    const couriers = normalizeCollection(data);

    const rows = couriers.map((courier) => ({
      "Номер курьера": courier.number ?? "",
      "Имя/Фамилия": buildCourierName(courier),
      Телефон: courier.phone ?? courier.user?.phone ?? "",
      ИИН: courier.iin ?? "",
      Статус: courier.status ?? "",
      "Комиссия override (%)":
        courier.courierCommissionPctOverride ??
        courier.courierProfile?.courierCommissionPctOverride ??
        "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Couriers");
    XLSX.writeFile(workbook, "couriers.xlsx");
  };

  const exportRestaurants = async () => {
    const data = (await apiFetch("/restaurants")) as ApiCollectionResponse<ExportRestaurant>;
    const restaurants = normalizeCollection(data);

    const rows = restaurants.map((restaurant) => ({
      ID: restaurant.id ?? "",
      "Название (RU)": restaurant.nameRu ?? "",
      "Название (KZ)": restaurant.nameKk ?? "",
      Статус: restaurant.status ?? "",
      Адрес: restaurant.address ?? "",
      Телефон: restaurant.phone ?? "",
      Комиссия: restaurant.commissionPct ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Restaurants");
    XLSX.writeFile(workbook, "restaurants.xlsx");
  };

  const handleReportsClick = async () => {
    try {
      if (isCouriersPage) {
        await exportCouriers();
        return;
      }

      if (isRestaurantsPage) {
        await exportRestaurants();
      }
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  const showAddButton =
    (isCouriersPage && !isCouriersNewPage && canCreateCourier) ||
    (isRestaurantsPage && !isRestaurantsNewPage);

  const addButtonLabel = isCouriersPage
    ? "Добавить курьера"
    : isRestaurantsPage
      ? "Добавить ресторан"
      : null;

  const showExportButton =
    (isCouriersPage && canExportCouriers) || isRestaurantsPage;

  return (
    <nav className="flex items-center gap-2.5">
      {showExportButton ? (
        <button
          type="button"
          onClick={handleReportsClick}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-white hover:bg-green-700"
        >
          <ClipboardList size={18} />
          {!isMobile ? <span>Выгрузить в Excel</span> : null}
        </button>
      ) : null}

      {showAddButton && addButtonLabel ? (
        <Button variant="mono" onClick={handleAddClick}>
          <Plus />
          {!isMobile ? <span>{addButtonLabel}</span> : null}
        </Button>
      ) : null}
    </nav>
  );
}
