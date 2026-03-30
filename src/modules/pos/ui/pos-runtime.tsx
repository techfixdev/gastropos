"use client";

import { useInventorySync } from "@/modules/inventory/lib/use-inventory-sync";
import { useSalesSync } from "../lib/use-sales-sync";

export function PosRuntime() {
  useSalesSync();
  useInventorySync();
  return null;
}
