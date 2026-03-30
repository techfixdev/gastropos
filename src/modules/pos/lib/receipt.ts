"use client";

import { money } from "./money";
import type {
  Branch,
  FiscalInvoice,
  Sale,
  TicketPrinterConfig,
  TicketReceipt,
} from "../store/use-pos-store";

type ReceiptPayload = {
  sale: Sale;
  receipt: TicketReceipt;
  branch: Branch | null;
  printer: TicketPrinterConfig | null;
  fiscalInvoice?: FiscalInvoice | null;
};

const dtf = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatQty(value: number, weighable: boolean) {
  return weighable ? `${value.toFixed(3)} kg` : `${value}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildReceiptHtml({ sale, receipt, branch, printer, fiscalInvoice }: ReceiptPayload) {
  const width = printer?.paperWidthMm ?? receipt.paperWidthMm ?? 80;
  const items = sale.items
    .map((item) => {
      const modifiers =
        item.modifiers.length > 0
          ? `<div class="mods">${item.modifiers.map((modifier) => escapeHtml(modifier.modifierName)).join(", ")}</div>`
          : "";
      return `
        <div class="row item">
          <div>
            <div class="name">${escapeHtml(item.productName)}</div>
            <div class="meta">${escapeHtml(formatQty(item.qty, item.isWeighable))} x ${escapeHtml(
              money(item.basePrice + item.modifiers.reduce((acc, modifier) => acc + modifier.priceDelta, 0))
            )}</div>
            ${modifiers}
          </div>
          <div class="amount">${escapeHtml(
            money((item.basePrice + item.modifiers.reduce((acc, modifier) => acc + modifier.priceDelta, 0)) * item.qty)
          )}</div>
        </div>
      `;
    })
    .join("");
  const payments = sale.payments
    .map(
      (payment) => `
        <div class="row pay">
          <div>
            <div>${escapeHtml(payment.method)}</div>
            ${
              payment.reference || payment.cardBrand || payment.last4
                ? `<div class="meta">${escapeHtml(
                    [payment.cardBrand, payment.last4 ? `****${payment.last4}` : null, payment.reference]
                      .filter(Boolean)
                      .join(" | ")
                  )}</div>`
                : ""
            }
          </div>
          <div class="amount">${escapeHtml(money(payment.amount))}</div>
        </div>
      `
    )
    .join("");

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Ticket ${escapeHtml(receipt.receiptNumber)}</title>
      <style>
        @page { size: ${width}mm auto; margin: 4mm; }
        body {
          font-family: "Comic Neue", "Trebuchet MS", sans-serif;
          color: #1f2937;
          margin: 0;
          padding: 0;
        }
        .ticket {
          width: ${width - 8}mm;
          margin: 0 auto;
          font-size: 11px;
          line-height: 1.35;
        }
        .center { text-align: center; }
        .title {
          font-family: "DynaPuff", "Comic Sans MS", cursive;
          font-size: 18px;
          margin: 0 0 2mm;
        }
        .box {
          border: 1px dashed #94a3b8;
          border-radius: 10px;
          padding: 3mm;
          margin-bottom: 3mm;
          background: #fffef8;
        }
        .row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin: 1.2mm 0;
        }
        .item { align-items: flex-start; }
        .amount { white-space: nowrap; font-weight: 700; }
        .name { font-weight: 700; }
        .meta, .mods, .small { color: #64748b; font-size: 10px; }
        .totals {
          border-top: 1px dashed #94a3b8;
          margin-top: 2mm;
          padding-top: 2mm;
        }
        .big { font-size: 13px; font-weight: 700; }
      </style>
    </head>
    <body>
      <main class="ticket">
        <section class="box center">
          <h1 class="title">${escapeHtml(branch?.name ?? "GastroPOS")}</h1>
          <div>${escapeHtml(branch?.code ?? "LOCAL")}</div>
          <div class="small">Ticket ${escapeHtml(receipt.receiptNumber)}</div>
          <div class="small">${escapeHtml(dtf.format(new Date(sale.createdAt)))}</div>
        </section>
        <section class="box">
          ${items}
          <div class="totals">
            <div class="row"><span>Subtotal</span><span>${escapeHtml(money(sale.subtotal))}</span></div>
            <div class="row"><span>IVA</span><span>${escapeHtml(money(sale.tax))}</span></div>
            <div class="row big"><span>Total</span><span>${escapeHtml(money(sale.total))}</span></div>
          </div>
        </section>
        <section class="box">
          <div class="name">Cobro</div>
          ${payments}
        </section>
        ${
          sale.customerName || sale.customerDocument
            ? `<section class="box">
                <div class="name">Cliente</div>
                ${sale.customerName ? `<div>${escapeHtml(sale.customerName)}</div>` : ""}
                ${sale.customerDocument ? `<div class="small">Doc: ${escapeHtml(sale.customerDocument)}</div>` : ""}
              </section>`
            : ""
        }
        ${
          fiscalInvoice
            ? `<section class="box">
                <div class="name">Fiscal</div>
                <div>${escapeHtml(fiscalInvoice.provider.toUpperCase())} - ${escapeHtml(fiscalInvoice.status)}</div>
                ${
                  fiscalInvoice.documentNumber
                    ? `<div class="small">Comprobante: ${escapeHtml(fiscalInvoice.documentNumber)}</div>`
                    : ""
                }
              </section>`
            : ""
        }
        <section class="center small">
          <div>Impresora: ${escapeHtml(printer?.name ?? "Navegador")}</div>
          <div>Gracias por su compra</div>
        </section>
      </main>
      <script>
        window.addEventListener("load", () => {
          setTimeout(() => window.print(), 120);
        });
      </script>
    </body>
  </html>`;
}

export function printSaleReceipt(payload: ReceiptPayload): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: false, error: "Solo disponible en navegador" };
  const popup = window.open("", "_blank", "width=480,height=720");
  if (!popup) return { ok: false, error: "El navegador bloqueo la ventana de impresion" };
  popup.document.open();
  popup.document.write(buildReceiptHtml(payload));
  popup.document.close();
  return { ok: true };
}
