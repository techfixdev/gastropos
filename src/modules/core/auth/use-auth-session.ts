"use client";

import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/modules/core/supabase/client";

type AuthState = {
  loading: boolean;
  configured: boolean;
  userId: string | null;
  email: string | null;
  tenantId: string | null;
  role: "admin" | "cashier" | null;
  error: string | null;
};

const initialState: AuthState = {
  loading: true,
  configured: isSupabaseConfigured,
  userId: null,
  email: null,
  tenantId: null,
  role: null,
  error: null,
};

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"; // CENTRAL

export function useAuthSession() {
  const [state, setState] = useState<AuthState>(initialState);

  const loadProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setState({
        loading: false,
        configured: false,
        userId: null,
        email: null,
        tenantId: null,
        role: null,
        error: "Supabase no configurado",
      });
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      setState((current) => ({ ...current, loading: false, error: userError.message }));
      return;
    }

    const user = userData.user;
    if (!user) {
      setState((current) => ({
        ...current,
        loading: false,
        userId: null,
        email: null,
        tenantId: null,
        role: null,
      }));
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("app_user")
      .select("tenant_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setState((current) => ({
        ...current,
        loading: false,
        userId: user.id,
        email: user.email ?? null,
        tenantId: null,
        role: null,
        error: profileError.message,
      }));
      return;
    }

    // Auto-create profile for first-time users
    if (!profile) {
      const { error: insertError } = await supabase
        .from("app_user")
        .insert({
          id: user.id,
          tenant_id: DEFAULT_TENANT_ID,
          full_name: user.email ?? "Usuario Local",
          role: "admin",
        });

      if (insertError) {
        setState((current) => ({
          ...current,
          loading: false,
          userId: user.id,
          email: user.email ?? null,
          tenantId: null,
          role: null,
          error: `No se pudo crear el perfil: ${insertError.message}`,
        }));
        return;
      }

      // Re-read the newly created profile
      const { data: newProfile, error: reReadError } = await supabase
        .from("app_user")
        .select("tenant_id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (reReadError || !newProfile) {
        setState((current) => ({
          ...current,
          loading: false,
          userId: user.id,
          email: user.email ?? null,
          tenantId: DEFAULT_TENANT_ID,
          role: "admin",
          error: null,
        }));
        return;
      }

      setState({
        loading: false,
        configured: true,
        userId: user.id,
        email: user.email ?? null,
        tenantId: newProfile.tenant_id,
        role: newProfile.role as "admin" | "cashier",
        error: null,
      });
      return;
    }

    setState({
      loading: false,
      configured: true,
      userId: user.id,
      email: user.email ?? null,
      tenantId: profile.tenant_id,
      role: profile.role as "admin" | "cashier",
      error: null,
    });
  }, []);

  useEffect(() => {
    void loadProfile();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      void loadProfile();
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: "Supabase no configurado" };
      setState((current) => ({ ...current, loading: true, error: null }));
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setState((current) => ({ ...current, loading: false, error: error.message }));
        return { ok: false, error: error.message };
      }
      await loadProfile();
      return { ok: true };
    },
    [loadProfile]
  );

  const signInAnonymously = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setState((current) => ({ ...current, error: error.message }));
      return;
    }
    await loadProfile();
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    await loadProfile();
  }, [loadProfile]);

  return { ...state, reload: loadProfile, signInAnonymously, signInWithPassword, signOut };
}
