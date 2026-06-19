"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GastroPOS] Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 p-6">
      <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-lg">
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="mb-2 text-lg font-semibold text-red-800">
          Error al cargar la página
        </h2>
        <p className="mb-4 text-sm text-neutral-600">
          Ocurrió un error al renderizar esta sección. Tus datos locales no se
          perdieron.
        </p>
        <details className="mb-4 text-left">
          <summary className="cursor-pointer text-xs text-neutral-500">
            Detalle técnico
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto rounded bg-neutral-100 p-2 text-xs text-red-700">
            {error.message ?? "Error desconocido"}
          </pre>
        </details>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600"
          >
            Reintentar
          </button>
          <a
            href="/pos"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            Volver al POS
          </a>
        </div>
      </div>
    </div>
  );
}
