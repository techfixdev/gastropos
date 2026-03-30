"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "../domain/catalog";

export type PaymentMethod =
  | "Efectivo"
  | "Debito"
  | "Credito"
  | "Mercado Pago QR"
  | "Mercado Pago Point"
  | "Transferencia";
export type PaymentStatus = "pending" | "approved" | "manual_confirmed" | "failed";
export type EntitySyncStatus = "pending" | "syncing" | "synced" | "failed";
export type PaperWidthMm = 80 | 90;
export type PrinterConnectionType = "browser" | "usb" | "network";
export type PaymentTerminalProvider = "manual" | "mercado_pago_qr" | "mercado_pago_point" | "bank_pos";
export type PaymentCollectionMode = "manual" | "qr_dynamic" | "terminal";
export type ReceiptPrintStatus = "pending" | "printed" | "failed";

export type SelectedModifier = {
  groupId: string;
  groupName: string;
  modifierId: string;
  modifierName: string;
  priceDelta: number;
};

export type CartItem = {
  lineId: string;
  productId: string;
  productName: string;
  basePrice: number;
  qty: number;
  isWeighable: boolean;
  isBundle: boolean;
  bundleItems: Array<{ productId: string; qty: number }>;
  modifiers: SelectedModifier[];
};

export type SalePayment = {
  id: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  reference: string | null;
  cardBrand: string | null;
  installments: number | null;
  last4: string | null;
  providerLabel: string | null;
  terminalId: string | null;
  createdAt: string;
};

export type CheckoutPaymentInput = {
  method: PaymentMethod;
  amount: number;
  status?: PaymentStatus;
  reference?: string | null;
  cardBrand?: string | null;
  installments?: number | null;
  last4?: string | null;
  providerLabel?: string | null;
  terminalId?: string | null;
};

export type TicketReceipt = {
  id: string;
  saleId: string;
  branchId: string;
  receiptNumber: string;
  printerId: string | null;
  paperWidthMm: PaperWidthMm;
  copies: number;
  printStatus: ReceiptPrintStatus;
  printedAt: string | null;
  createdAt: string;
  syncStatus: EntitySyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
};

export type Sale = {
  id: string;
  createdAt: string;
  branchId: string;
  paymentMethod: PaymentMethod;
  payments: SalePayment[];
  customerName: string | null;
  customerDocument: string | null;
  note: string | null;
  receiptId: string | null;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  syncStatus: EntitySyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
};

type SyncMeta = {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  remoteEnabled: boolean;
};

export type ShiftClose = {
  id: string;
  branchId: string;
  closedAt: string;
  ticketCount: number;
  totalAmount: number;
  syncedCount: number;
  pendingCount: number;
  shiftOpenedAt: string;
  openingAmount: number;
  cashSalesTotal: number;
  manualInTotal: number;
  manualOutTotal: number;
  expectedCash: number;
  countedCash: number | null;
  cashVariance: number | null;
  note: string | null;
  syncStatus: EntitySyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
};

export type ActiveShift = { id: string; openedAt: string; openingAmount: number };
export type CashMovementType = "in" | "out";
export type CashMovement = {
  id: string;
  shiftId: string;
  createdAt: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  syncStatus: EntitySyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
};
export type PreOrderStatus = "scheduled" | "ready" | "delivered" | "cancelled";
export type PreOrder = {
  id: string;
  branchId: string;
  customerName: string;
  customerPhone: string | null;
  note: string | null;
  dueAt: string;
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  status: PreOrderStatus;
  createdAt: string;
  syncStatus: EntitySyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
};
export type KitchenStatus = "sent" | "preparing" | "ready" | "served" | "cancelled";
export type DiningOrder = { id: string; tableCode: string; createdAt: string; status: KitchenStatus; notes: string | null; items: CartItem[] };
export type DeliveryStatus = "pending" | "assigned" | "picked_up" | "delivered" | "cancelled";
export type DeliverySource = "manual" | "pedidosya" | "rappi" | "ubereats" | "qr";
export type Courier = { id: string; name: string; phone: string | null; active: boolean; createdAt: string };
export type DeliveryOrder = {
  id: string;
  branchId: string;
  source: DeliverySource;
  customerName: string;
  customerPhone: string | null;
  address: string;
  note: string | null;
  totalAmount: number;
  status: DeliveryStatus;
  courierName: string | null;
  courierPhone: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: EntitySyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
};
export type FiscalProvider = "none" | "arca" | "sii" | "sat";
export type Branch = {
  id: string;
  name: string;
  code: string;
  fiscalProvider: FiscalProvider;
  active: boolean;
  createdAt: string;
  syncStatus: EntitySyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
};
export type FiscalInvoiceStatus = "pending" | "processing" | "issued" | "failed";
export type FiscalInvoice = {
  id: string;
  saleId: string;
  branchId: string;
  provider: Exclude<FiscalProvider, "none">;
  status: FiscalInvoiceStatus;
  documentNumber: string | null;
  responsePayload: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: EntitySyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
};
export type TicketPrinterConfig = {
  id: string;
  branchId: string;
  name: string;
  paperWidthMm: PaperWidthMm;
  connectionType: PrinterConnectionType;
  copies: number;
  autoPrint: boolean;
  ipAddress: string | null;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  syncStatus: EntitySyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
};
export type PaymentTerminalConfig = {
  id: string;
  branchId: string;
  name: string;
  provider: PaymentTerminalProvider;
  collectMode: PaymentCollectionMode;
  externalReference: string | null;
  active: boolean;
  createdAt: string;
  syncStatus: EntitySyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
};
export type ArcaConfig = {
  id: string;
  branchId: string;
  mode: "disabled" | "test" | "production";
  pointOfSale: number;
  invoiceType: "B" | "A" | "T";
  cuit: string;
  legalName: string;
  grossIncomeTaxStatus: string;
  enabled: boolean;
  lastTestAt: string | null;
  lastInvoiceAt: string | null;
  createdAt: string;
  syncStatus: EntitySyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
};
export type CheckoutPayload = {
  payments: CheckoutPaymentInput[];
  customerName?: string | null;
  customerDocument?: string | null;
  note?: string | null;
  printerId?: string | null;
};

type SyncEntity = { id: string; syncStatus: EntitySyncStatus; syncAttempts: number; lastSyncAttemptAt: string | null; syncedAt: string | null; syncError: string | null };
type SyncAction = "syncing" | "synced" | "failed" | "terminal";

type PosState = {
  cart: CartItem[];
  sales: Sale[];
  shiftClosures: ShiftClose[];
  cashMovements: CashMovement[];
  preOrders: PreOrder[];
  diningOrders: DiningOrder[];
  couriers: Courier[];
  deliveryOrders: DeliveryOrder[];
  branches: Branch[];
  activeBranchId: string | null;
  fiscalInvoices: FiscalInvoice[];
  ticketReceipts: TicketReceipt[];
  printerConfigs: TicketPrinterConfig[];
  paymentTerminals: PaymentTerminalConfig[];
  arcaConfigs: ArcaConfig[];
  activeShift: ActiveShift | null;
  syncMeta: SyncMeta;
  addLine: (product: Product, modifiers: SelectedModifier[], qty?: number) => void;
  updateQty: (lineId: string, nextQty: number) => void;
  clearCart: () => void;
  completeSale: (payload: CheckoutPayload) => Sale | null;
  clearSales: () => void;
  openShift: (openingAmount: number) => ActiveShift;
  closeShift: (countedCash?: number | null, note?: string | null) => ShiftClose | null;
  addCashMovement: (type: CashMovementType, amount: number, reason: string) => CashMovement | null;
  sendCartToKitchen: (tableCode: string, notes?: string | null) => DiningOrder | null;
  setDiningOrderStatus: (orderId: string, status: KitchenStatus) => void;
  moveDiningOrderToTable: (orderId: string, nextTableCode: string) => void;
  mergeDiningOrders: (targetOrderId: string, sourceOrderId: string) => void;
  addCourier: (name: string, phone?: string | null) => Courier | null;
  toggleCourierActive: (courierId: string, active: boolean) => void;
  createDeliveryOrder: (params: { source: DeliverySource; customerName: string; customerPhone?: string | null; address: string; note?: string | null; totalAmount: number }) => DeliveryOrder | null;
  assignDeliveryCourier: (orderId: string, courierId: string | null) => void;
  setDeliveryOrderStatus: (orderId: string, status: DeliveryStatus) => void;
  addBranch: (name: string, code: string, fiscalProvider: FiscalProvider) => Branch | null;
  setBranchActive: (branchId: string) => void;
  setBranchEnabled: (branchId: string, active: boolean) => void;
  upsertPrinterConfig: (config: Omit<TicketPrinterConfig, "createdAt" | "syncStatus" | "syncAttempts" | "lastSyncAttemptAt" | "syncedAt" | "syncError">) => TicketPrinterConfig;
  upsertPaymentTerminal: (terminal: Omit<PaymentTerminalConfig, "createdAt" | "syncStatus" | "syncAttempts" | "lastSyncAttemptAt" | "syncedAt" | "syncError">) => PaymentTerminalConfig;
  upsertArcaConfig: (config: Omit<ArcaConfig, "createdAt" | "syncStatus" | "syncAttempts" | "lastSyncAttemptAt" | "syncedAt" | "syncError">) => ArcaConfig;
  markTicketPrinted: (receiptId: string) => void;
  markTicketPrintFailed: (receiptId: string, errorMessage: string) => void;
  createPreOrder: (params: { customerName: string; customerPhone?: string | null; note?: string | null; dueAt: string; totalAmount: number; depositAmount: number }) => PreOrder;
  setPreOrderStatus: (preOrderId: string, status: PreOrderStatus) => void;
  markSaleSyncing: (saleId: string) => void;
  markSaleSynced: (saleId: string) => void;
  markSaleFailed: (saleId: string, errorMessage: string) => void;
  markSaleTerminal: (saleId: string, errorMessage: string) => void;
  markShiftCloseSyncing: (closeId: string) => void;
  markShiftCloseSynced: (closeId: string) => void;
  markShiftCloseFailed: (closeId: string, errorMessage: string) => void;
  markShiftCloseTerminal: (closeId: string, errorMessage: string) => void;
  markCashMovementSyncing: (movementId: string) => void;
  markCashMovementSynced: (movementId: string) => void;
  markCashMovementFailed: (movementId: string, errorMessage: string) => void;
  markCashMovementTerminal: (movementId: string, errorMessage: string) => void;
  markPreOrderSyncing: (preOrderId: string) => void;
  markPreOrderSynced: (preOrderId: string) => void;
  markPreOrderFailed: (preOrderId: string, errorMessage: string) => void;
  markPreOrderTerminal: (preOrderId: string, errorMessage: string) => void;
  markDeliveryOrderSyncing: (orderId: string) => void;
  markDeliveryOrderSynced: (orderId: string) => void;
  markDeliveryOrderFailed: (orderId: string, errorMessage: string) => void;
  markDeliveryOrderTerminal: (orderId: string, errorMessage: string) => void;
  markBranchSyncing: (branchId: string) => void;
  markBranchSynced: (branchId: string) => void;
  markBranchFailed: (branchId: string, errorMessage: string) => void;
  markBranchTerminal: (branchId: string, errorMessage: string) => void;
  markFiscalInvoiceSyncing: (invoiceId: string) => void;
  markFiscalInvoiceSynced: (invoiceId: string, documentNumber?: string | null, responsePayload?: string | null) => void;
  markFiscalInvoiceFailed: (invoiceId: string, errorMessage: string) => void;
  markFiscalInvoiceTerminal: (invoiceId: string, errorMessage: string) => void;
  markTicketReceiptSyncing: (receiptId: string) => void;
  markTicketReceiptSynced: (receiptId: string) => void;
  markTicketReceiptFailed: (receiptId: string, errorMessage: string) => void;
  markTicketReceiptTerminal: (receiptId: string, errorMessage: string) => void;
  markPrinterConfigSyncing: (configId: string) => void;
  markPrinterConfigSynced: (configId: string) => void;
  markPrinterConfigFailed: (configId: string, errorMessage: string) => void;
  markPrinterConfigTerminal: (configId: string, errorMessage: string) => void;
  markPaymentTerminalSyncing: (terminalId: string) => void;
  markPaymentTerminalSynced: (terminalId: string) => void;
  markPaymentTerminalFailed: (terminalId: string, errorMessage: string) => void;
  markPaymentTerminalTerminal: (terminalId: string, errorMessage: string) => void;
  markArcaConfigSyncing: (configId: string) => void;
  markArcaConfigSynced: (configId: string) => void;
  markArcaConfigFailed: (configId: string, errorMessage: string) => void;
  markArcaConfigTerminal: (configId: string, errorMessage: string) => void;
  setSyncMeta: (meta: Partial<SyncMeta>) => void;
};

const TAX_RATE = 0.21;
const WEIGHT_QTY_STEP = 0.05;
const DEFAULT_BRANCH_ID = "branch-main";
const roundQty = (qty: number) => Math.round(qty * 1000) / 1000;
const roundMoney = (value: number) => Math.max(0, Math.round(value));
const nowIso = () => new Date().toISOString();
const randomId = (suffix?: string) => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${suffix ? `-${suffix}` : ""}`;
const toFiscalProvider = (value: string | undefined | null): FiscalProvider => (value === "afip" ? "arca" : value === "arca" || value === "sii" || value === "sat" ? value : "none");
const primaryPaymentMethod = (payments: SalePayment[]) => [...payments].sort((a, b) => b.amount - a.amount)[0]?.method ?? "Efectivo";
const lineUnitPrice = (item: CartItem) => item.basePrice + item.modifiers.reduce((acc, modifier) => acc + modifier.priceDelta, 0);
export const calcTotals = (cart: CartItem[]) => {
  const subtotal = cart.reduce((acc, item) => acc + lineUnitPrice(item) * item.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  return { subtotal, tax, total: subtotal + tax };
};
const buildLineSignature = (productId: string, modifiers: SelectedModifier[], basePrice: number) => `${productId}::${basePrice}::${[...modifiers].sort((a, b) => a.modifierId.localeCompare(b.modifierId)).map((modifier) => modifier.modifierId).join("|")}`;
const syncBase = () => ({ syncStatus: "pending" as EntitySyncStatus, syncAttempts: 0, lastSyncAttemptAt: null, syncedAt: null, syncError: null });
const defaultBranch = (): Branch => ({ id: DEFAULT_BRANCH_ID, name: "Casa Central", code: "CENTRAL", fiscalProvider: "none", active: true, createdAt: nowIso(), ...syncBase() });
const defaultPrinter = (branchId: string): TicketPrinterConfig => ({ id: `${branchId}-printer-main`, branchId, name: "Caja mostrador 80mm", paperWidthMm: 80, connectionType: "browser", copies: 1, autoPrint: true, ipAddress: null, isDefault: true, active: true, createdAt: nowIso(), ...syncBase() });
const defaultArca = (branchId: string): ArcaConfig => ({ id: `${branchId}-arca`, branchId, mode: "disabled", pointOfSale: 1, invoiceType: "B", cuit: "", legalName: "", grossIncomeTaxStatus: "Consumidor final", enabled: false, lastTestAt: null, lastInvoiceAt: null, createdAt: nowIso(), ...syncBase() });
const normalizePayment = (payment: Partial<SalePayment> & Pick<SalePayment, "method" | "amount">): SalePayment => ({ id: payment.id ?? randomId("payment"), method: payment.method, amount: roundMoney(payment.amount), status: payment.status ?? "manual_confirmed", reference: payment.reference ?? null, cardBrand: payment.cardBrand ?? null, installments: payment.installments ?? null, last4: payment.last4 ?? null, providerLabel: payment.providerLabel ?? null, terminalId: payment.terminalId ?? null, createdAt: payment.createdAt ?? nowIso() });
const normalizeCheckoutPayments = (payments: CheckoutPaymentInput[], total: number): SalePayment[] => {
  const cleaned = payments.map((payment) => ({ ...payment, amount: roundMoney(payment.amount), reference: payment.reference?.trim() || null, cardBrand: payment.cardBrand?.trim() || null, last4: payment.last4?.trim() || null, providerLabel: payment.providerLabel?.trim() || null, terminalId: payment.terminalId?.trim() || null })).filter((payment) => payment.amount > 0);
  const base: Array<CheckoutPaymentInput & { amount: number }> = cleaned.length > 0 ? cleaned : [{ method: "Efectivo" as PaymentMethod, amount: total }];
  const delta = total - base.reduce((acc, payment) => acc + payment.amount, 0);
  if (base.length > 0) base[base.length - 1].amount += delta;
  return base.filter((payment) => payment.amount > 0).map((payment) => normalizePayment({ ...payment, status: payment.status ?? (payment.method === "Efectivo" || payment.method === "Transferencia" ? "manual_confirmed" : payment.reference || payment.terminalId ? "approved" : "manual_confirmed") }));
};
const normalizeSale = (sale: Partial<Sale> & Pick<Sale, "id" | "createdAt" | "items" | "subtotal" | "tax" | "total">): Sale => {
  const legacyMethod = sale.paymentMethod === ("Tarjeta" as PaymentMethod) ? "Debito" : sale.paymentMethod === ("QR" as PaymentMethod) ? "Mercado Pago QR" : sale.paymentMethod ?? "Efectivo";
  const payments = Array.isArray(sale.payments) && sale.payments.length > 0 ? sale.payments.map((payment) => normalizePayment(payment)) : [normalizePayment({ method: legacyMethod, amount: sale.total, status: legacyMethod === "Efectivo" ? "manual_confirmed" : "approved", providerLabel: legacyMethod === "Mercado Pago QR" ? "Mercado Pago" : legacyMethod === "Debito" || legacyMethod === "Credito" ? "Terminal manual" : "Caja" })];
  return { id: sale.id, createdAt: sale.createdAt, branchId: sale.branchId ?? DEFAULT_BRANCH_ID, paymentMethod: primaryPaymentMethod(payments), payments, customerName: sale.customerName ?? null, customerDocument: sale.customerDocument ?? null, note: sale.note ?? null, receiptId: sale.receiptId ?? null, items: Array.isArray(sale.items) ? sale.items.map((item) => ({ ...item, isWeighable: Boolean(item.isWeighable), isBundle: Boolean(item.isBundle), bundleItems: Array.isArray(item.bundleItems) ? item.bundleItems : [] })) : [], subtotal: sale.subtotal, tax: sale.tax, total: sale.total, syncStatus: sale.syncStatus ?? "pending", syncAttempts: sale.syncAttempts ?? 0, lastSyncAttemptAt: sale.lastSyncAttemptAt ?? null, syncedAt: sale.syncedAt ?? null, syncError: sale.syncError ?? null };
};
const normalizeShiftClose = (close: Partial<ShiftClose> & Pick<ShiftClose, "id" | "closedAt" | "ticketCount" | "totalAmount" | "syncedCount" | "pendingCount">): ShiftClose => ({ id: close.id, branchId: close.branchId ?? DEFAULT_BRANCH_ID, closedAt: close.closedAt, ticketCount: close.ticketCount, totalAmount: close.totalAmount, syncedCount: close.syncedCount, pendingCount: close.pendingCount, shiftOpenedAt: close.shiftOpenedAt ?? close.closedAt, openingAmount: close.openingAmount ?? 0, cashSalesTotal: close.cashSalesTotal ?? 0, manualInTotal: close.manualInTotal ?? 0, manualOutTotal: close.manualOutTotal ?? 0, expectedCash: close.expectedCash ?? close.totalAmount, countedCash: close.countedCash ?? null, cashVariance: close.cashVariance ?? null, note: close.note ?? null, syncStatus: close.syncStatus ?? "pending", syncAttempts: close.syncAttempts ?? 0, lastSyncAttemptAt: close.lastSyncAttemptAt ?? null, syncedAt: close.syncedAt ?? null, syncError: close.syncError ?? null });
const normalizeCashMovement = (movement: Partial<CashMovement> & Pick<CashMovement, "id" | "shiftId" | "createdAt" | "type" | "amount" | "reason">): CashMovement => ({ id: movement.id, shiftId: movement.shiftId, createdAt: movement.createdAt, type: movement.type, amount: movement.amount, reason: movement.reason, syncStatus: movement.syncStatus ?? "pending", syncAttempts: movement.syncAttempts ?? 0, lastSyncAttemptAt: movement.lastSyncAttemptAt ?? null, syncedAt: movement.syncedAt ?? null, syncError: movement.syncError ?? null });
const normalizePreOrder = (preOrder: Partial<PreOrder> & Pick<PreOrder, "id" | "customerName" | "dueAt" | "totalAmount" | "depositAmount" | "remainingAmount" | "createdAt">): PreOrder => ({ id: preOrder.id, branchId: preOrder.branchId ?? DEFAULT_BRANCH_ID, customerName: preOrder.customerName, customerPhone: preOrder.customerPhone ?? null, note: preOrder.note ?? null, dueAt: preOrder.dueAt, totalAmount: preOrder.totalAmount, depositAmount: preOrder.depositAmount, remainingAmount: preOrder.remainingAmount, status: preOrder.status ?? "scheduled", createdAt: preOrder.createdAt, syncStatus: preOrder.syncStatus ?? "pending", syncAttempts: preOrder.syncAttempts ?? 0, lastSyncAttemptAt: preOrder.lastSyncAttemptAt ?? null, syncedAt: preOrder.syncedAt ?? null, syncError: preOrder.syncError ?? null });
const normalizeDeliveryOrder = (order: Partial<DeliveryOrder> & Pick<DeliveryOrder, "id" | "customerName" | "address" | "totalAmount" | "createdAt" | "updatedAt">): DeliveryOrder => ({ id: order.id, branchId: order.branchId ?? DEFAULT_BRANCH_ID, source: order.source ?? "manual", customerName: order.customerName, customerPhone: order.customerPhone ?? null, address: order.address, note: order.note ?? null, totalAmount: order.totalAmount, status: order.status ?? "pending", courierName: order.courierName ?? null, courierPhone: order.courierPhone ?? null, createdAt: order.createdAt, updatedAt: order.updatedAt, syncStatus: order.syncStatus ?? "pending", syncAttempts: order.syncAttempts ?? 0, lastSyncAttemptAt: order.lastSyncAttemptAt ?? null, syncedAt: order.syncedAt ?? null, syncError: order.syncError ?? null });
const normalizeBranch = (branch: Partial<Branch> & Pick<Branch, "id" | "name" | "code" | "createdAt">): Branch => ({ id: branch.id, name: branch.name, code: branch.code.trim().toUpperCase(), fiscalProvider: toFiscalProvider(branch.fiscalProvider), active: branch.active ?? true, createdAt: branch.createdAt, syncStatus: branch.syncStatus ?? "pending", syncAttempts: branch.syncAttempts ?? 0, lastSyncAttemptAt: branch.lastSyncAttemptAt ?? null, syncedAt: branch.syncedAt ?? null, syncError: branch.syncError ?? null });
const normalizeFiscalInvoice = (invoice: Partial<FiscalInvoice> & Pick<FiscalInvoice, "id" | "saleId" | "branchId" | "createdAt" | "updatedAt">): FiscalInvoice => {
  const provider = toFiscalProvider(invoice.provider);
  return { id: invoice.id, saleId: invoice.saleId, branchId: invoice.branchId, provider: provider === "none" ? "arca" : provider, status: invoice.status ?? "pending", documentNumber: invoice.documentNumber ?? null, responsePayload: invoice.responsePayload ?? null, createdAt: invoice.createdAt, updatedAt: invoice.updatedAt, syncStatus: invoice.syncStatus ?? "pending", syncAttempts: invoice.syncAttempts ?? 0, lastSyncAttemptAt: invoice.lastSyncAttemptAt ?? null, syncedAt: invoice.syncedAt ?? null, syncError: invoice.syncError ?? null };
};
const normalizeTicketReceipt = (receipt: Partial<TicketReceipt> & Pick<TicketReceipt, "id" | "saleId" | "receiptNumber" | "createdAt">): TicketReceipt => ({ id: receipt.id, saleId: receipt.saleId, branchId: receipt.branchId ?? DEFAULT_BRANCH_ID, receiptNumber: receipt.receiptNumber, printerId: receipt.printerId ?? null, paperWidthMm: receipt.paperWidthMm === 90 ? 90 : 80, copies: Math.max(1, receipt.copies ?? 1), printStatus: receipt.printStatus ?? "pending", printedAt: receipt.printedAt ?? null, createdAt: receipt.createdAt, syncStatus: receipt.syncStatus ?? "pending", syncAttempts: receipt.syncAttempts ?? 0, lastSyncAttemptAt: receipt.lastSyncAttemptAt ?? null, syncedAt: receipt.syncedAt ?? null, syncError: receipt.syncError ?? null });
const normalizePrinter = (config: Partial<TicketPrinterConfig> & Pick<TicketPrinterConfig, "id" | "branchId" | "name" | "createdAt">): TicketPrinterConfig => ({ id: config.id, branchId: config.branchId, name: config.name, paperWidthMm: config.paperWidthMm === 90 ? 90 : 80, connectionType: config.connectionType ?? "browser", copies: Math.max(1, config.copies ?? 1), autoPrint: config.autoPrint ?? true, ipAddress: config.ipAddress ?? null, isDefault: config.isDefault ?? false, active: config.active ?? true, createdAt: config.createdAt, syncStatus: config.syncStatus ?? "pending", syncAttempts: config.syncAttempts ?? 0, lastSyncAttemptAt: config.lastSyncAttemptAt ?? null, syncedAt: config.syncedAt ?? null, syncError: config.syncError ?? null });
const normalizeTerminal = (terminal: Partial<PaymentTerminalConfig> & Pick<PaymentTerminalConfig, "id" | "branchId" | "name" | "createdAt">): PaymentTerminalConfig => ({ id: terminal.id, branchId: terminal.branchId, name: terminal.name, provider: terminal.provider ?? "manual", collectMode: terminal.collectMode ?? "manual", externalReference: terminal.externalReference ?? null, active: terminal.active ?? true, createdAt: terminal.createdAt, syncStatus: terminal.syncStatus ?? "pending", syncAttempts: terminal.syncAttempts ?? 0, lastSyncAttemptAt: terminal.lastSyncAttemptAt ?? null, syncedAt: terminal.syncedAt ?? null, syncError: terminal.syncError ?? null });
const normalizeArca = (config: Partial<ArcaConfig> & Pick<ArcaConfig, "id" | "branchId" | "createdAt">): ArcaConfig => ({ id: config.id, branchId: config.branchId, mode: config.mode ?? "disabled", pointOfSale: Math.max(1, config.pointOfSale ?? 1), invoiceType: config.invoiceType ?? "B", cuit: config.cuit ?? "", legalName: config.legalName ?? "", grossIncomeTaxStatus: config.grossIncomeTaxStatus ?? "Consumidor final", enabled: config.enabled ?? false, lastTestAt: config.lastTestAt ?? null, lastInvoiceAt: config.lastInvoiceAt ?? null, createdAt: config.createdAt, syncStatus: config.syncStatus ?? "pending", syncAttempts: config.syncAttempts ?? 0, lastSyncAttemptAt: config.lastSyncAttemptAt ?? null, syncedAt: config.syncedAt ?? null, syncError: config.syncError ?? null });
const normalizeDiningOrder = (order: DiningOrder): DiningOrder => ({ ...order, status: order.status ?? "sent", notes: order.notes ?? null, items: Array.isArray(order.items) ? order.items : [] });
const normalizeCourier = (courier: Courier): Courier => ({ ...courier, phone: courier.phone ?? null, active: courier.active ?? true });
const withOperationalDefaults = (branches: Branch[], printers: TicketPrinterConfig[], arcas: ArcaConfig[]) => ({ printers: branches.reduce((acc, branch) => acc.some((item) => item.branchId === branch.id) ? acc : [...acc, defaultPrinter(branch.id)], [...printers]), arcaConfigs: branches.reduce((acc, branch) => acc.some((item) => item.branchId === branch.id) ? acc : [...acc, defaultArca(branch.id)], [...arcas]) });
const applySyncState = <T extends SyncEntity>(items: T[], id: string, action: SyncAction, errorMessage?: string): T[] => items.map((item) => item.id !== id ? item : ({ ...item, syncStatus: action === "syncing" ? "syncing" : action === "synced" ? "synced" : "failed", syncAttempts: action === "syncing" ? item.syncAttempts + 1 : action === "terminal" ? 999 : item.syncAttempts, lastSyncAttemptAt: action === "syncing" ? nowIso() : item.lastSyncAttemptAt, syncedAt: action === "synced" ? nowIso() : item.syncedAt, syncError: action === "failed" || action === "terminal" ? errorMessage ?? item.syncError : null }));

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

export { lineUnitPrice };
