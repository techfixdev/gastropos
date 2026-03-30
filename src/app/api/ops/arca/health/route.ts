import { NextResponse } from "next/server";
import { getOpsStatus } from "@/modules/ops/server/env";

export async function GET() {
  const status = getOpsStatus();
  return NextResponse.json({
    ok: true,
    provider: "arca",
    status: status.arca,
    checkedAt: new Date().toISOString(),
  });
}
