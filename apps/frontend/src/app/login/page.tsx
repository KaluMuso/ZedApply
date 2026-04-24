"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";

import { auth, setAuthTokens } from "@/lib/api";

const PhoneSchema = z.string().regex(/^\+260[0-9]{9}$/, "Use +260 followed by 9 digits");
const CodeSchema = z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit code");

function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [status, setStatus] = useState<{ type: "idle" } | { type: "loading" } | { type: "error"; message: string }>({
    type: "idle",
  });

  async function onRequestOtp() {
    setStatus({ type: "loading" });
    try {
      PhoneSchema.parse(phone.trim());
      await auth.requestOtp(phone.trim());
      setStep("code");
      setStatus({ type: "idle" });
    } catch (e) {
      const message =
        e instanceof z.ZodError ? firstZodMessage(e) : e instanceof Error ? e.message : "Request failed";
      setStatus({ type: "error", message });
    }
  }

  async function onVerifyOtp() {
    setStatus({ type: "loading" });
    try {
      PhoneSchema.parse(phone.trim());
      CodeSchema.parse(code.trim());
      const tokens = await auth.verifyOtp(phone.trim(), code.trim());
      setAuthTokens(tokens.access_token, tokens.refresh_token);
      window.location.href = "/profile";
    } catch (e) {
      const message =
        e instanceof z.ZodError ? firstZodMessage(e) : e instanceof Error ? e.message : "Verification failed";
      setStatus({ type: "error", message });
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          WhatsApp OTP via <code className="font-mono">/auth/otp/*</code>. Zambia numbers: +260…
        </p>
      </header>

      {status.type === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          {status.message}
        </div>
      ) : null}

      {step === "phone" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <label className="text-sm">
            <div className="mb-1 font-medium text-zinc-800 dark:text-zinc-200">Phone</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+260971234567"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <button
            type="button"
            disabled={status.type === "loading"}
            onClick={() => void onRequestOtp()}
            className="mt-4 w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {status.type === "loading" ? "Sending…" : "Send OTP"}
          </button>
        </section>
      ) : (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Code sent to <span className="font-medium text-zinc-900 dark:text-zinc-100">{phone}</span>
          </p>
          <label className="mt-3 block text-sm">
            <div className="mb-1 font-medium text-zinc-800 dark:text-zinc-200">6-digit code</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm tracking-widest outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <button
            type="button"
            disabled={status.type === "loading"}
            onClick={() => void onVerifyOtp()}
            className="mt-4 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {status.type === "loading" ? "Verifying…" : "Verify & continue"}
          </button>
          <button
            type="button"
            className="mt-2 w-full text-center text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            onClick={() => {
              setStep("phone");
              setCode("");
              setStatus({ type: "idle" });
            }}
          >
            Use a different number
          </button>
        </section>
      )}

      <div className="flex justify-between text-sm">
        <Link href="/" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          Home
        </Link>
        <Link href="/profile" className="text-emerald-700 hover:underline dark:text-emerald-300">
          Profile
        </Link>
      </div>
    </main>
  );
}
