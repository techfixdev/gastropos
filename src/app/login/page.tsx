"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/modules/core/auth/use-auth-session";

export default function LoginPage() {
  const router = useRouter();
  const { userId, loading, configured, signInWithPassword, signInAnonymously, error } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userId) {
      router.replace("/pos");
    }
  }, [userId, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!email || !password) {
      setLoginError("Completá email y contraseña");
      return;
    }
    setSubmitting(true);
    const result = await signInWithPassword(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setLoginError(result.error ?? "Error al iniciar sesión");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500">Cargando...</p>
      </div>
    );
  }

  return (
    <main className="page-shell flex min-h-screen items-center justify-center">
      <div className="scene-panel w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">GastroPOS</h1>
          <p className="mt-1 text-sm text-neutral-500">Iniciá sesión para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-neutral-600">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-neutral-600">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {(loginError || error) && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {loginError || error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !configured}
            className="scene-button-primary w-full px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-4 border-t pt-4 text-center">
          <button
            onClick={signInAnonymously}
            disabled={!configured}
            className="text-xs text-neutral-500 underline hover:text-neutral-700 disabled:opacity-40"
          >
            Ingresar como invitado
          </button>
        </div>
      </div>
    </main>
  );
}
