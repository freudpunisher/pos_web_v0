import { formatCurrency } from "./mock-data"

interface PrintReportColumn {
  header: string
  key: string
  align?: "left" | "right" | "center"
  format?: "currency" | "date" | "number" | "text"
}

interface PrintReportMetric {
  label: string
  value: string | number
  highlight?: boolean
}

interface PrintReportData {
  title: string
  subtitle?: string
  period?: string
  logoUrl?: string
  metrics: PrintReportMetric[]
  columns: PrintReportColumn[]
  rows: Record<string, any>[]
  cancelled?: boolean
}

export function printReport(data: PrintReportData) {
  const formatCell = (value: any, col: PrintReportColumn): string => {
    if (value == null || value === "") return "—"
    switch (col.format) {
      case "currency":
        return formatCurrency(Number(value))
      case "date":
        return new Date(value).toLocaleDateString()
      case "number":
        return Number(value).toLocaleString()
      default:
        return String(value)
    }
  }

  const alignStyle = (align?: string) => {
    switch (align) {
      case "right": return "text-align: right;"
      case "center": return "text-align: center;"
      default: return "text-align: left;"
    }
  }

  const metricHtml = data.metrics
    .map(
      (m) => `
      <div class="metric ${m.highlight ? "highlight" : ""}">
        <div class="metric-value">${m.value}</div>
        <div class="metric-label">${m.label}</div>
      </div>`
    )
    .join("")

  const headerHtml = data.columns
    .map(
      (col) =>
        `<th style="${alignStyle(col.align)} padding: 8px 12px; border-bottom: 2px solid #1e293b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; white-space: nowrap;">${col.header}</th>`
    )
    .join("")

  const rowHtml = data.rows
    .map(
      (row, i) => `
      <tr>
        ${data.columns
          .map(
            (col) =>
              `<td style="${alignStyle(col.align)} padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b; ${
                i % 2 === 0 ? "background: #f8fafc;" : ""
              }">${formatCell(row[col.key], col)}</td>`
          )
          .join("")}
      </tr>`
    )
    .join("")

  const cancelledOverlay = data.cancelled ? `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 999;">
      <div style="font-size: 80px; font-weight: 900; color: rgba(220, 38, 38, 0.15); text-transform: uppercase; transform: rotate(-30deg); letter-spacing: 10px; border: 6px solid rgba(220, 38, 38, 0.2); padding: 20px 40px;">
        FACTURE ANNULÉE
      </div>
    </div>` : ""

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    @page { margin: 15mm 10mm; size: A4 portrait; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      color: #0f172a;
      line-height: 1.5;
      padding: 20px;
      position: relative;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header-logo { max-height: 60px; margin-bottom: 8px; }
    .header h1 { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    .header .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
    .header .period { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .metric {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .metric.highlight { border-color: #0f172a; background: #f1f5f9; }
    .metric-value { font-size: 22px; font-weight: 700; color: #0f172a; }
    .metric-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; }
    td, th { vertical-align: middle; }
    .footer {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${cancelledOverlay}
  <div class="header">
    ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Logo" class="header-logo" />` : ""}
    <h1>${data.title}</h1>
    ${data.subtitle ? `<div class="subtitle">${data.subtitle}</div>` : ""}
    ${data.period ? `<div class="period">${data.period}</div>` : ""}
    <div class="period" style="margin-top: 4px;">${new Date().toLocaleString()}</div>
  </div>

  <div class="metrics">
    ${metricHtml}
  </div>

  <table>
    <thead>
      <tr>${headerHtml}</tr>
    </thead>
    <tbody>
      ${rowHtml || '<tr><td colspan="99" style="text-align: center; padding: 24px; color: #94a3b8; font-size: 13px;">No data found for this period</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    Smart POS System &mdash; This is a computer-generated report
  </div>

  <script>
    window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
  </script>
</body>
</html>`

  const win = window.open("", "_blank", "width=900,height=700,scrollbars=yes")
  if (!win) {
    alert("Please allow popups to print reports")
    return
  }
  win.document.write(html)
  win.document.close()
}
