"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { profile as profileApi, subscription as subscriptionApi, type Subscription, type UserProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { formatMatchesLimit } from "@/lib/tier-config";
import { TIER_NAV_LABELS } from "@/lib/tier-display";
import { SettingsCard, SettingsSectionHeader } from "../_components/SettingsShell";

function formatWelcomeEnd(iso: string | null | undefined): string {
  if (!iso) return "soon";
  try {
    return new Date(iso).toLocaleDateString("en-ZM", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "soon";
  }
}

export function BillingSection() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      profileApi.get(token),
      subscriptionApi.get(token).catch(() => null),
    ])
      .then(([p, s]) => {
        setProfile(p);
        setSub(s);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading billing…</p>;
  }

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Could not load plan.</p>;
  }

  const tier = profile.subscription_tier;
  const tierLabel = TIER_NAV_LABELS[tier] ?? tier;
  const limitLabel = sub ? formatMatchesLimit(sub.matches_limit) : "—";
  const usageLine =
    sub && sub.matches_limit < 99999
      ? `${sub.matches_used} of ${limitLabel} matches used this period`
      : sub
        ? `${sub.matches_used} matches used (unlimited plan)`
        : null;

  return (
    <div>
      <SettingsSectionHeader title="Billing" />

      <SettingsCard className="mb-4">
        <div className="eyebrow mb-2">Current plan</div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="font-display text-3xl mb-1" style={{ letterSpacing: "-0.02em" }}>
              {tierLabel}
            </div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {tier === "free"
                ? sub?.welcome_bonus_active
                  ? `${sub.matches_limit} matches/mo (welcome bonus) until ${formatWelcomeEnd(sub.welcome_match_bonus_until)}`
                  : "Free tier with monthly match allowance"
                : usageLine}
            </p>
          </div>
          {tier !== "super_standard" ? (
            <Link href="/pricing" className="btn btn-primary btn-sm shrink-0">
              Upgrade plan
              <Icon name="arrowRight" size={14} />
            </Link>
          ) : (
            <Link href="/pricing" className="btn btn-outline btn-sm shrink-0">
              View plans
            </Link>
          )}
        </div>
      </SettingsCard>

      <SettingsCard className="mb-4">
        <div className="eyebrow mb-2">Payment method</div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No payment method on file. Add one when you upgrade on the pricing page (DPO Pay or
          Lenco mobile money).
        </p>
      </SettingsCard>

      <SettingsCard>
        <div className="eyebrow mb-2">Invoices</div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No invoices yet. Receipts will appear here once billing history is enabled.
        </p>
      </SettingsCard>
    </div>
  );
}
