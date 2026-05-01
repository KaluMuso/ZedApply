/**
 * API client for Zed CV backend.
 * All requests go through this client for consistent auth + error handling.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface FetchOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || body.title || "Unknown error");
  }

  return res.json() as Promise<T>;
}

/** Helper to get stored auth token */
function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("zed_cv_token") || "";
}

// ── Auth ──
export interface OTPResponse {
  message: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user_id: string;
}

export const auth = {
  requestOTP: (phone: string) =>
    apiFetch<OTPResponse>("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  verifyOTP: (phone: string, code: string) =>
    apiFetch<AuthTokens>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),
};

// ── Profile ──
export interface UserProfile {
  id: string;
  phone: string;
  full_name: string | null;
  email: string | null;
  skills: string[];
  cv_uploaded: boolean;
  subscription_tier: string;
}

export const profile = {
  get: (token: string) => apiFetch<UserProfile>("/profile", { token }),
  update: (token: string, data: Partial<UserProfile>) =>
    apiFetch<UserProfile>("/profile", {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),
};

// ── CV ──
export interface CVUploadResult {
  id: string;
  skills_extracted: string[];
  message: string;
}

export const cv = {
  upload: async (token: string, file: File): Promise<CVUploadResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/cv/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        (body as { detail?: string }).detail || "Upload failed"
      );
    }
    return res.json() as Promise<CVUploadResult>;
  },
};

// ── CV Generation & Analysis ──
export interface CVGenerateResult {
  tailored_cv: string;
  highlights: string[];
  message: string;
}

export interface CVAnalysisResult {
  overall_score: number;
  skills_score: number;
  format_score: number;
  impact_score: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}

export const cvTools = {
  generate: (token: string, data: { job_title: string; company?: string }) =>
    apiFetch<CVGenerateResult>("/cv/generate", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),
  analyze: (token: string) =>
    apiFetch<CVAnalysisResult>("/cv/analyze", { token }),
};

// ── Admin ──
export interface AdminStats {
  total_users: number;
  total_jobs: number;
  active_jobs: number;
  total_matches: number;
  total_cvs: number;
  total_cv_generations: number;
  subscriptions: { free: number; starter: number; professional: number };
}

export interface AdminJob extends Job {
  is_active: boolean;
  source: string;
  source_url: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  phone: string;
  full_name: string | null;
  email: string | null;
  role: string;
  subscription_tier: string;
  created_at: string;
  is_active: boolean;
}

export const admin = {
  stats: (token: string) => apiFetch<AdminStats>("/admin/stats", { token }),
  jobs: (token: string, params?: { page?: number; per_page?: number; search?: string; active_only?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    if (params?.search) query.set("search", params.search);
    if (params?.active_only) query.set("active_only", "true");
    return apiFetch<{ jobs: AdminJob[]; total: number; page: number; pages: number }>(`/admin/jobs?${query}`, { token });
  },
  createJob: (token: string, data: Record<string, unknown>) =>
    apiFetch<{ id: string; message: string }>("/admin/jobs", { method: "POST", token, body: JSON.stringify(data) }),
  updateJob: (token: string, jobId: string, data: Record<string, unknown>) =>
    apiFetch<{ message: string }>(`/admin/jobs/${jobId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),
  deleteJob: (token: string, jobId: string) =>
    apiFetch<{ message: string }>(`/admin/jobs/${jobId}`, { method: "DELETE", token }),
  users: (token: string, params?: { page?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.search) query.set("search", params.search);
    return apiFetch<{ users: AdminUser[]; total: number; page: number; pages: number }>(`/admin/users?${query}`, { token });
  },
  matches: (token: string, params?: { page?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    return apiFetch<{ matches: Record<string, unknown>[]; total: number; page: number; pages: number }>(`/admin/matches?${query}`, { token });
  },
  subscriptions: (token: string) =>
    apiFetch<{ subscriptions: Record<string, unknown>[] }>("/admin/subscriptions", { token }),
  updateSubscription: (token: string, userId: string, tier: string) =>
    apiFetch<{ message: string }>(`/admin/subscriptions/${userId}?tier=${tier}`, { method: "PATCH", token }),
};

// ── Jobs ──
export interface Job {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  closing_date: string | null;
  quality_score: number;
  skills: string[];
  description: string | null;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  pages: number;
}

export const jobs = {
  list: (params?: { page?: number; search?: string; location?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.search) query.set("search", params.search);
    if (params?.location) query.set("location", params.location);
    return apiFetch<JobListResponse>(`/jobs?${query}`);
  },
  get: (jobId: string) => {
    return apiFetch<Job>(`/jobs/${jobId}`);
  },
};

// ── Matches ──
export interface MatchData {
  id: string;
  score: number;
  vector_score: number;
  skill_score: number;
  bonus_score: number;
  matched_skills: string[];
  missing_skills: string[];
  explanation: string | null;
  job: {
    id: string;
    title: string;
    company: string | null;
    location: string | null;
    closing_date: string | null;
  };
}

export interface MatchListResponse {
  matches: MatchData[];
  remaining_quota: number;
}

export const matches = {
  get: (token: string, minScore?: number) =>
    apiFetch<MatchListResponse>(
      `/matches${minScore ? `?min_score=${minScore}` : ""}`,
      { token }
    ),
  trigger: (token: string) =>
    apiFetch<{ message: string }>("/matches/trigger", {
      method: "POST",
      token,
    }),
};

// ── Subscription ──
export interface Subscription {
  tier: string;
  matches_used: number;
  matches_limit: number;
  active: boolean;
  expires_at: string | null;
}

export const subscription = {
  get: (token: string) => apiFetch<Subscription>("/subscription", { token }),
  pay: (
    token: string,
    data: { tier: string; payment_method: string; phone: string }
  ) =>
    apiFetch<{ message: string; transaction_id: string }>(
      "/subscription/pay",
      { method: "POST", token, body: JSON.stringify(data) }
    ),
};

// ── Health ──
export const health = {
  check: () => apiFetch<{ status: string }>("/health"),
};
