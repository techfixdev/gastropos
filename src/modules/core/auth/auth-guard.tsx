"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuthSession } from "@/modules/core/auth/use-auth-session";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { userId, loading, configured } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (loading) return;
    // If not on login page and not authenticated → redirect to login
    if (!isLoginPage && configured && !userId) {
      router.replace("/login");
    }
    // If on login page and already authenticated → redirect to POS
    if (isLoginPage && userId) {
      router.replace("/pos");
    }
  }, [loading, userId, configured, isLoginPage, router]);

  // Show nothing while loading or redirecting
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500">Cargando...</p>
      </div>
    );
  }

  // Allow access to login page without auth
  if (isLoginPage) return <>{children}</>;

  // If configured but not authenticated, show nothing (redirect will happen)
  if (configured && !userId) return null;

  // Authenticated or not configured (local mode) → show children
  return <>{children}</>;
}
