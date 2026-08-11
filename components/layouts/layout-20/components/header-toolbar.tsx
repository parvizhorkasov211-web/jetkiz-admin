"use client";

import { ClipboardList, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useLayout } from "./context";

type ApiCollectionResponse<T> =
  | T[]
  | {
      items?: T[];
      data?: T[];
    };

type ExportCourier = {
  id?: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  iin?: string | null;
  status?: string | null;
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

type CsvValue = string | number | null | undefined;

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
  const directName = String(courier.name ?? "").trim();

  if (directName) {
    return directName;
  }

  return [courier.firstName, courier.lastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function csvCell(value: CsvValue): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(
  filename: string,
  headers: string[],
  rows: CsvValue[][],
): void {
  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function HeaderToolbar() {
  const { isMobile } = useLayout();
  const router = useRouter();
  const pathname = usePathname();

  const isCouriersPage = pathname === "/layout-20/couriers";
  const isCouriersNewPage = pathname === "/layout-20/couriers/new";

  const isRestaurantsPage = pathname === "/layout-20/restaurants";
  const isRestaurantsNewPage = pathname === "/layout-20/restaurants/new";

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
    const data = (await apiFetch("/couriers")) as ApiCollectionResponse<ExportCourier>;
    const couriers = normalizeCollection(data);

    downloadCsv(
      "couriers.csv",
      [
        "ID",
        "Имя/Фамилия",
        "Телефон",
        "ИИН",
        "Статус",
        "Комиссия override (%)",
      ],
      couriers.map((courier) => [
        courier.id ?? "",
        buildCourierName(courier),
        courier.phone ?? courier.user?.phone ?? "",
        courier.iin ?? "",
        courier.status ?? "",
        courier.courierCommissionPctOverride ??
          courier.courierProfile?.courierCommissionPctOverride ??
          "",
      ]),
    );
  };

  const exportRestaurants = async () => {
    const data = (await apiFetch("/restaurants")) as ApiCollectionResponse<ExportRestaurant>;
    const restaurants = normalizeCollection(data);

    downloadCsv(
      "restaurants.csv",
      [
        "ID",
        "Название (RU)",
        "Название (KZ)",
        "Статус",
        "Адрес",
        "Телефон",
        "Комиссия",
      ],
      restaurants.map((restaurant) => [
        restaurant.id ?? "",
        restaurant.nameRu ?? "",
        restaurant.nameKk ?? "",
        restaurant.status ?? "",
        restaurant.address ?? "",
        restaurant.phone ?? "",
        restaurant.commissionPct ?? "",
      ]),
    );
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
    (isCouriersPage && !isCouriersNewPage) ||
    (isRestaurantsPage && !isRestaurantsNewPage);

  const addButtonLabel = isCouriersPage
    ? "Добавить курьера"
    : isRestaurantsPage
      ? "Добавить ресторан"
      : null;

  const showExportButton = isCouriersPage || isRestaurantsPage;

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
