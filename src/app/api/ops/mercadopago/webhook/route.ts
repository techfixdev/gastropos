export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getOpsEnv } from "@/modules/ops/server/env";

async function verifyHmacSignature(
  secret: string,
  body: string,
  signature: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBytes = Uint8Array.from(signature.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));
}

export async function POST(request: NextRequest) {
  const env = getOpsEnv();
  const body = await request.text();
  const signature = request.headers.get("x-signature");
  const payload = JSON.parse(body);

  let verified = false;
  if (env.mercadoPagoWebhookSecret && signature) {
    try {
      verified = await verifyHmacSignature(env.mercadoPagoWebhookSecret, body, signature);
    } catch {
      verified = false;
    }
  }

  if (!verified) {
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    received: true,
    verified,
    payload,
  });
}
