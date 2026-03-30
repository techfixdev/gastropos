import { NextRequest, NextResponse } from "next/server";
import { getOpsStatus } from "@/modules/ops/server/env";

export async function POST(request: NextRequest) {
  const status = getOpsStatus();
  const payload = await request.json().catch(() => null);

  if (!status.arca.configured) {
    return NextResponse.json(
      {
        ok: false,
        error: "ARCA no configurado en backend",
        detail:
          "Se requieren WSAA/WSFE, CUIT y certificados del contribuyente para emitir comprobantes reales.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: false,
    provider: "arca",
    error: "Implementacion fiscal pendiente de homologacion",
    payload,
  });
}
