import { v4 as uuidv4 } from "uuid";
import type {
  ArcaConfig,
  Branch,
  CartItem,
  CashMovement,
  CheckoutPaymentInput,
  Courier,
  DeliveryOrder,
  DiningOrder,
  EntitySyncStatus,
  FiscalInvoice,
  FiscalProvider,
  PaymentMethod,
  PaymentTerminalConfig,
  PreOrder,
  Sale,
  SalePayment,
  SelectedModifier,
  ShiftClose,
  SyncAction,
  SyncEntity,
  TicketPrinterConfig,
  TicketReceipt,
} from "../domain/entities";

export const TAX_RATE = 0.21;
export const WEIGHT_QTY_STEP = 0.05;
export const DEFAULT_BRANCH_ID = "branch-main";
export const roundQty = (qty: number) => Math.round(qty * 1000) / 1000;
export const roundMoney = (value: number) => Math.max(0, Math.round(value));
export const nowIso = () => new Date().toISOString();
export const randomId = (suffix?: string) => `${uuidv4()}${suffix ? `-${suffix}` : ""}`;
export const toFiscalProvider = (value: string | undefined | null): FiscalProvider => (value === "afip" ? "arca" : value === "arca" || value === "sii" || value === "sat" ? value : "none");
export const primaryPaymentMethod = (payments: SalePayment[]) => [...payments].sort((a, b) => b.amount - a.amount)[0]?.method ?? "Efectivo";
export const lineUnitPrice = (item: CartItem) => item.basePrice + item.modifiers.reduce((acc, modifier) => acc + modifier.priceDelta, 0);
export const calcTotals = (cart: CartItem[]) => {
  const subtotal = cart.reduce((acc, item) => acc + lineUnitPrice(item) * item.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  return { subtotal, tax, total: subtotal + tax };
};
export const buildLineSignature = (productId: string, modifiers: SelectedModifier[], basePrice: number) => `${productId}::${basePrice}::${[...modifiers].sort((a, b) => a.modifierId.localeCompare(b.modifierId)).map((modifier) => modifier.modifierId).join("|")}`;
export const syncBase = () => ({ syncStatus: "pending" as EntitySyncStatus, syncAttempts: 0, lastSyncAttemptAt: null, syncedAt: null, syncError: null });
export const defaultBranch = (): Branch => ({ id: DEFAULT_BRANCH_ID, name: "Casa Central", code: "CENTRAL", fiscalProvider: "none", active: true, createdAt: nowIso(), ...syncBase() });
export const defaultPrinter = (branchId: string): TicketPrinterConfig => ({ id: `${branchId}-printer-main`, branchId, name: "Caja mostrador 80mm", paperWidthMm: 80, connectionType: "browser", copies: 1, autoPrint: true, ipAddress: null, isDefault: true, active: true, createdAt: nowIso(), ...syncBase() });
export const defaultArca = (branchId: string): ArcaConfig => ({ id: `${branchId}-arca`, branchId, mode: "disabled", pointOfSale: 1, invoiceType: "B", cuit: "", legalName: "", grossIncomeTaxStatus: "Consumidor final", enabled: false, lastTestAt: null, lastInvoiceAt: null, createdAt: nowIso(), ...syncBase() });
export const normalizePayment = (payment: Partial<SalePayment> & Pick<SalePayment, "method" | "amount">): SalePayment => ({ id: payment.id ?? randomId("payment"), method: payment.method, amount: roundMoney(payment.amount), status: payment.status ?? "manual_confirmed", reference: payment.reference ?? null, cardBrand: payment.cardBrand ?? null, installments: payment.installments ?? null, last4: payment.last4 ?? null, providerLabel: payment.providerLabel ?? null, terminalId: payment.terminalId ?? null, createdAt: payment.createdAt ?? nowIso() });
export const normalizeCheckoutPayments = (payments: CheckoutPaymentInput[], total: number): SalePayment[] => {
  const cleaned = payments.map((payment) => ({ ...payment, amount: roundMoney(payment.amount), reference: payment.reference?.trim() || null, cardBrand: payment.cardBrand?.trim() || null, last4: payment.last4?.trim() || null, providerLabel: payment.providerLabel?.trim() || null, terminalId: payment.terminalId?.trim() || null })).filter((payment) => payment.amount > 0);
  const base: Array<CheckoutPaymentInput & { amount: number }> = cleaned.length > 0 ? cleaned : [{ method: "Efectivo" as PaymentMethod, amount: total }];
  const delta = total - base.reduce((acc, payment) => acc + payment.amount, 0);
  if (base.length > 0) base[base.length - 1].amount += delta;
  return base.filter((payment) => payment.amount > 0).map((payment) => normalizePayment({ ...payment, status: payment.status ?? (payment.method === "Efectivo" || payment.method === "Transferencia" ? "manual_confirmed" : payment.reference || payment.terminalId ? "approved" : "manual_confirmed") }));
};
export const normalizeSale = (sale: Partial<Sale> & Pick<Sale, "id" | "createdAt" | "items" | "subtotal" | "tax" | "total">): Sale => {
  const legacyMethod = sale.paymentMethod === ("Tarjeta" as PaymentMethod) ? "Debito" : sale.paymentMethod === ("QR" as PaymentMethod) ? "Mercado Pago QR" : sale.paymentMethod ?? "Efectivo";
  const payments = Array.isArray(sale.payments) && sale.payments.length > 0 ? sale.payments.map((payment) => normalizePayment(payment)) : [normalizePayment({ method: legacyMethod, amount: sale.total, status: legacyMethod === "Efectivo" ? "manual_confirmed" : "approved", providerLabel: legacyMethod === "Mercado Pago QR" ? "Mercado Pago" : legacyMethod === "Debito" || legacyMethod === "Credito" ? "Terminal manual" : "Caja" })];
  return { id: sale.id, createdAt: sale.createdAt, branchId: sale.branchId ?? DEFAULT_BRANCH_ID, paymentMethod: primaryPaymentMethod(payments), payments, customerName: sale.customerName ?? null, customerDocument: sale.customerDocument ?? null, note: sale.note ?? null, receiptId: sale.receiptId ?? null, items: Array.isArray(sale.items) ? sale.items.map((item) => ({ ...item, isWeighable: Boolean(item.isWeighable), isBundle: Boolean(item.isBundle), bundleItems: Array.isArray(item.bundleItems) ? item.bundleItems : [] })) : [], subtotal: sale.subtotal, tax: sale.tax, total: sale.total, syncStatus: sale.syncStatus ?? "pending", syncAttempts: sale.syncAttempts ?? 0, lastSyncAttemptAt: sale.lastSyncAttemptAt ?? null, syncedAt: sale.syncedAt ?? null, syncError: sale.syncError ?? null };
};
export const normalizeShiftClose = (close: Partial<ShiftClose> & Pick<ShiftClose, "id" | "closedAt" | "ticketCount" | "totalAmount" | "syncedCount" | "pendingCount">): ShiftClose => ({ id: close.id, branchId: close.branchId ?? DEFAULT_BRANCH_ID, closedAt: close.closedAt, ticketCount: close.ticketCount, totalAmount: close.totalAmount, syncedCount: close.syncedCount, pendingCount: close.pendingCount, shiftOpenedAt: close.shiftOpenedAt ?? close.closedAt, openingAmount: close.openingAmount ?? 0, cashSalesTotal: close.cashSalesTotal ?? 0, manualInTotal: close.manualInTotal ?? 0, manualOutTotal: close.manualOutTotal ?? 0, expectedCash: close.expectedCash ?? close.totalAmount, countedCash: close.countedCash ?? null, cashVariance: close.cashVariance ?? null, note: close.note ?? null, syncStatus: close.syncStatus ?? "pending", syncAttempts: close.syncAttempts ?? 0, lastSyncAttemptAt: close.lastSyncAttemptAt ?? null, syncedAt: close.syncedAt ?? null, syncError: close.syncError ?? null });
export const normalizeCashMovement = (movement: Partial<CashMovement> & Pick<CashMovement, "id" | "shiftId" | "createdAt" | "type" | "amount" | "reason">): CashMovement => ({ id: movement.id, shiftId: movement.shiftId, createdAt: movement.createdAt, type: movement.type, amount: movement.amount, reason: movement.reason, syncStatus: movement.syncStatus ?? "pending", syncAttempts: movement.syncAttempts ?? 0, lastSyncAttemptAt: movement.lastSyncAttemptAt ?? null, syncedAt: movement.syncedAt ?? null, syncError: movement.syncError ?? null });
export const normalizePreOrder = (preOrder: Partial<PreOrder> & Pick<PreOrder, "id" | "customerName" | "dueAt" | "totalAmount" | "depositAmount" | "remainingAmount" | "createdAt">): PreOrder => ({ id: preOrder.id, branchId: preOrder.branchId ?? DEFAULT_BRANCH_ID, customerName: preOrder.customerName, customerPhone: preOrder.customerPhone ?? null, note: preOrder.note ?? null, dueAt: preOrder.dueAt, totalAmount: preOrder.totalAmount, depositAmount: preOrder.depositAmount, remainingAmount: preOrder.remainingAmount, status: preOrder.status ?? "scheduled", createdAt: preOrder.createdAt, syncStatus: preOrder.syncStatus ?? "pending", syncAttempts: preOrder.syncAttempts ?? 0, lastSyncAttemptAt: preOrder.lastSyncAttemptAt ?? null, syncedAt: preOrder.syncedAt ?? null, syncError: preOrder.syncError ?? null });
export const normalizeDeliveryOrder = (order: Partial<DeliveryOrder> & Pick<DeliveryOrder, "id" | "customerName" | "address" | "totalAmount" | "createdAt" | "updatedAt">): DeliveryOrder => ({ id: order.id, branchId: order.branchId ?? DEFAULT_BRANCH_ID, source: order.source ?? "manual", customerName: order.customerName, customerPhone: order.customerPhone ?? null, address: order.address, note: order.note ?? null, totalAmount: order.totalAmount, status: order.status ?? "pending", courierName: order.courierName ?? null, courierPhone: order.courierPhone ?? null, createdAt: order.createdAt, updatedAt: order.updatedAt, syncStatus: order.syncStatus ?? "pending", syncAttempts: order.syncAttempts ?? 0, lastSyncAttemptAt: order.lastSyncAttemptAt ?? null, syncedAt: order.syncedAt ?? null, syncError: order.syncError ?? null });
export const normalizeBranch = (branch: Partial<Branch> & Pick<Branch, "id" | "name" | "code" | "createdAt">): Branch => ({ id: branch.id, name: branch.name, code: branch.code.trim().toUpperCase(), fiscalProvider: toFiscalProvider(branch.fiscalProvider), active: branch.active ?? true, createdAt: branch.createdAt, syncStatus: branch.syncStatus ?? "pending", syncAttempts: branch.syncAttempts ?? 0, lastSyncAttemptAt: branch.lastSyncAttemptAt ?? null, syncedAt: branch.syncedAt ?? null, syncError: branch.syncError ?? null });
export const normalizeFiscalInvoice = (invoice: Partial<FiscalInvoice> & Pick<FiscalInvoice, "id" | "saleId" | "branchId" | "createdAt" | "updatedAt">): FiscalInvoice => {
  const provider = toFiscalProvider(invoice.provider);
  return { id: invoice.id, saleId: invoice.saleId, branchId: invoice.branchId, provider: provider === "none" ? "arca" : provider, status: invoice.status ?? "pending", documentNumber: invoice.documentNumber ?? null, responsePayload: invoice.responsePayload ?? null, createdAt: invoice.createdAt, updatedAt: invoice.updatedAt, syncStatus: invoice.syncStatus ?? "pending", syncAttempts: invoice.syncAttempts ?? 0, lastSyncAttemptAt: invoice.lastSyncAttemptAt ?? null, syncedAt: invoice.syncedAt ?? null, syncError: invoice.syncError ?? null };
};
export const normalizeTicketReceipt = (receipt: Partial<TicketReceipt> & Pick<TicketReceipt, "id" | "saleId" | "receiptNumber" | "createdAt">): TicketReceipt => ({ id: receipt.id, saleId: receipt.saleId, branchId: receipt.branchId ?? DEFAULT_BRANCH_ID, receiptNumber: receipt.receiptNumber, printerId: receipt.printerId ?? null, paperWidthMm: receipt.paperWidthMm === 90 ? 90 : 80, copies: Math.max(1, receipt.copies ?? 1), printStatus: receipt.printStatus ?? "pending", printedAt: receipt.printedAt ?? null, createdAt: receipt.createdAt, syncStatus: receipt.syncStatus ?? "pending", syncAttempts: receipt.syncAttempts ?? 0, lastSyncAttemptAt: receipt.lastSyncAttemptAt ?? null, syncedAt: receipt.syncedAt ?? null, syncError: receipt.syncError ?? null });
export const normalizePrinter = (config: Partial<TicketPrinterConfig> & Pick<TicketPrinterConfig, "id" | "branchId" | "name" | "createdAt">): TicketPrinterConfig => ({ id: config.id, branchId: config.branchId, name: config.name, paperWidthMm: config.paperWidthMm === 90 ? 90 : 80, connectionType: config.connectionType ?? "browser", copies: Math.max(1, config.copies ?? 1), autoPrint: config.autoPrint ?? true, ipAddress: config.ipAddress ?? null, isDefault: config.isDefault ?? false, active: config.active ?? true, createdAt: config.createdAt, syncStatus: config.syncStatus ?? "pending", syncAttempts: config.syncAttempts ?? 0, lastSyncAttemptAt: config.lastSyncAttemptAt ?? null, syncedAt: config.syncedAt ?? null, syncError: config.syncError ?? null });
export const normalizeTerminal = (terminal: Partial<PaymentTerminalConfig> & Pick<PaymentTerminalConfig, "id" | "branchId" | "name" | "createdAt">): PaymentTerminalConfig => ({ id: terminal.id, branchId: terminal.branchId, name: terminal.name, provider: terminal.provider ?? "manual", collectMode: terminal.collectMode ?? "manual", externalReference: terminal.externalReference ?? null, active: terminal.active ?? true, createdAt: terminal.createdAt, syncStatus: terminal.syncStatus ?? "pending", syncAttempts: terminal.syncAttempts ?? 0, lastSyncAttemptAt: terminal.lastSyncAttemptAt ?? null, syncedAt: terminal.syncedAt ?? null, syncError: terminal.syncError ?? null });
export const normalizeArca = (config: Partial<ArcaConfig> & Pick<ArcaConfig, "id" | "branchId" | "createdAt">): ArcaConfig => ({ id: config.id, branchId: config.branchId, mode: config.mode ?? "disabled", pointOfSale: Math.max(1, config.pointOfSale ?? 1), invoiceType: config.invoiceType ?? "B", cuit: config.cuit ?? "", legalName: config.legalName ?? "", grossIncomeTaxStatus: config.grossIncomeTaxStatus ?? "Consumidor final", enabled: config.enabled ?? false, lastTestAt: config.lastTestAt ?? null, lastInvoiceAt: config.lastInvoiceAt ?? null, createdAt: config.createdAt, syncStatus: config.syncStatus ?? "pending", syncAttempts: config.syncAttempts ?? 0, lastSyncAttemptAt: config.lastSyncAttemptAt ?? null, syncedAt: config.syncedAt ?? null, syncError: config.syncError ?? null });
export const normalizeDiningOrder = (order: DiningOrder): DiningOrder => ({ ...order, status: order.status ?? "sent", notes: order.notes ?? null, items: Array.isArray(order.items) ? order.items : [] });
export const normalizeCourier = (courier: Courier): Courier => ({ ...courier, phone: courier.phone ?? null, active: courier.active ?? true });
export const withOperationalDefaults = (branches: Branch[], printers: TicketPrinterConfig[], arcas: ArcaConfig[]) => ({ printers: branches.reduce((acc, branch) => acc.some((item) => item.branchId === branch.id) ? acc : [...acc, defaultPrinter(branch.id)], [...printers]), arcaConfigs: branches.reduce((acc, branch) => acc.some((item) => item.branchId === branch.id) ? acc : [...acc, defaultArca(branch.id)], [...arcas]) });
export const applySyncState = <T extends SyncEntity>(items: T[], id: string, action: SyncAction, errorMessage?: string): T[] => items.map((item) => item.id !== id ? item : ({ ...item, syncStatus: action === "syncing" ? "syncing" : action === "synced" ? "synced" : "failed", syncAttempts: action === "syncing" ? item.syncAttempts + 1 : action === "terminal" ? 999 : item.syncAttempts, lastSyncAttemptAt: action === "syncing" ? nowIso() : item.lastSyncAttemptAt, syncedAt: action === "synced" ? nowIso() : item.syncedAt, syncError: action === "failed" || action === "terminal" ? errorMessage ?? item.syncError : null }));
