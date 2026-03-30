"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BackLink } from "@/modules/core/ui/back-link";
import { ModuleGlyph } from "@/modules/core/ui/module-glyph";
import { usePosStore, type KitchenStatus } from "@/modules/pos/store/use-pos-store";

const dtf = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

const statusFlow: KitchenStatus[] = ["sent", "preparing", "ready", "served", "cancelled"];

export default function KdsPage() {
  const diningOrders = usePosStore((state) => state.diningOrders);
  const setDiningOrderStatus = usePosStore((state) => state.setDiningOrderStatus);

  const activeOrders = useMemo(
    () => diningOrders.filter((order) => order.status !== "served" && order.status !== "cancelled"),
    [diningOrders]
  );

  return (
    <main className="page-shell">
      <section className="scene-panel mx-auto w-full max-w-6xl p-5">
        <header className="scene-toolbar mb-5">
          <div className="scene-heading">
            <ModuleGlyph name="kds" className="scene-float" />
            <div className="scene-heading-copy">
              <p className="scene-kicker">Kitchen Display</p>
              <h1 className="text-2xl font-semibold">KDS</h1>
            </div>
          </div>
          <div className="scene-actions">
            <BackLink inline />
            <Link
              href="/mesas"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Mesas
            </Link>
            <Link
              href="/pos"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Caja
            </Link>
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-2">
          {activeOrders.length === 0 && (
            <p className="scene-empty p-4 text-sm text-neutral-500">
              No hay comandas activas en cocina.
            </p>
          )}
          {activeOrders.map((order) => (
            <article key={order.id} className="scene-card p-4">
              <p className="scene-kicker">{order.tableCode}</p>
              <p className="text-sm text-neutral-500">{dtf.format(new Date(order.createdAt))}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {order.items.map((item) => (
                  <li key={`${order.id}-${item.lineId}`} className="rounded-lg border px-2 py-1">
                    {item.qty} x {item.productName}
                  </li>
                ))}
              </ul>
              {order.notes && <p className="mt-2 text-xs text-neutral-600">Nota: {order.notes}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {statusFlow.map((status) => (
                  <button
                    key={`${order.id}-${status}`}
                    onClick={() => setDiningOrderStatus(order.id, status)}
                    className={`rounded-lg border px-3 py-1 text-xs ${
                      order.status === status ? "border-sky-500 bg-sky-50" : "hover:bg-neutral-50"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
