export type CsvColumn<T> = {
  header: string;
  value: (row: T) => unknown;
};

function escapeCsvField(value: unknown): string {
  if (value == null) return "";

  const text = String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return `"${text.replace(/"/g, '""')}"`;
}

function getLocalDateStamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((column) => escapeCsvField(column.header)).join(";");
  const rowLines = rows.map((row) =>
    columns.map((column) => escapeCsvField(column.value(row))).join(";"),
  );

  return `\uFEFF${[headerLine, ...rowLines].join("\r\n")}`;
}

export function downloadCsv<T>(
  baseFileName: string,
  rows: T[],
  columns: CsvColumn<T>[],
): void {
  const csv = buildCsv(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${baseFileName}-${getLocalDateStamp()}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
