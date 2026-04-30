"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { profile as profileApi } from "@/lib/api";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated || !token) {
      router.replace("/auth?next=/admin");
      return;
    }
    profileApi
      .get(token)
      .then((p) => {
        if (p.role === "superadmin" || p.role === "admin") {
          setOk(true);
        } else {
          router.replace("/");
        }
      })
      .catch(() => {
        router.replace("/");
      });
  }, [authLoading, isAuthenticated, token, router]);

  if (authLoading || !ok) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-sm text-muted-foreground">Checking access…</div>
    );
  }
  return <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">{children}</div>;
}
