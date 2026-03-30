"use client";

import { useAuthSession } from "./use-auth-session";

export function AuthChip() {
  const { loading, configured, userId, tenantId, role, error, signInAnonymously, signOut } =
    useAuthSession();

  if (!configured) {
    return (
      <div className="scene-card px-3 py-2 text-xs text-neutral-600">
        Auth: local mode
      </div>
    );
  }

  return (
    <div className="scene-card px-3 py-2 text-xs text-neutral-700">
      <p className="font-semibold">
        Auth: {loading ? "cargando" : userId ? "activa" : "sin sesion"}
      </p>
      {userId && (
        <p>
          {userId.slice(0, 8)} | tenant: {tenantId?.slice(0, 8) ?? "sin perfil"} |{" "}
          {role ?? "sin rol"}
        </p>
      )}
      {error && <p className="text-rose-700">{error}</p>}
      <div className="mt-1 flex gap-1">
        {!userId ? (
          <button
            onClick={() => void signInAnonymously()}
            className="scene-button-secondary px-2 py-1 text-[11px]"
          >
            Login anon
          </button>
        ) : (
          <button onClick={() => void signOut()} className="scene-button-secondary px-2 py-1 text-[11px]">
            Salir
          </button>
        )}
      </div>
    </div>
  );
}

