"use client";

import {
  checkRemoteSyncReadiness,
  resolveAuthContext,
} from "@/modules/core/supabase/auth-context";
import { supabase } from "@/modules/core/supabase/client";
import type { InventoryMovement } from "../store/use-inventory-store";

export { checkRemoteSyncReadiness };

export async function syncInventoryMovementToRemote(
  movement: InventoryMovement
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase no configurado" };

  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };

  if (movement.productId === "all") return { ok: true };

  const stockResult = await supabase
    .from("inventory_stock")
    .upsert(
      {
        tenant_id: authContext.tenantId,
        product_id: movement.productId,
        current_stock: 0,
      },
      { onConflict: "tenant_id,product_id" }
    )
    .select("current_stock")
    .single();

  if (stockResult.error) return { ok: false, error: stockResult.error.message };

  const nextStock = Math.max(0, (stockResult.data?.current_stock ?? 0) + movement.delta);

  const updateResult = await supabase
    .from("inventory_stock")
    .update({ current_stock: nextStock, updated_at: new Date().toISOString() })
    .eq("tenant_id", authContext.tenantId)
    .eq("product_id", movement.productId);

  if (updateResult.error) return { ok: false, error: updateResult.error.message };

  const movementResult = await supabase.from("inventory_movement").upsert(
    {
      id: movement.id,
      tenant_id: authContext.tenantId,
      product_id: movement.productId,
      product_name_snapshot: movement.productName,
      delta: movement.delta,
      reason: movement.reason,
      created_at: movement.createdAt,
    },
    { onConflict: "id" }
  );

  if (movementResult.error) return { ok: false, error: movementResult.error.message };

  return { ok: true };
}
