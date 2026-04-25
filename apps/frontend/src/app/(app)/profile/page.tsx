"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { profile as profileApi, cv as cvApi, subscription as subApi, type UserProfile, type Subscription } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SkillBadge } from "@/components/features/SkillBadge";
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
import { Loader2 } from "lucide-react";
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
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", location: "", years: 0 });
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [drag, setDrag] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [token, isAuthenticated, authLoading, router, setZust]);

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
        const u = await profileApi.get(token);
        setProfile(u);
        setZust(u);
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
    return <p className="text-sm text-destructive py-8">Could not load your profile. Try signing in again.</p>;
  }

  const tkey = (profile.subscription_tier || "mwana") as keyof typeof TIER_INFO;
  const tinfo = TIER_INFO[tkey] || TIER_INFO.mwana;
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
              <CardTitle>Extracted skills</CardTitle>
              <CardDescription>We sync these with our skills graph after each parse.</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">Upload a CV to extract skills.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s) => (
                    <SkillBadge key={s} skill={s} matched />
                  ))}
                </div>
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
        <p className="text-sm text-muted-foreground">Remove account and local session.</p>
        <Button
          className="mt-2"
          type="button"
          variant="destructive"
          onClick={() => setDelOpen(true)}
        >
          Delete account
        </Button>
        <Dialog open={delOpen} onOpenChange={setDelOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete is coming soon on the API</DialogTitle>
              <DialogDescription>
                For now you can only sign out. Contact the team to erase PII. TODO: <code>DELETE /profile</code>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={() => setDelOpen(false)}>Back</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
