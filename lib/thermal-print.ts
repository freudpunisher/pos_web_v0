"use client"

export interface ReceiptData {
  header: { name: string; address?: string; phone?: string; taxId?: string; rcNumber?: string; nifNumber?: string }
  orderId: string
  date: Date
  client?: string
  cashier?: string
  waiter?: string
  table?: string
  items: { name: string; quantity: number; price: number; total: number }[]
  total: number
  paymentMethod?: string
  currencySymbol?: string
  billReference?: string
  simple?: boolean
}

export function printThermal(data: ReceiptData): void {
  const fmt = (n: number) =>
    `${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${data.currencySymbol || "Fbu"}`
  const w = window.open("", "_blank", "width=400,height=650")
  if (!w) return

  const itemsHtml = data.simple
    ? data.items
        .map(
          (i) =>
            `<tr>
              <td style="text-align:left;width:8mm;padding:0.5mm 0;">${i.quantity}x</td>
              <td style="text-align:left;padding:0.5mm 0 0.5mm 1mm;">${i.name}</td>
            </tr>`,
        )
        .join("")
    : data.items
        .map(
          (i) =>
            `<tr>
              <td style="text-align:left;width:8mm;padding:0.5mm 0;">${i.quantity}x</td>
              <td style="text-align:left;padding:0.5mm 0 0.5mm 1mm;">${i.name}</td>
              <td style="text-align:right;padding:0.5mm 0;width:12mm;">${fmt(i.price)}</td>
              <td style="text-align:right;padding:0.5mm 0;width:12mm;">${fmt(i.total)}</td>
            </tr>`,
        )
        .join("")

  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${data.orderId.slice(0, 8)}</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      width: 72mm;
      margin: 0 auto;
      padding: 3mm 2mm;
      color: #111;
      background: #fff;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .header { text-align: center; margin-bottom: 2mm; padding-bottom: 2mm; }
    .header .logo { max-width: 60mm; max-height: 20mm; margin-bottom: 1mm; }
    .header .sub { font-size: 9px; color: #555; margin-top: 0.5mm; }
    .header .tax { font-size: 9px; color: #555; }
    .divider { border: none; border-top: 1px dashed #333; margin: 1.5mm 0; }
    .divider-thick { border: none; border-top: 2px solid #111; margin: 1.5mm 0; }
    .info-line { font-size: 10px; margin: 0.3mm 0; text-align: center; }
    .info-label { color: #555; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    td { vertical-align: top; }
    .items-header td { font-weight: bold; padding: 0.5mm 0; border-bottom: 1px dashed #333; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .total-block { display: flex; justify-content: space-between; align-items: center; padding: 1mm 0; }
    .total-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .total-value { font-size: 16px; font-weight: bold; }
    .payment-line { text-align: center; font-size: 10px; margin-top: 0.5mm; padding: 0.5mm 0; }
    .payment-line strong { letter-spacing: 1px; }
    .footer { text-align: center; margin-top: 2mm; padding-top: 1mm; font-size: 9px; color: #555; }
    .barcode { text-align: center; font-size: 9px; letter-spacing: 4px; font-family: 'Courier New', monospace; margin: 1.5mm 0; color: #333; }
    .qr-placeholder { text-align: center; margin: 1mm 0; }
    .qr-placeholder span { font-size: 16px; letter-spacing: 2px; }
  </style>
</head>
<body>

  <!-- Store Header -->
  <div class="header">
    <div style="font-size:16px;font-weight:bold;letter-spacing:2px;margin-bottom:1mm;">${data.header.name}</div>
    ${data.header.address ? `<div class="sub">${data.header.address}</div>` : ""}
    ${data.header.phone ? `<div class="sub">Tel: ${data.header.phone}</div>` : ""}
    ${data.header.taxId ? `<div class="tax">NIF: ${data.header.taxId}</div>` : ""}
    ${data.header.rcNumber ? `<div class="tax">RC: ${data.header.rcNumber}</div>` : ""}
    ${data.header.nifNumber ? `<div class="tax">NIF: ${data.header.nifNumber}</div>` : ""}
  </div>

  <div class="divider-thick"></div>

  <!-- Transaction Info -->
  <div class="info-line" style="font-size:14px;font-weight:bold;letter-spacing:2px;margin-bottom:1mm;">${data.billReference || `#${data.orderId.slice(0, 8).toUpperCase()}`}</div>
  <div class="info-line"><span class="info-label">Date</span> ${data.date.toLocaleDateString()} ${data.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
  ${data.client ? `<div class="info-line"><span class="info-label">Client</span> ${data.client}</div>` : ""}
  ${data.cashier ? `<div class="info-line"><span class="info-label">Cashier</span> ${data.cashier}</div>` : ""}
  ${data.waiter ? `<div class="info-line"><span class="info-label">Waiter</span> ${data.waiter}</div>` : ""}
  ${data.table ? `<div class="info-line"><span class="info-label">Table</span> ${data.table}</div>` : ""}

  <div class="divider"></div>

  <!-- Items Table -->
  <table>
    <tr class="items-header">
      <td style="width:8mm;">QTY</td>
      <td style="padding:0 1mm;">DESCRIPTION</td>
      ${data.simple ? "" : `<td style="text-align:right;width:14mm;">PRICE</td>
      <td style="text-align:right;width:14mm;">TOTAL</td>`}
    </tr>
    ${itemsHtml}
  </table>

  ${data.simple ? `<div class="divider-thick"></div>` : `
  <div class="divider"></div>

  <!-- Total -->
  <div class="total-block">
    <span class="total-label">Total</span>
    <span class="total-value">${fmt(data.total)}</span>
  </div>

  <!-- Payment Method -->
  <div class="divider"></div>
  <div class="payment-line">
    Payment: <strong>${data.paymentMethod === "cash" ? "ESPÈCES" : data.paymentMethod === "credit" ? "CRÉDIT" : (data.paymentMethod || "EN ATTENTE").toUpperCase()}</strong>
  </div>

  <div class="divider-thick"></div>`}

  <!-- Footer -->
  <div class="barcode">* ${data.orderId.slice(0, 12).toUpperCase()} *</div>
  <div class="footer">
    <p>Thank you for your visit!</p>
    <p>${new Date().toLocaleDateString()}</p>
  </div>

  <script>window.print();window.close();</script>
</body>
</html>`)
  w.document.close()
}
