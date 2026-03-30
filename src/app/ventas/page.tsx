"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BackLink } from "@/modules/core/ui/back-link";
import { ModuleGlyph } from "@/modules/core/ui/module-glyph";
import { AuthChip } from "@/modules/core/auth/auth-chip";
import { money } from "@/modules/pos/lib/money";
import { printSaleReceipt } from "@/modules/pos/lib/receipt";
import {
  exportSalesCsv,
  exportShiftClosuresCsv,
} from "@/modules/pos/lib/report-export";
import { type CashMovementType, type PreOrderStatus, usePosStore } from "@/modules/pos/store/use-pos-store";
import { SyncStatusChip } from "@/modules/pos/ui/sync-status-chip";

const dtf = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

type FilterPreset = "today" | "7d" | "30d" | "custom" | "all";

function toInputDateTime(value: Date) {
  const iso = new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString();
  return iso.slice(0, 16);
}

function parseInputDateTime(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function getRangeLabel(
  preset: FilterPreset,
  from: string,
  to: string
) {
  if (preset === "all") return "Todo el historial";
  if (preset === "today") return "Hoy";
  if (preset === "7d") return "Ultimos 7 dias";
  if (preset === "30d") return "Ultimos 30 dias";
  const fromLabel = parseInputDateTime(from);
  const toLabel = parseInputDateTime(to);
  if (fromLabel == null || toLabel == null) return "Personalizado";
  return `${dtf.format(new Date(fromLabel))} - ${dtf.format(new Date(toLabel))}`;
}

export default function VentasPage() {
  const sales = usePosStore((state) => state.sales);
  const branches = usePosStore((state) => state.branches);
  const fiscalInvoices = usePosStore((state) => state.fiscalInvoices);
  const ticketReceipts = usePosStore((state) => state.ticketReceipts);
  const printerConfigs = usePosStore((state) => state.printerConfigs);
  const shiftClosures = usePosStore((state) => state.shiftClosures);
  const cashMovements = usePosStore((state) => state.cashMovements);
  const preOrders = usePosStore((state) => state.preOrders);
  const activeShift = usePosStore((state) => state.activeShift);
  const clearSales = usePosStore((state) => state.clearSales);
  const openShift = usePosStore((state) => state.openShift);
  const closeShift = usePosStore((state) => state.closeShift);
  const addCashMovement = usePosStore((state) => state.addCashMovement);
  const markTicketPrinted = usePosStore((state) => state.markTicketPrinted);
  const markTicketPrintFailed = usePosStore((state) => state.markTicketPrintFailed);
  const createPreOrder = usePosStore((state) => state.createPreOrder);
  const setPreOrderStatus = usePosStore((state) => state.setPreOrderStatus);

  const [lastClosureId, setLastClosureId] = useState<string | null>(null);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [openingAmount, setOpeningAmount] = useState<string>("");
  const [countedCash, setCountedCash] = useState<string>("");
  const [closureNote, setClosureNote] = useState<string>("");
  const [movementType, setMovementType] = useState<CashMovementType>("in");
  const [movementAmount, setMovementAmount] = useState<string>("");
  const [movementReason, setMovementReason] = useState<string>("");
  const [preOrderCustomer, setPreOrderCustomer] = useState("");
  const [preOrderPhone, setPreOrderPhone] = useState("");
  const [preOrderDueAt, setPreOrderDueAt] = useState<string>(() =>
    toInputDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );
  const [preOrderTotal, setPreOrderTotal] = useState<string>("0");
  const [preOrderDeposit, setPreOrderDeposit] = useState<string>("0");
  const [preOrderNote, setPreOrderNote] = useState<string>("");
  const [preset, setPreset] = useState<FilterPreset>("all");
  const [referenceNow] = useState(() => Date.now());
  const [from, setFrom] = useState<string>(() =>
    toInputDateTime(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  );
  const [to, setTo] = useState<string>(() => toInputDateTime(new Date()));

  const windowRange = useMemo(() => {
    if (preset === "all") return { fromTs: null, toTs: null };

    const now = referenceNow;
    if (preset === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { fromTs: start.getTime(), toTs: now };
    }
    if (preset === "7d") return { fromTs: now - 7 * 24 * 60 * 60 * 1000, toTs: now };
    if (preset === "30d") return { fromTs: now - 30 * 24 * 60 * 60 * 1000, toTs: now };

    return { fromTs: parseInputDateTime(from), toTs: parseInputDateTime(to) };
  }, [from, preset, referenceNow, to]);

  const filteredSales = useMemo(() => {
    const { fromTs, toTs } = windowRange;
    return sales.filter((sale) => {
      const ts = new Date(sale.createdAt).getTime();
      if (fromTs != null && ts < fromTs) return false;
      if (toTs != null && ts > toTs) return false;
      return true;
    });
  }, [sales, windowRange]);

  const filteredClosures = useMemo(() => {
    const { fromTs, toTs } = windowRange;
    return shiftClosures.filter((closure) => {
      const ts = new Date(closure.closedAt).getTime();
      if (fromTs != null && ts < fromTs) return false;
      if (toTs != null && ts > toTs) return false;
      return true;
    });
  }, [shiftClosures, windowRange]);
  const filteredPreOrders = useMemo(() => {
    const { fromTs, toTs } = windowRange;
    return preOrders.filter((preOrder) => {
      const ts = new Date(preOrder.dueAt).getTime();
      if (fromTs != null && ts < fromTs) return false;
      if (toTs != null && ts > toTs) return false;
      return true;
    });
  }, [preOrders, windowRange]);

  const activeShiftMovements = useMemo(
    () =>
      activeShift
        ? cashMovements.filter((movement) => movement.shiftId === activeShift.id)
        : [],
    [activeShift, cashMovements]
  );
  const branchNameById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, `${branch.name} (${branch.code})`])),
    [branches]
  );
  const fiscalBySaleId = useMemo(
    () => new Map(fiscalInvoices.map((invoice) => [invoice.saleId, invoice])),
    [fiscalInvoices]
  );
  const receiptBySaleId = useMemo(
    () => new Map(ticketReceipts.map((receipt) => [receipt.saleId, receipt])),
    [ticketReceipts]
  );
  const printerById = useMemo(
    () => new Map(printerConfigs.map((printer) => [printer.id, printer])),
    [printerConfigs]
  );

  const totalTurno = filteredSales.reduce((acc, sale) => acc + sale.total, 0);
  const tickets = filteredSales.length;
  const ticketPromedio = tickets === 0 ? 0 : Math.round(totalTurno / tickets);
  const totalEfectivo = filteredSales.reduce(
    (acc, sale) =>
      acc +
      sale.payments
        .filter((payment) => payment.method === "Efectivo")
        .reduce((sum, payment) => sum + payment.amount, 0),
    0
  );
  const totalTarjetas = filteredSales.reduce(
    (acc, sale) =>
      acc +
      sale.payments
        .filter((payment) => payment.method === "Debito" || payment.method === "Credito")
        .reduce((sum, payment) => sum + payment.amount, 0),
    0
  );
  const totalMercadoPago = filteredSales.reduce(
    (acc, sale) =>
      acc +
      sale.payments
        .filter(
          (payment) => payment.method === "Mercado Pago QR" || payment.method === "Mercado Pago Point"
        )
        .reduce((sum, payment) => sum + payment.amount, 0),
    0
  );
  const rangeLabel = getRangeLabel(preset, from, to);

  const handleCloseShift = () => {
    const parsedCounted =
      countedCash.trim() === "" ? null : Number.isFinite(Number(countedCash)) ? Number(countedCash) : null;
    const closure = closeShift(parsedCounted, closureNote);
    if (!closure) {
      setShiftError("Primero debes abrir la caja.");
      return;
    }
    setLastClosureId(closure.id.slice(0, 8).toUpperCase());
    setCountedCash("");
    setClosureNote("");
    setShiftError(null);
  };

  const handleOpenShift = () => {
    const parsed = Number(openingAmount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setShiftError("El monto de apertura debe ser mayor o igual a 0.");
      return;
    }
    openShift(parsed);
    setOpeningAmount("");
    setShiftError(null);
  };

  const handleAddMovement = () => {
    const parsed = Number(movementAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setShiftError("El monto del movimiento debe ser mayor a 0.");
      return;
    }
    if (!movementReason.trim()) {
      setShiftError("Debes indicar un motivo para el movimiento.");
      return;
    }
    const movement = addCashMovement(movementType, parsed, movementReason);
    if (!movement) {
      setShiftError("No se pudo registrar el movimiento. Verifica que la caja este abierta.");
      return;
    }
    setMovementAmount("");
    setMovementReason("");
    setShiftError(null);
  };

  const handleCreatePreOrder = () => {
    if (!preOrderCustomer.trim()) {
      setShiftError("Debes indicar el nombre del cliente.");
      return;
    }
    const total = Number(preOrderTotal);
    const deposit = Number(preOrderDeposit);
    if (!Number.isFinite(total) || total <= 0) {
      setShiftError("El total del pedido anticipado debe ser mayor a 0.");
      return;
    }
    if (!Number.isFinite(deposit) || deposit < 0 || deposit > total) {
      setShiftError("La seña debe estar entre 0 y el total.");
      return;
    }
    createPreOrder({
      customerName: preOrderCustomer,
      customerPhone: preOrderPhone || null,
      dueAt: new Date(preOrderDueAt).toISOString(),
      totalAmount: total,
      depositAmount: deposit,
      note: preOrderNote || null,
    });
    setPreOrderCustomer("");
    setPreOrderPhone("");
    setPreOrderTotal("0");
    setPreOrderDeposit("0");
    setPreOrderNote("");
    setShiftError(null);
  };

  const preOrderStatusOptions: PreOrderStatus[] = [
    "scheduled",
    "ready",
    "delivered",
    "cancelled",
  ];

  return (
    <main className="page-shell">
      <section className="scene-panel mx-auto w-full max-w-6xl p-5">
        <BackLink />
        <header className="scene-toolbar mb-5 print:hidden">
          <div className="scene-heading">
            <ModuleGlyph name="sales" className="scene-float" />
            <div className="scene-heading-copy">
              <p className="scene-kicker">Analitica rapida</p>
              <h1 className="text-2xl font-semibold">Historial de ventas</h1>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="scene-status-pill">{rangeLabel}</span>
              <span className={`scene-status-pill ${filteredSales.length === 0 ? "warn" : ""}`}>
                {filteredSales.length} ventas visibles
              </span>
            </div>
          </div>
          <div className="scene-actions">
            <AuthChip />
            <SyncStatusChip />
            <Link
              href="/pos"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Volver a caja
            </Link>
            <Link
              href="/operaciones"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Operaciones
            </Link>
            <button
              onClick={clearSales}
              className="scene-button-danger px-4 py-2 text-sm font-medium"
            >
              Limpiar historial
            </button>
            <button
              onClick={handleCloseShift}
              disabled={!activeShift}
              className="scene-button-primary px-4 py-2 text-sm font-medium text-white"
            >
              Cerrar caja
            </button>
          </div>
        </header>

        <section className="scene-card mb-5 p-4 print:hidden">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="mb-1 text-xs text-neutral-600">Rango</p>
              <select
                value={preset}
                onChange={(event) => setPreset(event.target.value as FilterPreset)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Todo</option>
                <option value="today">Hoy</option>
                <option value="7d">Ultimos 7 dias</option>
                <option value="30d">Ultimos 30 dias</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            {preset === "custom" && (
              <>
                <div>
                  <p className="mb-1 text-xs text-neutral-600">Desde</p>
                  <input
                    type="datetime-local"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-neutral-600">Hasta</p>
                  <input
                    type="datetime-local"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <button
              onClick={() => exportSalesCsv(filteredSales)}
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Exportar ventas CSV
            </button>
            <button
              onClick={() => exportShiftClosuresCsv(filteredClosures)}
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Exportar cierres CSV
            </button>
            <button
              onClick={() => window.print()}
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Exportar PDF
            </button>
          </div>
        </section>

        {lastClosureId && (
          <p className="scene-card mb-4 bg-sky-50 px-4 py-2 text-sm text-sky-700">
            Cierre de caja registrado #{lastClosureId}
          </p>
        )}
        {shiftError && (
          <p className="scene-card mb-4 bg-rose-50 px-4 py-2 text-sm text-rose-800">
            {shiftError}
          </p>
        )}

        <section className="scene-card mb-5 p-4 print:hidden">
          <h2 className="text-lg font-semibold">Gestion de caja</h2>
          {!activeShift ? (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <p className="mb-1 text-xs text-neutral-600">Monto de apertura</p>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={openingAmount}
                  onChange={(event) => setOpeningAmount(event.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleOpenShift}
                className="scene-button-primary px-4 py-2 text-sm font-medium text-white"
              >
                Abrir caja
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-neutral-700">
                Caja abierta desde {dtf.format(new Date(activeShift.openedAt))} con base{" "}
                <span className="font-semibold">{money(activeShift.openingAmount)}</span>
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <p className="mb-1 text-xs text-neutral-600">Tipo</p>
                  <select
                    value={movementType}
                    onChange={(event) => setMovementType(event.target.value as CashMovementType)}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="in">Ingreso</option>
                    <option value="out">Egreso</option>
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-xs text-neutral-600">Monto</p>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={movementAmount}
                    onChange={(event) => setMovementAmount(event.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div className="min-w-[220px]">
                  <p className="mb-1 text-xs text-neutral-600">Motivo</p>
                  <input
                    value={movementReason}
                    onChange={(event) => setMovementReason(event.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={handleAddMovement}
                  className="scene-button-secondary px-4 py-2 text-sm font-medium"
                >
                  Registrar movimiento
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={countedCash}
                  onChange={(event) => setCountedCash(event.target.value)}
                  placeholder="Efectivo contado"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  value={closureNote}
                  onChange={(event) => setClosureNote(event.target.value)}
                  placeholder="Nota de arqueo / diferencias"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <button
                  onClick={handleCloseShift}
                  className="scene-button-primary px-4 py-2 text-sm font-medium text-white"
                >
                  Registrar arqueo y cerrar
                </button>
              </div>
              <div className="space-y-2">
                {activeShiftMovements.length === 0 && (
                  <p className="scene-empty p-3 text-sm text-neutral-500">
                    Sin movimientos manuales en esta caja.
                  </p>
                )}
                {activeShiftMovements.slice(0, 8).map((movement) => (
                  <div key={movement.id} className="scene-card p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p>
                        {movement.type === "in" ? "Ingreso" : "Egreso"} -{" "}
                        <span className="font-semibold">{money(movement.amount)}</span>
                      </p>
                      <p className="text-xs text-neutral-500">
                        {dtf.format(new Date(movement.createdAt))}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-600">{movement.reason}</p>
                    <p className="text-xs text-neutral-500">
                      Sync: {movement.syncStatus}
                      {movement.syncError ? ` - ${movement.syncError}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="scene-card mb-5 p-4 print:hidden">
          <h2 className="text-lg font-semibold">Pedidos anticipados</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-6">
            <input
              value={preOrderCustomer}
              onChange={(event) => setPreOrderCustomer(event.target.value)}
              placeholder="Cliente"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              value={preOrderPhone}
              onChange={(event) => setPreOrderPhone(event.target.value)}
              placeholder="Telefono"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={preOrderDueAt}
              onChange={(event) => setPreOrderDueAt(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              step={1}
              value={preOrderTotal}
              onChange={(event) => setPreOrderTotal(event.target.value)}
              placeholder="Total"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              step={1}
              value={preOrderDeposit}
              onChange={(event) => setPreOrderDeposit(event.target.value)}
              placeholder="Seña"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <button
              onClick={handleCreatePreOrder}
              className="scene-button-primary px-4 py-2 text-sm font-medium text-white"
            >
              Crear pedido
            </button>
          </div>
          <input
            value={preOrderNote}
            onChange={(event) => setPreOrderNote(event.target.value)}
            placeholder="Nota (opcional)"
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          />

          <div className="mt-4 space-y-2">
            {filteredPreOrders.length === 0 && (
              <p className="scene-empty p-3 text-sm text-neutral-500">
                No hay pedidos anticipados en el rango seleccionado.
              </p>
            )}
            {filteredPreOrders.map((preOrder) => (
              <article key={preOrder.id} className="scene-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{preOrder.customerName}</p>
                    <p className="text-xs text-neutral-600">
                      Entrega: {dtf.format(new Date(preOrder.dueAt))}
                      {preOrder.customerPhone ? ` - ${preOrder.customerPhone}` : ""}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Total {money(preOrder.totalAmount)} | Seña {money(preOrder.depositAmount)} | Saldo{" "}
                      {money(preOrder.remainingAmount)}
                    </p>
                    {preOrder.note && <p className="text-xs text-neutral-500">Nota: {preOrder.note}</p>}
                    <p className="text-xs text-neutral-500">
                      Sync: {preOrder.syncStatus}
                      {preOrder.syncError ? ` - ${preOrder.syncError}` : ""}
                    </p>
                  </div>
                  <select
                    value={preOrder.status}
                    onChange={(event) =>
                      setPreOrderStatus(preOrder.id, event.target.value as PreOrderStatus)
                    }
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    {preOrderStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6 print:hidden">
          <article className="scene-card p-4">
            <p className="text-sm text-neutral-600">Total filtrado</p>
            <p className="mt-1 text-2xl font-semibold">{money(totalTurno)}</p>
          </article>
          <article className="scene-card p-4">
            <p className="text-sm text-neutral-600">Tickets filtrados</p>
            <p className="mt-1 text-2xl font-semibold">{tickets}</p>
          </article>
          <article className="scene-card p-4">
            <p className="text-sm text-neutral-600">Ticket promedio</p>
            <p className="mt-1 text-2xl font-semibold">{money(ticketPromedio)}</p>
          </article>
          <article className="scene-card p-4">
            <p className="text-sm text-neutral-600">Efectivo</p>
            <p className="mt-1 text-2xl font-semibold">{money(totalEfectivo)}</p>
          </article>
          <article className="scene-card p-4">
            <p className="text-sm text-neutral-600">Tarjetas</p>
            <p className="mt-1 text-2xl font-semibold">{money(totalTarjetas)}</p>
          </article>
          <article className="scene-card p-4">
            <p className="text-sm text-neutral-600">Mercado Pago</p>
            <p className="mt-1 text-2xl font-semibold">{money(totalMercadoPago)}</p>
          </article>
        </div>

        <div className="mt-5 space-y-3 print:hidden">
          {filteredSales.length === 0 && (
            <p className="scene-empty p-4 text-sm text-neutral-500">
              No hay ventas en el rango seleccionado.
            </p>
          )}
          {filteredSales.map((sale) => (
            <article key={sale.id} className="scene-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-neutral-600">
                    Ticket #{sale.id.slice(0, 8).toUpperCase()} -{" "}
                    {dtf.format(new Date(sale.createdAt))}
                  </p>
                  <p className="font-medium">
                    {sale.items.length} items - {sale.paymentMethod}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {sale.payments
                      .map((payment) =>
                        `${payment.method}: ${money(payment.amount)}${
                          payment.reference ? ` (${payment.reference})` : ""
                        }`
                      )
                      .join(" | ")}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Sucursal: {branchNameById.get(sale.branchId) ?? sale.branchId}
                  </p>
                  {receiptBySaleId.get(sale.id) && (
                    <p className="text-xs text-neutral-500">
                      Ticket: {receiptBySaleId.get(sale.id)?.receiptNumber} -{" "}
                      {receiptBySaleId.get(sale.id)?.printStatus}
                    </p>
                  )}
                  {fiscalBySaleId.get(sale.id) && (
                    <p className="text-xs text-neutral-500">
                      Fiscal: {fiscalBySaleId.get(sale.id)?.provider.toUpperCase()} -{" "}
                      {fiscalBySaleId.get(sale.id)?.status}
                      {fiscalBySaleId.get(sale.id)?.documentNumber
                        ? ` (${fiscalBySaleId.get(sale.id)?.documentNumber})`
                        : ""}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    Sync: {sale.syncStatus}
                    {sale.syncError ? ` - ${sale.syncError}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-lg font-semibold">{money(sale.total)}</p>
                  {receiptBySaleId.get(sale.id) && (
                    <button
                      type="button"
                      onClick={() => {
                        const receipt = receiptBySaleId.get(sale.id);
                        if (!receipt) return;
                        const printer = receipt.printerId ? printerById.get(receipt.printerId) ?? null : null;
                        const result = printSaleReceipt({
                          sale,
                          receipt,
                          branch: branches.find((branch) => branch.id === sale.branchId) ?? null,
                          printer,
                          fiscalInvoice: fiscalBySaleId.get(sale.id) ?? null,
                        });
                        if (result.ok) {
                          markTicketPrinted(receipt.id);
                        } else {
                          markTicketPrintFailed(receipt.id, result.error ?? "No se pudo reimprimir");
                          setShiftError(result.error ?? "No se pudo reimprimir");
                        }
                      }}
                      className="scene-button-secondary px-3 py-2 text-xs font-medium"
                    >
                      Reimprimir ticket
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 print:hidden">
          <h2 className="text-lg font-semibold">Cierres de caja</h2>
          <div className="mt-3 space-y-3">
            {filteredClosures.length === 0 && (
              <p className="scene-empty p-4 text-sm text-neutral-500">
                No hay cierres en el rango seleccionado.
              </p>
            )}
            {filteredClosures.map((closure) => (
              <article key={closure.id} className="scene-card p-4">
                <p className="text-sm text-neutral-600">
                  Cierre #{closure.id.slice(0, 8).toUpperCase()} -{" "}
                  {dtf.format(new Date(closure.closedAt))}
                </p>
                <div className="mt-1 flex flex-wrap gap-3 text-sm">
                  <span>Tickets: {closure.ticketCount}</span>
                  <span>Total: {money(closure.totalAmount)}</span>
                  <span>Apertura: {money(closure.openingAmount)}</span>
                  <span>Ventas efectivo: {money(closure.cashSalesTotal)}</span>
                  <span>Ingresos: {money(closure.manualInTotal)}</span>
                  <span>Egresos: {money(closure.manualOutTotal)}</span>
                  <span>Esperado: {money(closure.expectedCash)}</span>
                  <span>Contado: {closure.countedCash == null ? "-" : money(closure.countedCash)}</span>
                  <span>
                    Diferencia: {closure.cashVariance == null ? "-" : money(closure.cashVariance)}
                  </span>
                  <span>Sync OK: {closure.syncedCount}</span>
                  <span>Pendientes: {closure.pendingCount}</span>
                  <span>Sync cierre: {closure.syncStatus}</span>
                </div>
                {closure.note && <p className="mt-2 text-xs text-neutral-600">Nota: {closure.note}</p>}
                {closure.syncError && (
                  <p className="mt-2 text-xs text-rose-700">Error sync: {closure.syncError}</p>
                )}
              </article>
            ))}
          </div>
        </div>

        <section className="hidden print:block">
          <div className="mb-4 border-b pb-3">
            <h2 className="text-2xl font-semibold">GastroPOS - Reporte de Ventas</h2>
            <p className="text-sm">Generado: {dtf.format(new Date())}</p>
            <p className="text-sm">Rango: {rangeLabel}</p>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded border p-3">
              <p>Total</p>
              <p className="font-semibold">{money(totalTurno)}</p>
            </div>
            <div className="rounded border p-3">
              <p>Tickets</p>
              <p className="font-semibold">{tickets}</p>
            </div>
            <div className="rounded border p-3">
              <p>Ticket promedio</p>
              <p className="font-semibold">{money(ticketPromedio)}</p>
            </div>
          </div>

          <h3 className="mb-2 text-lg font-semibold">Detalle de ventas</h3>
          <table className="scene-report-table mb-6 text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Ticket</th>
                <th className="p-2 text-left">Pago</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-left">Sync</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="border-b">
                  <td className="p-2">{dtf.format(new Date(sale.createdAt))}</td>
                  <td className="p-2">#{sale.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-2">{sale.paymentMethod}</td>
                  <td className="p-2 text-right">{money(sale.total)}</td>
                  <td className="p-2">{sale.syncStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="mb-2 text-lg font-semibold">Cierres</h3>
          <table className="scene-report-table text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Apertura</th>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Cierre</th>
                <th className="p-2 text-right">Tickets</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-right">Esperado</th>
                <th className="p-2 text-right">Pendientes</th>
              </tr>
            </thead>
            <tbody>
              {filteredClosures.map((closure) => (
                <tr key={closure.id} className="border-b">
                  <td className="p-2">{dtf.format(new Date(closure.shiftOpenedAt))}</td>
                  <td className="p-2">{dtf.format(new Date(closure.closedAt))}</td>
                  <td className="p-2">#{closure.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-2 text-right">{closure.ticketCount}</td>
                  <td className="p-2 text-right">{money(closure.totalAmount)}</td>
                  <td className="p-2 text-right">{money(closure.expectedCash)}</td>
                  <td className="p-2 text-right">{closure.pendingCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}

