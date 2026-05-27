"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { employer, type EmployerMe, type EmployerSubscription } from "@/lib/api";

export default function EmployerDashboardPage() {
  const { token } = useAuth();
  const [me, setMe] = useState<EmployerMe | null>(null);
  const [sub, setSub] = useState<EmployerSubscription | null>(null);

  useEffect(() => {
    if (!token) return;
    void Promise.all([employer.me(token), employer.subscription(token)]).then(([m, s]) => {
      setMe(m);
      setSub(s);
    });
  }, [token]);

  return (
    <div className="space-y-6">
      <p className="text-sm">
        Welcome, <strong>{me?.employer.company_name ?? "…"}</strong>
      </p>
      <div className="rounded-lg border p-4">
        <h2 className="font-medium">Subscription</h2>
        {sub?.active ? (
          <p className="text-sm text-muted-foreground mt-1">
            {sub.tier === "pro" ? "Employer Pro" : "Employer Lite"} — {sub.contacts_used}/
            {sub.contacts_limit >= 99999 ? "∞" : sub.contacts_limit} contacts used this period
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            No active plan.{" "}
            <Link href="/employer/billing" className="text-primary underline">
              Subscribe
            </Link>
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Link href="/employer/search" className="rounded-lg border px-4 py-2 text-sm font-medium">
          Search candidates
        </Link>
        <Link href="/employer/contacts" className="rounded-lg border px-4 py-2 text-sm font-medium">
          View contact log
        </Link>
      </div>
    </div>
  );
}
