export interface CSVColumn {
  key: string;
  label: string;
}

export function exportToCSV(
  data: any[],
  columns: CSVColumn[],
  filename: string
): void {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn("exportToCSV: 数据为空，无法导出");
    return;
  }

  const headerRow = columns.map((col) => escapeCSV(col.label)).join(",");

  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) {
          return escapeCSV("");
        }
        return escapeCSV(String(value));
      })
      .join(",")
  );

  const csvContent = [headerRow, ...dataRows].join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
