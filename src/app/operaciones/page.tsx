"use client";

import { useEffect, useMemo, useState } from "react";
import { BackLink } from "@/modules/core/ui/back-link";
import { ModuleGlyph } from "@/modules/core/ui/module-glyph";
import { AuthChip } from "@/modules/core/auth/auth-chip";
import { SyncStatusChip } from "@/modules/pos/ui/sync-status-chip";
import {
  type FiscalProvider,
  type PaperWidthMm,
  type PaymentCollectionMode,
  type PaymentTerminalProvider,
  usePosStore,
} from "@/modules/pos/store/use-pos-store";

export default function OperacionesPage() {
  const branches = usePosStore((state) => state.branches);
  const activeBranchId = usePosStore((state) => state.activeBranchId);
  const printerConfigs = usePosStore((state) => state.printerConfigs);
  const paymentTerminals = usePosStore((state) => state.paymentTerminals);
  const arcaConfigs = usePosStore((state) => state.arcaConfigs);
  const upsertPrinterConfig = usePosStore((state) => state.upsertPrinterConfig);
  const upsertPaymentTerminal = usePosStore((state) => state.upsertPaymentTerminal);
  const upsertArcaConfig = usePosStore((state) => state.upsertArcaConfig);

  const activeBranch = useMemo(
    () => branches.find((branch) => branch.id === activeBranchId) ?? branches[0] ?? null,
    [activeBranchId, branches]
  );
  const branchPrinters = useMemo(
    () => printerConfigs.filter((config) => config.branchId === activeBranch?.id),
    [activeBranch?.id, printerConfigs]
  );
  const branchTerminals = useMemo(
    () => paymentTerminals.filter((terminal) => terminal.branchId === activeBranch?.id),
    [activeBranch?.id, paymentTerminals]
  );
  const arcaConfig = useMemo(
    () => arcaConfigs.find((config) => config.branchId === activeBranch?.id) ?? null,
    [activeBranch?.id, arcaConfigs]
  );

  const [printerName, setPrinterName] = useState("");
  const [paperWidthMm, setPaperWidthMm] = useState<PaperWidthMm>(80);
  const [connectionType, setConnectionType] = useState<"browser" | "usb" | "network">("browser");
  const [printerCopies, setPrinterCopies] = useState("1");
  const [printerIp, setPrinterIp] = useState("");
  const [terminalName, setTerminalName] = useState("");
  const [terminalProvider, setTerminalProvider] = useState<PaymentTerminalProvider>("manual");
  const [terminalMode, setTerminalMode] = useState<PaymentCollectionMode>("manual");
  const [terminalReference, setTerminalReference] = useState("");
  const [arcaMode, setArcaMode] = useState<"disabled" | "test" | "production">(arcaConfig?.mode ?? "disabled");
  const [arcaInvoiceType, setArcaInvoiceType] = useState<"B" | "A" | "T">(arcaConfig?.invoiceType ?? "B");
  const [arcaPointOfSale, setArcaPointOfSale] = useState(String(arcaConfig?.pointOfSale ?? 1));
  const [arcaCuit, setArcaCuit] = useState(arcaConfig?.cuit ?? "");
  const [arcaLegalName, setArcaLegalName] = useState(arcaConfig?.legalName ?? "");
  const [arcaGrossIncome, setArcaGrossIncome] = useState(arcaConfig?.grossIncomeTaxStatus ?? "Consumidor final");
  const [message, setMessage] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<{
    mercadoPago: { configured: boolean; webhookConfigured: boolean };
    arca: { mode: string; configured: boolean; hasCertificates: boolean };
  } | null>(null);

  const branchFiscalProvider: FiscalProvider = activeBranch?.fiscalProvider ?? "none";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ops/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled && json?.status) setBackendStatus(json.status);
      })
      .catch(() => {
        if (!cancelled) setBackendStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSavePrinter = () => {
    if (!activeBranch || !printerName.trim()) return;
    upsertPrinterConfig({
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-printer`,
      branchId: activeBranch.id,
      name: printerName.trim(),
      paperWidthMm,
      connectionType,
      copies: Math.max(1, Number(printerCopies) || 1),
      autoPrint: true,
      ipAddress: printerIp.trim() || null,
      isDefault: branchPrinters.length === 0,
      active: true,
    });
    setPrinterName("");
    setPrinterIp("");
    setPrinterCopies("1");
    setMessage("Impresora guardada.");
  };

  const handleSaveTerminal = () => {
    if (!activeBranch || !terminalName.trim()) return;
    upsertPaymentTerminal({
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-terminal`,
      branchId: activeBranch.id,
      name: terminalName.trim(),
      provider: terminalProvider,
      collectMode: terminalMode,
      externalReference: terminalReference.trim() || null,
      active: true,
    });
    setTerminalName("");
    setTerminalReference("");
    setMessage("Terminal guardada.");
  };

  const handleSaveArca = () => {
    if (!activeBranch) return;
    upsertArcaConfig({
      id: arcaConfig?.id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-arca`),
      branchId: activeBranch.id,
      mode: arcaMode,
      pointOfSale: Math.max(1, Number(arcaPointOfSale) || 1),
      invoiceType: arcaInvoiceType,
      cuit: arcaCuit.trim(),
      legalName: arcaLegalName.trim(),
      grossIncomeTaxStatus: arcaGrossIncome.trim() || "Consumidor final",
      enabled: arcaMode !== "disabled",
      lastTestAt: arcaConfig?.lastTestAt ?? null,
      lastInvoiceAt: arcaConfig?.lastInvoiceAt ?? null,
    });
    setMessage("Configuracion ARCA actualizada.");
  };

  return (
    <main className="page-shell">
      <section className="scene-panel mx-auto w-full max-w-6xl p-5">
        <header className="scene-toolbar mb-5 print:hidden">
          <div className="scene-heading">
            <ModuleGlyph name="sales" className="scene-float" />
            <div className="scene-heading-copy">
              <p className="scene-kicker">Operacion real</p>
              <h1 className="text-2xl font-semibold">Impresoras, cobro y ARCA</h1>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="scene-status-pill">{activeBranch?.name ?? "Sin sucursal"}</span>
              <span className={`scene-status-pill ${branchFiscalProvider === "arca" ? "" : "warn"}`}>
                Fiscal {branchFiscalProvider.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="scene-actions">
            <BackLink inline />
            <AuthChip />
            <SyncStatusChip />
          </div>
        </header>

        {message && <p className="scene-card mb-4 bg-sky-50 px-4 py-2 text-sm text-sky-700">{message}</p>}

        <section className="mb-4 grid gap-3 md:grid-cols-2">
          <article className="scene-card p-4">
            <p className="text-sm text-neutral-600">Backend Mercado Pago</p>
            <p className="mt-1 text-lg font-semibold">
              {backendStatus?.mercadoPago.configured ? "Configurado" : "Pendiente"}
            </p>
            <p className="text-xs text-neutral-500">
              Webhook: {backendStatus?.mercadoPago.webhookConfigured ? "listo" : "sin secreto"}
            </p>
          </article>
          <article className="scene-card p-4">
            <p className="text-sm text-neutral-600">Backend ARCA</p>
            <p className="mt-1 text-lg font-semibold">
              {backendStatus?.arca.configured ? `Listo (${backendStatus.arca.mode})` : "Pendiente"}
            </p>
            <p className="text-xs text-neutral-500">
              Certificados: {backendStatus?.arca.hasCertificates ? "cargados" : "faltantes"}
            </p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="scene-card p-4">
            <h2 className="text-lg font-semibold">Tickets termicos</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Configura impresoras de 80 mm o 90 mm para mostrador, retiro o cocina.
            </p>
            <div className="mt-3 grid gap-2">
              <input
                value={printerName}
                onChange={(event) => setPrinterName(event.target.value)}
                placeholder="Nombre de impresora"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  value={paperWidthMm}
                  onChange={(event) => setPaperWidthMm(Number(event.target.value) as PaperWidthMm)}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <option value={80}>80 mm</option>
                  <option value={90}>90 mm</option>
                </select>
                <select
                  value={connectionType}
                  onChange={(event) => setConnectionType(event.target.value as "browser" | "usb" | "network")}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="browser">Navegador</option>
                  <option value="usb">USB</option>
                  <option value="network">Red</option>
                </select>
                <input
                  value={printerCopies}
                  onChange={(event) => setPrinterCopies(event.target.value)}
                  placeholder="Copias"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <input
                value={printerIp}
                onChange={(event) => setPrinterIp(event.target.value)}
                placeholder="IP (solo red)"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <button onClick={handleSavePrinter} className="scene-button-primary px-4 py-2 text-sm font-medium text-white">
                Guardar impresora
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {branchPrinters.map((printer) => (
                <div key={printer.id} className="scene-card-soft p-3 text-sm">
                  <p className="font-medium">{printer.name}</p>
                  <p className="text-neutral-600">
                    {printer.paperWidthMm} mm - {printer.connectionType}
                    {printer.ipAddress ? ` - ${printer.ipAddress}` : ""}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {printer.isDefault ? "Predeterminada" : "Secundaria"} - Sync {printer.syncStatus}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="scene-card p-4">
            <h2 className="text-lg font-semibold">Cobro electronico</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Para cafeteria conviene combinar Point/QR de Mercado Pago con respaldo manual para tarjeta bancaria.
            </p>
            <div className="mt-3 grid gap-2">
              <input
                value={terminalName}
                onChange={(event) => setTerminalName(event.target.value)}
                placeholder="Nombre de terminal"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <select
                value={terminalProvider}
                onChange={(event) => setTerminalProvider(event.target.value as PaymentTerminalProvider)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="manual">Manual / POS bancario</option>
                <option value="mercado_pago_qr">Mercado Pago QR</option>
                <option value="mercado_pago_point">Mercado Pago Point</option>
                <option value="bank_pos">POS bancario</option>
              </select>
              <select
                value={terminalMode}
                onChange={(event) => setTerminalMode(event.target.value as PaymentCollectionMode)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="manual">Confirmacion manual</option>
                <option value="qr_dynamic">QR dinamico</option>
                <option value="terminal">Terminal dedicada</option>
              </select>
              <input
                value={terminalReference}
                onChange={(event) => setTerminalReference(event.target.value)}
                placeholder="Referencia externa"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <button onClick={handleSaveTerminal} className="scene-button-primary px-4 py-2 text-sm font-medium text-white">
                Guardar terminal
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {branchTerminals.map((terminal) => (
                <div key={terminal.id} className="scene-card-soft p-3 text-sm">
                  <p className="font-medium">{terminal.name}</p>
                  <p className="text-neutral-600">
                    {terminal.provider} - {terminal.collectMode}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {terminal.externalReference ?? "Sin referencia"} - Sync {terminal.syncStatus}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="scene-card p-4">
            <h2 className="text-lg font-semibold">ARCA</h2>
            <p className="mt-1 text-sm text-neutral-600">
              La emision real requiere credenciales WSAA/WSFE en backend seguro. Aqui dejas el perfil operativo de la sucursal.
            </p>
            <div className="mt-3 grid gap-2">
              <select
                value={arcaMode}
                onChange={(event) => setArcaMode(event.target.value as "disabled" | "test" | "production")}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="disabled">Desactivado</option>
                <option value="test">Homologacion</option>
                <option value="production">Produccion</option>
              </select>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={arcaPointOfSale}
                  onChange={(event) => setArcaPointOfSale(event.target.value)}
                  placeholder="Punto de venta"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <select
                  value={arcaInvoiceType}
                  onChange={(event) => setArcaInvoiceType(event.target.value as "B" | "A" | "T")}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="B">Factura B / ticket</option>
                  <option value="A">Factura A</option>
                  <option value="T">Ticket no fiscal</option>
                </select>
              </div>
              <input
                value={arcaCuit}
                onChange={(event) => setArcaCuit(event.target.value)}
                placeholder="CUIT emisor"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={arcaLegalName}
                onChange={(event) => setArcaLegalName(event.target.value)}
                placeholder="Razon social"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={arcaGrossIncome}
                onChange={(event) => setArcaGrossIncome(event.target.value)}
                placeholder="Condicion tributaria"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <button onClick={handleSaveArca} className="scene-button-primary px-4 py-2 text-sm font-medium text-white">
                Guardar ARCA
              </button>
            </div>
            {arcaConfig && (
              <div className="scene-card-soft mt-4 p-3 text-sm">
                <p className="font-medium">
                  Estado {arcaConfig.enabled ? arcaConfig.mode.toUpperCase() : "DESACTIVADO"}
                </p>
                <p className="text-neutral-600">
                  Punto de venta {arcaConfig.pointOfSale} - Tipo {arcaConfig.invoiceType}
                </p>
                <p className="text-xs text-neutral-500">
                  Ultima emision: {arcaConfig.lastInvoiceAt ?? "sin registros"} - Sync {arcaConfig.syncStatus}
                </p>
              </div>
            )}
          </article>
        </section>

        <section className="scene-card mt-5 p-4">
          <h2 className="text-lg font-semibold">Recomendacion para cafeteria-pasteleria</h2>
          <div className="mt-2 grid gap-2 text-sm text-neutral-700 md:grid-cols-3">
            <p>Mostrador: impresora 80 mm + navegador con impresion silenciosa del sistema operativo.</p>
            <p>Cobro: efectivo, debito/credito manual y Mercado Pago Point o QR para baja friccion.</p>
            <p>Fiscal: usar ARCA en backend seguro y dejar el POS web como originador del comprobante.</p>
          </div>
        </section>
      </section>
    </main>
  );
}
