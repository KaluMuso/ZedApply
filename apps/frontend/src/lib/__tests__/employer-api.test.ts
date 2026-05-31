import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { employer } from "../api";

const API_BASE = "http://localhost:8000/api/v1";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

describe("employer API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("register POSTs company payload to /employers/register", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        employer: {
          id: "emp-1",
          company_name: "Zed Corp",
          verified: false,
        },
      }),
    );
    const result = await employer.register("tok", {
      company_name: "Zed Corp",
      industry: "Tech",
    });
    expect(result.employer.company_name).toBe("Zed Corp");
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE}/employers/register`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      company_name: "Zed Corp",
      industry: "Tech",
    });
  });

  it("subscription GETs /employers/me/subscription with billing fields", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        tier: "pro",
        status: "active",
        active: true,
        contacts_used: 3,
        contacts_limit: 50,
        price_ngwee: 50000,
        current_period_end: "2026-06-01T00:00:00Z",
      }),
    );
    const sub = await employer.subscription("tok");
    expect(sub.tier).toBe("pro");
    expect(sub.price_ngwee).toBe(50000);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(`${API_BASE}/employers/me/subscription`);
  });

  it("checkout POSTs tier to /employers/me/subscription/checkout", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        reference: "ref-emp",
        amount_ngwee: 25000,
        tier: "lite",
        public_key: "pk_test",
        label: "Employer Lite",
      }),
    );
    const checkout = await employer.checkout("tok", "lite");
    expect(checkout.amount_ngwee).toBe(25000);
    expect(checkout.tier).toBe("lite");
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ tier: "lite" });
  });

  it("verifyPayment POSTs reference and tier", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: "completed",
        tier: "pro",
        reference: "ref-emp",
        message: "Subscription active",
      }),
    );
    const result = await employer.verifyPayment("tok", {
      reference: "ref-emp",
      tier: "pro",
    });
    expect(result.status).toBe("completed");
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      `${API_BASE}/employers/me/subscription/verify-payment`,
    );
  });

  it("search builds query string for skills and location", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ results: [], total: 0 }),
    );
    await employer.search("tok", {
      skills: "python,sql",
      location: "Lusaka",
      limit: 10,
    });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("skills=python%2Csql");
    expect(url).toContain("location=Lusaka");
    expect(url).toContain("limit=10");
  });
});
