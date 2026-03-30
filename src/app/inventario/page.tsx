"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BackLink } from "@/modules/core/ui/back-link";
import { ModuleGlyph } from "@/modules/core/ui/module-glyph";
import { useInventoryStore } from "@/modules/inventory/store/use-inventory-store";
import { useCatalogStore } from "@/modules/pos/store/use-catalog-store";

const dtf = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

type FilterMode = "all" | "low" | "ok";

export default function InventarioPage() {
  const items = useInventoryStore((state) => state.items);
  const movements = useInventoryStore((state) => state.movements);
  const adjustStock = useInventoryStore((state) => state.adjustStock);
  const setMinStock = useInventoryStore((state) => state.setMinStock);
  const resetInventory = useInventoryStore((state) => state.resetInventory);
  const reconcileCatalog = useInventoryStore((state) => state.reconcileCatalog);
  const products = useCatalogStore((state) => state.products);

  const [filter, setFilter] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    reconcileCatalog(products);
  }, [products, reconcileCatalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const isLow = item.currentStock <= item.minStock;
      if (filter === "low" && !isLow) return false;
      if (filter === "ok" && isLow) return false;
      if (!q) return true;
      return item.productName.toLowerCase().includes(q);
    });
  }, [filter, items, query]);

  const lowCount = items.filter((item) => item.currentStock <= item.minStock).length;
  const totalStock = items.reduce((acc, item) => acc + item.currentStock, 0);

  return (
    <main className="page-shell">
      <section className="scene-panel mx-auto w-full max-w-6xl p-5">
        <header className="scene-toolbar mb-5">
          <div className="scene-heading">
            <ModuleGlyph name="inventory" className="scene-float" />
            <div className="scene-heading-copy">
              <p className="scene-kicker">Control operativo</p>
              <h1 className="text-2xl font-semibold">Inventario</h1>
            </div>
          </div>
          <div className="scene-actions">
            <BackLink inline />
            <Link
              href="/pos"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Ir a caja
            </Link>
            <Link
              href="/catalogo"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Editar catalogo
            </Link>
            <button
              onClick={resetInventory}
              className="scene-button-danger px-4 py-2 text-sm font-medium"
            >
              Reset stock
            </button>
          </div>
        </header>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <article className="scene-card p-4">
            <p className="text-sm text-neutral-600">Productos</p>
            <p className="mt-1 text-2xl font-semibold">{items.length}</p>
          </article>
          <article className="scene-card p-4">
            <p className="text-sm text-neutral-600">Stock total</p>
            <p className="mt-1 text-2xl font-semibold">{totalStock}</p>
          </article>
          <article className="scene-card p-4">
            <p className="text-sm text-neutral-600">Alertas bajo stock</p>
            <p className="mt-1 text-2xl font-semibold text-violet-700">{lowCount}</p>
          </article>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-xs text-neutral-600">Filtro</p>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as FilterMode)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="low">Bajo stock</option>
              <option value="ok">Stock OK</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs text-neutral-600">Buscar producto</p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej: Capuccino"
              className="rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((item) => {
            const isLow = item.currentStock <= item.minStock;
            return (
              <article
                key={item.productId}
                className={`scene-card p-4 ${
                  isLow ? "border-amber-300 bg-amber-50/70" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{item.productName}</h2>
                    <p className="text-xs text-neutral-600">
                      Ultima actualizacion: {dtf.format(new Date(item.updatedAt))}
                    </p>
                    <p className="text-sm">
                      Stock: <strong>{item.currentStock}</strong> / Minimo: {item.minStock}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => adjustStock(item.productId, -1)}
                      className="scene-chip h-9 w-9 text-lg"
                    >
                      -
                    </button>
                    <button
                      onClick={() => adjustStock(item.productId, 1)}
                      className="scene-chip h-9 w-9 text-lg"
                    >
                      +
                    </button>
                    <button
                      onClick={() => adjustStock(item.productId, 10)}
                      className="scene-chip px-3 py-2 text-sm"
                    >
                      +10
                    </button>
                    <button
                      onClick={() => setMinStock(item.productId, item.minStock + 1)}
                      className="scene-chip px-3 py-2 text-sm"
                    >
                      Min +1
                    </button>
                    <button
                      onClick={() => setMinStock(item.productId, item.minStock - 1)}
                      className="scene-chip px-3 py-2 text-sm"
                    >
                      Min -1
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {filtered.length === 0 && (
            <p className="scene-empty p-4 text-sm text-neutral-500">
              No hay productos para el filtro actual.
            </p>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">Movimientos recientes</h2>
          <div className="mt-3 space-y-2">
            {movements.slice(0, 20).map((movement) => (
              <article key={movement.id} className="scene-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    {movement.productName} -{" "}
                    <span className={movement.delta < 0 ? "text-rose-700" : "text-sky-700"}>
                      {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                    </span>{" "}
                    ({movement.reason}) - sync: {movement.syncStatus}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {dtf.format(new Date(movement.createdAt))}
                  </p>
                </div>
                {movement.syncError && (
                  <p className="mt-1 text-xs text-rose-700">{movement.syncError}</p>
                )}
              </article>
            ))}
            {movements.length === 0 && (
              <p className="scene-empty p-4 text-sm text-neutral-500">
                Todavia no hay movimientos de inventario.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

