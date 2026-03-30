import { NextRequest, NextResponse } from "next/server";
import { getOpsEnv } from "@/modules/ops/server/env";

export async function POST(request: NextRequest) {
  const env = getOpsEnv();
  const signature = request.headers.get("x-signature");
  const payload = await request.json().catch(() => null);

  return NextResponse.json({
    ok: true,
    received: true,
    verified: Boolean(env.mercadoPagoWebhookSecret && signature),
    payload,
  });
}
