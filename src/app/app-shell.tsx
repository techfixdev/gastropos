"use client";

import type { ReactNode } from "react";
import { ErrorBoundary } from "@/modules/core/ui/error-boundary";
import { PosRuntime } from "@/modules/pos/ui/pos-runtime";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <PosRuntime />
      <ErrorBoundary
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center p-6">
            <div className="rounded-xl border border-red-200 bg-white p-6 text-center shadow-lg">
              <p className="text-red-700 font-medium">Error al cargar la sección</p>
              <a href="/pos" className="mt-3 inline-block text-sm text-sky-600 underline">
                Volver al POS
              </a>
            </div>
          </div>
        }
      >
        {children}
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
