export type CourierMetricsExportTab =
  | "ALL"
  | "ONLINE_IDLE"
  | "BUSY"
  | "OFFLINE"
  | "BLOCKED"
  | "SLEEPING";

export type CourierMetricsExportRange =
  | "today"
  | "7d"
  | "14d"
  | "30d"
  | "month"
  | "year";

type DownloadCourierMetricsExcelInput = {
  tab: CourierMetricsExportTab;
  range: CourierMetricsExportRange;
  search?: string;
};

function getFilenameFromDisposition(value: string | null): string {
  if (!value) return "";

  const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);

  const asciiMatch = value.match(/filename="([^"]+)"/i);
  if (asciiMatch?.[1]) return asciiMatch[1];

  return "";
}

export async function downloadCourierMetricsExcel(
  input: DownloadCourierMetricsExcelInput,
): Promise<void> {
  const params = new URLSearchParams();

  params.set("tab", input.tab);
  params.set("range", input.range);

  const search = String(input.search ?? "").trim();
  if (search) {
    params.set("search", search);
  }

  const response = await fetch(
    `/api/proxy/couriers/metrics/export.xlsx?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Excel export failed: ${response.status}`);
  }

  const blob = await response.blob();

  const filename =
    getFilenameFromDisposition(response.headers.get("content-disposition")) ||
    `jetkiz-courier-metrics-${input.range}.xlsx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}