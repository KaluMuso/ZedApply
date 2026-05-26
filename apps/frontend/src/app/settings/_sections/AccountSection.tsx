"use client";

import { useCallback, useEffect, useState } from "react";
import { profile as profileApi, type UserProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";
import { notify } from "@/lib/toast";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionHeader,
  SettingsEditLink,
  VerifiedBadge,
} from "../_components/SettingsShell";

type EditField = "full_name" | "email" | "location" | null;

export function AccountSection() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState<EditField>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    profileApi
      .get(token)
      .then(setProfile)
      .catch((e) =>
        notify.error(e instanceof Error ? e.message : "Could not load profile"),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (field: EditField, current: string) => {
    setEditField(field);
    setDraft(current);
  };

  const cancelEdit = () => {
    setEditField(null);
    setDraft("");
  };

  const saveField = async () => {
    if (!token || !editField) return;
    setSaving(true);
    try {
      const payload: {
        full_name?: string | null;
        email?: string | null;
        location?: string | null;
      } = {};
      if (editField === "full_name") {
        payload.full_name = draft.trim() || null;
      } else if (editField === "email") {
        payload.email = draft.trim() || null;
      } else if (editField === "location") {
        payload.location = draft.trim() || null;
      }
      const updated = await profileApi.update(token, payload);
      setProfile(updated);
      notify.custom.success("Saved");
      cancelEdit();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading account…</p>;
  }

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Could not load account.</p>;
  }

  return (
    <div>
      <SettingsSectionHeader
        title="Account"
        action={
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Profile & CV tools live on{" "}
            <a href="/profile" className="underline" style={{ color: "var(--green-700)" }}>
              Profile
            </a>
          </span>
        }
      />

      <SettingsCard className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b border-[var(--line)]">
          <Avatar name={profile.full_name || "User"} size={72} />
          <div>
            <div className="font-display text-2xl" style={{ letterSpacing: "-0.01em" }}>
              {profile.full_name || "Your account"}
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Manage contact details used for matches and digests.
            </p>
          </div>
        </div>

        <div className="space-y-0">
          <SettingsRow
            label="WhatsApp number"
            value={
              <span className="inline-flex items-center gap-2 font-mono">
                {profile.phone}
                <VerifiedBadge />
              </span>
            }
          />

          {editField === "full_name" ? (
            <FieldEditor
              label="Full name"
              draft={draft}
              onDraftChange={setDraft}
              onSave={() => void saveField()}
              onCancel={cancelEdit}
              saving={saving}
            />
          ) : (
            <SettingsRow
              label="Full name"
              value={profile.full_name || "Not set"}
              action={
                <SettingsEditLink
                  onClick={() => startEdit("full_name", profile.full_name ?? "")}
                />
              }
            />
          )}

          {editField === "email" ? (
            <FieldEditor
              label="Email"
              draft={draft}
              type="email"
              onDraftChange={setDraft}
              onSave={() => void saveField()}
              onCancel={cancelEdit}
              saving={saving}
            />
          ) : (
            <SettingsRow
              label="Email"
              value={profile.email || "Not set"}
              action={
                <SettingsEditLink
                  onClick={() => startEdit("email", profile.email ?? "")}
                />
              }
            />
          )}

          {editField === "location" ? (
            <FieldEditor
              label="Location"
              draft={draft}
              onDraftChange={setDraft}
              onSave={() => void saveField()}
              onCancel={cancelEdit}
              saving={saving}
            />
          ) : (
            <SettingsRow
              label="Location"
              value={profile.location || "Not set"}
              action={
                <SettingsEditLink
                  onClick={() => startEdit("location", profile.location ?? "")}
                />
              }
            />
          )}
        </div>
      </SettingsCard>
    </div>
  );
}

function FieldEditor({
  label,
  draft,
  type = "text",
  onDraftChange,
  onSave,
  onCancel,
  saving,
}: {
  label: string;
  draft: string;
  type?: string;
  onDraftChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="py-4" style={{ borderBottom: "1px solid var(--line)" }}>
      <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "var(--muted)" }}>
        {label}
      </label>
      <input
        type={type}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        className="field mb-3"
        disabled={saving}
      />
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
