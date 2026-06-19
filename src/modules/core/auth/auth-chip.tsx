"use client";

import { useAuthSession } from "./use-auth-session";

export function AuthChip() {
  const { loading, configured, userId, email, role, error, signInAnonymously, signOut } =
    useAuthSession();

  if (!configured) {
    return (
      <div className="scene-card px-3 py-2 text-xs text-neutral-600">
        Auth: local mode
      </div>
    );
  }

  if (loading) {
    return (
      <div className="scene-card px-3 py-2 text-xs text-neutral-500">
        Auth: cargando...
      </div>
    );
  }

  return (
    <div className="scene-card px-3 py-2 text-xs text-neutral-700">
      {userId ? (
        <>
          <p className="font-semibold">{email || userId.slice(0, 8)}</p>
          <p className="text-neutral-500">{role ?? "sin rol"}</p>
          {error && <p className="text-rose-700">{error}</p>}
          <button
            onClick={() => void signOut()}
            className="mt-1 scene-button-secondary px-2 py-1 text-[11px]"
          >
            Salir
          </button>
        </>
      ) : (
        <>
          <p className="font-semibold">Sin sesión</p>
          {error && <p className="text-rose-700">{error}</p>}
          <button
            onClick={() => void signInAnonymously()}
            className="mt-1 scene-button-secondary px-2 py-1 text-[11px]"
          >
            Login anon
          </button>
        </>
      )}
    </div>
  );
}

