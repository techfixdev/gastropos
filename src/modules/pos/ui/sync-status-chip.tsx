"use client";

import { usePosStore } from "../store/use-pos-store";

export function SyncStatusChip() {
  const sales = usePosStore((state) => state.sales);
  const shiftClosures = usePosStore((state) => state.shiftClosures);
  const cashMovements = usePosStore((state) => state.cashMovements);
  const preOrders = usePosStore((state) => state.preOrders);
  const deliveryOrders = usePosStore((state) => state.deliveryOrders);
  const branches = usePosStore((state) => state.branches);
  const fiscalInvoices = usePosStore((state) => state.fiscalInvoices);
  const syncMeta = usePosStore((state) => state.syncMeta);
  const pendingSales = sales.filter((sale) => sale.syncStatus !== "synced").length;
  const pendingClosures = shiftClosures.filter((closure) => closure.syncStatus !== "synced").length;
  const pendingMovements = cashMovements.filter((movement) => movement.syncStatus !== "synced").length;
  const pendingPreOrders = preOrders.filter((preOrder) => preOrder.syncStatus !== "synced").length;
  const pendingDeliveryOrders = deliveryOrders.filter((order) => order.syncStatus !== "synced").length;
  const pendingBranches = branches.filter((branch) => branch.syncStatus !== "synced").length;
  const pendingFiscalInvoices = fiscalInvoices.filter((invoice) => invoice.syncStatus !== "synced").length;
  const pending =
    pendingSales +
    pendingClosures +
    pendingMovements +
    pendingPreOrders +
    pendingDeliveryOrders +
    pendingBranches +
    pendingFiscalInvoices;

  const mode = syncMeta.remoteEnabled ? "Remoto" : "Local";
  const onlineText = syncMeta.isOnline ? "Online" : "Offline";
  const syncText = syncMeta.isSyncing ? "Sincronizando" : "Estable";

  return (
    <div className="scene-card px-3 py-2 text-xs text-neutral-700">
      <p className="font-semibold">
        {mode} - {onlineText}
      </p>
      <p>
        Estado: {syncText} | Pendientes: {pending}
      </p>
      {syncMeta.lastSyncError && <p className="text-rose-700">{syncMeta.lastSyncError}</p>}
    </div>
  );
}

