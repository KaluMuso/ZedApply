"use client";

import type { AdminStats, AdminTierBreakdown } from "@/lib/api";
import { StatCard, formatNgwee } from "./shared";

export function OverviewTab({
  stats,
  breakdown,
}: {
  stats: AdminStats | null;
  breakdown: AdminTierBreakdown | null;
}) {
  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Users"
          value={stats ? stats.users_total.toLocaleString() : "—"}
          hint={stats ? `${stats.users_active_30d} active in 30d` : undefined}
        />
        <StatCard
          label="Active subs"
          value={stats ? stats.subscriptions_active.toLocaleString() : "—"}
          hint={stats ? `${stats.subscriptions_paid} paying` : undefined}
        />
        <StatCard
          label="Jobs in DB"
          value={stats ? stats.jobs_active.toLocaleString() : "—"}
          hint={stats ? `${stats.jobs_expired} expired & still active` : undefined}
        />
        <StatCard
          label="Matches (24h)"
          value={stats ? stats.matches_24h.toLocaleString() : "—"}
          hint={stats ? `${stats.matches_total.toLocaleString()} all time` : undefined}
        />
      </div>

      {stats && (
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <StatCard
            label="Revenue (30d)"
            value={formatNgwee(stats.revenue_ngwee_30d)}
          />
          <StatCard
            label="Revenue (lifetime)"
            value={formatNgwee(stats.revenue_ngwee_total)}
          />
        </div>
      )}

      {breakdown && (
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Free"
            value={breakdown.free.toLocaleString()}
            hint={`${Math.round(
              (breakdown.free / Math.max(breakdown.total_active, 1)) * 100
            )}% of active`}
          />
          <StatCard
            label="Starter"
            value={breakdown.starter.toLocaleString()}
            hint="K125/mo"
          />
          <StatCard
            label="Professional"
            value={breakdown.professional.toLocaleString()}
            hint="K250/mo"
          />
          <StatCard
            label="Super Standard"
            value={breakdown.super_standard.toLocaleString()}
            hint="K500/mo · unlimited"
          />
        </div>
      )}
    </div>
  );
}
