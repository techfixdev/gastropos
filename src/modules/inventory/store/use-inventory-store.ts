"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/modules/pos/domain/catalog";
import { getCatalogProductsSnapshot } from "@/modules/pos/store/use-catalog-store";

export type InventoryItem = {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  updatedAt: string;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  productName: string;
  delta: number;
  reason: "manual" | "sale" | "reset";
  createdAt: string;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  syncAttempts: number;
  syncError: string | null;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
};

type InventoryState = {
  items: InventoryItem[];
  movements: InventoryMovement[];
  reconcileCatalog: (products: Product[]) => void;
  adjustStock: (productId: string, delta: number) => void;
  deductBySale: (lines: Array<{ productId: string; qty: number }>) => void;
  getStockForProduct: (productId: string) => number;
  setMinStock: (productId: string, minStock: number) => void;
  resetInventory: () => void;
  markMovementSyncing: (movementId: string) => void;
  markMovementSynced: (movementId: string) => void;
  markMovementFailed: (movementId: string, errorMessage: string) => void;
  markMovementTerminal: (movementId: string, errorMessage: string) => void;
};

const createInitialItems = (products: Product[]): InventoryItem[] =>
  products
    .filter((product) => product.kind !== "bundle")
    .map((product, index) => ({
    productId: product.id,
    productName: product.name,
    currentStock: 12 + (index % 5) * 3,
    minStock: 8,
    updatedAt: new Date().toISOString(),
  }));

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: createInitialItems(getCatalogProductsSnapshot()),
      movements: [],
      reconcileCatalog: (products) =>
        set((state) => {
          const stockProducts = products.filter((product) => product.kind !== "bundle");
          const currentById = new Map(state.items.map((item) => [item.productId, item]));
          const nextItems = stockProducts.map((product, index) => {
            const existing = currentById.get(product.id);
            if (existing) return { ...existing, productName: product.name };
            return {
              productId: product.id,
              productName: product.name,
              currentStock: 12 + (index % 5) * 3,
              minStock: 8,
              updatedAt: new Date().toISOString(),
            };
          });
          return { items: nextItems };
        }),
      adjustStock: (productId, delta) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  currentStock: Math.max(0, item.currentStock + delta),
                  updatedAt: new Date().toISOString(),
                }
              : item
          ),
          movements: [
            {
              id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${productId}`,
              productId,
              productName:
                state.items.find((item) => item.productId === productId)?.productName ?? productId,
              delta,
              reason: "manual" as const,
              createdAt: new Date().toISOString(),
              syncStatus: "pending" as const,
              syncAttempts: 0,
              syncError: null,
              lastSyncAttemptAt: null,
              syncedAt: null,
            },
            ...state.movements,
          ].slice(0, 200),
        })),
      deductBySale: (lines) =>
        set((state) => {
          const qtyByProduct = new Map<string, number>();
          lines.forEach((line) => {
            const current = qtyByProduct.get(line.productId) ?? 0;
            qtyByProduct.set(line.productId, current + line.qty);
          });

          const saleMovements: InventoryMovement[] = [];
          const nextItems = state.items.map((item) => {
            const needed = qtyByProduct.get(item.productId) ?? 0;
            if (needed <= 0) return item;

            const nextStock = Math.max(0, item.currentStock - needed);
            saleMovements.push({
              id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${item.productId}`,
              productId: item.productId,
              productName: item.productName,
              delta: -needed,
              reason: "sale" as const,
              createdAt: new Date().toISOString(),
              syncStatus: "pending" as const,
              syncAttempts: 0,
              syncError: null,
              lastSyncAttemptAt: null,
              syncedAt: null,
            });

            return {
              ...item,
              currentStock: nextStock,
              updatedAt: new Date().toISOString(),
            };
          });

          return {
            items: nextItems,
            movements: [...saleMovements, ...state.movements].slice(0, 200),
          };
        }),
      getStockForProduct: (productId) =>
        get().items.find((item) => item.productId === productId)?.currentStock ?? 0,
      setMinStock: (productId, minStock) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  minStock: Math.max(0, minStock),
                  updatedAt: new Date().toISOString(),
                }
              : item
          ),
        })),
      resetInventory: () =>
        set((state) => {
          const catalogProducts = getCatalogProductsSnapshot();
          const initial = createInitialItems(catalogProducts);
          const initialByProduct = new Map(
            initial.map((item) => [item.productId, item.currentStock])
          );

          const resetMovements: InventoryMovement[] = [];
          const nextItems = state.items.map((item) => {
            const targetStock = initialByProduct.get(item.productId) ?? item.currentStock;
            const delta = targetStock - item.currentStock;
            if (delta !== 0) {
              resetMovements.push({
                id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${item.productId}-reset`,
                productId: item.productId,
                productName: item.productName,
                delta,
                reason: "reset" as const,
                createdAt: new Date().toISOString(),
                syncStatus: "pending" as const,
                syncAttempts: 0,
                syncError: null,
                lastSyncAttemptAt: null,
                syncedAt: null,
              });
            }

            return {
              ...item,
              currentStock: targetStock,
              updatedAt: new Date().toISOString(),
            };
          });

          return {
            items: nextItems,
            movements: [...resetMovements, ...state.movements].slice(0, 200),
          };
        }),
      markMovementSyncing: (movementId) =>
        set((state) => ({
          movements: state.movements.map((movement) =>
            movement.id === movementId
              ? {
                  ...movement,
                  syncStatus: "syncing",
                  syncAttempts: movement.syncAttempts + 1,
                  syncError: null,
                  lastSyncAttemptAt: new Date().toISOString(),
                }
              : movement
          ),
        })),
      markMovementSynced: (movementId) =>
        set((state) => ({
          movements: state.movements.map((movement) =>
            movement.id === movementId
              ? {
                  ...movement,
                  syncStatus: "synced",
                  syncError: null,
                  syncedAt: new Date().toISOString(),
                }
              : movement
          ),
        })),
      markMovementFailed: (movementId, errorMessage) =>
        set((state) => ({
          movements: state.movements.map((movement) =>
            movement.id === movementId
              ? {
                  ...movement,
                  syncStatus: "failed",
                  syncError: errorMessage,
                }
              : movement
          ),
        })),
      markMovementTerminal: (movementId, errorMessage) =>
        set((state) => ({
          movements: state.movements.map((movement) =>
            movement.id === movementId
              ? {
                  ...movement,
                  syncStatus: "failed",
                  syncAttempts: 999,
                  syncError: errorMessage,
                }
              : movement
          ),
        })),
    }),
    {
      name: "gastropos-inventory-v1",
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<InventoryState> | undefined;
        if (!state) return {} as unknown as InventoryState;
        return {
          ...state,
          items: Array.isArray(state.items)
            ? state.items
            : createInitialItems(getCatalogProductsSnapshot()),
          movements: Array.isArray(state.movements)
            ? state.movements.map((movement) => ({
                ...movement,
                syncStatus:
                  movement.productId === "all"
                    ? "synced"
                    : (movement.syncStatus ?? "pending"),
                syncAttempts: movement.syncAttempts ?? 0,
                syncError: movement.syncError ?? null,
                lastSyncAttemptAt: movement.lastSyncAttemptAt ?? null,
                syncedAt: movement.syncedAt ?? null,
              }))
            : [],
        } as InventoryState;
      },
    }
  )
);
