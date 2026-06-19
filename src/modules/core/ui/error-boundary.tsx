"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[GastroPOS] Error boundary caught:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-red-50 p-6">
          <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-lg">
            <div className="mb-4 text-4xl">⚠️</div>
            <h2 className="mb-2 text-lg font-semibold text-red-800">
              Algo salió mal
            </h2>
            <p className="mb-4 text-sm text-neutral-600">
              La aplicación encontró un error inesperado. Esto no afecta tus
              datos locales.
            </p>
            <details className="mb-4 text-left">
              <summary className="cursor-pointer text-xs text-neutral-500">
                Detalle técnico
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto rounded bg-neutral-100 p-2 text-xs text-red-700">
                {this.state.error?.message ?? "Error desconocido"}
              </pre>
            </details>
            <button
              onClick={this.handleReset}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
