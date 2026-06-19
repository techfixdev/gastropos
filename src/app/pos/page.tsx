"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BackLink } from "@/modules/core/ui/back-link";
import { ModuleGlyph } from "@/modules/core/ui/module-glyph";
import { sanitizeText, sanitizeDocumentNumber, sanitizeTableCode } from "@/modules/core/lib/sanitize";
import {
  CATEGORIES,
  type ModifierGroup,
  type Product,
} from "@/modules/pos/domain/catalog";
import { money } from "@/modules/pos/lib/money";
import { printSaleReceipt } from "@/modules/pos/lib/receipt";
import {
  calcTotals,
  lineUnitPrice,
  type Branch,
  type CheckoutPaymentInput,
  type PaymentMethod,
  type SelectedModifier,
  usePosStore,
} from "@/modules/pos/store/use-pos-store";
import { SyncStatusChip } from "@/modules/pos/ui/sync-status-chip";
import { AuthChip } from "@/modules/core/auth/auth-chip";
import { useInventoryStore } from "@/modules/inventory/store/use-inventory-store";
import { useCatalogStore } from "@/modules/pos/store/use-catalog-store";

type SelectionsState = Record<string, string[]>;
type PaymentDraft = CheckoutPaymentInput;
const DEFAULT_BRANCH_ID_FALLBACK = "branch-main";
const PAYMENT_METHODS: PaymentMethod[] = [
  "Efectivo",
  "Debito",
  "Credito",
  "Mercado Pago QR",
  "Mercado Pago Point",
  "Transferencia",
];

const WEIGHABLE_STEP = 0.05;

function formatQty(qty: number, isWeighable: boolean): string {
  if (!isWeighable) return `${qty}`;
  return `${qty.toFixed(3)} kg`;
}

function getRemainingForProduct(
  product: Product,
  stockByProduct: Record<string, number>,
  reservedByProduct: Record<string, number>
): number {
  if (product.kind === "bundle") {
    if (product.bundleItems.length === 0) return 0;
    const limits = product.bundleItems.map((component) => {
      const stock = stockByProduct[component.productId] ?? 0;
      const reserved = reservedByProduct[component.productId] ?? 0;
      return Math.floor(Math.max(0, stock - reserved) / component.qty);
    });
    return Math.max(0, Math.min(...limits));
  }

  if (product.recipeItems.length > 0) {
    const limits = product.recipeItems.map((recipeItem) => {
      const stock = stockByProduct[recipeItem.ingredientProductId] ?? 0;
      const reserved = reservedByProduct[recipeItem.ingredientProductId] ?? 0;
      return Math.floor((Math.max(0, stock - reserved) / recipeItem.qty) * 1000) / 1000;
    });
    return Math.max(0, Math.min(...limits));
  }

  const stock = stockByProduct[product.id] ?? 0;
  const reserved = reservedByProduct[product.id] ?? 0;
  return Math.max(0, stock - reserved);
}

function expandProductDeduction(product: Product, qty: number) {
  if (product.kind === "bundle" && product.bundleItems.length > 0) {
    return product.bundleItems.map((component) => ({
      productId: component.productId,
      qty: component.qty * qty,
    }));
  }
  if (product.recipeItems.length > 0) {
    return product.recipeItems.map((recipeItem) => ({
      productId: recipeItem.ingredientProductId,
      qty: recipeItem.qty * qty,
    }));
  }
  return [{ productId: product.id, qty }];
}

function createDefaultSelections(
  product: Product,
  modifierGroupMap: Map<string, ModifierGroup>
): SelectionsState {
  const entries = product.modifierGroupIds.map((groupId) => {
    const group = modifierGroupMap.get(groupId);
    if (!group) return [groupId, []] as const;
    return [groupId, group.minSelect > 0 ? [group.modifiers[0]?.id ?? ""] : []] as const;
  });
  return Object.fromEntries(entries);
}

function getBranchProductPrice(product: Product, branchId: string | null): number {
  if (!branchId) return product.basePrice;
  const branchPrice = product.branchPrices?.find((item) => item.branchId === branchId);
  return branchPrice ? branchPrice.price : product.basePrice;
}

function withBranchPrice(product: Product, branchId: string | null): Product {
  return {
    ...product,
    basePrice: getBranchProductPrice(product, branchId),
  };
}

function mapSelectionsToModifiers(
  product: Product,
  selections: SelectionsState,
  modifierGroupMap: Map<string, ModifierGroup>
): SelectedModifier[] {
  const selected: SelectedModifier[] = [];
  product.modifierGroupIds.forEach((groupId) => {
    const group = modifierGroupMap.get(groupId);
    if (!group) return;
    (selections[groupId] ?? []).forEach((modifierId) => {
      const modifier = group.modifiers.find((item) => item.id === modifierId);
      if (!modifier) return;
      selected.push({
        groupId: group.id,
        groupName: group.name,
        modifierId: modifier.id,
        modifierName: modifier.name,
        priceDelta: modifier.priceDelta,
      });
    });
  });
  return selected;
}

function ModifierSelector({
  group,
  selectedIds,
  onChange,
}: {
  group: ModifierGroup;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (modifierId: string) => {
    const isMulti = group.maxSelect > 1;
    if (!isMulti) {
      onChange(selectedIds.includes(modifierId) ? [] : [modifierId]);
      return;
    }

    if (selectedIds.includes(modifierId)) {
      onChange(selectedIds.filter((id) => id !== modifierId));
      return;
    }

    if (selectedIds.length >= group.maxSelect) return;
    onChange([...selectedIds, modifierId]);
  };

  return (
    <div className="scene-card-soft space-y-2 p-3">
      <p className="text-sm font-medium">{group.name}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {group.modifiers.map((modifier) => {
          const active = selectedIds.includes(modifier.id);
          return (
            <button
              key={modifier.id}
              type="button"
              onClick={() => toggle(modifier.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                active ? "border-sky-500 bg-white" : "bg-white/70 hover:bg-white"
              }`}
            >
              <p>{modifier.name}</p>
              <p className="text-xs text-neutral-500">
                {modifier.priceDelta > 0 ? `+ ${money(modifier.priceDelta)}` : "Sin recargo"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PosPage() {
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("Todos");
  const [paymentLines, setPaymentLines] = useState<PaymentDraft[]>([{ method: "Efectivo", amount: 0 }]);
  const [lastTicket, setLastTicket] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selections, setSelections] = useState<SelectionsState>({});
  const [selectedQty, setSelectedQty] = useState<string>("1");
  const [tableCode, setTableCode] = useState("MESA-1");
  const [kitchenNote, setKitchenNote] = useState("");
  const [lastKitchenOrder, setLastKitchenOrder] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");
  const [saleNote, setSaleNote] = useState("");
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");

  const cart = usePosStore((state) => state.cart);
  const addLine = usePosStore((state) => state.addLine);
  const updateQty = usePosStore((state) => state.updateQty);
  const completeSale = usePosStore((state) => state.completeSale);
  const markTicketPrinted = usePosStore((state) => state.markTicketPrinted);
  const markTicketPrintFailed = usePosStore((state) => state.markTicketPrintFailed);
  const sendCartToKitchen = usePosStore((state) => state.sendCartToKitchen);
  const products = useCatalogStore((state) => state.products);
  const modifierGroups = useCatalogStore((state) => state.modifierGroups);
  const branches = usePosStore((state) => state.branches);
  const activeBranchId = usePosStore((state) => state.activeBranchId);
  const setBranchActive = usePosStore((state) => state.setBranchActive);
  const printerConfigs = usePosStore((state) => state.printerConfigs);
  const paymentTerminals = usePosStore((state) => state.paymentTerminals);
  const inventoryItems = useInventoryStore((state) => state.items);
  const reconcileCatalog = useInventoryStore((state) => state.reconcileCatalog);
  const deductBySale = useInventoryStore((state) => state.deductBySale);
  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);
  const modifierGroupMap = useMemo(
    () => new Map(modifierGroups.map((group) => [group.id, group])),
    [modifierGroups]
  );

  useEffect(() => {
    reconcileCatalog(products);
  }, [products, reconcileCatalog]);

  const visibleProducts = useMemo(() => {
    const sellable = products.filter((item) => item.availableInPos);
    if (activeCategory === "Todos") return sellable;
    return sellable.filter((item) => item.category === activeCategory);
  }, [activeCategory, products]);

  const { subtotal, tax, total } = calcTotals(cart);
  const stockByProduct = useMemo(
    () =>
      inventoryItems.reduce<Record<string, number>>((acc, item) => {
        acc[item.productId] = item.currentStock;
        return acc;
      }, {}),
    [inventoryItems]
  );
  const reservedByProduct = useMemo(
    () =>
      cart.reduce<Record<string, number>>((acc, line) => {
        const product = productById.get(line.productId);
        if (!product) return acc;
        const deductions = expandProductDeduction(product, line.qty);
        deductions.forEach((deduction) => {
          acc[deduction.productId] = (acc[deduction.productId] ?? 0) + deduction.qty;
        });
        return acc;
      }, {}),
    [cart, productById]
  );
  const lowStockCount = useMemo(
    () => inventoryItems.filter((item) => item.currentStock <= item.minStock).length,
    [inventoryItems]
  );
  const activeBranchPrinters = useMemo(
    () =>
      printerConfigs.filter(
        (config) => config.branchId === (activeBranchId ?? DEFAULT_BRANCH_ID_FALLBACK) && config.active
      ),
    [activeBranchId, printerConfigs]
  );
  const activeBranchTerminals = useMemo(
    () =>
      paymentTerminals.filter(
        (terminal) => terminal.branchId === (activeBranchId ?? DEFAULT_BRANCH_ID_FALLBACK) && terminal.active
      ),
    [activeBranchId, paymentTerminals]
  );
  const activeBranch = useMemo(
    () => branches.find((branch) => branch.id === activeBranchId) ?? branches[0] ?? null,
    [activeBranchId, branches]
  );
  const paymentTotal = useMemo(
    () => paymentLines.reduce((acc, line) => acc + (Number.isFinite(line.amount) ? Number(line.amount) : 0), 0),
    [paymentLines]
  );
  const paymentDelta = total - Math.round(paymentTotal);

  const effectivePrinterId =
    activeBranchPrinters.find((printer) => printer.id === selectedPrinterId)?.id ??
    activeBranchPrinters.find((printer) => printer.isDefault)?.id ??
    activeBranchPrinters[0]?.id ??
    "";

  const openProduct = (product: Product) => {
    const remaining = getRemainingForProduct(product, stockByProduct, reservedByProduct);
    if (remaining <= 0) {
      setStockError(`Sin stock para ${product.name}.`);
      return;
    }

    setStockError(null);
    const pricedProduct = withBranchPrice(product, activeBranchId);
    if (product.modifierGroupIds.length === 0 && !product.isWeighable) {
      addLine(pricedProduct, [], 1);
      return;
    }

    setSelectedProduct(pricedProduct);
    setSelections(createDefaultSelections(product, modifierGroupMap));
    setSelectedQty(product.isWeighable ? "0.250" : "1");
  };

  const confirmProduct = () => {
    if (!selectedProduct) return;
    const parsedQty = Number(selectedQty);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setStockError(`Cantidad invalida para ${selectedProduct.name}.`);
      return;
    }
    if (selectedProduct.isWeighable && parsedQty < WEIGHABLE_STEP) {
      setStockError(`El peso minimo es ${WEIGHABLE_STEP} kg.`);
      return;
    }
    const remaining = getRemainingForProduct(selectedProduct, stockByProduct, reservedByProduct);
    if (parsedQty > remaining) {
      setStockError(`Stock insuficiente para ${selectedProduct.name}.`);
      return;
    }

    const modifiers = mapSelectionsToModifiers(selectedProduct, selections, modifierGroupMap);
    addLine(withBranchPrice(selectedProduct, activeBranchId), modifiers, parsedQty);
    setSelectedProduct(null);
    setSelections({});
    setSelectedQty("1");
    setStockError(null);
  };

  const handleCharge = () => {
    const outOfStock = Object.entries(reservedByProduct).find(([productId, qty]) => {
      const stock = stockByProduct[productId] ?? 0;
      return qty > stock;
    });
    if (outOfStock) {
      const [productId] = outOfStock;
      const productName =
        inventoryItems.find((item) => item.productId === productId)?.productName ?? productId;
      setStockError(`Stock insuficiente para ${productName}.`);
      return;
    }

    const sale = completeSale({
      payments: paymentLines,
      customerName,
      customerDocument,
      note: saleNote,
      printerId: effectivePrinterId || null,
    });
    if (sale) {
      setLastTicket(sale.id.slice(0, 8).toUpperCase());
      setStockError(null);
      const deductions = sale.items.flatMap((item) => {
        const product = productById.get(item.productId);
        if (!product) return [{ productId: item.productId, qty: item.qty }];
        return expandProductDeduction(product, item.qty);
      });
      deductBySale(deductions);
      const state = usePosStore.getState();
      const receipt = state.ticketReceipts.find((item) => item.id === sale.receiptId);
      const printer = state.printerConfigs.find((item) => item.id === receipt?.printerId) ?? null;
      const fiscalInvoice = state.fiscalInvoices.find((item) => item.saleId === sale.id) ?? null;
      if (receipt) {
        const result = printSaleReceipt({
          sale,
          receipt,
          branch: activeBranch,
          printer,
          fiscalInvoice,
        });
        if (result.ok) {
          markTicketPrinted(receipt.id);
        } else {
          markTicketPrintFailed(receipt.id, result.error ?? "No se pudo abrir la impresion");
          setStockError(result.error ?? "No se pudo abrir la impresion");
        }
      }
      setPaymentLines([{ method: "Efectivo", amount: 0 }]);
      setCustomerName("");
      setCustomerDocument("");
      setSaleNote("");
    }
  };

  return (
    <main className="page-shell">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="scene-panel p-5">
          <BackLink />
          <header className="scene-toolbar mb-5">
            <div className="scene-heading">
              <ModuleGlyph name="pos" className="scene-float" />
              <div className="scene-heading-copy">
                <p className="scene-kicker">Terminal</p>
                <h1 className="text-2xl font-semibold">GastroPOS - Caja</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="scene-status-pill">
                    Sucursal {activeBranch?.code ?? "N/A"}
                  </span>
                  <span className={`scene-status-pill ${lowStockCount > 0 ? "warn" : ""}`}>
                    {lowStockCount > 0 ? `${lowStockCount} alertas de stock` : "Stock controlado"}
                  </span>
                </div>
              </div>
            </div>
            <div className="scene-actions">
              <select
                value={activeBranch?.id ?? ""}
                onChange={(event) => setBranchActive(event.target.value)}
                className="scene-chip px-3 py-2 text-xs font-medium"
              >
                {branches.map((branch: Branch) => (
                  <option key={branch.id} value={branch.id} disabled={!branch.active}>
                    {branch.name} ({branch.code}){branch.active ? "" : " - Inactiva"}
                  </option>
                ))}
              </select>
              <Link
                href="/inventario"
                className="scene-button-secondary px-3 py-2 text-xs font-medium"
              >
                Stock bajo: {lowStockCount}
              </Link>
              <AuthChip />
              <SyncStatusChip />
            </div>
          </header>

          <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/mesas"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Mesas
            </Link>
            <Link
              href="/kds"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              KDS
            </Link>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeCategory === category
                    ? "bg-sky-500 text-white shadow-md"
                    : "bg-white/75 text-slate-800 hover:bg-sky-50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {visibleProducts.map((item) => (
              (() => {
                const remaining = getRemainingForProduct(item, stockByProduct, reservedByProduct);
                return (
                  <button
                    key={item.id}
                    onClick={() => openProduct(item)}
                    disabled={remaining <= 0}
                    className="scene-card scene-float p-4 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-sky-300 enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <p className="text-sm text-sky-700">{item.category}</p>
                    <h2 className="font-semibold">{item.name}</h2>
                    <p className="mt-2 text-lg">
                      {money(getBranchProductPrice(item, activeBranch?.id ?? null))}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {item.kind === "bundle"
                        ? `Combos disponibles: ${Math.max(remaining, 0)}`
                        : `Stock: ${item.isWeighable ? `${Math.max(remaining, 0).toFixed(3)} kg` : Math.max(remaining, 0)}`}
                      {item.kind === "bundle" ? " - Combo" : ""}
                      {item.isWeighable ? " - Venta por peso" : ""}
                      {item.modifierGroupIds.length > 0 ? " - Configurable" : ""}
                    </p>
                  </button>
                );
              })()
            ))}
          </div>
        </section>

        <aside className="scene-panel p-5">
          <h2 className="text-lg font-semibold">Pedido actual</h2>
          <p className="text-sm text-neutral-500">{cart.length} lineas en carro</p>

          <div className="mt-4 space-y-3">
            {cart.length === 0 && (
              <p className="scene-empty p-4 text-sm text-neutral-500">
                Agrega productos para comenzar el pedido.
              </p>
            )}
            {cart.map((item) => (
              <div key={item.lineId} className="scene-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.isBundle && item.bundleItems.length > 0 && (
                      <p className="text-xs text-neutral-600">
                        {item.bundleItems
                          .map((component) => {
                            const componentName =
                              productById.get(component.productId)?.name ?? component.productId;
                            return `${component.qty}x ${componentName}`;
                          })
                          .join(" + ")}
                      </p>
                    )}
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-neutral-600">
                        {item.modifiers.map((modifier) => modifier.modifierName).join(", ")}
                      </p>
                    )}
                  </div>
                  <p className="text-sm">{money(lineUnitPrice(item) * item.qty)}</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateQty(item.lineId, item.qty - (item.isWeighable ? WEIGHABLE_STEP : 1))
                    }
                    className="scene-chip h-9 w-9 text-lg"
                  >
                    -
                  </button>
                  <span className="min-w-20 text-center text-sm">
                    {formatQty(item.qty, item.isWeighable)}
                  </span>
                  <button
                    onClick={() =>
                      updateQty(item.lineId, item.qty + (item.isWeighable ? WEIGHABLE_STEP : 1))
                    }
                    className="scene-chip h-9 w-9 text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600">Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">IVA (21%)</span>
              <span>{money(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>

          <div className="scene-card mt-5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wider text-neutral-500">Cobro</p>
              <button
                type="button"
                onClick={() =>
                  setPaymentLines((current) => [...current, { method: "Efectivo", amount: Math.max(0, paymentDelta) }])
                }
                className="scene-button-secondary px-3 py-2 text-xs font-medium"
              >
                Dividir pago
              </button>
            </div>
            <div className="space-y-2">
              {paymentLines.map((line, index) => (
                <div key={`${line.method}-${index}`} className="scene-card-soft grid gap-2 p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <select
                      value={line.method}
                      onChange={(event) =>
                        setPaymentLines((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, method: event.target.value as PaymentMethod }
                              : item
                          )
                        )
                      }
                      className="rounded-lg border px-3 py-2 text-sm min-w-0"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={line.amount}
                      onFocus={(event) => event.target.select()}
                      onChange={(event) =>
                        setPaymentLines((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, amount: Number(event.target.value) || 0 }
                              : item
                          )
                        )
                      }
                      className="rounded-lg border px-3 py-2 text-sm w-20 min-w-0"
                    />
                    <button
                      type="button"
                      disabled={paymentLines.length === 1}
                      onClick={() =>
                        setPaymentLines((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                      className="scene-button-danger px-3 py-2 text-xs font-medium disabled:opacity-40"
                    >
                      Quitar
                    </button>
                  </div>
                  {line.method !== "Efectivo" && line.method !== "Transferencia" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={line.cardBrand ?? ""}
                        onChange={(event) =>
                          setPaymentLines((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, cardBrand: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Marca / entidad"
                        className="rounded-lg border px-3 py-2 text-sm"
                      />
                      <input
                        value={line.last4 ?? ""}
                        onChange={(event) =>
                          setPaymentLines((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, last4: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Ultimos 4"
                        className="rounded-lg border px-3 py-2 text-sm"
                      />
                      <input
                        value={line.reference ?? ""}
                        onChange={(event) =>
                          setPaymentLines((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, reference: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Referencia / aprobacion"
                        className="rounded-lg border px-3 py-2 text-sm"
                      />
                      <select
                        value={line.terminalId ?? ""}
                        onChange={(event) =>
                          setPaymentLines((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    terminalId: event.target.value || null,
                                    providerLabel:
                                      activeBranchTerminals.find((terminal) => terminal.id === event.target.value)?.name ??
                                      item.providerLabel,
                                  }
                                : item
                            )
                          )
                        }
                        className="rounded-lg border px-3 py-2 text-sm"
                      >
                        <option value="">Terminal manual</option>
                        {activeBranchTerminals.map((terminal) => (
                          <option key={terminal.id} value={terminal.id}>
                            {terminal.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(sanitizeText(event.target.value))}
                placeholder="Cliente (opcional)"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={customerDocument}
                onChange={(event) => setCustomerDocument(sanitizeDocumentNumber(event.target.value))}
                placeholder="Documento / CUIT"
                className="rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <input
              value={saleNote}
              onChange={(event) => setSaleNote(sanitizeText(event.target.value, 500))}
              placeholder="Observacion del ticket"
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] min-w-0">
              <select
                value={effectivePrinterId}
                onChange={(event) => setSelectedPrinterId(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm min-w-0 truncate"
              >
                <option value="">Sin impresora seleccionada</option>
                {activeBranchPrinters.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name} - {printer.paperWidthMm} mm
                  </option>
                ))}
              </select>
              <Link href="/operaciones" className="scene-button-secondary px-4 py-2 text-sm font-medium">
                Operaciones
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-neutral-600">
              <span>Total cobrado: {money(paymentTotal)}</span>
              <span className={paymentDelta === 0 ? "text-emerald-700" : "text-rose-700"}>
                {paymentDelta === 0
                  ? "Monto cerrado"
                  : paymentDelta > 0
                    ? `Faltan ${money(paymentDelta)}`
                    : `Sobra ${money(Math.abs(paymentDelta))}`}
              </span>
            </div>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={handleCharge}
            className="scene-button-primary mt-4 w-full px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            Cobrar y emitir ticket
          </button>

          <div className="scene-card mt-3 p-3">
            <p className="text-xs uppercase tracking-wider text-neutral-500">Comanda cocina</p>
            <div className="mt-2 grid gap-2">
              <input
                value={tableCode}
                onChange={(event) => setTableCode(sanitizeTableCode(event.target.value))}
                placeholder="Mesa (ej: MESA-4)"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={kitchenNote}
                onChange={(event) => setKitchenNote(sanitizeText(event.target.value, 300))}
                placeholder="Nota para cocina (opcional)"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <button
                disabled={cart.length === 0}
                onClick={() => {
                  const order = sendCartToKitchen(tableCode, kitchenNote);
                  if (!order) return;
                  setLastKitchenOrder(order.id.slice(0, 8).toUpperCase());
                  setKitchenNote("");
                }}
                className="scene-button-secondary px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enviar a cocina
              </button>
            </div>
          </div>

          {lastTicket && (
            <p className="scene-card mt-3 bg-sky-50 px-3 py-2 text-sm text-sky-700">
              Venta registrada. Ticket #{lastTicket}
            </p>
          )}
          {stockError && (
            <p className="scene-card mt-3 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {stockError}
            </p>
          )}
          {lastKitchenOrder && (
            <p className="scene-card mt-3 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Comanda enviada #{lastKitchenOrder}
            </p>
          )}

          <Link
            href="/ventas"
            className="scene-button-secondary mt-3 block px-4 py-2 text-center text-sm font-medium"
          >
            Ver historial de ventas
          </Link>
        </aside>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="scene-panel w-full max-w-xl p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="scene-kicker">Configurar producto</p>
                <h3 className="text-xl font-semibold">{selectedProduct.name}</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              {selectedProduct.isWeighable && (
                <div className="scene-card-soft p-3">
                  <p className="text-sm font-medium">Peso (kg)</p>
                  <input
                    type="number"
                    min={WEIGHABLE_STEP}
                    step={WEIGHABLE_STEP}
                    value={selectedQty}
                    onChange={(event) => setSelectedQty(event.target.value)}
                    className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Precio por kg: {money(selectedProduct.basePrice)}
                  </p>
                </div>
              )}
              {selectedProduct.modifierGroupIds.map((groupId) => {
                const group = modifierGroupMap.get(groupId);
                if (!group) return null;
                return (
                  <ModifierSelector
                    key={group.id}
                    group={group}
                    selectedIds={selections[group.id] ?? []}
                    onChange={(ids) =>
                      setSelections((current) => ({
                        ...current,
                        [group.id]: ids,
                      }))
                    }
                  />
                );
              })}
            </div>

            <button
              onClick={confirmProduct}
              className="scene-button-primary mt-4 w-full px-4 py-3 font-semibold text-white"
            >
              Agregar al pedido
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

