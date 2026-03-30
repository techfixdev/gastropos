"use client";

import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/modules/core/supabase/client";

type AuthState = {
  loading: boolean;
  configured: boolean;
  userId: string | null;
  tenantId: string | null;
  role: "admin" | "cashier" | null;
  error: string | null;
};

const initialState: AuthState = {
  loading: true,
  configured: isSupabaseConfigured,
  userId: null,
  tenantId: null,
  role: null,
  error: null,
};

export function useAuthSession() {
  const [state, setState] = useState<AuthState>(initialState);

  const loadProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setState({
        loading: false,
        configured: false,
        userId: null,
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
        tenantId: null,
        role: null,
        error: profileError.message,
      }));
      return;
    }

    setState({
      loading: false,
      configured: true,
      userId: user.id,
      tenantId: profile?.tenant_id ?? null,
      role: (profile?.role as "admin" | "cashier" | null) ?? null,
      error: null,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      void loadProfile();
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [loadProfile]);

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

  return { ...state, reload: loadProfile, signInAnonymously, signOut };
}
