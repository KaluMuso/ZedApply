"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { profile as profileApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DataPrivacyCard } from "@/app/profile/_tabs/DataPrivacyCard";
import { SettingsCard, SettingsSectionHeader } from "../_components/SettingsShell";

/** Export + policy links. Account deletion lives under Danger zone. */
export function PrivacySection() {
  const { token } = useAuth();
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    profileApi.get(token).then((p) => setPhone(p.phone)).catch(() => setPhone(null));
  }, [token]);

  return (
    <div>
      <SettingsSectionHeader title="Privacy & data" />

      <SettingsCard className="mb-4">
        <div className="eyebrow mb-2">Your data</div>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
          We don&apos;t sell your data. Download a copy of your profile, CVs, matches, and payment
          history under the Zambia Data Protection Act 2021.
        </p>
        {token && phone ? (
          <DataPrivacyCard token={token} phone={phone} onDeleted={() => {}} exportOnly />
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </SettingsCard>

      <SettingsCard>
        <div className="eyebrow mb-2">Policies</div>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/legal/privacy" className="underline" style={{ color: "var(--green-700)" }}>
              Privacy policy
            </Link>
          </li>
          <li>
            <Link href="/legal/terms" className="underline" style={{ color: "var(--green-700)" }}>
              Terms of service
            </Link>
          </li>
          <li>
            <Link href="/legal/cookies" className="underline" style={{ color: "var(--green-700)" }}>
              Cookie policy
            </Link>
          </li>
        </ul>
      </SettingsCard>
    </div>
  );
}
