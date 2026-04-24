"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { z } from "zod";

const phoneSchema = z.string().regex(/^\+260[0-9]{9}$/, "Enter a valid Zambian number: +260XXXXXXXXX");
const otpSchema = z.string().length(6, "OTP must be 6 digits");

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState("+260");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = phoneSchema.safeParse(phone);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await auth.requestOTP(phone);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = otpSchema.safeParse(code);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const tokens = await auth.verifyOTP(phone, code);
      login(tokens.access_token, tokens.user_id);
      router.push("/matches");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 sm:mt-20 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Sign In to Zed CV</h1>
        <p className="text-gray-500 text-sm">
          Enter your Zambian phone number to get started
        </p>
      </div>

      {step === "phone" ? (
        <form onSubmit={handleRequestOTP} className="space-y-4">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              WhatsApp Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+260971234567"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-base"
              required
            />
            <p className="text-xs text-gray-500 mt-1.5">
              We will send a verification code to your WhatsApp
            </p>
          </div>
          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-3.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition touch-target"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium">{phone}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-full px-4 py-4 border border-gray-300 rounded-lg text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-brand-500"
            required
            autoFocus
          />
          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-brand-600 text-white py-3.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition touch-target"
          >
            {loading ? "Verifying..." : "Verify & Sign In"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError("");
            }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 touch-target"
          >
            Change number
          </button>
        </form>
      )}
    </div>
  );
}
