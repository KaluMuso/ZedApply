"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { employer } from "@/lib/api";

const SIZE_BANDS = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;

export default function EmployerSignupPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [sizeBand, setSizeBand] = useState<string>(SIZE_BANDS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      router.push("/auth?next=/employer/signup");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await employer.register(token, {
        company_name: companyName.trim(),
        industry: industry.trim() || undefined,
        size_band: sizeBand,
      });
      router.push("/employer/billing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Sign in with your Zed Apply account first.</p>
        <Link href="/auth?next=/employer/signup" className="text-primary font-medium">
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">Employer registration</h1>
      <p className="text-sm text-muted-foreground mt-1">Step 1 — company profile</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-medium">
          Company name
          <input
            required
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Industry
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Company size
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={sizeBand}
            onChange={(e) => setSizeBand(e.target.value)}
          >
            {SIZE_BANDS.map((b) => (
              <option key={b} value={b}>
                {b} employees
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create employer account"}
        </button>
      </form>
    </div>
  );
}
