"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ArcaConfig,
  Branch,
  CashMovement,
  Courier,
  DeliveryOrder,
  DiningOrder,
  EntitySyncStatus,
  FiscalInvoice,
  PaymentTerminalConfig,
  PosState,
  PreOrder,
  Sale,
  ShiftClose,
  TicketPrinterConfig,
  TicketReceipt,
} from "../domain/entities";
import {
  applySyncState,
  buildLineSignature,
  calcTotals,
  DEFAULT_BRANCH_ID,
  defaultArca,
  defaultBranch,
  defaultPrinter,
  normalizeArca,
  normalizeBranch,
  normalizeCashMovement,
  normalizeCheckoutPayments,
  normalizeCourier,
  normalizeDeliveryOrder,
  normalizeDiningOrder,
  normalizeFiscalInvoice,
  normalizePreOrder,
  normalizePrinter,
  normalizeSale,
  normalizeShiftClose,
  normalizeTerminal,
  normalizeTicketReceipt,
  nowIso,
  primaryPaymentMethod,
  randomId,
  roundMoney,
  roundQty,
  syncBase,
  WEIGHT_QTY_STEP,
  withOperationalDefaults,
} from "../lib/helpers";

// Re-export everything for backward compatibility
export type {
  PaymentMethod,
  PaymentStatus,
  EntitySyncStatus,
  PaperWidthMm,
  PrinterConnectionType,
  PaymentTerminalProvider,
  PaymentCollectionMode,
  ReceiptPrintStatus,
  SelectedModifier,
  CartItem,
  SalePayment,
  CheckoutPaymentInput,
  TicketReceipt,
  Sale,
  ShiftClose,
  ActiveShift,
  CashMovementType,
  CashMovement,
  PreOrderStatus,
  PreOrder,
  KitchenStatus,
  DiningOrder,
  DeliveryStatus,
  DeliverySource,
  Courier,
  DeliveryOrder,
  FiscalProvider,
  Branch,
  FiscalInvoiceStatus,
  FiscalInvoice,
  TicketPrinterConfig,
  PaymentTerminalConfig,
  ArcaConfig,
  CheckoutPayload,
  SyncMeta,
  SyncEntity,
  SyncAction,
  PosState,
} from "../domain/entities";

export {
  calcTotals,
  lineUnitPrice,
} from "../lib/helpers";

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      cart: [],
      sales: [],
      shiftClosures: [],
      cashMovements: [],
      preOrders: [],
      diningOrders: [],
      couriers: [],
      deliveryOrders: [],
      branches: [defaultBranch()],
      activeBranchId: DEFAULT_BRANCH_ID,
      fiscalInvoices: [],
      ticketReceipts: [],
      printerConfigs: [defaultPrinter(DEFAULT_BRANCH_ID)],
      paymentTerminals: [],
      arcaConfigs: [defaultArca(DEFAULT_BRANCH_ID)],
      activeShift: null,
      syncMeta: { isOnline: true, isSyncing: false, lastSyncAt: null, lastSyncError: null, remoteEnabled: false },
      addLine: (product, modifiers, qty = 1) => set((state) => {
        const normalizedQty = roundQty(Math.max(product.isWeighable ? WEIGHT_QTY_STEP : 1, qty));
        const signature = buildLineSignature(product.id, modifiers, product.basePrice);
        const existing = state.cart.find((line) => line.lineId === signature);
        if (existing) return { cart: state.cart.map((line) => line.lineId === signature ? { ...line, qty: roundQty(line.qty + normalizedQty) } : line) };
        return { cart: [...state.cart, { lineId: signature, productId: product.id, productName: product.name, basePrice: product.basePrice, qty: normalizedQty, isWeighable: product.isWeighable, isBundle: product.kind === "bundle", bundleItems: product.bundleItems, modifiers }] };
      }),
      updateQty: (lineId, nextQty) => set((state) => {
        const existing = state.cart.find((line) => line.lineId === lineId);
        const minQty = existing?.isWeighable ? WEIGHT_QTY_STEP : 1;
        if (nextQty <= 0) return { cart: state.cart.filter((line) => line.lineId !== lineId) };
        return { cart: state.cart.map((line) => line.lineId === lineId ? { ...line, qty: roundQty(nextQty) < minQty ? minQty : roundQty(nextQty) } : line) };
      }),
      clearCart: () => set({ cart: [] }),
      completeSale: (payload) => {
        const { cart, sales, activeBranchId, branches, fiscalInvoices, printerConfigs, ticketReceipts } = get();
        if (cart.length === 0) return null;
        const branch = branches.find((item) => item.id === activeBranchId) ?? branches[0];
        if (!branch) return null;
        const { subtotal, tax, total } = calcTotals(cart);
        const payments = normalizeCheckoutPayments(payload.payments, total);
        if (payments.length === 0) return null;
        const printer = printerConfigs.find((config) => config.id === payload.printerId && config.active) ?? printerConfigs.find((config) => config.branchId === branch.id && config.isDefault && config.active) ?? printerConfigs.find((config) => config.branchId === branch.id && config.active) ?? null;
        const saleId = randomId();
        const createdAt = nowIso();
        const receipt: TicketReceipt = { id: randomId("receipt"), saleId, branchId: branch.id, receiptNumber: `${branch.code}-${String(ticketReceipts.filter((item) => item.branchId === branch.id).length + 1).padStart(6, "0")}`, printerId: printer?.id ?? null, paperWidthMm: printer?.paperWidthMm ?? 80, copies: printer?.copies ?? 1, printStatus: "pending", printedAt: null, createdAt, ...syncBase() };
        const sale: Sale = { id: saleId, createdAt, branchId: branch.id, paymentMethod: primaryPaymentMethod(payments), payments, customerName: payload.customerName?.trim() || null, customerDocument: payload.customerDocument?.trim() || null, note: payload.note?.trim() || null, receiptId: receipt.id, items: cart, subtotal, tax, total, ...syncBase() };
        const nextFiscalInvoices = branch.fiscalProvider !== "none" ? [{ id: randomId("fiscal"), saleId: sale.id, branchId: branch.id, provider: branch.fiscalProvider, status: "pending", documentNumber: null, responsePayload: null, createdAt, updatedAt: createdAt, ...syncBase() } as FiscalInvoice, ...fiscalInvoices] : fiscalInvoices;
        set({ cart: [], sales: [sale, ...sales], fiscalInvoices: nextFiscalInvoices, ticketReceipts: [receipt, ...ticketReceipts] });
        return sale;
      },
      clearSales: () => set({ sales: [] }),
      openShift: (openingAmount) => {
        const activeShift = { id: randomId("shift"), openedAt: nowIso(), openingAmount: roundMoney(openingAmount) };
        set({ activeShift });
        return activeShift;
      },
      closeShift: (countedCash, note) => {
        const { sales, shiftClosures, activeShift, cashMovements, activeBranchId, branches } = get();
        if (!activeShift) return null;
        const branch = branches.find((item) => item.id === activeBranchId) ?? branches[0];
        if (!branch) return null;
        const manualInTotal = cashMovements.filter((movement) => movement.shiftId === activeShift.id && movement.type === "in").reduce((acc, movement) => acc + movement.amount, 0);
        const manualOutTotal = cashMovements.filter((movement) => movement.shiftId === activeShift.id && movement.type === "out").reduce((acc, movement) => acc + movement.amount, 0);
        const cashSalesTotal = sales.reduce((acc, sale) => acc + sale.payments.filter((payment) => payment.method === "Efectivo").reduce((sum, payment) => sum + payment.amount, 0), 0);
        const expectedCash = activeShift.openingAmount + cashSalesTotal + manualInTotal - manualOutTotal;
        const normalizedCountedCash = typeof countedCash === "number" && Number.isFinite(countedCash) ? roundMoney(countedCash) : null;
        const closure: ShiftClose = { id: randomId("closure"), branchId: branch.id, closedAt: nowIso(), ticketCount: sales.length, totalAmount: sales.reduce((acc, sale) => acc + sale.total, 0), syncedCount: sales.filter((sale) => sale.syncStatus === "synced").length, pendingCount: sales.filter((sale) => sale.syncStatus !== "synced").length, shiftOpenedAt: activeShift.openedAt, openingAmount: activeShift.openingAmount, cashSalesTotal, manualInTotal, manualOutTotal, expectedCash, countedCash: normalizedCountedCash, cashVariance: normalizedCountedCash == null ? null : normalizedCountedCash - expectedCash, note: note?.trim() || null, ...syncBase() };
        set({ sales: [], activeShift: null, shiftClosures: [closure, ...shiftClosures] });
        return closure;
      },
      addCashMovement: (type, amount, reason) => {
        const { activeShift, cashMovements } = get();
        const normalizedAmount = roundMoney(amount);
        if (!activeShift || normalizedAmount <= 0 || !reason.trim()) return null;
        const movement: CashMovement = { id: randomId(type), shiftId: activeShift.id, createdAt: nowIso(), type, amount: normalizedAmount, reason: reason.trim(), ...syncBase() };
        set({ cashMovements: [movement, ...cashMovements].slice(0, 400) });
        return movement;
      },
      sendCartToKitchen: (tableCode, notes) => {
        const { cart, diningOrders } = get();
        const normalizedTable = tableCode.trim().toUpperCase();
        if (cart.length === 0 || !normalizedTable) return null;
        const diningOrder: DiningOrder = { id: randomId("kitchen"), tableCode: normalizedTable, createdAt: nowIso(), status: "sent", notes: notes?.trim() || null, items: cart };
        set({ cart: [], diningOrders: [diningOrder, ...diningOrders].slice(0, 300) });
        return diningOrder;
      },
      setDiningOrderStatus: (orderId, status) => set((state) => ({ diningOrders: state.diningOrders.map((order) => order.id === orderId ? { ...order, status } : order) })),
      moveDiningOrderToTable: (orderId, nextTableCode) => set((state) => ({ diningOrders: state.diningOrders.map((order) => order.id === orderId ? { ...order, tableCode: nextTableCode.trim().toUpperCase() || order.tableCode } : order) })),
      mergeDiningOrders: (targetOrderId, sourceOrderId) => set((state) => {
        if (targetOrderId === sourceOrderId) return {};
        const target = state.diningOrders.find((order) => order.id === targetOrderId);
        const source = state.diningOrders.find((order) => order.id === sourceOrderId);
        if (!target || !source) return {};
        return { diningOrders: state.diningOrders.filter((order) => order.id !== sourceOrderId).map((order) => order.id === targetOrderId ? { ...target, items: [...target.items, ...source.items], notes: [target.notes, source.notes].filter(Boolean).join(" | ") || null, createdAt: target.createdAt < source.createdAt ? target.createdAt : source.createdAt } : order) };
      }),
      addCourier: (name, phone) => {
        const cleanName = name.trim();
        if (!cleanName) return null;
        const courier = { id: randomId("courier"), name: cleanName, phone: phone?.trim() || null, active: true, createdAt: nowIso() };
        set((state) => ({ couriers: [courier, ...state.couriers] }));
        return courier;
      },
      toggleCourierActive: (courierId, active) => set((state) => ({ couriers: state.couriers.map((courier) => courier.id === courierId ? { ...courier, active } : courier) })),
      createDeliveryOrder: (params) => {
        const branch = get().branches.find((item) => item.id === get().activeBranchId) ?? get().branches[0];
        const customerName = params.customerName.trim();
        const address = params.address.trim();
        const totalAmount = roundMoney(params.totalAmount);
        if (!branch || !customerName || !address || totalAmount <= 0) return null;
        const order: DeliveryOrder = { id: randomId("delivery"), branchId: branch.id, source: params.source, customerName, customerPhone: params.customerPhone?.trim() || null, address, note: params.note?.trim() || null, totalAmount, status: "pending", courierName: null, courierPhone: null, createdAt: nowIso(), updatedAt: nowIso(), ...syncBase() };
        set((state) => ({ deliveryOrders: [order, ...state.deliveryOrders] }));
        return order;
      },
      assignDeliveryCourier: (orderId, courierId) => set((state) => {
        const courier = courierId ? state.couriers.find((item) => item.id === courierId && item.active) : null;
        return { deliveryOrders: state.deliveryOrders.map((order) => order.id === orderId ? { ...order, courierName: courier?.name ?? null, courierPhone: courier?.phone ?? null, status: courier ? "assigned" : "pending", updatedAt: nowIso(), syncStatus: "pending" as EntitySyncStatus } : order) };
      }),
      setDeliveryOrderStatus: (orderId, status) => set((state) => ({ deliveryOrders: state.deliveryOrders.map((order) => order.id === orderId ? { ...order, status, updatedAt: nowIso(), syncStatus: "pending" as EntitySyncStatus } : order) })),
      addBranch: (name, code, fiscalProvider) => {
        const cleanName = name.trim();
        const cleanCode = code.trim().toUpperCase();
        if (!cleanName || !cleanCode) return null;
        const branch: Branch = { id: randomId("branch"), name: cleanName, code: cleanCode, fiscalProvider, active: true, createdAt: nowIso(), ...syncBase() };
        set((state) => ({ branches: [branch, ...state.branches], printerConfigs: [defaultPrinter(branch.id), ...state.printerConfigs], arcaConfigs: [defaultArca(branch.id), ...state.arcaConfigs] }));
        return branch;
      },
      setBranchActive: (branchId) => set((state) => ({ activeBranchId: state.branches.some((item) => item.id === branchId && item.active) ? branchId : state.activeBranchId })),
      setBranchEnabled: (branchId, active) => set((state) => ({ branches: state.branches.map((branch) => branch.id === branchId ? { ...branch, active, syncStatus: "pending" as EntitySyncStatus } : branch), activeBranchId: state.activeBranchId === branchId && !active ? state.branches.find((branch) => branch.id !== branchId && branch.active)?.id ?? DEFAULT_BRANCH_ID : state.activeBranchId })),
      upsertPrinterConfig: (config) => {
        const normalized = normalizePrinter({ ...config, createdAt: nowIso(), ...syncBase() });
        set((state) => ({ printerConfigs: state.printerConfigs.some((item) => item.id === normalized.id) ? state.printerConfigs.map((item) => item.id === normalized.id ? { ...normalized, createdAt: item.createdAt, syncStatus: "pending" as EntitySyncStatus } : normalized.isDefault && item.branchId === normalized.branchId ? { ...item, isDefault: false, syncStatus: "pending" as EntitySyncStatus } : item) : [normalized, ...state.printerConfigs.map((item) => normalized.isDefault && item.branchId === normalized.branchId ? { ...item, isDefault: false, syncStatus: "pending" as EntitySyncStatus } : item)] }));
        return normalized;
      },
      upsertPaymentTerminal: (terminal) => {
        const normalized = normalizeTerminal({ ...terminal, createdAt: nowIso(), ...syncBase() });
        set((state) => ({ paymentTerminals: state.paymentTerminals.some((item) => item.id === normalized.id) ? state.paymentTerminals.map((item) => item.id === normalized.id ? { ...normalized, createdAt: item.createdAt, syncStatus: "pending" as EntitySyncStatus } : item) : [normalized, ...state.paymentTerminals] }));
        return normalized;
      },
      upsertArcaConfig: (config) => {
        const normalized = normalizeArca({ ...config, createdAt: nowIso(), ...syncBase() });
        set((state) => ({ arcaConfigs: state.arcaConfigs.some((item) => item.id === normalized.id) ? state.arcaConfigs.map((item) => item.id === normalized.id ? { ...normalized, createdAt: item.createdAt, syncStatus: "pending" as EntitySyncStatus } : item) : [normalized, ...state.arcaConfigs] }));
        return normalized;
      },
      markTicketPrinted: (receiptId) => set((state) => ({ ticketReceipts: state.ticketReceipts.map((receipt) => receipt.id === receiptId ? { ...receipt, printStatus: "printed", printedAt: nowIso() } : receipt) })),
      markTicketPrintFailed: (receiptId, errorMessage) => set((state) => ({ ticketReceipts: state.ticketReceipts.map((receipt) => receipt.id === receiptId ? { ...receipt, printStatus: "failed", syncError: errorMessage } : receipt) })),
      createPreOrder: (params) => {
        const branch = get().branches.find((item) => item.id === get().activeBranchId) ?? get().branches[0];
        if (!branch) throw new Error("No hay sucursal activa");
        const totalAmount = roundMoney(params.totalAmount);
        const depositAmount = Math.max(0, Math.min(totalAmount, roundMoney(params.depositAmount)));
        const preOrder: PreOrder = { id: randomId("preorder"), branchId: branch.id, customerName: params.customerName.trim(), customerPhone: params.customerPhone?.trim() || null, note: params.note?.trim() || null, dueAt: params.dueAt, totalAmount, depositAmount, remainingAmount: totalAmount - depositAmount, status: "scheduled", createdAt: nowIso(), ...syncBase() };
        set((state) => ({ preOrders: [preOrder, ...state.preOrders] }));
        return preOrder;
      },
      setPreOrderStatus: (preOrderId, status) => set((state) => ({ preOrders: state.preOrders.map((preOrder) => preOrder.id === preOrderId ? { ...preOrder, status, syncStatus: "pending" as EntitySyncStatus } : preOrder) })),
      markSaleSyncing: (saleId) => set((state) => ({ sales: applySyncState(state.sales, saleId, "syncing") })),
      markSaleSynced: (saleId) => set((state) => ({ sales: applySyncState(state.sales, saleId, "synced") })),
      markSaleFailed: (saleId, errorMessage) => set((state) => ({ sales: applySyncState(state.sales, saleId, "failed", errorMessage) })),
      markSaleTerminal: (saleId, errorMessage) => set((state) => ({ sales: applySyncState(state.sales, saleId, "terminal", errorMessage) })),
      markShiftCloseSyncing: (closeId) => set((state) => ({ shiftClosures: applySyncState(state.shiftClosures, closeId, "syncing") })),
      markShiftCloseSynced: (closeId) => set((state) => ({ shiftClosures: applySyncState(state.shiftClosures, closeId, "synced") })),
      markShiftCloseFailed: (closeId, errorMessage) => set((state) => ({ shiftClosures: applySyncState(state.shiftClosures, closeId, "failed", errorMessage) })),
      markShiftCloseTerminal: (closeId, errorMessage) => set((state) => ({ shiftClosures: applySyncState(state.shiftClosures, closeId, "terminal", errorMessage) })),
      markCashMovementSyncing: (movementId) => set((state) => ({ cashMovements: applySyncState(state.cashMovements, movementId, "syncing") })),
      markCashMovementSynced: (movementId) => set((state) => ({ cashMovements: applySyncState(state.cashMovements, movementId, "synced") })),
      markCashMovementFailed: (movementId, errorMessage) => set((state) => ({ cashMovements: applySyncState(state.cashMovements, movementId, "failed", errorMessage) })),
      markCashMovementTerminal: (movementId, errorMessage) => set((state) => ({ cashMovements: applySyncState(state.cashMovements, movementId, "terminal", errorMessage) })),
      markPreOrderSyncing: (preOrderId) => set((state) => ({ preOrders: applySyncState(state.preOrders, preOrderId, "syncing") })),
      markPreOrderSynced: (preOrderId) => set((state) => ({ preOrders: applySyncState(state.preOrders, preOrderId, "synced") })),
      markPreOrderFailed: (preOrderId, errorMessage) => set((state) => ({ preOrders: applySyncState(state.preOrders, preOrderId, "failed", errorMessage) })),
      markPreOrderTerminal: (preOrderId, errorMessage) => set((state) => ({ preOrders: applySyncState(state.preOrders, preOrderId, "terminal", errorMessage) })),
      markDeliveryOrderSyncing: (orderId) => set((state) => ({ deliveryOrders: applySyncState(state.deliveryOrders, orderId, "syncing") })),
      markDeliveryOrderSynced: (orderId) => set((state) => ({ deliveryOrders: applySyncState(state.deliveryOrders, orderId, "synced") })),
      markDeliveryOrderFailed: (orderId, errorMessage) => set((state) => ({ deliveryOrders: applySyncState(state.deliveryOrders, orderId, "failed", errorMessage) })),
      markDeliveryOrderTerminal: (orderId, errorMessage) => set((state) => ({ deliveryOrders: applySyncState(state.deliveryOrders, orderId, "terminal", errorMessage) })),
      markBranchSyncing: (branchId) => set((state) => ({ branches: applySyncState(state.branches, branchId, "syncing") })),
      markBranchSynced: (branchId) => set((state) => ({ branches: applySyncState(state.branches, branchId, "synced") })),
      markBranchFailed: (branchId, errorMessage) => set((state) => ({ branches: applySyncState(state.branches, branchId, "failed", errorMessage) })),
      markBranchTerminal: (branchId, errorMessage) => set((state) => ({ branches: applySyncState(state.branches, branchId, "terminal", errorMessage) })),
      markFiscalInvoiceSyncing: (invoiceId) => set((state) => ({ fiscalInvoices: state.fiscalInvoices.map((invoice) => invoice.id === invoiceId ? { ...applySyncState([invoice], invoiceId, "syncing")[0], status: "processing", updatedAt: nowIso() } : invoice) })),
      markFiscalInvoiceSynced: (invoiceId, documentNumber, responsePayload) => set((state) => ({ fiscalInvoices: state.fiscalInvoices.map((invoice) => invoice.id === invoiceId ? { ...applySyncState([invoice], invoiceId, "synced")[0], status: "issued", documentNumber: documentNumber ?? invoice.documentNumber, responsePayload: responsePayload ?? invoice.responsePayload, updatedAt: nowIso() } : invoice), arcaConfigs: state.arcaConfigs.map((config) => state.fiscalInvoices.some((invoice) => invoice.id === invoiceId && invoice.branchId === config.branchId) ? { ...config, lastInvoiceAt: nowIso(), syncStatus: "pending" as EntitySyncStatus } : config) })),
      markFiscalInvoiceFailed: (invoiceId, errorMessage) => set((state) => ({ fiscalInvoices: state.fiscalInvoices.map((invoice) => invoice.id === invoiceId ? { ...applySyncState([invoice], invoiceId, "failed", errorMessage)[0], status: "failed", updatedAt: nowIso() } : invoice) })),
      markFiscalInvoiceTerminal: (invoiceId, errorMessage) => set((state) => ({ fiscalInvoices: state.fiscalInvoices.map((invoice) => invoice.id === invoiceId ? { ...applySyncState([invoice], invoiceId, "terminal", errorMessage)[0], status: "failed", updatedAt: nowIso() } : invoice) })),
      markTicketReceiptSyncing: (receiptId) => set((state) => ({ ticketReceipts: applySyncState(state.ticketReceipts, receiptId, "syncing") })),
      markTicketReceiptSynced: (receiptId) => set((state) => ({ ticketReceipts: applySyncState(state.ticketReceipts, receiptId, "synced") })),
      markTicketReceiptFailed: (receiptId, errorMessage) => set((state) => ({ ticketReceipts: applySyncState(state.ticketReceipts, receiptId, "failed", errorMessage) })),
      markTicketReceiptTerminal: (receiptId, errorMessage) => set((state) => ({ ticketReceipts: applySyncState(state.ticketReceipts, receiptId, "terminal", errorMessage) })),
      markPrinterConfigSyncing: (configId) => set((state) => ({ printerConfigs: applySyncState(state.printerConfigs, configId, "syncing") })),
      markPrinterConfigSynced: (configId) => set((state) => ({ printerConfigs: applySyncState(state.printerConfigs, configId, "synced") })),
      markPrinterConfigFailed: (configId, errorMessage) => set((state) => ({ printerConfigs: applySyncState(state.printerConfigs, configId, "failed", errorMessage) })),
      markPrinterConfigTerminal: (configId, errorMessage) => set((state) => ({ printerConfigs: applySyncState(state.printerConfigs, configId, "terminal", errorMessage) })),
      markPaymentTerminalSyncing: (terminalId) => set((state) => ({ paymentTerminals: applySyncState(state.paymentTerminals, terminalId, "syncing") })),
      markPaymentTerminalSynced: (terminalId) => set((state) => ({ paymentTerminals: applySyncState(state.paymentTerminals, terminalId, "synced") })),
      markPaymentTerminalFailed: (terminalId, errorMessage) => set((state) => ({ paymentTerminals: applySyncState(state.paymentTerminals, terminalId, "failed", errorMessage) })),
      markPaymentTerminalTerminal: (terminalId, errorMessage) => set((state) => ({ paymentTerminals: applySyncState(state.paymentTerminals, terminalId, "terminal", errorMessage) })),
      markArcaConfigSyncing: (configId) => set((state) => ({ arcaConfigs: applySyncState(state.arcaConfigs, configId, "syncing") })),
      markArcaConfigSynced: (configId) => set((state) => ({ arcaConfigs: applySyncState(state.arcaConfigs, configId, "synced") })),
      markArcaConfigFailed: (configId, errorMessage) => set((state) => ({ arcaConfigs: applySyncState(state.arcaConfigs, configId, "failed", errorMessage) })),
      markArcaConfigTerminal: (configId, errorMessage) => set((state) => ({ arcaConfigs: applySyncState(state.arcaConfigs, configId, "terminal", errorMessage) })),
      setSyncMeta: (meta) => set((state) => ({ syncMeta: { ...state.syncMeta, ...meta } })),
    }),
    {
      name: "gastropos-storage-v3",
      version: 9,
      migrate: (persistedState) => {
        const state = persistedState as Partial<PosState> | undefined;
        if (!state) return {} as PosState;
        const branchesRaw = Array.isArray(state.branches) ? state.branches.map((branch) => normalizeBranch(branch as Branch)) : [];
        const branches = branchesRaw.length > 0 ? branchesRaw : [defaultBranch()];
        const printersRaw = Array.isArray(state.printerConfigs) ? state.printerConfigs.map((config) => normalizePrinter(config as TicketPrinterConfig)) : [];
        const arcaRaw = Array.isArray(state.arcaConfigs) ? state.arcaConfigs.map((config) => normalizeArca(config as ArcaConfig)) : [];
        const defaults = withOperationalDefaults(branches, printersRaw, arcaRaw);
        return {
          ...state,
          cart: Array.isArray(state.cart) ? state.cart : [],
          sales: Array.isArray(state.sales) ? state.sales.map((sale) => normalizeSale(sale as Sale)) : [],
          shiftClosures: Array.isArray(state.shiftClosures) ? state.shiftClosures.map((closure) => normalizeShiftClose(closure as ShiftClose)) : [],
          cashMovements: Array.isArray(state.cashMovements) ? state.cashMovements.map((movement) => normalizeCashMovement(movement as CashMovement)) : [],
          preOrders: Array.isArray(state.preOrders) ? state.preOrders.map((preOrder) => normalizePreOrder(preOrder as PreOrder)) : [],
          diningOrders: Array.isArray(state.diningOrders) ? state.diningOrders.map((order) => normalizeDiningOrder(order as DiningOrder)) : [],
          couriers: Array.isArray(state.couriers) ? state.couriers.map((courier) => normalizeCourier(courier as Courier)) : [],
          deliveryOrders: Array.isArray(state.deliveryOrders) ? state.deliveryOrders.map((order) => normalizeDeliveryOrder(order as DeliveryOrder)) : [],
          branches,
          activeBranchId: state.activeBranchId && branches.some((branch) => branch.id === state.activeBranchId) ? state.activeBranchId : branches.find((branch) => branch.active)?.id ?? branches[0].id,
          fiscalInvoices: Array.isArray(state.fiscalInvoices) ? state.fiscalInvoices.map((invoice) => normalizeFiscalInvoice(invoice as FiscalInvoice)) : [],
          ticketReceipts: Array.isArray(state.ticketReceipts) ? state.ticketReceipts.map((receipt) => normalizeTicketReceipt(receipt as TicketReceipt)) : [],
          printerConfigs: defaults.printers,
          paymentTerminals: Array.isArray(state.paymentTerminals) ? state.paymentTerminals.map((terminal) => normalizeTerminal(terminal as PaymentTerminalConfig)) : [],
          arcaConfigs: defaults.arcaConfigs,
          activeShift: state.activeShift ?? null,
          syncMeta: { isOnline: true, isSyncing: false, lastSyncAt: null, lastSyncError: null, remoteEnabled: false },
        } as PosState;
      },
    }
  )
);
