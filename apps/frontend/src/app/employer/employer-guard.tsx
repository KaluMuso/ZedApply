"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { employer } from "@/lib/api";
import { EmployerShell } from "./_components/EmployerShell";

export function EmployerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !token) {
      router.replace("/auth?next=/employer/dashboard");
      return;
    }
    employer
      .me(token)
      .then(() => setOk(true))
      .catch(() => router.replace("/employer/signup"));
  }, [authLoading, isAuthenticated, token, router]);

  if (authLoading || !ok) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-sm text-muted-foreground">
        Loading employer workspace…
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8">
      <EmployerShell>{children}</EmployerShell>
    </div>
  );
}
