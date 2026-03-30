"use client";

import { isSupabaseConfigured, supabase } from "./client";

export type AuthContextResult =
  | { ok: true; userId: string; tenantId: string }
  | { ok: false; error: string };

export async function resolveAuthContext(): Promise<AuthContextResult> {
  if (!supabase) return { ok: false, error: "Cliente Supabase no disponible" };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { ok: false, error: userError.message };
  if (!userData.user) return { ok: false, error: "Sin sesion autenticada" };

  const { data: profile, error: profileError } = await supabase
    .from("app_user")
    .select("tenant_id")
    .eq("id", userData.user.id)
    .single();

  if (profileError) return { ok: false, error: profileError.message };
  if (!profile.tenant_id) return { ok: false, error: "Usuario sin tenant asignado" };

  return {
    ok: true,
    userId: userData.user.id,
    tenantId: profile.tenant_id as string,
  };
}

export async function checkRemoteSyncReadiness(): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase no configurado" };
  }
  const authContext = await resolveAuthContext();
  if (!authContext.ok) return { ok: false, error: authContext.error };
  return { ok: true };
}
