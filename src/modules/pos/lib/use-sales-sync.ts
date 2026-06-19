"use client";

import { useEffect } from "react";
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

interface SyncableItem {
  syncStatus: string;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
}

function filterPending<T extends SyncableItem>(items: T[]): T[] {
  return items.filter(
    (item) =>
      item.syncStatus !== "synced" &&
      item.syncAttempts < RETRY_LIMIT &&
      shouldRetryNow({
        attempts: item.syncAttempts,
        lastAttemptAt: item.lastSyncAttemptAt,
        baseDelayMs: RETRY_BASE_DELAY_MS,
        maxDelayMs: RETRY_MAX_DELAY_MS,
      })
  );
}

export function useSalesSync() {
  const syncMeta = usePosStore((state) => state.syncMeta);
  const setSyncMeta = usePosStore((state) => state.setSyncMeta);

  const pendingCount = usePosStore((state) => {
    return (
      filterPending(state.sales).length +
      filterPending(state.branches).length +
      filterPending(state.shiftClosures).length +
      filterPending(state.cashMovements).length +
      filterPending(state.preOrders).length +
      filterPending(state.deliveryOrders).length +
      filterPending(state.fiscalInvoices).length +
      filterPending(state.ticketReceipts).length +
      filterPending(state.printerConfigs).length +
      filterPending(state.paymentTerminals).length +
      filterPending(state.arcaConfigs).length
    );
  });

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

      const state = usePosStore.getState();
      const pendingSales = filterPending(state.sales);
      const pendingBranches = filterPending(state.branches);
      const pendingShiftClosures = filterPending(state.shiftClosures);
      const pendingCashMovements = filterPending(state.cashMovements);
      const pendingPreOrders = filterPending(state.preOrders);
      const pendingDeliveryOrders = filterPending(state.deliveryOrders);
      const pendingFiscalInvoices = filterPending(state.fiscalInvoices);
      const pendingTicketReceipts = filterPending(state.ticketReceipts);
      const pendingPrinterConfigs = filterPending(state.printerConfigs);
      const pendingPaymentTerminals = filterPending(state.paymentTerminals);
      const pendingArcaConfigs = filterPending(state.arcaConfigs);

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
        usePosStore.getState().markBranchSyncing(branch.id);
        const result = await syncBranchToRemote(branch);
        if (result.ok) {
          usePosStore.getState().markBranchSynced(branch.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            usePosStore.getState().markBranchTerminal(branch.id, result.error ?? "Error de sincronizacion");
          } else {
            usePosStore.getState().markBranchFailed(branch.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const config of pendingPrinterConfigs) {
        usePosStore.getState().markPrinterConfigSyncing(config.id);
        const result = await syncPrinterConfigToRemote(config);
        if (result.ok) {
          usePosStore.getState().markPrinterConfigSynced(config.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) usePosStore.getState().markPrinterConfigTerminal(config.id, result.error ?? "Error de sincronizacion");
          else usePosStore.getState().markPrinterConfigFailed(config.id, result.error ?? "Error de sincronizacion");
          setSyncMeta({ lastSyncError: result.error ?? "Error de sincronizacion" });
        }
      }

      for (const terminal of pendingPaymentTerminals) {
        usePosStore.getState().markPaymentTerminalSyncing(terminal.id);
        const result = await syncPaymentTerminalToRemote(terminal);
        if (result.ok) {
          usePosStore.getState().markPaymentTerminalSynced(terminal.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) usePosStore.getState().markPaymentTerminalTerminal(terminal.id, result.error ?? "Error de sincronizacion");
          else usePosStore.getState().markPaymentTerminalFailed(terminal.id, result.error ?? "Error de sincronizacion");
          setSyncMeta({ lastSyncError: result.error ?? "Error de sincronizacion" });
        }
      }

      for (const config of pendingArcaConfigs) {
        usePosStore.getState().markArcaConfigSyncing(config.id);
        const result = await syncArcaConfigToRemote(config);
        if (result.ok) {
          usePosStore.getState().markArcaConfigSynced(config.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) usePosStore.getState().markArcaConfigTerminal(config.id, result.error ?? "Error de sincronizacion");
          else usePosStore.getState().markArcaConfigFailed(config.id, result.error ?? "Error de sincronizacion");
          setSyncMeta({ lastSyncError: result.error ?? "Error de sincronizacion" });
        }
      }

      for (const sale of pendingSales) {
        usePosStore.getState().markSaleSyncing(sale.id);
        const result = await syncSaleToRemote(sale);
        if (result.ok) {
          usePosStore.getState().markSaleSynced(sale.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            usePosStore.getState().markSaleTerminal(sale.id, result.error ?? "Error de sincronizacion");
          } else {
            usePosStore.getState().markSaleFailed(sale.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const receipt of pendingTicketReceipts) {
        usePosStore.getState().markTicketReceiptSyncing(receipt.id);
        const result = await syncTicketReceiptToRemote(receipt);
        if (result.ok) {
          usePosStore.getState().markTicketReceiptSynced(receipt.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) usePosStore.getState().markTicketReceiptTerminal(receipt.id, result.error ?? "Error de sincronizacion");
          else usePosStore.getState().markTicketReceiptFailed(receipt.id, result.error ?? "Error de sincronizacion");
          setSyncMeta({ lastSyncError: result.error ?? "Error de sincronizacion" });
        }
      }

      for (const close of pendingShiftClosures) {
        usePosStore.getState().markShiftCloseSyncing(close.id);
        const result = await syncShiftCloseToRemote(close);
        if (result.ok) {
          usePosStore.getState().markShiftCloseSynced(close.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            usePosStore.getState().markShiftCloseTerminal(close.id, result.error ?? "Error de sincronizacion");
          } else {
            usePosStore.getState().markShiftCloseFailed(close.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const movement of pendingCashMovements) {
        usePosStore.getState().markCashMovementSyncing(movement.id);
        const result = await syncCashMovementToRemote(movement);
        if (result.ok) {
          usePosStore.getState().markCashMovementSynced(movement.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            usePosStore.getState().markCashMovementTerminal(movement.id, result.error ?? "Error de sincronizacion");
          } else {
            usePosStore.getState().markCashMovementFailed(movement.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const preOrder of pendingPreOrders) {
        usePosStore.getState().markPreOrderSyncing(preOrder.id);
        const result = await syncPreOrderToRemote(preOrder);
        if (result.ok) {
          usePosStore.getState().markPreOrderSynced(preOrder.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            usePosStore.getState().markPreOrderTerminal(preOrder.id, result.error ?? "Error de sincronizacion");
          } else {
            usePosStore.getState().markPreOrderFailed(preOrder.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const order of pendingDeliveryOrders) {
        usePosStore.getState().markDeliveryOrderSyncing(order.id);
        const result = await syncDeliveryOrderToRemote(order);
        if (result.ok) {
          usePosStore.getState().markDeliveryOrderSynced(order.id);
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            usePosStore.getState().markDeliveryOrderTerminal(order.id, result.error ?? "Error de sincronizacion");
          } else {
            usePosStore.getState().markDeliveryOrderFailed(order.id, result.error ?? "Error de sincronizacion");
          }
          setSyncMeta({
            lastSyncError: terminalError
              ? `Error no recuperable: ${result.error ?? "Error de sincronizacion"}`
              : result.error ?? "Error de sincronizacion",
          });
        }
      }

      for (const invoice of pendingFiscalInvoices) {
        usePosStore.getState().markFiscalInvoiceSyncing(invoice.id);
        const result = await syncFiscalInvoiceToRemote(invoice);
        if (result.ok) {
          usePosStore.getState().markFiscalInvoiceSynced(
            invoice.id,
            result.documentNumber ?? null,
            result.responsePayload ?? null
          );
          setSyncMeta({ lastSyncAt: new Date().toISOString() });
        } else {
          const terminalError = isTerminalSyncError(result.error);
          if (terminalError) {
            usePosStore.getState().markFiscalInvoiceTerminal(invoice.id, result.error ?? "Error de sincronizacion");
          } else {
            usePosStore.getState().markFiscalInvoiceFailed(invoice.id, result.error ?? "Error de sincronizacion");
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
  }, []);

  return { pendingCount, syncMeta };
}
