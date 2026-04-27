"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  CourierMetricsExportRange,
  CourierMetricsExportTab,
  downloadCourierMetricsExcel,
} from "@/lib/courierMetrics/courierMetrics-export.client";

type CourierMetricsExportButtonProps = {
  tab: CourierMetricsExportTab;
  range: CourierMetricsExportRange;
  search?: string;
  disabled?: boolean;
};

export function CourierMetricsExportButton({
  tab,
  range,
  search,
  disabled,
}: CourierMetricsExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const isDisabled = Boolean(disabled || loading);

  async function handleExport() {
    if (isDisabled) return;

    setLoading(true);

    try {
      await downloadCourierMetricsExcel({
        tab,
        range,
        search,
      });
    } catch (error) {
      console.error("Courier metrics Excel export failed:", error);
      window.alert("Не удалось выгрузить Excel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isDisabled}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 10,
        border: "1px solid #E5E7EB",
        background: isDisabled ? "#F1F5F9" : "#FFFFFF",
        color: isDisabled ? "#94A3B8" : "#0F172A",
        fontSize: 13,
        fontWeight: 750,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: isDisabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <Download size={16} />
      {loading ? "Выгрузка..." : "Выгрузить Excel"}
    </button>
  );
}