export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getOpsStatus } from "@/modules/ops/server/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: getOpsStatus(),
    checkedAt: new Date().toISOString(),
  });
}
