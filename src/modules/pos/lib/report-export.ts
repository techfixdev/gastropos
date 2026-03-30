"use client";

import type { Sale, ShiftClose } from "../store/use-pos-store";

function escapeCsv(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const headerLine = headers.map(escapeCsv).join(",");
  const body = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  return `${headerLine}\n${body}`;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportSalesCsv(sales: Sale[]) {
  const rows = sales.map((sale) => [
    sale.id,
    sale.createdAt,
    sale.paymentMethod,
    sale.payments.map((payment) => `${payment.method}:${payment.amount}`).join(" | "),
    sale.items.length,
    sale.subtotal,
    sale.tax,
    sale.total,
    sale.syncStatus,
    sale.syncAttempts,
    sale.syncedAt,
    sale.syncError,
  ]);

  const csv = buildCsv(
    [
      "id",
      "created_at",
      "payment_method",
      "payments",
      "item_lines",
      "subtotal",
      "tax",
      "total",
      "sync_status",
      "sync_attempts",
      "synced_at",
      "sync_error",
    ],
    rows
  );

  downloadTextFile(`ventas_${new Date().toISOString()}.csv`, csv, "text/csv;charset=utf-8;");
}

export function exportShiftClosuresCsv(closures: ShiftClose[]) {
  const rows = closures.map((closure) => [
    closure.id,
    closure.shiftOpenedAt,
    closure.closedAt,
    closure.openingAmount,
    closure.cashSalesTotal,
    closure.manualInTotal,
    closure.manualOutTotal,
    closure.expectedCash,
    closure.countedCash,
    closure.cashVariance,
    closure.note,
    closure.ticketCount,
    closure.totalAmount,
    closure.syncedCount,
    closure.pendingCount,
    closure.syncStatus,
    closure.syncAttempts,
    closure.syncedAt,
    closure.syncError,
  ]);

  const csv = buildCsv(
    [
      "id",
      "shift_opened_at",
      "closed_at",
      "opening_amount",
      "cash_sales_total",
      "manual_in_total",
      "manual_out_total",
      "expected_cash",
      "counted_cash",
      "cash_variance",
      "note",
      "ticket_count",
      "total_amount",
      "synced_count",
      "pending_count",
      "sync_status",
      "sync_attempts",
      "synced_at",
      "sync_error",
    ],
    rows
  );

  downloadTextFile(`cierres_${new Date().toISOString()}.csv`, csv, "text/csv;charset=utf-8;");
}
