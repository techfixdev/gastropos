export const dynamic = "force-static";
import { NextRequest, NextResponse } from "next/server";
import { getOpsEnv } from "@/modules/ops/server/env";

type MercadoPagoOrderRequest = {
  title: string;
  total: number;
  externalReference: string;
  items: Array<{ title: string; quantity: number; unitPrice: number }>;
};

export async function POST(request: NextRequest) {
  const env = getOpsEnv();
  if (!env.mercadoPagoAccessToken) {
    return NextResponse.json(
      { ok: false, error: "MERCADOPAGO_ACCESS_TOKEN no configurado" },
      { status: 503 }
    );
  }

  const body = (await request.json()) as Partial<MercadoPagoOrderRequest>;
  if (!body.title || !body.externalReference || !Array.isArray(body.items) || !body.total) {
    return NextResponse.json(
      { ok: false, error: "Payload invalido para orden de Mercado Pago" },
      { status: 400 }
    );
  }

  const payload = {
    type: "online",
    external_reference: body.externalReference,
    total_amount: body.total,
    title: body.title,
    items: body.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_amount: item.unitPrice * item.quantity,
    })),
  };

  const mpResponse = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.mercadoPagoAccessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = await mpResponse.json().catch(() => null);
  if (!mpResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Mercado Pago rechazo la orden",
        detail: json,
      },
      { status: mpResponse.status }
    );
  }

  return NextResponse.json({
    ok: true,
    provider: "mercado_pago",
    order: json,
  });
}
