"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CATEGORIES,
  DEFAULT_MODIFIER_GROUPS,
  DEFAULT_PRODUCTS,
  type Modifier,
  type ModifierGroup,
  type Product,
} from "../domain/catalog";

type CatalogState = {
  products: Product[];
  modifierGroups: ModifierGroup[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (productId: string, patch: Partial<Omit<Product, "id">>) => void;
  removeProduct: (productId: string) => void;
  addModifierGroup: (groupName: string) => void;
  updateModifierGroup: (
    groupId: string,
    patch: Partial<Omit<ModifierGroup, "id" | "modifiers">>
  ) => void;
  removeModifierGroup: (groupId: string) => void;
  addModifierToGroup: (groupId: string, modifier: Omit<Modifier, "id">) => void;
  updateModifierInGroup: (
    groupId: string,
    modifierId: string,
    patch: Partial<Omit<Modifier, "id">>
  ) => void;
  removeModifierFromGroup: (groupId: string, modifierId: string) => void;
};

const makeId = (prefix: string) => globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}`;

const normalizeProduct = (product: Product): Product => ({
  ...product,
  isWeighable: Boolean(product.isWeighable),
  availableInPos: product.availableInPos ?? true,
  kind: product.kind === "bundle" ? "bundle" : "single",
  bundleItems: Array.isArray(product.bundleItems)
    ? product.bundleItems
        .filter((item) => item && item.productId)
        .map((item) => ({ productId: item.productId, qty: Math.max(1, Math.round(item.qty || 1)) }))
    : [],
  recipeItems: Array.isArray(product.recipeItems)
    ? product.recipeItems
        .filter((item) => item && item.ingredientProductId)
        .map((item) => ({
          ingredientProductId: item.ingredientProductId,
          qty: Math.max(0.001, Math.round((item.qty || 0.001) * 1000) / 1000),
        }))
    : [],
  branchPrices: Array.isArray(product.branchPrices)
    ? product.branchPrices
        .filter((item) => item && item.branchId)
        .map((item) => ({
          branchId: item.branchId,
          price: Math.max(0, Math.round(item.price || 0)),
        }))
    : [],
});

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      products: DEFAULT_PRODUCTS,
      modifierGroups: DEFAULT_MODIFIER_GROUPS,
      addProduct: (product) =>
        set((state) => ({
          products: [...state.products, { ...product, id: makeId("prod") }],
        })),
      updateProduct: (productId, patch) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId ? { ...product, ...patch } : product
          ),
        })),
      removeProduct: (productId) =>
        set((state) => ({
          products: state.products.filter((product) => product.id !== productId),
        })),
      addModifierGroup: (groupName) =>
        set((state) => ({
          modifierGroups: [
            ...state.modifierGroups,
            {
              id: makeId("mgroup"),
              name: groupName,
              minSelect: 0,
              maxSelect: 1,
              modifiers: [],
            },
          ],
        })),
      updateModifierGroup: (groupId, patch) =>
        set((state) => ({
          modifierGroups: state.modifierGroups.map((group) =>
            group.id === groupId ? { ...group, ...patch } : group
          ),
        })),
      removeModifierGroup: (groupId) =>
        set((state) => ({
          modifierGroups: state.modifierGroups.filter((group) => group.id !== groupId),
          products: state.products.map((product) => ({
            ...product,
            modifierGroupIds: product.modifierGroupIds.filter((id) => id !== groupId),
          })),
        })),
      addModifierToGroup: (groupId, modifier) =>
        set((state) => ({
          modifierGroups: state.modifierGroups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  modifiers: [...group.modifiers, { ...modifier, id: makeId("mod") }],
                }
              : group
          ),
        })),
      updateModifierInGroup: (groupId, modifierId, patch) =>
        set((state) => ({
          modifierGroups: state.modifierGroups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  modifiers: group.modifiers.map((modifier) =>
                    modifier.id === modifierId ? { ...modifier, ...patch } : modifier
                  ),
                }
              : group
          ),
        })),
      removeModifierFromGroup: (groupId, modifierId) =>
        set((state) => ({
          modifierGroups: state.modifierGroups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  modifiers: group.modifiers.filter((modifier) => modifier.id !== modifierId),
                }
              : group
          ),
        })),
    }),
    {
      name: "gastropos-catalog-v1",
      version: 5,
      migrate: (persistedState) => {
        const state = persistedState as Partial<CatalogState> | undefined;
        if (!state) return {} as unknown as CatalogState;
        const products = Array.isArray(state.products)
          ? state.products.map((product) => normalizeProduct(product as Product))
          : DEFAULT_PRODUCTS;
        return {
          ...state,
          products,
          modifierGroups: Array.isArray(state.modifierGroups)
            ? state.modifierGroups
            : DEFAULT_MODIFIER_GROUPS,
        } as CatalogState;
      },
    }
  )
);

export const getCatalogProductsSnapshot = () => useCatalogStore.getState().products;
export const getCatalogModifierGroupsSnapshot = () => useCatalogStore.getState().modifierGroups;
export { CATEGORIES };
