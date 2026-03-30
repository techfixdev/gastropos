"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BackLink } from "@/modules/core/ui/back-link";
import { ModuleGlyph } from "@/modules/core/ui/module-glyph";
import { usePosStore } from "@/modules/pos/store/use-pos-store";

const TABLES = Array.from({ length: 12 }, (_, idx) => `MESA-${idx + 1}`);

export default function MesasPage() {
  const diningOrders = usePosStore((state) => state.diningOrders);
  const moveDiningOrderToTable = usePosStore((state) => state.moveDiningOrderToTable);
  const mergeDiningOrders = usePosStore((state) => state.mergeDiningOrders);
  const [targetTable, setTargetTable] = useState("MESA-1");
  const [sourceOrderId, setSourceOrderId] = useState<string>("");
  const [targetOrderId, setTargetOrderId] = useState<string>("");

  const activeOrders = useMemo(
    () => diningOrders.filter((order) => order.status !== "served" && order.status !== "cancelled"),
    [diningOrders]
  );

  const ordersByTable = useMemo(() => {
    const map = new Map<string, typeof activeOrders>();
    TABLES.forEach((table) => map.set(table, []));
    activeOrders.forEach((order) => {
      const current = map.get(order.tableCode) ?? [];
      map.set(order.tableCode, [...current, order]);
    });
    return map;
  }, [activeOrders]);

  return (
    <main className="page-shell">
      <section className="scene-panel mx-auto w-full max-w-6xl p-5">
        <header className="scene-toolbar mb-5">
          <div className="scene-heading">
            <ModuleGlyph name="tables" className="scene-float" />
            <div className="scene-heading-copy">
              <p className="scene-kicker">Salon</p>
              <h1 className="text-2xl font-semibold">Mapa de mesas</h1>
            </div>
          </div>
          <div className="scene-actions">
            <BackLink inline />
            <Link
              href="/kds"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              KDS
            </Link>
            <Link
              href="/pos"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Caja
            </Link>
          </div>
        </header>

        <section className="scene-card mb-5 p-4">
          <h2 className="text-sm font-semibold">Trasladar comanda</h2>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <select
              value={sourceOrderId}
              onChange={(event) => setSourceOrderId(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Seleccionar comanda</option>
              {activeOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.tableCode} - {order.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <select
              value={targetTable}
              onChange={(event) => setTargetTable(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              {TABLES.map((table) => (
                <option key={table} value={table}>
                  {table}
                </option>
              ))}
            </select>
            <button
              onClick={() => sourceOrderId && moveDiningOrderToTable(sourceOrderId, targetTable)}
              className="scene-button-secondary px-3 py-2 text-sm"
            >
              Mover
            </button>
          </div>

          <h2 className="mt-4 text-sm font-semibold">Fusionar comandas</h2>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <select
              value={targetOrderId}
              onChange={(event) => setTargetOrderId(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Comanda destino</option>
              {activeOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.tableCode} - {order.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <select
              value={sourceOrderId}
              onChange={(event) => setSourceOrderId(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Comanda origen</option>
              {activeOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.tableCode} - {order.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <button
              onClick={() => targetOrderId && sourceOrderId && mergeDiningOrders(targetOrderId, sourceOrderId)}
              className="scene-button-secondary px-3 py-2 text-sm"
            >
              Fusionar
            </button>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TABLES.map((table) => {
            const orders = ordersByTable.get(table) ?? [];
            const state =
              orders.length === 0
                ? "Libre"
                : orders.some((order) => order.status === "ready")
                  ? "Listo"
                  : orders.some((order) => order.status === "preparing")
                    ? "En preparacion"
                    : "Pendiente";

            return (
              <article key={table} className="scene-card p-4">
                <p className="scene-kicker">{table}</p>
                <p className="mt-1 text-sm font-medium">{state}</p>
                <p className="text-xs text-neutral-500">{orders.length} comandas activas</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
