"use client";

import { useState } from "react";
import { subscription } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { TIER_INFO } from "@/lib/constants";
import { Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { motion, useReducedMotion } from "framer-motion";

const planRows = [
  {
    tier: "mwana" as const,
    features: [
      { t: "5 job matches / month", ok: true },
      { t: "Basic WhatsApp alerts", ok: true },
      { t: "AI cover letters", ok: false },
    ],
  },
  {
    tier: "mwezi" as const,
    features: [
      { t: "30 matches, cover help", ok: true },
      { t: "Priority in queue", ok: true },
      { t: "Truly unlimited", ok: false },
    ],
  },
  {
    tier: "bwino" as const,
    features: [
      { t: "Generous “unlimited” (fair use)", ok: true },
      { t: "All features + insights", ok: true },
      { t: "Priority support", ok: true },
    ],
  },
] as const;

const faq = [
  { q: "Is my number safe?", a: "We use WhatsApp OTP. Phone numbers are never sold." },
  { q: "Can I cancel any time?", a: "Yes. Plans renew month by month. Free tier is always available." },
  { q: "What payment methods work?", a: "MTN Mobile Money and Airtel Money, charged in ZMW (ngwee in our backend)."},
];

type Pay = "mtn" | "airtel";

export default function PricingPage() {
  const { token, isAuthenticated } = useAuth();
  const [open, setOpen] = useState<null | (typeof planRows)[number]["tier"]>(null);
  const [pay, setPay] = useState<Pay>("mtn");
  const [phone, setPhone] = useState("+260");
  const [paying, setPaying] = useState(false);
  const reduce = useReducedMotion() ?? false;

  const priceLabel = (k: (typeof planRows)[number]["tier"]) => TIER_INFO[k].priceLabel;

  const cta = (k: (typeof planRows)[number]["tier"]) => {
    if (k === "mwana") {
      if (!isAuthenticated) {
        window.location.href = "/auth";
        return;
      }
      toast("You are already on the free Mwana plan.");
      return;
    }
    if (!isAuthenticated) {
      window.location.href = "/auth";
      return;
    }
    setOpen(k);
  };

  const doPay = async () => {
    if (!token || !open) {
      return;
    }
    setPaying(true);
    try {
      const r = await subscription.pay(token, {
        tier: open,
        payment_method: pay,
        phone,
      });
      toast.success(r.message || "Payment request sent. Approve in your phone.");
      setOpen(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl sm:text-4xl font-bold text-center">ZMW pricing, simple tiers</h1>
      <p className="text-center text-muted-foreground text-base mt-2">
        Mwana, Mwezi, Bwino. Monthly billing in kwacha — change or cancel any time.
      </p>

      <div className="mt-8 grid sm:grid-cols-3 gap-4 sm:gap-5">
        {planRows.map((p) => {
          const info = TIER_INFO[p.tier];
          const isHighlight = p.tier === "mwezi";
          return (
            <motion.div
              key={p.tier}
              {...(reduce ? {} : { whileHover: { y: -2 }, transition: { type: "spring" } })}
            >
              <Card
                className={cn("h-full flex flex-col", isHighlight && "ring-2 ring-primary shadow-lg sm:scale-105 z-[1]")}
              >
                <CardHeader>
                  {isHighlight && <span className="text-xs font-medium text-primary">Most popular</span>}
                  <CardTitle>{info.name}</CardTitle>
                  <CardDescription>{info.bemba}</CardDescription>
                  <p className="pt-2 text-3xl font-bold">
                    {priceLabel(p.tier)}
                    <span className="text-sm font-normal text-muted-foreground"> {p.tier === "mwana" ? "forever" : "/ month"}</span>
                  </p>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f.t} className="flex items-start gap-2 text-sm">
                        {f.ok ? (
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/60 mt-0.5 shrink-0" aria-hidden />
                        )}
                        <span className="text-foreground/90">{f.t}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full min-h-11"
                    onClick={() => cta(p.tier)}
                    variant={isHighlight ? "default" : "outline"}
                  >
                    {p.tier === "mwana" ? "Get started" : p.tier === "mwezi" ? "Subscribe" : "Go premium"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 max-w-2xl mx-auto space-y-1">
        {faq.map((x) => (
          <details
            key={x.q}
            className="group border-b border-border/60 py-2"
          >
            <summary className="cursor-pointer min-h-11 list-none text-left font-medium flex items-center justify-between">
              {x.q}
              <span className="text-muted-foreground text-lg group-open:rotate-180">&#8964;</span>
            </summary>
            <p className="text-sm text-muted-foreground pt-2 pb-1 pr-2">{x.a}</p>
          </details>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        MTN • Airtel &mdash; approve prompts on the phone in seconds. Final pricing text subject to DPO/Lenco
        webhooks in production.
      </p>

      {open && (
        <Dialog open onOpenChange={(o) => { if (!o) setOpen(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pay {TIER_INFO[open].name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Method</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    className={cn("min-h-10 rounded border text-sm", pay === "mtn" ? "border-primary bg-primary/5" : "")}
                    type="button"
                    onClick={() => setPay("mtn")}
                  >
                    MTN
                  </button>
                  <button
                    className={cn("min-h-10 rounded border text-sm", pay === "airtel" ? "border-primary bg-primary/5" : "")}
                    type="button"
                    onClick={() => setPay("airtel")}
                  >
                    Airtel
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium" id="momo-label">MoMo number</p>
                <Input
                  className="h-11"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  autoComplete="tel"
                  aria-labelledby="momo-label"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(null)}
                type="button"
              >Cancel</Button>
              <Button
                onClick={doPay}
                disabled={paying}
                type="button"
              >{paying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
