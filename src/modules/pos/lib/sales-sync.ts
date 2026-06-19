"use client";

import { isSupabaseConfigured, supabase } from "@/modules/core/supabase/client";
import {
  checkRemoteSyncReadiness,
  resolveAuthContext,
} from "@/modules/core/supabase/auth-context";
import type {
  ArcaConfig,
  Branch,
  CashMovement,
  DeliveryOrder,
  FiscalInvoice,
  PaymentTerminalConfig,
  PreOrder,
  Sale,
  ShiftClose,
  TicketPrinterConfig,
  TicketReceipt,
} from "@/modules/pos/store/use-pos-store";

export { checkRemoteSyncReadiness };

const mapPaymentMethod = (method: Sale["paymentMethod"]) => {
  if (method === "Debito" || method === "Credito") return "card";
  if (method === "Mercado Pago QR" || method === "Mercado Pago Point") return "qr";
  if (method === "Transferencia") return "transfer";
  return "cash";
};

export async function syncSaleToRemote(sale: Sale): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  const orderPayload = {
    id: sale.id,
    tenant_id: authContext.tenantId,
    branch_id: sale.branchId,
    cashier_user_id: authContext.userId,
    payment_method: mapPaymentMethod(sale.paymentMethod),
    customer_name: sale.customerName,
    customer_document: sale.customerDocument,
    note: sale.note,
    subtotal: sale.subtotal,
    tax: sale.tax,
    total: sale.total,
    status: "paid",
  };

  const { error: orderError } = await supabase.from("order").upsert(orderPayload, {
    onConflict: "id",
  });
  if (orderError) return { ok: false, error: orderError.message };

  const { error: deleteItemsError } = await supabase.from("order_item").delete().eq("order_id", sale.id);
  if (deleteItemsError) return { ok: false, error: deleteItemsError.message };

  const linePayload = sale.items.map((item) => {
    const unitPrice =
      item.basePrice + item.modifiers.reduce((acc, modifier) => acc + modifier.priceDelta, 0);
    return {
      tenant_id: authContext.tenantId,
      order_id: sale.id,
      product_id: item.productId,
      product_name_snapshot: item.productName,
      unit_price_snapshot: unitPrice,
      qty: item.qty,
      line_total: unitPrice * item.qty,
      client_line_id: item.lineId,
    };
  });

  const { data: insertedItems, error: lineError } = await supabase
    .from("order_item")
    .insert(linePayload)
    .select("id, client_line_id");
  if (lineError) return { ok: false, error: lineError.message };

  const lineMap = new Map<string, string>();
  for (const row of insertedItems ?? []) {
    lineMap.set(row.client_line_id as string, row.id as string);
  }

  const modifierPayload = sale.items.flatMap((item) =>
    item.modifiers
      .map((modifier) => ({
        tenant_id: authContext.tenantId,
        order_item_id: lineMap.get(item.lineId),
        modifier_name_snapshot: modifier.modifierName,
        price_delta_snapshot: modifier.priceDelta,
      }))
      .filter((entry) => Boolean(entry.order_item_id))
  );

  if (modifierPayload.length > 0) {
    const { error: modifierError } = await supabase.from("order_item_modifier").insert(modifierPayload);
    if (modifierError) return { ok: false, error: modifierError.message };
  }

  const { error: deletePaymentsError } = await supabase.from("sale_payment").delete().eq("order_id", sale.id);
  if (deletePaymentsError) return { ok: false, error: deletePaymentsError.message };

  const paymentPayload = sale.payments.map((payment) => ({
    id: payment.id,
    tenant_id: authContext.tenantId,
    branch_id: sale.branchId,
    order_id: sale.id,
    method: mapPaymentMethod(payment.method),
    method_label: payment.method,
    amount: payment.amount,
    status: payment.status,
    provider_label: payment.providerLabel,
    reference: payment.reference,
    card_brand: payment.cardBrand,
    installments: payment.installments,
    last4: payment.last4,
    terminal_id: payment.terminalId,
    created_at: payment.createdAt,
  }));

  if (paymentPayload.length > 0) {
    const { error: paymentError } = await supabase.from("sale_payment").upsert(paymentPayload, {
      onConflict: "id",
    });
    if (paymentError) return { ok: false, error: paymentError.message };
  }

  return { ok: true };
}

export async function syncShiftCloseToRemote(shiftClose: ShiftClose): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  const payload = {
    id: shiftClose.id,
    tenant_id: authContext.tenantId,
    branch_id: shiftClose.branchId,
    cashier_user_id: authContext.userId,
    ticket_count: shiftClose.ticketCount,
    total_amount: shiftClose.totalAmount,
    synced_count: shiftClose.syncedCount,
    pending_count: shiftClose.pendingCount,
    shift_opened_at: shiftClose.shiftOpenedAt,
    opening_amount: shiftClose.openingAmount,
    cash_sales_total: shiftClose.cashSalesTotal,
    manual_in_total: shiftClose.manualInTotal,
    manual_out_total: shiftClose.manualOutTotal,
    expected_cash: shiftClose.expectedCash,
    counted_cash: shiftClose.countedCash,
    cash_variance: shiftClose.cashVariance,
    note: shiftClose.note,
    closed_at: shiftClose.closedAt,
  };

  const { error } = await supabase.from("cash_shift_close").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function syncCashMovementToRemote(
  movement: CashMovement
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  const payload = {
    id: movement.id,
    tenant_id: authContext.tenantId,
    cashier_user_id: authContext.userId,
    shift_id: movement.shiftId,
    movement_type: movement.type,
    amount: movement.amount,
    reason: movement.reason,
    created_at: movement.createdAt,
  };

  const { error } = await supabase.from("cash_movement").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function syncPreOrderToRemote(
  preOrder: PreOrder
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  const payload = {
    id: preOrder.id,
    tenant_id: authContext.tenantId,
    branch_id: preOrder.branchId,
    cashier_user_id: authContext.userId,
    customer_name: preOrder.customerName,
    customer_phone: preOrder.customerPhone,
    note: preOrder.note,
    due_at: preOrder.dueAt,
    total_amount: preOrder.totalAmount,
    deposit_amount: preOrder.depositAmount,
    remaining_amount: preOrder.remainingAmount,
    status: preOrder.status,
    created_at: preOrder.createdAt,
  };

  const { error } = await supabase.from("pre_order").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function syncDeliveryOrderToRemote(
  order: DeliveryOrder
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  const payload = {
    id: order.id,
    tenant_id: authContext.tenantId,
    branch_id: order.branchId,
    cashier_user_id: authContext.userId,
    source_channel: order.source,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    address: order.address,
    note: order.note,
    total_amount: order.totalAmount,
    status: order.status,
    courier_name: order.courierName,
    courier_phone: order.courierPhone,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };

  const { error } = await supabase.from("delivery_order").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function syncTicketReceiptToRemote(
  receipt: TicketReceipt
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  const payload = {
    id: receipt.id,
    tenant_id: authContext.tenantId,
    branch_id: receipt.branchId,
    order_id: receipt.saleId,
    printer_config_id: receipt.printerId,
    receipt_number: receipt.receiptNumber,
    paper_width_mm: receipt.paperWidthMm,
    copies: receipt.copies,
    print_status: receipt.printStatus,
    printed_at: receipt.printedAt,
    created_at: receipt.createdAt,
  };

  const { error } = await supabase.from("ticket_receipt").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function syncPrinterConfigToRemote(
  config: TicketPrinterConfig
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  const payload = {
    id: config.id,
    tenant_id: authContext.tenantId,
    branch_id: config.branchId,
    name: config.name,
    paper_width_mm: config.paperWidthMm,
    connection_type: config.connectionType,
    copies: config.copies,
    auto_print: config.autoPrint,
    ip_address: config.ipAddress,
    is_default: config.isDefault,
    is_active: config.active,
    created_at: config.createdAt,
  };

  const { error } = await supabase.from("ticket_printer_config").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function syncPaymentTerminalToRemote(
  terminal: PaymentTerminalConfig
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  const payload = {
    id: terminal.id,
    tenant_id: authContext.tenantId,
    branch_id: terminal.branchId,
    name: terminal.name,
    provider: terminal.provider,
    collect_mode: terminal.collectMode,
    external_reference: terminal.externalReference,
    is_active: terminal.active,
    created_at: terminal.createdAt,
  };

  const { error } = await supabase.from("payment_terminal_config").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function syncArcaConfigToRemote(
  config: ArcaConfig
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  const payload = {
    id: config.id,
    tenant_id: authContext.tenantId,
    branch_id: config.branchId,
    mode: config.mode,
    point_of_sale: config.pointOfSale,
    invoice_type: config.invoiceType,
    cuit: config.cuit,
    legal_name: config.legalName,
    gross_income_tax_status: config.grossIncomeTaxStatus,
    enabled: config.enabled,
    last_test_at: config.lastTestAt,
    last_invoice_at: config.lastInvoiceAt,
    created_at: config.createdAt,
  };

  const { error } = await supabase.from("arca_config").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function syncBranchToRemote(branch: Branch): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  const payload = {
    id: branch.id,
    tenant_id: authContext.tenantId,
    name: branch.name,
    code: branch.code,
    fiscal_provider: branch.fiscalProvider,
    is_active: branch.active,
    created_at: branch.createdAt,
  };

  const { error } = await supabase.from("branch").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function syncFiscalInvoiceToRemote(
  invoice: FiscalInvoice
): Promise<{ ok: boolean; error?: string; documentNumber?: string; responsePayload?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  // Facturación fiscal real pendiente de integración con ARCA
  // Las facturas se registran como "pending" hasta que se implemente WSAA/WSFE
  const documentNumber = invoice.documentNumber ?? undefined;
  const responsePayload =
    invoice.responsePayload ??
    JSON.stringify({
      provider: invoice.provider,
      status: "pending_homologation",
      note: "Facturación electrónica no implementada. Requiere integración con ARCA WSAA/WSFE.",
      registeredAt: new Date().toISOString(),
    });

  const payload = {
    id: invoice.id,
    tenant_id: authContext.tenantId,
    branch_id: invoice.branchId,
    order_id: invoice.saleId,
    provider: invoice.provider,
    status: "pending",
    document_number: documentNumber,
    response_payload: responsePayload,
    created_at: invoice.createdAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("fiscal_invoice").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  return { ok: true, documentNumber, responsePayload };
}
