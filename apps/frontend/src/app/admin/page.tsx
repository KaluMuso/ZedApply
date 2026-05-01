"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { admin, type AdminStats, type AdminJob, type AdminUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

type Tab = "overview" | "jobs" | "users" | "matches" | "pricing" | "post-job";

export default function AdminPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Jobs state
  const [jobsList, setJobsList] = useState<AdminJob[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsSearch, setJobsSearch] = useState("");
  const [jobsLoading, setJobsLoading] = useState(false);

  // Users state
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  // Post job form
  const [jobForm, setJobForm] = useState({
    title: "",
    company: "",
    location: "",
    description: "",
    closing_date: "",
    skills: "",
  });
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !token) {
      router.push("/auth");
      return;
    }
    loadStats();
  }, [token, isAuthenticated, authLoading]);

  const loadStats = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await admin.stats(token);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats. You may not have admin access.");
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = useCallback(async () => {
    if (!token) return;
    setJobsLoading(true);
    try {
      const data = await admin.jobs(token, { page: jobsPage, per_page: 20, search: jobsSearch || undefined });
      setJobsList(data.jobs);
      setJobsTotal(data.total);
    } catch {
      /* handled by stats error */
    } finally {
      setJobsLoading(false);
    }
  }, [token, jobsPage, jobsSearch]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    try {
      const data = await admin.users(token, { page: usersPage, search: usersSearch || undefined });
      setUsersList(data.users);
      setUsersTotal(data.total);
    } catch {
      /* handled */
    } finally {
      setUsersLoading(false);
    }
  }, [token, usersPage, usersSearch]);

  useEffect(() => {
    if (activeTab === "jobs") loadJobs();
  }, [activeTab, loadJobs]);

  useEffect(() => {
    if (activeTab === "users") loadUsers();
  }, [activeTab, loadUsers]);

  const toggleJob = async (jobId: string, currentlyActive: boolean) => {
    if (!token) return;
    try {
      await admin.updateJob(token, jobId, { is_active: !currentlyActive });
      loadJobs();
    } catch {
      /* ignore */
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setPosting(true);
    setPostMsg("");
    try {
      const skills = jobForm.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const result = await admin.createJob(token, {
        title: jobForm.title,
        company: jobForm.company || undefined,
        location: jobForm.location || undefined,
        description: jobForm.description || undefined,
        closing_date: jobForm.closing_date || undefined,
        skills,
        source: "manual",
      });
      setPostMsg(result.message);
      setJobForm({ title: "", company: "", location: "", description: "", closing_date: "", skills: "" });
      loadStats();
    } catch (err) {
      setPostMsg(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setPosting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="skeleton h-10 w-64 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-20 text-center">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ background: "var(--danger-bg, #fef2f2)", color: "var(--danger)" }}
        >
          <Icon name="x" size={24} />
        </div>
        <h2 className="font-display text-2xl mb-2">Access Denied</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {error}
        </p>
        <Link href="/" className="btn btn-ghost btn-sm mt-6">
          <Icon name="arrowLeft" size={14} /> Back to Home
        </Link>
      </div>
    );
  }

  if (!stats) return null;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "target" },
    { key: "jobs", label: "Jobs", icon: "briefcase" },
    { key: "post-job", label: "Post Job", icon: "edit" },
    { key: "users", label: "Users", icon: "user" },
    { key: "matches", label: "Matches", icon: "target" },
    { key: "pricing", label: "Pricing", icon: "star" },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 fade-up">
        <div>
          <div className="eyebrow">Admin Dashboard</div>
          <h1
            className="font-display text-3xl md:text-4xl mt-1"
            style={{ letterSpacing: "-0.02em" }}
          >
            Zed CV Control Panel
          </h1>
        </div>
        <button onClick={loadStats} className="btn btn-ghost btn-sm">
          <Icon name="settings" size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-8 overflow-x-auto scroll-thin pb-1"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 pb-3 px-3 text-sm font-medium relative whitespace-nowrap transition-colors"
            style={{
              color: activeTab === tab.key ? "var(--ink)" : "var(--muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Icon name={tab.icon} size={14} />
            {tab.label}
            {activeTab === tab.key && (
              <span
                className="absolute left-0 right-0 bottom-0 h-0.5 rounded-full"
                style={{ background: "var(--copper-500)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && (
        <div className="space-y-8 fade-up">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: stats.total_users, icon: "user", color: "var(--green-500)" },
              { label: "Active Jobs", value: stats.active_jobs, icon: "briefcase", color: "var(--copper-500)" },
              { label: "Total Matches", value: stats.total_matches, icon: "target", color: "var(--orange-500)" },
              { label: "CVs Uploaded", value: stats.total_cvs, icon: "file", color: "var(--green-400)" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="card p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `color-mix(in srgb, ${kpi.color} 15%, transparent)`, color: kpi.color }}
                  >
                    <Icon name={kpi.icon} size={16} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                    {kpi.label}
                  </span>
                </div>
                <div className="font-display text-3xl" style={{ letterSpacing: "-0.02em" }}>
                  {kpi.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Subscription breakdown */}
            <div className="card p-6">
              <div className="eyebrow mb-4">Subscriptions</div>
              <div className="space-y-3">
                {[
                  { tier: "Free", count: stats.subscriptions.free, color: "var(--muted)" },
                  { tier: "Starter (K125)", count: stats.subscriptions.starter, color: "var(--copper-500)" },
                  { tier: "Professional (K250)", count: stats.subscriptions.professional, color: "var(--green-500)" },
                ].map((sub) => (
                  <div key={sub.tier} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: sub.color }} />
                      <span className="text-sm">{sub.tier}</span>
                    </div>
                    <span className="font-mono text-sm font-medium">{sub.count}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--muted)" }}>Total revenue potential</span>
                  <span className="font-mono font-medium">
                    K{(stats.subscriptions.starter * 125 + stats.subscriptions.professional * 250).toLocaleString()}/mo
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="card p-6">
              <div className="eyebrow mb-4">Platform metrics</div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Total Jobs (all time)</div>
                  <div className="font-display text-xl">{stats.total_jobs}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>CV Generations</div>
                  <div className="font-display text-xl">{stats.total_cv_generations}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Active vs Total Jobs</div>
                  <div className="font-display text-xl">
                    {stats.active_jobs} / {stats.total_jobs}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="card p-6">
              <div className="eyebrow mb-4">Quick actions</div>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab("post-job")}
                  className="btn btn-primary w-full btn-sm"
                >
                  <Icon name="edit" size={13} /> Post New Job
                </button>
                <button
                  onClick={() => setActiveTab("jobs")}
                  className="btn btn-ghost w-full btn-sm"
                >
                  <Icon name="briefcase" size={13} /> Manage Jobs
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className="btn btn-ghost w-full btn-sm"
                >
                  <Icon name="user" size={13} /> View Users
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Jobs Tab ── */}
      {activeTab === "jobs" && (
        <div className="space-y-6 fade-up">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              className="field flex-1"
              placeholder="Search jobs by title or company..."
              value={jobsSearch}
              onChange={(e) => {
                setJobsSearch(e.target.value);
                setJobsPage(1);
              }}
            />
            <button onClick={() => setActiveTab("post-job")} className="btn btn-primary btn-sm">
              <Icon name="edit" size={13} /> New Job
            </button>
          </div>

          {jobsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                {jobsTotal} job{jobsTotal !== 1 ? "s" : ""} found
              </div>
              <div className="space-y-2">
                {jobsList.map((job) => (
                  <div
                    key={job.id}
                    className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{job.title}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {job.company || "—"} · {job.location || "—"} · {job.source || "scraped"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`tag text-xs ${job.is_active ? "tag-green" : ""}`}
                        style={!job.is_active ? { background: "var(--bg-2)", color: "var(--muted)" } : {}}
                      >
                        {job.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className="tag tag-mono text-xs">{job.quality_score}</span>
                      <button
                        onClick={() => toggleJob(job.id, job.is_active)}
                        className="btn btn-ghost btn-sm"
                        title={job.is_active ? "Deactivate" : "Activate"}
                      >
                        <Icon name={job.is_active ? "x" : "check"} size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {jobsTotal > 20 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={jobsPage <= 1}
                    onClick={() => setJobsPage((p) => p - 1)}
                  >
                    <Icon name="arrowLeft" size={12} /> Prev
                  </button>
                  <span className="text-sm font-mono" style={{ color: "var(--muted)" }}>
                    Page {jobsPage}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={jobsList.length < 20}
                    onClick={() => setJobsPage((p) => p + 1)}
                  >
                    Next <Icon name="arrowRight" size={12} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Post Job Tab ── */}
      {activeTab === "post-job" && (
        <div className="max-w-2xl fade-up">
          <div className="card p-6">
            <div className="eyebrow mb-2">Post a New Job</div>
            <h3 className="font-display text-xl mb-1" style={{ letterSpacing: "-0.01em" }}>
              Manual Job Posting
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              Create a new job listing manually. It will immediately appear in the jobs board and be available for matching.
            </p>

            <form onSubmit={handlePostJob} className="space-y-4">
              <div>
                <label className="eyebrow mb-1.5 block">Job Title *</label>
                <input
                  type="text"
                  className="field"
                  placeholder="e.g. Senior Accountant"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="eyebrow mb-1.5 block">Company</label>
                  <input
                    type="text"
                    className="field"
                    placeholder="e.g. ZANACO"
                    value={jobForm.company}
                    onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                  />
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">Location</label>
                  <input
                    type="text"
                    className="field"
                    placeholder="e.g. Lusaka"
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Description</label>
                <textarea
                  className="field"
                  rows={5}
                  placeholder="Full job description, requirements, and responsibilities..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  style={{ resize: "vertical", minHeight: 120 }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="eyebrow mb-1.5 block">Closing Date</label>
                  <input
                    type="date"
                    className="field"
                    value={jobForm.closing_date}
                    onChange={(e) => setJobForm({ ...jobForm, closing_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">Skills (comma separated)</label>
                  <input
                    type="text"
                    className="field"
                    placeholder="e.g. Excel, SAP, IFRS"
                    value={jobForm.skills}
                    onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={posting}>
                {posting ? (
                  <>
                    <span
                      className="spinner"
                      style={{ borderTopColor: "#faf7f2", borderColor: "rgba(255,255,255,0.3)" }}
                    />{" "}
                    Posting...
                  </>
                ) : (
                  <>
                    Post Job <Icon name="arrowRight" size={14} />
                  </>
                )}
              </button>

              {postMsg && (
                <p
                  className="text-sm text-center"
                  style={{
                    color: postMsg.includes("Failed") || postMsg.includes("exists")
                      ? "var(--danger)"
                      : "var(--success, var(--green-700))",
                  }}
                >
                  {postMsg}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── Users Tab ── */}
      {activeTab === "users" && (
        <div className="space-y-6 fade-up">
          <input
            type="text"
            className="field"
            placeholder="Search users by name, phone, or email..."
            value={usersSearch}
            onChange={(e) => {
              setUsersSearch(e.target.value);
              setUsersPage(1);
            }}
          />

          {usersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                {usersTotal} user{usersTotal !== 1 ? "s" : ""}
              </div>
              <div className="space-y-2">
                {usersList.map((u) => (
                  <div key={u.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{u.full_name || "No name"}</div>
                      <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                        {u.phone} {u.email ? `· ${u.email}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tag tag-mono text-xs">{u.subscription_tier || "free"}</span>
                      {u.role === "superadmin" && (
                        <span className="tag tag-copper text-xs">Admin</span>
                      )}
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {usersTotal > 20 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={usersPage <= 1}
                    onClick={() => setUsersPage((p) => p - 1)}
                  >
                    <Icon name="arrowLeft" size={12} /> Prev
                  </button>
                  <span className="text-sm font-mono" style={{ color: "var(--muted)" }}>
                    Page {usersPage}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={usersList.length < 20}
                    onClick={() => setUsersPage((p) => p + 1)}
                  >
                    Next <Icon name="arrowRight" size={12} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Matches Tab ── */}
      {activeTab === "matches" && (
        <div className="fade-up">
          <div className="card p-8 text-center">
            <Icon name="target" size={32} />
            <h3 className="font-display text-xl mt-4 mb-2">Match Analytics</h3>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              {stats.total_matches} total matches generated across {stats.total_users} users.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-6">
              <div className="text-center">
                <div className="font-display text-2xl" style={{ color: "var(--green-500)" }}>
                  {stats.total_matches}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Matches</div>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl" style={{ color: "var(--copper-500)" }}>
                  {stats.total_users > 0 ? Math.round(stats.total_matches / stats.total_users) : 0}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Avg/User</div>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl" style={{ color: "var(--orange-500)" }}>
                  {stats.active_jobs}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Active Jobs</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pricing Tab ── */}
      {activeTab === "pricing" && (
        <div className="space-y-6 fade-up">
          <div className="card p-6">
            <div className="eyebrow mb-4">Pricing Tiers</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  tier: "Free",
                  price: "K0",
                  count: stats.subscriptions.free,
                  features: ["5 job matches/month", "1 CV generation", "Basic skills extraction"],
                  color: "var(--muted)",
                },
                {
                  tier: "Starter",
                  price: "K125/mo",
                  count: stats.subscriptions.starter,
                  features: ["25 job matches/month", "5 CV generations/month", "WhatsApp alerts", "Priority matching"],
                  color: "var(--copper-500)",
                },
                {
                  tier: "Professional",
                  price: "K250/mo",
                  count: stats.subscriptions.professional,
                  features: ["Unlimited matches", "Unlimited CV generations", "WhatsApp alerts", "Cover letters", "Priority support"],
                  color: "var(--green-500)",
                },
              ].map((plan) => (
                <div
                  key={plan.tier}
                  className="p-5 rounded-xl"
                  style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display text-lg">{plan.tier}</span>
                    <span
                      className="font-mono text-sm font-medium px-2 py-0.5 rounded-full"
                      style={{ background: `color-mix(in srgb, ${plan.color} 15%, transparent)`, color: plan.color }}
                    >
                      {plan.count} users
                    </span>
                  </div>
                  <div className="font-display text-2xl mb-3" style={{ color: plan.color }}>
                    {plan.price}
                  </div>
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="text-xs flex items-center gap-2" style={{ color: "var(--ink-2)" }}>
                        <Icon name="check" size={10} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="eyebrow mb-3">Revenue Summary</div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Monthly Recurring Revenue</div>
                <div className="font-display text-3xl" style={{ color: "var(--green-500)" }}>
                  K{(stats.subscriptions.starter * 125 + stats.subscriptions.professional * 250).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Paying Customers</div>
                <div className="font-display text-3xl" style={{ color: "var(--copper-500)" }}>
                  {stats.subscriptions.starter + stats.subscriptions.professional}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
