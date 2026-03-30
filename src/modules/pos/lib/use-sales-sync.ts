"use client";

import { useEffect, useMemo } from "react";
import { isSupabaseConfigured } from "@/modules/core/supabase/client";
import {
  syncArcaConfigToRemote,
  checkRemoteSyncReadiness,
  syncBranchToRemote,
  syncCashMovementToRemote,
  syncDeliveryOrderToRemote,
  syncFiscalInvoiceToRemote,
  syncPaymentTerminalToRemote,
  syncPrinterConfigToRemote,
  syncPreOrderToRemote,
  syncSaleToRemote,
  syncShiftCloseToRemote,
  syncTicketReceiptToRemote,
} from "./sales-sync";
import { isTerminalSyncError, shouldRetryNow } from "@/modules/core/sync/policy";
import { usePosStore } from "../store/use-pos-store";

const SYNC_INTERVAL_MS = 8000;
const RETRY_LIMIT = 8;
const RETRY_BASE_DELAY_MS = 4000;
const RETRY_MAX_DELAY_MS = 120000;

export function useSalesSync() {
  const sales = usePosStore((state) => state.sales);
  const branches = usePosStore((state) => state.branches);
  const shiftClosures = usePosStore((state) => state.shiftClosures);
  const cashMovements = usePosStore((state) => state.cashMovements);
  const preOrders = usePosStore((state) => state.preOrders);
  const deliveryOrders = usePosStore((state) => state.deliveryOrders);
  const fiscalInvoices = usePosStore((state) => state.fiscalInvoices);
  const ticketReceipts = usePosStore((state) => state.ticketReceipts);
  const printerConfigs = usePosStore((state) => state.printerConfigs);
  const paymentTerminals = usePosStore((state) => state.paymentTerminals);
  const arcaConfigs = usePosStore((state) => state.arcaConfigs);
  const syncMeta = usePosStore((state) => state.syncMeta);
  const setSyncMeta = usePosStore((state) => state.setSyncMeta);
  const markSaleSyncing = usePosStore((state) => state.markSaleSyncing);
  const markSaleSynced = usePosStore((state) => state.markSaleSynced);
  const markSaleFailed = usePosStore((state) => state.markSaleFailed);
  const markSaleTerminal = usePosStore((state) => state.markSaleTerminal);
  const markShiftCloseSyncing = usePosStore((state) => state.markShiftCloseSyncing);
  const markShiftCloseSynced = usePosStore((state) => state.markShiftCloseSynced);
  const markShiftCloseFailed = usePosStore((state) => state.markShiftCloseFailed);
  const markShiftCloseTerminal = usePosStore((state) => state.markShiftCloseTerminal);
  const markCashMovementSyncing = usePosStore((state) => state.markCashMovementSyncing);
  const markCashMovementSynced = usePosStore((state) => state.markCashMovementSynced);
  const markCashMovementFailed = usePosStore((state) => state.markCashMovementFailed);
  const markCashMovementTerminal = usePosStore((state) => state.markCashMovementTerminal);
  const markPreOrderSyncing = usePosStore((state) => state.markPreOrderSyncing);
  const markPreOrderSynced = usePosStore((state) => state.markPreOrderSynced);
  const markPreOrderFailed = usePosStore((state) => state.markPreOrderFailed);
  const markPreOrderTerminal = usePosStore((state) => state.markPreOrderTerminal);
  const markDeliveryOrderSyncing = usePosStore((state) => state.markDeliveryOrderSyncing);
  const markDeliveryOrderSynced = usePosStore((state) => state.markDeliveryOrderSynced);
  const markDeliveryOrderFailed = usePosStore((state) => state.markDeliveryOrderFailed);
  const markDeliveryOrderTerminal = usePosStore((state) => state.markDeliveryOrderTerminal);
  const markBranchSyncing = usePosStore((state) => state.markBranchSyncing);
  const markBranchSynced = usePosStore((state) => state.markBranchSynced);
  const markBranchFailed = usePosStore((state) => state.markBranchFailed);
  const markBranchTerminal = usePosStore((state) => state.markBranchTerminal);
  const markFiscalInvoiceSyncing = usePosStore((state) => state.markFiscalInvoiceSyncing);
  const markFiscalInvoiceSynced = usePosStore((state) => state.markFiscalInvoiceSynced);
  const markFiscalInvoiceFailed = usePosStore((state) => state.markFiscalInvoiceFailed);
  const markFiscalInvoiceTerminal = usePosStore((state) => state.markFiscalInvoiceTerminal);
  const markTicketReceiptSyncing = usePosStore((state) => state.markTicketReceiptSyncing);
  const markTicketReceiptSynced = usePosStore((state) => state.markTicketReceiptSynced);
  const markTicketReceiptFailed = usePosStore((state) => state.markTicketReceiptFailed);
  const markTicketReceiptTerminal = usePosStore((state) => state.markTicketReceiptTerminal);
  const markPrinterConfigSyncing = usePosStore((state) => state.markPrinterConfigSyncing);
  const markPrinterConfigSynced = usePosStore((state) => state.markPrinterConfigSynced);
  const markPrinterConfigFailed = usePosStore((state) => state.markPrinterConfigFailed);
  const markPrinterConfigTerminal = usePosStore((state) => state.markPrinterConfigTerminal);
  const markPaymentTerminalSyncing = usePosStore((state) => state.markPaymentTerminalSyncing);
  const markPaymentTerminalSynced = usePosStore((state) => state.markPaymentTerminalSynced);
  const markPaymentTerminalFailed = usePosStore((state) => state.markPaymentTerminalFailed);
  const markPaymentTerminalTerminal = usePosStore((state) => state.markPaymentTerminalTerminal);
  const markArcaConfigSyncing = usePosStore((state) => state.markArcaConfigSyncing);
  const markArcaConfigSynced = usePosStore((state) => state.markArcaConfigSynced);
  const markArcaConfigFailed = usePosStore((state) => state.markArcaConfigFailed);
  const markArcaConfigTerminal = usePosStore((state) => state.markArcaConfigTerminal);

  const pendingSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          sale.syncStatus !== "synced" &&
          sale.syncAttempts < RETRY_LIMIT &&
          shouldRetryNow({
            attempts: sale.syncAttempts,
            lastAttemptAt: sale.lastSyncAttemptAt,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            maxDelayMs: RETRY_MAX_DELAY_MS,
          })
      ),
    [sales]
  );
  const pendingBranches = useMemo(
    () =>
      branches.filter(
        (branch) =>
          branch.syncStatus !== "synced" &&
          branch.syncAttempts < RETRY_LIMIT &&
          shouldRetryNow({
            attempts: branch.syncAttempts,
            lastAttemptAt: branch.lastSyncAttemptAt,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            maxDelayMs: RETRY_MAX_DELAY_MS,
          })
      ),
    [branches]
  );
  const pendingShiftClosures = useMemo(
    () =>
      shiftClosures.filter(
        (close) =>
          close.syncStatus !== "synced" &&
          close.syncAttempts < RETRY_LIMIT &&
          shouldRetryNow({
            attempts: close.syncAttempts,
            lastAttemptAt: close.lastSyncAttemptAt,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            maxDelayMs: RETRY_MAX_DELAY_MS,
          })
      ),
    [shiftClosures]
  );
  const pendingCashMovements = useMemo(
    () =>
      cashMovements.filter(
        (movement) =>
          movement.syncStatus !== "synced" &&
          movement.syncAttempts < RETRY_LIMIT &&
          shouldRetryNow({
            attempts: movement.syncAttempts,
            lastAttemptAt: movement.lastSyncAttemptAt,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            maxDelayMs: RETRY_MAX_DELAY_MS,
          })
      ),
    [cashMovements]
  );
  const pendingPreOrders = useMemo(
    () =>
      preOrders.filter(
        (preOrder) =>
          preOrder.syncStatus !== "synced" &&
          preOrder.syncAttempts < RETRY_LIMIT &&
          shouldRetryNow({
            attempts: preOrder.syncAttempts,
            lastAttemptAt: preOrder.lastSyncAttemptAt,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            maxDelayMs: RETRY_MAX_DELAY_MS,
          })
      ),
    [preOrders]
  );
  const pendingDeliveryOrders = useMemo(
    () =>
      deliveryOrders.filter(
        (order) =>
          order.syncStatus !== "synced" &&
          order.syncAttempts < RETRY_LIMIT &&
          shouldRetryNow({
            attempts: order.syncAttempts,
            lastAttemptAt: order.lastSyncAttemptAt,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            maxDelayMs: RETRY_MAX_DELAY_MS,
          })
      ),
    [deliveryOrders]
  );
  const pendingFiscalInvoices = useMemo(
    () =>
      fiscalInvoices.filter(
        (invoice) =>
          invoice.syncStatus !== "synced" &&
          invoice.syncAttempts < RETRY_LIMIT &&
          shouldRetryNow({
            attempts: invoice.syncAttempts,
            lastAttemptAt: invoice.lastSyncAttemptAt,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            maxDelayMs: RETRY_MAX_DELAY_MS,
          })
      ),
    [fiscalInvoices]
  );
  const pendingTicketReceipts = useMemo(
    () =>
      ticketReceipts.filter(
        (receipt) =>
          receipt.syncStatus !== "synced" &&
          receipt.syncAttempts < RETRY_LIMIT &&
          shouldRetryNow({
            attempts: receipt.syncAttempts,
            lastAttemptAt: receipt.lastSyncAttemptAt,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            maxDelayMs: RETRY_MAX_DELAY_MS,
          })
      ),
    [ticketReceipts]
  );
  const pendingPrinterConfigs = useMemo(
    () =>
      printerConfigs.filter(
        (config) =>
          config.syncStatus !== "synced" &&
          config.syncAttempts < RETRY_LIMIT &&
          shouldRetryNow({
            attempts: config.syncAttempts,
            lastAttemptAt: config.lastSyncAttemptAt,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            maxDelayMs: RETRY_MAX_DELAY_MS,
          })
      ),
    [printerConfigs]
  );
  const pendingPaymentTerminals = useMemo(
    () =>
      paymentTerminals.filter(
        (terminal) =>
          terminal.syncStatus !== "synced" &&
          terminal.syncAttempts < RETRY_LIMIT &&
          shouldRetryNow({
            attempts: terminal.syncAttempts,
            lastAttemptAt: terminal.lastSyncAttemptAt,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            maxDelayMs: RETRY_MAX_DELAY_MS,
          })
      ),
    [paymentTerminals]
  );
  const pendingArcaConfigs = useMemo(
    () =>
      arcaConfigs.filter(
        (config) =>
          config.syncStatus !== "synced" &&
          config.syncAttempts < RETRY_LIMIT &&
          shouldRetryNow({
            attempts: config.syncAttempts,
            lastAttemptAt: config.lastSyncAttemptAt,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            maxDelayMs: RETRY_MAX_DELAY_MS,
          })
      ),
    [arcaConfigs]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateOnline = () => setSyncMeta({ isOnline: navigator.onLine });
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, [setSyncMeta]);

  useEffect(() => {
    setSyncMeta({ remoteEnabled: isSupabaseConfigured });
  }, [setSyncMeta]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let busy = false;

    const runSync = async () => {
      if (busy) return;
      if (!navigator.onLine) return;
      if (!isSupabaseConfigured) return;
      if (
        pendingSales.length === 0 &&
        pendingBranches.length === 0 &&
        pendingShiftClosures.length === 0 &&
        pendingCashMovements.length === 0 &&
        pendingPreOrders.length === 0 &&
        pendingDeliveryOrders.length === 0 &&
        pendingFiscalInvoices.length === 0 &&
        pendingTicketReceipts.length === 0 &&
        pendingPrinterConfigs.length === 0 &&
        pendingPaymentTerminals.length === 0 &&
        pendingArcaConfigs.length === 0
      ) {
        return;
      }

      const readiness = await checkRemoteSyncReadiness();
      if (!readiness.ok) {
        setSyncMeta({ lastSyncError: readiness.error ?? "No se pudo validar autenticacion" });
        return;
      }

      busy = true;
      setSyncMeta({ isSyncing: true, lastSyncError: null });

      for (const branch of pendingBranches) {
        markBranchSyncing(branch.id);
        const result = await syncBranchToRemote(branch);
        if (result.ok) {
          markBranchSynced(branch.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            markBranchTerminal(branch.id, result.error ?? "Error de sincronizacion");
          } else {
            markBranchFailed(branch.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const config of pendingPrinterConfigs) {
        markPrinterConfigSyncing(config.id);
        const result = await syncPrinterConfigToRemote(config);
        if (result.ok) {
          markPrinterConfigSynced(config.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) markPrinterConfigTerminal(config.id, result.error ?? "Error de sincronizacion");
          else markPrinterConfigFailed(config.id, result.error ?? "Error de sincronizacion");
          setSyncMeta({ lastSyncError: result.error ?? "Error de sincronizacion" });
        }
      }

      for (const terminal of pendingPaymentTerminals) {
        markPaymentTerminalSyncing(terminal.id);
        const result = await syncPaymentTerminalToRemote(terminal);
        if (result.ok) {
          markPaymentTerminalSynced(terminal.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) markPaymentTerminalTerminal(terminal.id, result.error ?? "Error de sincronizacion");
          else markPaymentTerminalFailed(terminal.id, result.error ?? "Error de sincronizacion");
          setSyncMeta({ lastSyncError: result.error ?? "Error de sincronizacion" });
        }
      }

      for (const config of pendingArcaConfigs) {
        markArcaConfigSyncing(config.id);
        const result = await syncArcaConfigToRemote(config);
        if (result.ok) {
          markArcaConfigSynced(config.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) markArcaConfigTerminal(config.id, result.error ?? "Error de sincronizacion");
          else markArcaConfigFailed(config.id, result.error ?? "Error de sincronizacion");
          setSyncMeta({ lastSyncError: result.error ?? "Error de sincronizacion" });
        }
      }

      for (const sale of pendingSales) {
        markSaleSyncing(sale.id);
        const result = await syncSaleToRemote(sale);
        if (result.ok) {
          markSaleSynced(sale.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            markSaleTerminal(sale.id, result.error ?? "Error de sincronizacion");
          } else {
            markSaleFailed(sale.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const receipt of pendingTicketReceipts) {
        markTicketReceiptSyncing(receipt.id);
        const result = await syncTicketReceiptToRemote(receipt);
        if (result.ok) {
          markTicketReceiptSynced(receipt.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) markTicketReceiptTerminal(receipt.id, result.error ?? "Error de sincronizacion");
          else markTicketReceiptFailed(receipt.id, result.error ?? "Error de sincronizacion");
          setSyncMeta({ lastSyncError: result.error ?? "Error de sincronizacion" });
        }
      }

      for (const close of pendingShiftClosures) {
        markShiftCloseSyncing(close.id);
        const result = await syncShiftCloseToRemote(close);
        if (result.ok) {
          markShiftCloseSynced(close.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            markShiftCloseTerminal(close.id, result.error ?? "Error de sincronizacion");
          } else {
            markShiftCloseFailed(close.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const movement of pendingCashMovements) {
        markCashMovementSyncing(movement.id);
        const result = await syncCashMovementToRemote(movement);
        if (result.ok) {
          markCashMovementSynced(movement.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            markCashMovementTerminal(movement.id, result.error ?? "Error de sincronizacion");
          } else {
            markCashMovementFailed(movement.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const preOrder of pendingPreOrders) {
        markPreOrderSyncing(preOrder.id);
        const result = await syncPreOrderToRemote(preOrder);
        if (result.ok) {
          markPreOrderSynced(preOrder.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            markPreOrderTerminal(preOrder.id, result.error ?? "Error de sincronizacion");
          } else {
            markPreOrderFailed(preOrder.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const order of pendingDeliveryOrders) {
        markDeliveryOrderSyncing(order.id);
        const result = await syncDeliveryOrderToRemote(order);
        if (result.ok) {
          markDeliveryOrderSynced(order.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            markDeliveryOrderTerminal(order.id, result.error ?? "Error de sincronizacion");
          } else {
            markDeliveryOrderFailed(order.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const invoice of pendingFiscalInvoices) {
        markFiscalInvoiceSyncing(invoice.id);
        const result = await syncFiscalInvoiceToRemote(invoice);
        if (result.ok) {
          markFiscalInvoiceSynced(
            invoice.id,
            result.documentNumber ?? null,
            result.responsePayload ?? null
          );
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            markFiscalInvoiceTerminal(invoice.id, result.error ?? "Error de sincronizacion");
          } else {
            markFiscalInvoiceFailed(invoice.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      setSyncMeta({ isSyncing: false });
      busy = false;
    };

    runSync();
    const intervalId = window.setInterval(runSync, SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    markSaleFailed,
    markSaleSynced,
    markSaleSyncing,
    markSaleTerminal,
    markShiftCloseFailed,
    markShiftCloseSynced,
    markShiftCloseSyncing,
    markShiftCloseTerminal,
    markCashMovementFailed,
    markCashMovementSynced,
    markCashMovementSyncing,
    markCashMovementTerminal,
    markPreOrderFailed,
    markPreOrderSynced,
    markPreOrderSyncing,
    markPreOrderTerminal,
    markDeliveryOrderFailed,
    markDeliveryOrderSynced,
    markDeliveryOrderSyncing,
    markDeliveryOrderTerminal,
    markBranchFailed,
    markBranchSynced,
    markBranchSyncing,
    markBranchTerminal,
    markFiscalInvoiceFailed,
    markFiscalInvoiceSynced,
    markFiscalInvoiceSyncing,
    markFiscalInvoiceTerminal,
    markTicketReceiptFailed,
    markTicketReceiptSynced,
    markTicketReceiptSyncing,
    markTicketReceiptTerminal,
    markPrinterConfigFailed,
    markPrinterConfigSynced,
    markPrinterConfigSyncing,
    markPrinterConfigTerminal,
    markPaymentTerminalFailed,
    markPaymentTerminalSynced,
    markPaymentTerminalSyncing,
    markPaymentTerminalTerminal,
    markArcaConfigFailed,
    markArcaConfigSynced,
    markArcaConfigSyncing,
    markArcaConfigTerminal,
    pendingSales,
    pendingBranches,
    pendingShiftClosures,
    pendingCashMovements,
    pendingPreOrders,
    pendingDeliveryOrders,
    pendingFiscalInvoices,
    pendingTicketReceipts,
    pendingPrinterConfigs,
    pendingPaymentTerminals,
    pendingArcaConfigs,
    setSyncMeta,
  ]);

  return {
    pendingCount:
      pendingSales.length +
      pendingBranches.length +
      pendingShiftClosures.length +
      pendingCashMovements.length +
      pendingPreOrders.length +
      pendingDeliveryOrders.length +
      pendingFiscalInvoices.length +
      pendingTicketReceipts.length +
      pendingPrinterConfigs.length +
      pendingPaymentTerminals.length +
      pendingArcaConfigs.length,
    syncMeta,
  };
}
