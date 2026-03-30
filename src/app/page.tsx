import Link from "next/link";
import { ModuleGlyph } from "@/modules/core/ui/module-glyph";

export default function Home() {
  return (
    <main className="page-shell flex items-center justify-center">
      <section className="scene-panel w-full max-w-4xl p-8 text-center md:p-12">
        <div className="scene-hero-band scene-float mx-auto max-w-3xl">
          <p className="scene-kicker">App Gastronomica</p>
          <h1 className="scene-title mt-3 text-5xl font-extrabold md:text-6xl">GastroPOS</h1>
          <p className="scene-lead mx-auto mt-4 max-w-2xl text-base md:text-lg">
            Punto de venta con una interfaz mas amable, clara y rapida para cafeterias,
            pastelerias y equipos de caja que trabajan todo el dia.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/pos" className="scene-button-primary">
            Abrir caja
          </Link>
          <Link href="/ventas" className="scene-button-secondary">
            Ver ventas
          </Link>
          <Link href="/inventario" className="scene-button-secondary">
            Inventario
          </Link>
          <Link href="/catalogo" className="scene-button-secondary">
            Catalogo
          </Link>
          <Link href="/mesas" className="scene-button-secondary">
            Mesas
          </Link>
          <Link href="/kds" className="scene-button-secondary">
            KDS
          </Link>
          <Link href="/delivery" className="scene-button-secondary">
            Delivery
          </Link>
        </div>

        <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
          <article className="scene-card scene-float p-4">
            <ModuleGlyph name="pos" />
            <p className="scene-kicker">Caja</p>
            <h2 className="mt-2 text-xl font-bold">Rapida y tactil</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Carrito, combos, venta por peso y modificadores con lectura clara.
            </p>
          </article>
          <article className="scene-card scene-float-delayed p-4">
            <ModuleGlyph name="inventory" />
            <p className="scene-kicker">Operacion</p>
            <h2 className="mt-2 text-xl font-bold">Todo conectado</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Inventario, mesas, cocina, delivery y cierres de caja en el mismo flujo.
            </p>
          </article>
          <article className="scene-card scene-float p-4">
            <ModuleGlyph name="catalog" />
            <p className="scene-kicker">Escala</p>
            <h2 className="mt-2 text-xl font-bold">Multi-sucursal</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Precios por sucursal, sync remoto y base lista para facturacion fiscal.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}

