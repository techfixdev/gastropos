"use client";

import { useEffect, useMemo } from "react";
import { checkRemoteSyncReadiness, syncInventoryMovementToRemote } from "./inventory-sync";
import { isTerminalSyncError, shouldRetryNow } from "@/modules/core/sync/policy";
import { useInventoryStore } from "../store/use-inventory-store";

const SYNC_INTERVAL_MS = 9000;
const RETRY_LIMIT = 8;
const RETRY_BASE_DELAY_MS = 4000;
const RETRY_MAX_DELAY_MS = 120000;

export function useInventorySync() {
  const movements = useInventoryStore((state) => state.movements);
  const markMovementSyncing = useInventoryStore((state) => state.markMovementSyncing);
  const markMovementSynced = useInventoryStore((state) => state.markMovementSynced);
  const markMovementFailed = useInventoryStore((state) => state.markMovementFailed);
  const markMovementTerminal = useInventoryStore((state) => state.markMovementTerminal);

  const pending = useMemo(
    () =>
      movements.filter(
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
    [movements]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    let busy = false;

    const runSync = async () => {
      if (busy) return;
      if (!navigator.onLine) return;
      if (pending.length === 0) return;

      const readiness = await checkRemoteSyncReadiness();
      if (!readiness.ok) return;

      busy = true;
      for (const movement of pending) {
        markMovementSyncing(movement.id);
        const result = await syncInventoryMovementToRemote(movement);
        if (result.ok) {
          markMovementSynced(movement.id);
        } else {
          if (isTerminalSyncError(result.error)) {
            markMovementTerminal(movement.id, result.error ?? "Error de sincronizacion");
          } else {
            markMovementFailed(movement.id, result.error ?? "Error de sincronizacion");
          }
        }
      }
      busy = false;
    };

    void runSync();
    const intervalId = window.setInterval(() => {
      void runSync();
    }, SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [markMovementFailed, markMovementSynced, markMovementSyncing, markMovementTerminal, pending]);
}
