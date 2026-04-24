"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  clearAccessToken,
  getStoredAccessToken,
  profile as profileApi,
  setAccessToken,
  subscription as subscriptionApi,
  cv as cvApi,
  type UserProfile,
  type UserProfileUpdate,
  type Subscription,
  type CVUploadResponse,
} from "@/lib/api";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: UserProfile; subscription: Subscription };

function looksLikeAuthFailure(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("not authenticated") ||
    m.includes("credentials") ||
    m.includes("could not validate") ||
    m.includes("invalid token")
  );
}

function tierLabel(tier: UserProfile["subscription_tier"]) {
  switch (tier) {
    case "mwana":
      return "Mwana (Free)";
    case "mwezi":
      return "Mwezi";
    case "bwino":
      return "Bwino";
    default:
      return tier;
  }
}

function SkillTag({ skill }: { skill: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20">
      {skill}
    </span>
  );
}

export default function ProfilePage() {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [tokenInput, setTokenInput] = useState("");
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [uploadState, setUploadState] = useState<
    | { status: "idle" }
    | { status: "uploading" }
    | { status: "error"; message: string }
    | { status: "success"; data: CVUploadResponse }
  >({ status: "idle" });

  const [edit, setEdit] = useState<UserProfileUpdate>({});

  const isReady = state.status === "ready";

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!getStoredAccessToken()) {
        setState({
          status: "error",
          message: "You are not signed in. Use WhatsApp OTP sign-in first.",
        });
        return;
      }
      setState({ status: "loading" });
      try {
        const [p, s] = await Promise.all([
          profileApi.get(),
          subscriptionApi.get(),
        ]);
        if (cancelled) return;
        setEdit({
          full_name: p.full_name ?? undefined,
          email: p.email ?? undefined,
          location: p.location ?? undefined,
          years_experience: p.years_experience,
        });
        setParsedSkills(p.skills ?? []);
        setState({ status: "ready", profile: p, subscription: s });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load profile";
        if (cancelled) return;
        setState({ status: "error", message });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSaveProfile() {
    if (state.status !== "ready") return;
    setState({ status: "loading" });
    try {
      const updated = await profileApi.update(edit);
      const s = await subscriptionApi.get();
      setState({ status: "ready", profile: updated, subscription: s });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update profile";
      setState({ status: "error", message });
    }
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    setUploadState({ status: "uploading" });
    try {
      const data = await cvApi.upload(file);
      setUploadState({ status: "success", data });
      setParsedSkills(data.parsed_skills);

      if (state.status === "ready") {
        const p = await profileApi.get();
        const s = await subscriptionApi.get();
        setState({ status: "ready", profile: p, subscription: s });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setUploadState({ status: "error", message });
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your CV, skills, and subscription details.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pricing"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            View pricing
          </Link>
          <Link href="/" className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900">
            Home
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Authentication</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Paste a JWT access token from OTP verification. It is stored in <code className="font-mono">localStorage</code>.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="eyJhbGciOi..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="button"
            onClick={() => {
              setAccessToken(tokenInput.trim());
              window.location.reload();
            }}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Save token
          </button>
          <button
            type="button"
            onClick={() => {
              clearAccessToken();
              window.location.reload();
            }}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Clear
          </button>
        </div>
      </section>

      {state.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          <p>{state.message}</p>
          {!getStoredAccessToken() || looksLikeAuthFailure(state.message) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/login"
                className="inline-flex rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Sign in
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearAccessToken();
                  window.location.reload();
                }}
                className="inline-flex rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-900 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-50 dark:hover:bg-red-950/50"
              >
                Clear saved token
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {state.status === "loading" ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          Loading profile…
        </div>
      ) : null}

      {isReady ? (
        <>
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Account</h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Name</dt>
                <dd className="font-medium">{state.profile.full_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Phone</dt>
                <dd className="font-medium">{state.profile.phone}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Location</dt>
                <dd className="font-medium">{state.profile.location ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Experience</dt>
                <dd className="font-medium">{state.profile.years_experience} years</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500 dark:text-zinc-400">Subscription tier</dt>
                <dd className="font-medium">{tierLabel(state.profile.subscription_tier)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Subscription</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Status from <code className="font-mono">/subscription</code>.
                </p>
              </div>
              <Link href="/pricing" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300">
                Upgrade
              </Link>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Plan</dt>
                <dd className="font-medium">{tierLabel(state.subscription.tier)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
                <dd className="font-medium">{state.subscription.status}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Matches used</dt>
                <dd className="font-medium">
                  {state.subscription.matches_used} / {state.subscription.matches_limit}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Current period</dt>
                <dd className="font-medium text-xs sm:text-sm">
                  {state.subscription.current_period_start}
                  {state.subscription.current_period_end
                    ? ` → ${state.subscription.current_period_end}`
                    : ""}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">CV upload</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Drag and drop a PDF/DOCX/image, or click to choose a file. Calls <code className="font-mono">POST /cv/upload</code>.
            </p>

            <label
              className={[
                "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center text-sm transition-colors",
                isDragging
                  ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:bg-zinc-900",
              ].join(" ")}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0] ?? null;
                void onPickFile(file);
              }}
            >
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
                onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              />
              <div className="font-medium">Drop your CV here</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Max 5MB (enforced by API)</div>
            </label>

            {uploadState.status === "uploading" ? (
              <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">Uploading…</p>
            ) : null}
            {uploadState.status === "error" ? (
              <p className="mt-3 text-sm text-red-700 dark:text-red-300">{uploadState.message}</p>
            ) : null}
            {uploadState.status === "success" ? (
              <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">Upload complete</div>
                <div className="mt-1 text-xs">
                  Parsing confidence: {(uploadState.data.parsing_confidence * 100).toFixed(0)}%
                </div>
                {uploadState.data.experience_summary ? (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{uploadState.data.experience_summary}</p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Parsed skills</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Skills come from your latest CV parse and your saved profile skills.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {parsedSkills.length ? (
                parsedSkills.map((s) => <SkillTag key={s} skill={s} />)
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No skills yet. Upload a CV to populate tags.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Edit profile</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Updates via <code className="font-mono">PATCH /profile</code>.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <div className="mb-1 text-zinc-600 dark:text-zinc-400">Full name</div>
                <input
                  value={edit.full_name ?? ""}
                  onChange={(e) => setEdit((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-zinc-600 dark:text-zinc-400">Email</div>
                <input
                  value={edit.email ?? ""}
                  onChange={(e) => setEdit((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <div className="mb-1 text-zinc-600 dark:text-zinc-400">Location</div>
                <input
                  value={edit.location ?? ""}
                  onChange={(e) => setEdit((p) => ({ ...p, location: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <div className="mb-1 text-zinc-600 dark:text-zinc-400">Years of experience</div>
                <input
                  type="number"
                  min={0}
                  value={edit.years_experience ?? 0}
                  onChange={(e) =>
                    setEdit((p) => ({ ...p, years_experience: Number.parseInt(e.target.value || "0", 10) }))
                  }
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void onSaveProfile()}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Save changes
              </button>
            </div>
          </section>
        </>
      ) : null}

    </main>
  );
}
