"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BackLink } from "@/modules/core/ui/back-link";
import { ModuleGlyph } from "@/modules/core/ui/module-glyph";
import { money } from "@/modules/pos/lib/money";
import { CATEGORIES, useCatalogStore } from "@/modules/pos/store/use-catalog-store";
import { type FiscalProvider, usePosStore } from "@/modules/pos/store/use-pos-store";

type ProductCategory = Exclude<(typeof CATEGORIES)[number], "Todos">;
type ProductKind = "single" | "bundle";

export default function CatalogoPage() {
  const products = useCatalogStore((state) => state.products);
  const modifierGroups = useCatalogStore((state) => state.modifierGroups);
  const addProduct = useCatalogStore((state) => state.addProduct);
  const updateProduct = useCatalogStore((state) => state.updateProduct);
  const removeProduct = useCatalogStore((state) => state.removeProduct);
  const addModifierGroup = useCatalogStore((state) => state.addModifierGroup);
  const updateModifierGroup = useCatalogStore((state) => state.updateModifierGroup);
  const removeModifierGroup = useCatalogStore((state) => state.removeModifierGroup);
  const addModifierToGroup = useCatalogStore((state) => state.addModifierToGroup);
  const updateModifierInGroup = useCatalogStore((state) => state.updateModifierInGroup);
  const removeModifierFromGroup = useCatalogStore((state) => state.removeModifierFromGroup);
  const branches = usePosStore((state) => state.branches);
  const activeBranchId = usePosStore((state) => state.activeBranchId);
  const addBranch = usePosStore((state) => state.addBranch);
  const setBranchActive = usePosStore((state) => state.setBranchActive);
  const setBranchEnabled = usePosStore((state) => state.setBranchEnabled);

  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("0");
  const [newProductCategory, setNewProductCategory] = useState<ProductCategory>("Cafe");
  const [newProductWeighable, setNewProductWeighable] = useState(false);
  const [newProductKind, setNewProductKind] = useState<ProductKind>("single");
  const [newGroupName, setNewGroupName] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchCode, setNewBranchCode] = useState("");
  const [newBranchProvider, setNewBranchProvider] = useState<FiscalProvider>("none");
  const activeBranch = useMemo(
    () => branches.find((branch) => branch.id === activeBranchId) ?? branches[0] ?? null,
    [activeBranchId, branches]
  );

  return (
    <main className="page-shell">
      <section className="scene-panel mx-auto w-full max-w-6xl p-5">
        <header className="scene-toolbar mb-5">
          <div className="scene-heading">
            <ModuleGlyph name="catalog" className="scene-float" />
            <div className="scene-heading-copy">
              <p className="scene-kicker">Administracion</p>
              <h1 className="text-2xl font-semibold">Catalogo</h1>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="scene-status-pill">{products.length} productos</span>
              <span className="scene-status-pill">{branches.length} sucursales</span>
              <span className="scene-status-pill warn">
                Activa {activeBranch?.code ?? "N/A"}
              </span>
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
              href="/inventario"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Inventario
            </Link>
          </div>
        </header>

        <section className="scene-card mb-6 p-4">
          <h2 className="font-semibold">Alta de producto</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={newProductName}
              onChange={(event) => setNewProductName(event.target.value)}
              placeholder="Nombre"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              value={newProductPrice}
              onChange={(event) => setNewProductPrice(event.target.value)}
              placeholder="Precio"
              type="number"
              className="w-32 rounded-lg border px-3 py-2 text-sm"
            />
            <select
              value={newProductCategory}
              onChange={(event) =>
                setNewProductCategory(event.target.value as ProductCategory)
              }
              className="rounded-lg border px-3 py-2 text-sm"
            >
              {CATEGORIES.filter((category) => category !== "Todos").map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (!newProductName.trim()) return;
                addProduct({
                  name: newProductName.trim(),
                  basePrice: Number(newProductPrice || 0),
                  category: newProductCategory,
                  modifierGroupIds: [],
                  isWeighable: newProductKind === "bundle" ? false : newProductWeighable,
                  availableInPos: true,
                  kind: newProductKind,
                  bundleItems: [],
                  recipeItems: [],
                  branchPrices: [],
                });
                setNewProductName("");
                setNewProductPrice("0");
                setNewProductWeighable(false);
                setNewProductKind("single");
              }}
              className="scene-button-primary px-4 py-2 text-sm font-medium text-white"
            >
              Crear
            </button>
            <select
              value={newProductKind}
              onChange={(event) => setNewProductKind(event.target.value as ProductKind)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="single">Simple</option>
              <option value="bundle">Combo</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <input
                type="checkbox"
                disabled={newProductKind === "bundle"}
                checked={newProductWeighable}
                onChange={(event) => setNewProductWeighable(event.target.checked)}
              />
              Venta por peso
            </label>
          </div>
        </section>

        <section className="scene-card mb-6 p-4">
          <h2 className="font-semibold">Sucursales y facturacion</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={newBranchName}
              onChange={(event) => setNewBranchName(event.target.value)}
              placeholder="Nombre sucursal"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              value={newBranchCode}
              onChange={(event) => setNewBranchCode(event.target.value)}
              placeholder="Codigo"
              className="w-32 rounded-lg border px-3 py-2 text-sm uppercase"
            />
            <select
              value={newBranchProvider}
              onChange={(event) => setNewBranchProvider(event.target.value as FiscalProvider)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="none">Sin fiscal</option>
              <option value="arca">ARCA</option>
              <option value="sii">SII</option>
              <option value="sat">SAT</option>
            </select>
            <button
              onClick={() => {
                const created = addBranch(newBranchName, newBranchCode, newBranchProvider);
                if (!created) return;
                setNewBranchName("");
                setNewBranchCode("");
                setNewBranchProvider("none");
                setBranchActive(created.id);
              }}
              className="scene-button-primary px-4 py-2 text-sm font-medium text-white"
            >
              Crear sucursal
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="scene-card flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div>
                  <p className="font-medium">
                    {branch.name} ({branch.code})
                  </p>
                  <p className="text-xs text-neutral-600">Fiscal: {branch.fiscalProvider.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBranchActive(branch.id)}
                    className={`scene-chip px-3 py-2 text-xs ${
                      activeBranch?.id === branch.id ? "border-sky-500 bg-sky-50" : "hover:bg-neutral-50"
                    }`}
                  >
                    Activa
                  </button>
                  <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                    <input
                      type="checkbox"
                      checked={branch.active}
                      onChange={(event) => setBranchEnabled(branch.id, event.target.checked)}
                    />
                    Habilitada
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Productos</h2>
          <div className="space-y-3">
            {products.map((product) => (
              <article key={product.id} className="scene-card p-4">
                <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                  <input
                    value={product.name}
                    onChange={(event) => updateProduct(product.id, { name: event.target.value })}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={product.basePrice}
                    onChange={(event) =>
                      updateProduct(product.id, { basePrice: Number(event.target.value || 0) })
                    }
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <select
                    value={product.category}
                    onChange={(event) =>
                      updateProduct(product.id, {
                        category: event.target.value as ProductCategory,
                      })
                    }
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    {CATEGORIES.filter((category) => category !== "Todos").map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={product.kind === "bundle"}
                      checked={product.isWeighable}
                      onChange={(event) =>
                        updateProduct(product.id, { isWeighable: event.target.checked })
                      }
                    />
                    Pesable
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={product.availableInPos}
                      onChange={(event) =>
                        updateProduct(product.id, { availableInPos: event.target.checked })
                      }
                    />
                    Visible POS
                  </label>
                  <select
                    value={product.kind}
                    onChange={(event) => {
                      const nextKind = event.target.value as ProductKind;
                      updateProduct(product.id, {
                        kind: nextKind,
                        isWeighable: nextKind === "bundle" ? false : product.isWeighable,
                        bundleItems: nextKind === "bundle" ? product.bundleItems : [],
                      });
                    }}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="single">Simple</option>
                    <option value="bundle">Combo</option>
                  </select>
                  <button
                    onClick={() => removeProduct(product.id)}
                    className="scene-button-danger px-3 py-2 text-sm"
                  >
                    Eliminar
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {modifierGroups.map((group) => {
                    const active = product.modifierGroupIds.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        onClick={() =>
                          updateProduct(product.id, {
                            modifierGroupIds: active
                              ? product.modifierGroupIds.filter((id) => id !== group.id)
                              : [...product.modifierGroupIds, group.id],
                          })
                        }
                        className={`scene-chip px-3 py-1 text-xs ${
                          active ? "border-sky-500 bg-sky-50" : "hover:bg-neutral-50"
                        }`}
                      >
                        {group.name}
                      </button>
                    );
                  })}
                </div>

                <div className="scene-card-soft mt-3 p-3">
                  <p className="text-sm font-medium">Precio por sucursal</p>
                  <p className="text-xs text-neutral-600">
                    Base: {money(product.basePrice)}. Si una sucursal no tiene override, usa base.
                  </p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {branches.map((branch) => {
                      const branchPrice =
                        product.branchPrices?.find((item) => item.branchId === branch.id)?.price ??
                        product.basePrice;
                      return (
                        <label key={`${product.id}-${branch.id}`} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
                          <span className="min-w-[110px] text-xs text-neutral-600">
                            {branch.code}
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={branchPrice}
                            onChange={(event) => {
                              const nextValue = Math.max(0, Number(event.target.value || 0));
                              const current = product.branchPrices ?? [];
                              const exists = current.some((item) => item.branchId === branch.id);
                              const next = exists
                                ? current.map((item) =>
                                    item.branchId === branch.id ? { ...item, price: nextValue } : item
                                  )
                                : [...current, { branchId: branch.id, price: nextValue }];
                              updateProduct(product.id, { branchPrices: next });
                            }}
                            className="w-full rounded-lg border px-3 py-1.5 text-sm"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {product.kind === "bundle" && (
                  <div className="scene-card-soft mt-3 p-3">
                    <p className="text-sm font-medium">Componentes del combo</p>
                    <div className="mt-2 space-y-2">
                      {product.bundleItems.map((component, index) => (
                        <div key={`${product.id}-${index}`} className="flex flex-wrap items-center gap-2">
                          <select
                            value={component.productId}
                            onChange={(event) => {
                              const next = [...product.bundleItems];
                              next[index] = { ...next[index], productId: event.target.value };
                              updateProduct(product.id, { bundleItems: next });
                            }}
                            className="rounded-lg border px-3 py-2 text-sm"
                          >
                            {products
                              .filter((candidate) => candidate.id !== product.id && candidate.kind === "single")
                              .map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name}
                                </option>
                              ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={component.qty}
                            onChange={(event) => {
                              const next = [...product.bundleItems];
                              next[index] = {
                                ...next[index],
                                qty: Math.max(1, Number(event.target.value || 1)),
                              };
                              updateProduct(product.id, { bundleItems: next });
                            }}
                            className="w-24 rounded-lg border px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() =>
                              updateProduct(product.id, {
                                bundleItems: product.bundleItems.filter((_, itemIndex) => itemIndex !== index),
                              })
                            }
                            className="scene-button-danger px-3 py-2 text-sm"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const firstSingle = products.find(
                            (candidate) => candidate.id !== product.id && candidate.kind === "single"
                          );
                          if (!firstSingle) return;
                          updateProduct(product.id, {
                            bundleItems: [
                              ...product.bundleItems,
                              { productId: firstSingle.id, qty: 1 },
                            ],
                          });
                        }}
                        className="scene-button-secondary px-3 py-2 text-sm"
                      >
                        Agregar componente
                      </button>
                    </div>
                  </div>
                )}

                {product.kind === "single" && (
                  <div className="scene-card mt-3 p-3">
                    <p className="text-sm font-medium">Receta / Escandallo</p>
                    <div className="mt-2 space-y-2">
                      {product.recipeItems.map((recipeItem, index) => (
                        <div key={`${product.id}-recipe-${index}`} className="flex flex-wrap items-center gap-2">
                          <select
                            value={recipeItem.ingredientProductId}
                            onChange={(event) => {
                              const next = [...product.recipeItems];
                              next[index] = {
                                ...next[index],
                                ingredientProductId: event.target.value,
                              };
                              updateProduct(product.id, { recipeItems: next });
                            }}
                            className="rounded-lg border px-3 py-2 text-sm"
                          >
                            {products
                              .filter((candidate) => candidate.id !== product.id && candidate.kind === "single")
                              .map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name}
                                </option>
                              ))}
                          </select>
                          <input
                            type="number"
                            min={0.001}
                            step={0.001}
                            value={recipeItem.qty}
                            onChange={(event) => {
                              const next = [...product.recipeItems];
                              next[index] = {
                                ...next[index],
                                qty: Math.max(0.001, Number(event.target.value || 0.001)),
                              };
                              updateProduct(product.id, { recipeItems: next });
                            }}
                            className="w-28 rounded-lg border px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() =>
                              updateProduct(product.id, {
                                recipeItems: product.recipeItems.filter((_, itemIndex) => itemIndex !== index),
                              })
                            }
                            className="scene-button-danger px-3 py-2 text-sm"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const firstIngredient = products.find(
                            (candidate) => candidate.id !== product.id && candidate.kind === "single"
                          );
                          if (!firstIngredient) return;
                          updateProduct(product.id, {
                            recipeItems: [
                              ...product.recipeItems,
                              { ingredientProductId: firstIngredient.id, qty: 0.01 },
                            ],
                          });
                        }}
                        className="scene-button-secondary px-3 py-2 text-sm"
                      >
                        Agregar ingrediente
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Grupos de modificadores</h2>
          <div className="mb-3 flex gap-2">
            <input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Nuevo grupo"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                if (!newGroupName.trim()) return;
                addModifierGroup(newGroupName.trim());
                setNewGroupName("");
              }}
              className="scene-button-primary px-4 py-2 text-sm font-medium text-white"
            >
              Crear grupo
            </button>
          </div>

          <div className="space-y-3">
            {modifierGroups.map((group) => (
              <article key={group.id} className="scene-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={group.name}
                    onChange={(event) => updateModifierGroup(group.id, { name: event.target.value })}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={group.minSelect}
                    onChange={(event) =>
                      updateModifierGroup(group.id, { minSelect: Number(event.target.value || 0) })
                    }
                    className="w-24 rounded-lg border px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={group.maxSelect}
                    onChange={(event) =>
                      updateModifierGroup(group.id, { maxSelect: Number(event.target.value || 1) })
                    }
                    className="w-24 rounded-lg border px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => removeModifierGroup(group.id)}
                    className="scene-button-danger px-3 py-2 text-sm"
                  >
                    Eliminar grupo
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {group.modifiers.map((modifier) => (
                    <div key={modifier.id} className="flex flex-wrap items-center gap-2">
                      <input
                        value={modifier.name}
                        onChange={(event) =>
                          updateModifierInGroup(group.id, modifier.id, { name: event.target.value })
                        }
                        className="rounded-lg border px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        value={modifier.priceDelta}
                        onChange={(event) =>
                          updateModifierInGroup(group.id, modifier.id, {
                            priceDelta: Number(event.target.value || 0),
                          })
                        }
                        className="w-28 rounded-lg border px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => removeModifierFromGroup(group.id, modifier.id)}
                        className="scene-button-danger px-3 py-2 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      addModifierToGroup(group.id, {
                        name: "Nuevo",
                        priceDelta: 0,
                      })
                    }
                    className="scene-button-secondary px-3 py-2 text-sm"
                  >
                    Agregar modificador
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
