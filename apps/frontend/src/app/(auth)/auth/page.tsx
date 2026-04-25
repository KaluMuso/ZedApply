"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { z } from "zod";
import { isValidZambianPhone, toE164 } from "@/lib/phone";
import { OTPInput } from "@/components/features/OTPInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { MessageCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

const phoneSchema = z.string().refine(
  (s) => isValidZambianPhone(s),
  { message: "Use a Zambian number: +260 followed by 9 digits." }
);
const otpSchema = z.string().length(6, { message: "Enter all 6 digits" });

const RESEND_SEC = 30;

function phoneDigitsOnly(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.startsWith("260")) {
    return `+${d.slice(0, 12)}`;
  }
  const last = d.slice(-9).padStart(9, "0").replace(/\D/g, "").slice(0, 9);
  return `+260${last}`;
}

function AuthInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") && search.get("next")!.startsWith("/") ? search.get("next")! : "/matches";
  const { login } = useAuth();
  const [phone, setPhone] = useState("+260");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "done">("phone");
  const [loading, setLoading] = useState(false);
  const [resend, setResend] = useState(0);
  const reduce = useReducedMotion() ?? false;

  useEffect(() => {
    if (resend <= 0) {
      return;
    }
    const t = setTimeout(() => setResend((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resend]);

  const onPhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(phoneDigitsOnly(e.target.value));
  };

  const requestOTP = useCallback(async () => {
    const normalized = toE164(phone);
    const result = phoneSchema.safeParse(normalized);
    if (!result.success) {
      const msg = result.error.errors[0]?.message || "Check your number";
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      await auth.requestOTP(result.data);
      setStep("otp");
      setResend(RESEND_SEC);
      toast.success("We sent a code to your WhatsApp.");
    } catch (e) {
      const { message, isAuth, isRateLimit } = getErrorMessage(
        e,
        "We could not send a code. Try again."
      );
      toast.error(message, {
        action:
          isRateLimit || (e instanceof ApiError && e.status === 429)
            ? { label: "OK", onClick: () => {} }
            : undefined,
      });
      if (isAuth) {
        router.push("/auth");
      }
    } finally {
      setLoading(false);
    }
  }, [phone, router]);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestOTP();
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const pOk = phoneSchema.safeParse(toE164(phone));
    const cOk = otpSchema.safeParse(code);
    if (!pOk.success) {
      toast.error("Phone looks invalid. Go back to step one.");
      return;
    }
    if (!cOk.success) {
      toast.error(cOk.error.errors[0]?.message || "Enter 6 digits");
      return;
    }
    setLoading(true);
    try {
      const tokens = await auth.verifyOTP(pOk.data, cOk.data);
      login(tokens.access_token, tokens.user_id);
      setStep("done");
      toast.success("You are in!");
      if (!reduce) {
        setTimeout(() => {
          router.push(next);
        }, 900);
      } else {
        router.push(next);
      }
    } catch (e) {
      const { message } = getErrorMessage(e, "That code does not work. Request a new one.");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-4">
        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold" aria-hidden>
          ZC
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Sign in to Zed CV</h1>
        <p className="text-sm text-muted-foreground mt-1.5">WhatsApp OTP. No email password to forget.</p>
      </div>

      <Card className="border shadow-lg">
        {step === "phone" && (
          <form onSubmit={handleRequestOTP} className="contents">
            <CardHeader>
              <CardTitle className="text-lg">Your number</CardTitle>
              <CardDescription>We text a code to WhatsApp only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label
                  className="flex text-sm font-medium text-foreground"
                  htmlFor="phone"
                >
                  <MessageCircle className="h-4 w-4 text-primary mr-1.5 mt-0.5" aria-hidden />
                  WhatsApp number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={onPhoneInput}
                  onBlur={() => {
                    if (phone === "+260") {
                      return;
                    }
                    setPhone(toE164(phone));
                  }}
                  className="h-11 min-h-11 text-base"
                  required
                />
                <p className="text-xs text-muted-foreground">Format: +260 and 9 digits. Example: +260 97X XXX XXX</p>
              </div>
              <Button type="submit" className="w-full min-h-11 text-base" disabled={loading} variant="default">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
              </Button>
            </CardContent>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOTP} className="contents">
            <CardHeader>
              <CardTitle className="text-lg">6-digit code</CardTitle>
              <CardDescription>
                Sent to <span className="text-foreground font-medium">{toE164(phone)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="md:pt-0">
                <label className="sr-only" htmlFor="otp-0">Enter code</label>
                <OTPInput value={code} onChange={setCode} disabled={loading} />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {resend > 0
                    ? `Resend in ${resend}s`
                    : "You can resend a new code below."}
                </p>
                <button
                  type="button"
                  disabled={resend > 0 || loading}
                  onClick={async () => {
                    setCode("");
                    await requestOTP();
                  }}
                  className={cn(
                    buttonVariants({ variant: "link" }),
                    "text-sm min-h-10 p-0 h-auto"
                  )}
                >
                  Resend code
                </button>
              </div>
              <div className="space-y-2">
                <Button
                  className="w-full min-h-11 text-base"
                  type="submit"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify and continue"}
                </Button>
                <Button
                  type="button"
                  className="w-full min-h-10"
                  variant="ghost"
                  onClick={() => { setStep("phone"); setCode(""); }}
                >
                  Use a different number
                </Button>
              </div>
            </CardContent>
          </form>
        )}

        {step === "done" && (
          <CardContent className="pt-8 pb-10 text-center space-y-4">
            <motion.div
              className="mx-auto w-12 h-12 text-primary"
              initial={reduce ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.45 }}
            >
              <CheckCircle className="w-12 h-12" strokeWidth={1.5} aria-hidden />
            </motion.div>
            <p className="font-medium text-foreground">Welcome back</p>
            <p className="text-sm text-muted-foreground">Taking you to the app…</p>
            <Button className="min-h-10" onClick={() => router.push(next)}>Continue now</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AuthInner />
    </Suspense>
  );
}
