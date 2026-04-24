import { z } from "zod";

const ACCESS_TOKEN_KEY = "zedcv_access_token";
const REFRESH_TOKEN_KEY = "zedcv_refresh_token";

let refreshInFlight: Promise<boolean> | null = null;

const UserProfileSchema = z.object({
  id: z.string().uuid(),
  phone: z.string(),
  full_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  location: z.string().nullable().optional(),
  years_experience: z.number().int().nonnegative(),
  skills: z.array(z.string()),
  subscription_tier: z.enum(["mwana", "mwezi", "bwino"]),
  created_at: z.string(),
});

const UserProfileUpdateSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().email().optional(),
  location: z.string().optional(),
  years_experience: z.number().int().nonnegative().optional(),
});

const CVUploadResponseSchema = z.object({
  cv_id: z.string().uuid(),
  parsed_skills: z.array(z.string()),
  experience_summary: z.string(),
  parsing_confidence: z.number(),
});

const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  tier: z.enum(["mwana", "mwezi", "bwino"]),
  status: z.enum(["active", "expired", "cancelled", "past_due"]),
  current_period_start: z.string(),
  current_period_end: z.string().nullable().optional(),
  matches_used: z.number().int().nonnegative(),
  matches_limit: z.number().int().nonnegative(),
});

const JobSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  company: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  description: z.string(),
  requirements: z.array(z.string()),
  skills_required: z.array(z.string()),
  salary_min: z.number().nullable().optional(),
  salary_max: z.number().nullable().optional(),
  apply_url: z.string().nullable().optional(),
  apply_email: z.string().nullable().optional(),
  source: z.string(),
  quality_score: z.number().int(),
  closing_date: z.string().nullable().optional(),
  posted_at: z.string(),
  is_active: z.boolean(),
});

const JobListSchema = z.object({
  jobs: z.array(JobSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  per_page: z.number().int().positive(),
});

const OTPRequestResponseSchema = z.object({
  message: z.string(),
});

const AuthTokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user_id: z.string().uuid(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
export type CVUploadResponse = z.infer<typeof CVUploadResponseSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type Job = z.infer<typeof JobSchema>;
export type JobList = z.infer<typeof JobListSchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  return base.replace(/\/$/, "");
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Returns the JWT stored for API calls, or null if missing. */
export function getStoredAccessToken(): string | null {
  return getAccessToken();
}

/** Manual access-token only (e.g. pasted dev token). Clears refresh so stale refresh is not used. */
export function setAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function tryRefreshTokens(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return false;
    }
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const rawBody = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
      if (!response.ok) {
        return false;
      }
      const tokens = AuthTokensSchema.parse(rawBody);
      setAuthTokens(tokens.access_token, tokens.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function apiFetch(
  path: string,
  init: RequestInit,
  options: { auth?: boolean; skipRefresh?: boolean } = {},
): Promise<unknown> {
  const useAuth = options.auth !== false;
  const skipRefresh = options.skipRefresh === true;
  const token = useAuth ? getAccessToken() : null;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && useAuth) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (
      response.status === 401 &&
      useAuth &&
      !skipRefresh &&
      getRefreshToken() &&
      path !== "/auth/refresh"
    ) {
      const refreshed = await tryRefreshTokens();
      if (refreshed) {
        return apiFetch(path, init, { ...options, skipRefresh: true });
      }
      clearAccessToken();
    }
    const message =
      typeof rawBody === "object" && rawBody !== null && "detail" in rawBody
        ? String((rawBody as { detail?: unknown }).detail)
        : typeof rawBody === "string"
          ? rawBody
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return rawBody;
}

export const auth = {
  async requestOtp(phone: string): Promise<{ message: string }> {
    const data = await apiFetch(
      "/auth/otp/request",
      { method: "POST", body: JSON.stringify({ phone }) },
      { auth: false },
    );
    return OTPRequestResponseSchema.parse(data);
  },

  async verifyOtp(phone: string, code: string): Promise<AuthTokens> {
    const data = await apiFetch(
      "/auth/otp/verify",
      { method: "POST", body: JSON.stringify({ phone, code }) },
      { auth: false },
    );
    return AuthTokensSchema.parse(data);
  },

  async refreshWithStoredToken(): Promise<AuthTokens> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token");
    }
    const data = await apiFetch(
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
      { auth: false, skipRefresh: true },
    );
    const tokens = AuthTokensSchema.parse(data);
    setAuthTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  },
};

export const profile = {
  async get(): Promise<UserProfile> {
    const data = await apiFetch("/profile", { method: "GET" });
    return UserProfileSchema.parse(data);
  },

  async update(body: UserProfileUpdate): Promise<UserProfile> {
    const data = await apiFetch("/profile", {
      method: "PATCH",
      body: JSON.stringify(UserProfileUpdateSchema.parse(body)),
    });
    return UserProfileSchema.parse(data);
  },
};

export const cv = {
  async upload(file: File): Promise<CVUploadResponse> {
    const form = new FormData();
    form.append("file", file);

    const data = await apiFetch("/cv/upload", {
      method: "POST",
      body: form,
    });
    return CVUploadResponseSchema.parse(data);
  },
};

export const subscription = {
  async get(): Promise<Subscription> {
    const data = await apiFetch("/subscription", { method: "GET" });
    return SubscriptionSchema.parse(data);
  },
};

export const jobs = {
  async list(params: {
    page?: number;
    per_page?: number;
    location?: string;
    search?: string;
  }): Promise<JobList> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.per_page) searchParams.set("per_page", String(params.per_page));
    if (params.location) searchParams.set("location", params.location);
    if (params.search) searchParams.set("search", params.search);

    const qs = searchParams.toString();
    const path = qs ? `/jobs?${qs}` : "/jobs";
    const data = await apiFetch(path, { method: "GET" });
    return JobListSchema.parse(data);
  },

  async get(jobId: string): Promise<Job> {
    const data = await apiFetch(`/jobs/${jobId}`, { method: "GET" });
    return JobSchema.parse(data);
  },
};
