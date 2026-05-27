"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { admin, type AdminStats, type AdminTierBreakdown } from "@/lib/api";
import { notify } from "@/lib/toast";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const OverviewTab = dynamic(
  () => import("../_tabs/OverviewTab").then((m) => ({ default: m.OverviewTab })),
  { loading: () => <AdminTabLoader /> }
);

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [breakdown, setBreakdown] = useState<AdminTierBreakdown | null>(null);

  useEffect(() => {
    if (!token) return;
    admin
      .stats(token)
      .then(setStats)
      .catch((e) => notify.error(e instanceof Error ? e.message : "Failed to load stats"));
    admin
      .subscriptions(token, { per_page: 1 })
      .then((r) => setBreakdown(r.breakdown))
      .catch(() => setBreakdown(null));
  }, [token]);

  if (!token) return null;

  return <OverviewTab token={token} stats={stats} breakdown={breakdown} />;
}
