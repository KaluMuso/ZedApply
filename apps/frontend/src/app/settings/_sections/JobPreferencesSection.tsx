"use client";

import { useEffect, useState } from "react";
import { profile as profileApi, type UserProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PreferencesTab } from "@/app/profile/_tabs/PreferencesTab";
import { SettingsSectionHeader } from "../_components/SettingsShell";

export function JobPreferencesSection() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    profileApi
      .get(token)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading preferences…</p>;
  }

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Could not load preferences.</p>;
  }

  return (
    <div>
      <SettingsSectionHeader title="Job preferences" />
      <PreferencesTab profileData={profile} />
    </div>
  );
}
