"use client";

import Link from "next/link";
import { useState } from "react";
import { BackLink } from "@/modules/core/ui/back-link";
import { ModuleGlyph } from "@/modules/core/ui/module-glyph";
import {
  type DeliverySource,
  type DeliveryStatus,
  usePosStore,
} from "@/modules/pos/store/use-pos-store";
import { money } from "@/modules/pos/lib/money";

const dtf = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

const statusOptions: DeliveryStatus[] = ["pending", "assigned", "picked_up", "delivered", "cancelled"];
const sourceOptions: DeliverySource[] = ["manual", "pedidosya", "rappi", "ubereats", "qr"];

export default function DeliveryPage() {
  const couriers = usePosStore((state) => state.couriers);
  const deliveryOrders = usePosStore((state) => state.deliveryOrders);
  const addCourier = usePosStore((state) => state.addCourier);
  const toggleCourierActive = usePosStore((state) => state.toggleCourierActive);
  const createDeliveryOrder = usePosStore((state) => state.createDeliveryOrder);
  const assignDeliveryCourier = usePosStore((state) => state.assignDeliveryCourier);
  const setDeliveryOrderStatus = usePosStore((state) => state.setDeliveryOrderStatus);

  const [courierName, setCourierName] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [source, setSource] = useState<DeliverySource>("manual");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [total, setTotal] = useState("0");

  return (
    <main className="page-shell">
      <section className="scene-panel mx-auto w-full max-w-6xl p-5">
        <header className="scene-toolbar mb-5">
          <div className="scene-heading">
            <ModuleGlyph name="delivery" className="scene-float" />
            <div className="scene-heading-copy">
              <p className="scene-kicker">Logistica</p>
              <h1 className="text-2xl font-semibold">Delivery</h1>
            </div>
          </div>
          <div className="scene-actions">
            <BackLink inline />
            <Link
              href="/pos"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Caja
            </Link>
            <Link
              href="/ventas"
              className="scene-button-secondary px-4 py-2 text-sm font-medium"
            >
              Ventas
            </Link>
          </div>
        </header>

        <section className="scene-card mb-5 p-4">
          <h2 className="text-sm font-semibold">Repartidores</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={courierName}
              onChange={(event) => setCourierName(event.target.value)}
              placeholder="Nombre"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              value={courierPhone}
              onChange={(event) => setCourierPhone(event.target.value)}
              placeholder="Telefono"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                const courier = addCourier(courierName, courierPhone);
                if (!courier) return;
                setCourierName("");
                setCourierPhone("");
              }}
              className="scene-button-secondary px-3 py-2 text-sm"
            >
              Agregar
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {couriers.map((courier) => (
              <button
                key={courier.id}
                onClick={() => toggleCourierActive(courier.id, !courier.active)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  courier.active ? "border-emerald-400 bg-emerald-50" : "border-neutral-300"
                }`}
              >
                {courier.name} {courier.active ? "(activo)" : "(inactivo)"}
              </button>
            ))}
          </div>
        </section>

        <section className="scene-card mb-5 p-4">
          <h2 className="text-sm font-semibold">Nuevo pedido delivery</h2>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as DeliverySource)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              {sourceOptions.map((sourceOption) => (
                <option key={sourceOption} value={sourceOption}>
                  {sourceOption}
                </option>
              ))}
            </select>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Cliente"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="Telefono"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Direccion"
              className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
            />
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nota"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              step={1}
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              placeholder="Total"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                const order = createDeliveryOrder({
                  source,
                  customerName,
                  customerPhone,
                  address,
                  note,
                  totalAmount: Number(total),
                });
                if (!order) return;
                setCustomerName("");
                setCustomerPhone("");
                setAddress("");
                setNote("");
                setTotal("0");
              }}
              className="scene-button-primary px-3 py-2 text-sm"
            >
              Crear pedido
            </button>
          </div>
        </section>

        <section className="space-y-3">
          {deliveryOrders.length === 0 && (
            <p className="scene-empty p-4 text-sm text-neutral-500">
              Sin pedidos delivery.
            </p>
          )}
          {deliveryOrders.map((order) => (
            <article key={order.id} className="scene-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {order.customerName} - {money(order.totalAmount)}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {order.source} | {order.address}
                  </p>
                  <p className="text-xs text-neutral-500">{dtf.format(new Date(order.createdAt))}</p>
                  {order.note && <p className="text-xs text-neutral-500">Nota: {order.note}</p>}
                  <p className="text-xs text-neutral-500">
                    Courier: {order.courierName ?? "Sin asignar"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Sync: {order.syncStatus}
                    {order.syncError ? ` - ${order.syncError}` : ""}
                  </p>
                </div>
                <div className="grid gap-2">
                  <select
                    value={order.status}
                    onChange={(event) =>
                      setDeliveryOrderStatus(order.id, event.target.value as DeliveryStatus)
                    }
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    {statusOptions.map((status) => (
                      <option key={`${order.id}-${status}`} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <select
                    value={
                      couriers.find((courier) => courier.name === order.courierName)?.id ?? ""
                    }
                    onChange={(event) =>
                      assignDeliveryCourier(order.id, event.target.value || null)
                    }
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="">Sin asignar</option>
                    {couriers
                      .filter((courier) => courier.active)
                      .map((courier) => (
                        <option key={courier.id} value={courier.id}>
                          {courier.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
