"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { profile as profileApi, cv as cvApi, subscription as subApi, type UserProfile, type Subscription, type UserSkill, type SkillProficiency } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ZAMBIAN_CITIES, TIER_INFO } from "@/lib/constants";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Trash2, Plus } from "lucide-react";
import { useAppStore } from "@/lib/zustand-store";

function initials(phone: string, name: string | null) {
  if (name && name.trim()) {
    const p = name.trim().split(/\s+/);
    return p.length >= 2
      ? (p[0]![0]! + p[1]![0]!).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return phone.replace(/\D/g, "").slice(-2) || "U";
}

export default function ProfilePage() {
  const router = useRouter();
  const { setProfile: setZust } = useAppStore();
  const { token, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", location: "", years: 0 });
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [drag, setDrag] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delLoading, setDelLoading] = useState(false);
  const [delConfirm, setDelConfirm] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProf, setNewSkillProf] = useState<SkillProficiency>("intermediate");
  const [skillBusy, setSkillBusy] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated || !token) {
      router.push("/auth");
      return;
    }
    Promise.all([profileApi.get(token), subApi.get(token)])
      .then(([p, s]) => {
        setError(null);
        setProfile(p);
        setZust(p);
        setSub(s);
        setForm({
          full_name: p.full_name || "",
          email: p.email || "",
          location: p.location || "",
          years: p.years_experience || 0,
        });
      })
      .catch((err) => {
        setProfile(null);
        setError(err instanceof Error ? err.message : "Failed to load profile. Please try again.");
      })
      .finally(() => setLoading(false));

    profileApi
      .getSkills(token)
      .then((r) => setSkills(r.skills))
      .catch(() => setSkills([]))
      .finally(() => setSkillsLoading(false));
  }, [token, isAuthenticated, authLoading, router, setZust]);

  const addSkill = async () => {
    if (!token) {
      return;
    }
    const name = newSkillName.trim();
    if (!name) {
      return;
    }
    setSkillBusy("__add__");
    try {
      const r = await profileApi.addSkill(token, { name, proficiency: newSkillProf });
      setSkills(r.skills);
      setNewSkillName("");
      setNewSkillProf("intermediate");
      toast.success(`Added "${name}".`);
      const fresh = await profileApi.get(token);
      setProfile(fresh);
      setZust(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add skill");
    } finally {
      setSkillBusy(null);
    }
  };

  const changeProficiency = async (name: string, p: SkillProficiency) => {
    if (!token) {
      return;
    }
    setSkillBusy(name);
    try {
      const r = await profileApi.updateSkill(token, name, p);
      setSkills(r.skills);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setSkillBusy(null);
    }
  };

  const removeSkill = async (name: string) => {
    if (!token) {
      return;
    }
    setSkillBusy(name);
    try {
      const r = await profileApi.removeSkill(token, name);
      setSkills(r.skills);
      const fresh = await profileApi.get(token);
      setProfile(fresh);
      setZust(fresh);
      toast.success(`Removed "${name}".`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setSkillBusy(null);
    }
  };

  const save = async () => {
    if (!token) {
      return;
    }
    setSaving(true);
    try {
      const u = await profileApi.update(token, {
        full_name: form.full_name || null,
        email: form.email || null,
        location: form.location || null,
        years_experience: form.years,
      });
      setProfile(u);
      setZust(u);
      toast.success("Profile updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const onUpload = useCallback(
    async (file: File) => {
      if (!token) {
        return;
      }
      const v = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
      ];
      if (!v.includes(file.type)) {
        setUploadMsg("Please use PDF, Word, or a clear image.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadMsg("File must be under 5MB.");
        return;
      }
      setUploading(true);
      setUploadMsg("");
      try {
        const r = await cvApi.upload(token, file);
        setUploadMsg(`Upload ok — ${r.skills_extracted.length} skills read.`);
        const [u, sk] = await Promise.all([
          profileApi.get(token),
          profileApi.getSkills(token),
        ]);
        setProfile(u);
        setZust(u);
        setSkills(sk.skills);
        toast.success("CV processed.");
      } catch (e) {
        setUploadMsg(e instanceof Error ? e.message : "Upload failed");
        toast.error("Upload failed. Try a smaller file.");
      } finally {
        setUploading(false);
      }
    },
    [token, setZust]
  );

  if (authLoading || loading) {
    return <p className="text-sm text-muted-foreground py-8">Loading profile…</p>;
  }
  if (!profile) {
    return (
      <div className="text-center py-8 bg-red-50 rounded-xl border border-red-200">
        <p className="text-red-600 text-sm">{error || "Could not load profile. Try signing in again."}</p>
        <button
          onClick={() => router.refresh()}
          className="mt-2 text-sm text-brand-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const tkey = (profile.subscription_tier || "free") as keyof typeof TIER_INFO;
  const tinfo = TIER_INFO[tkey] || TIER_INFO.free;
  const usePct = sub
    ? Math.min(100, (sub.matches_used / Math.max(1, sub.matches_limit)) * 100)
    : 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center mb-6 p-4 rounded-2xl border border-border/80 bg-card/40">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
            {initials(profile.phone, profile.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold truncate">
            {profile.full_name || "Add your name"}
          </h1>
          <p className="text-sm text-muted-foreground">{profile.phone}</p>
          <p className="text-sm mt-0.5">
            Plan: <span className="font-medium text-primary">{tinfo.name}</span> &mdash; {tinfo.bemba}
          </p>
        </div>
        <a href="/pricing" className="text-sm text-primary min-h-11 items-center sm:inline-flex underline">
          Upgrade
        </a>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="w-full sm:w-auto min-h-11 h-auto flex-wrap sm:flex-nowrap p-1">
          <TabsTrigger className="min-h-9" value="personal">Info</TabsTrigger>
          <TabsTrigger className="min-h-9" value="cv">CV & skills</TabsTrigger>
          <TabsTrigger className="min-h-9" value="sub">Plan</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal</CardTitle>
              <CardDescription>We only use this to make matches and emails better.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-w-md">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Name</p>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="h-10 min-h-10"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <Input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">City or town</p>
                <select
                  className="h-10 w-full min-h-10 rounded-md border border-input bg-background px-3"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                >
                  <option value="">Select</option>
                  {ZAMBIAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Years of experience (approx.)</p>
                <Input
                  type="number"
                  min={0}
                  className="h-10 w-32"
                  value={form.years}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, years: Math.max(0, parseInt(e.target.value, 10) || 0) }));
                  }}
                />
              </div>
              <Button
                className="min-h-10"
                type="button"
                onClick={save}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4" value="cv">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Your CV</CardTitle>
              <CardDescription>Re-uploading replaces skills we can see from the document.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onUpload(f); }}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                onClick={() => fileRef.current?.click()}
                className={[
                  "cursor-pointer min-h-44 border-2 border-dashed rounded-xl p-6 text-center",
                  drag ? "border-primary bg-primary/5" : "border-border",
                ].join(" ")}
                role="button"
                tabIndex={0}
                aria-label="Drop zone for CV"
              >
                <input
                  type="file"
                  ref={fileRef}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                  className="hidden"
                />
                {uploading ? <Loader2 className="h-6 w-6 mx-auto animate-spin" /> : <p>Drag a file or tap to browse</p>}
                <p className="text-xs text-muted-foreground mt-2">Max 5MB. PDF, Word, or image.</p>
                {uploadMsg && <p className="text-sm mt-2" role="status">{uploadMsg}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Your skills</CardTitle>
              <CardDescription>
                Add anything we missed and set how strong you are. We use proficiency in matching and cover letters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="flex flex-col gap-2 sm:flex-row sm:items-end"
                onSubmit={(e) => { e.preventDefault(); addSkill(); }}
              >
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block" htmlFor="new-skill-name">
                    Skill
                  </label>
                  <Input
                    id="new-skill-name"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="e.g. Customer support"
                    className="h-10"
                    maxLength={100}
                    disabled={skillBusy === "__add__"}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block" htmlFor="new-skill-prof">
                    Level
                  </label>
                  <select
                    id="new-skill-prof"
                    className="h-10 min-h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newSkillProf}
                    onChange={(e) => setNewSkillProf(e.target.value as SkillProficiency)}
                    disabled={skillBusy === "__add__"}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  className="min-h-10"
                  disabled={!newSkillName.trim() || skillBusy === "__add__"}
                >
                  {skillBusy === "__add__" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </>
                  )}
                </Button>
              </form>

              {skillsLoading ? (
                <p className="text-sm text-muted-foreground">Loading your skills…</p>
              ) : skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No skills yet. Upload a CV above or add them by hand.
                </p>
              ) : (
                <ul className="divide-y divide-border/60 rounded-md border border-border/60">
                  {skills.map((s) => {
                    const busy = skillBusy === s.name;
                    return (
                      <li
                        key={s.name}
                        className="flex flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap"
                      >
                        <span className="flex-1 min-w-0 text-sm font-medium text-foreground capitalize truncate">
                          {s.name}
                        </span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {s.source === "cv_parse" ? "from CV" : s.source === "manual" ? "added" : s.source}
                        </span>
                        <select
                          className="h-9 min-h-9 rounded-md border border-input bg-background px-2 text-xs"
                          value={s.proficiency}
                          onChange={(e) => changeProficiency(s.name, e.target.value as SkillProficiency)}
                          disabled={busy}
                          aria-label={`Proficiency for ${s.name}`}
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="expert">Expert</option>
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-9 min-w-9 h-9 w-9 p-0"
                          onClick={() => removeSkill(s.name)}
                          disabled={busy}
                          aria-label={`Remove ${s.name}`}
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4" value="sub">
          <Card>
            <CardHeader>
              <CardTitle>Your usage</CardTitle>
              {sub && (
                <p className="text-sm text-muted-foreground">
                  {sub.matches_used} / {sub.matches_limit} matches
                </p>
              )}
            </CardHeader>
            <CardContent>
              {sub && (
                <div className="mb-2">
                  <Progress className="h-2" value={usePct} />
                </div>
              )}
              <a href="/pricing" className="text-primary text-sm min-h-11 inline-flex items-center mt-2 underline w-fit">
                See plans &rarr;
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-10 p-4 rounded-xl border border-destructive/30">
        <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently remove your account, CV, matches, and subscription history. This cannot be undone.
        </p>
        <Button
          className="mt-2"
          type="button"
          variant="destructive"
          onClick={() => setDelOpen(true)}
        >
          Delete account
        </Button>
        <Dialog
          open={delOpen}
          onOpenChange={(o) => {
            setDelOpen(o);
            if (!o) {
              setDelConfirm("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This removes your profile, CV, skills, matches, subscription, and payment history. Type{" "}
                <span className="font-mono font-semibold">DELETE</span> below to confirm.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={delConfirm}
              onChange={(e) => setDelConfirm(e.target.value)}
              placeholder="DELETE"
              className="h-10"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDelOpen(false)} disabled={delLoading}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={delConfirm !== "DELETE" || delLoading}
                onClick={async () => {
                  if (!token) {
                    return;
                  }
                  setDelLoading(true);
                  try {
                    await profileApi.remove(token);
                    toast.success("Account deleted. Goodbye for now.");
                    setDelOpen(false);
                    logout();
                    setZust(null);
                    router.push("/");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not delete");
                  } finally {
                    setDelLoading(false);
                  }
                }}
              >
                {delLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete forever"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
