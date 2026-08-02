import type { AnalyticsDataset, DateRange, Kpis } from "./types";

export type ExportTable = { columns: string[]; rows: Array<Array<string | number>> };

function toCsv(table: ExportTable) {
  return [table.columns, ...table.rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(table: ExportTable, filename: string) {
  download(new Blob(["\ufeff", toCsv(table)], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

/** Excel-compatible single-sheet XML — opens natively in Excel and Numbers. */
export function exportExcel(table: ExportTable, filename: string) {
  const escape = (value: string | number) =>
    String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const head = `<tr>${table.columns.map((column) => `<th>${escape(column)}</th>`).join("")}</tr>`;
  const body = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`)
    .join("");
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head><body><table border="1">${head}${body}</table></body></html>`;
  download(new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" }), `${filename}.xls`);
}

function reportHtml(
  title: string,
  subtitle: string,
  kpis: Array<{ label: string; value: string }>,
  table: ExportTable,
  isAr: boolean,
) {
  const escape = (value: string | number) =>
    String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<!doctype html><html dir="${isAr ? "rtl" : "ltr"}" lang="${isAr ? "ar" : "en"}"><head><meta charset="utf-8" />
<title>${escape(title)}</title>
<style>
  body{font-family:system-ui,"Noto Kufi Arabic",sans-serif;margin:32px;color:#3d2b1f;}
  h1{font-size:22px;margin:0 0 4px;} p.sub{margin:0 0 20px;color:#806f65;font-size:13px;}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:22px;}
  .kpi{border:1px solid #e7dccd;border-radius:12px;padding:10px 12px;}
  .kpi small{display:block;color:#806f65;font-size:11px;} .kpi strong{font-size:16px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th,td{border-bottom:1px solid #e7dccd;padding:7px 8px;text-align:${isAr ? "right" : "left"};}
  th{background:#faf5ee;}
</style></head><body>
<h1>${escape(title)}</h1><p class="sub">${escape(subtitle)}</p>
<div class="kpis">${kpis
    .map((kpi) => `<div class="kpi"><small>${escape(kpi.label)}</small><strong>${escape(kpi.value)}</strong></div>`)
    .join("")}</div>
<table><thead><tr>${table.columns.map((column) => `<th>${escape(column)}</th>`).join("")}</tr></thead>
<tbody>${table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
}

export function printReport(
  options: {
    title: string;
    subtitle: string;
    kpis: Array<{ label: string; value: string }>;
    table: ExportTable;
    isAr: boolean;
  },
) {
  const win = window.open("", "_blank", "width=1024,height=768");
  if (!win) return false;
  win.document.write(reportHtml(options.title, options.subtitle, options.kpis, options.table, options.isAr));
  win.document.close();
  return true;
}

/** PDF export goes through the browser print pipeline (Save as PDF). */
export const exportPdf = printReport;

export function datasetSummary(data: AnalyticsDataset, kpis: Kpis, range: DateRange) {
  return { rows: data.sales.length, revenue: kpis.revenue, range };
}