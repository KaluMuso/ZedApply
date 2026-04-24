"use client";

import { useState } from "react";
import { subscription } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Plan {
  name: string;
  subtitle: string;
  price: string;
  period: string;
  tier: string;
  features: string[];
  highlight: boolean;
}

const plans: Plan[] = [
  {
    name: "Mwana",
    subtitle: "Free",
    price: "K0",
    period: "forever",
    tier: "mwana",
    features: [
      "5 job matches per month",
      "WhatsApp alerts",
      "Basic CV analysis",
    ],
    highlight: false,
  },
  {
    name: "Mwezi",
    subtitle: "Most Popular",
    price: "K79",
    period: "/month",
    tier: "mwezi",
    features: [
      "25 job matches per month",
      "AI-generated tailored CVs",
      "Priority matching",
      "WhatsApp + web dashboard",
    ],
    highlight: true,
  },
  {
    name: "Bwino",
    subtitle: "Professional",
    price: "K199",
    period: "/month",
    tier: "bwino",
    features: [
      "Unlimited job matches",
      "AI cover letter generation",
      "Career coaching insights",
      "Priority support",
      "Everything in Mwezi",
    ],
    highlight: false,
  },
];

type PaymentMethod = "mtn" | "airtel";

export default function PricingPage() {
  const { token, isAuthenticated } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mtn");
  const [payPhone, setPayPhone] = useState("+260");
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");

  const handlePay = async (tier: string) => {
    if (!isAuthenticated || !token) {
      window.location.href = "/auth";
      return;
    }
    if (tier === "mwana") return;
    setSelectedPlan(tier);
  };

  const submitPayment = async () => {
    if (!token || !selectedPlan) return;
    setPaying(true);
    setPayMsg("");
    try {
      const res = await subscription.pay(token, {
        tier: selectedPlan,
        payment_method: paymentMethod,
        phone: payPhone,
      });
      setPayMsg(`Payment initiated! ${res.message}`);
      setSelectedPlan(null);
    } catch (err) {
      setPayMsg(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
        Simple, Fair Pricing
      </h1>
      <p className="text-gray-600 text-center mb-8 sm:mb-12 text-sm sm:text-base">
        Pay with MTN Mobile Money or Airtel Money. All prices in ZMW.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl border-2 p-6 sm:p-8 ${
              plan.highlight
                ? "border-brand-600 shadow-lg relative"
                : "border-gray-200"
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs px-3 py-1 rounded-full">
                {plan.subtitle}
              </span>
            )}
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <div className="mt-4">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-gray-500 text-sm"> {plan.period}</span>
            </div>
            <ul className="mt-6 space-y-3">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="text-brand-600 mt-0.5 shrink-0">
                    &#10003;
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePay(plan.tier)}
              className={`mt-8 w-full py-3 rounded-lg font-medium transition touch-target ${
                plan.highlight
                  ? "bg-brand-600 text-white hover:bg-brand-700"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {plan.tier === "mwana" ? "Get Started" : `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Money Payment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              Pay for {plans.find((p) => p.tier === selectedPlan)?.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("mtn")}
                    className={`py-3 rounded-lg border-2 text-sm font-medium transition touch-target ${
                      paymentMethod === "mtn"
                        ? "border-yellow-500 bg-yellow-50 text-yellow-800"
                        : "border-gray-200"
                    }`}
                  >
                    MTN MoMo
                  </button>
                  <button
                    onClick={() => setPaymentMethod("airtel")}
                    className={`py-3 rounded-lg border-2 text-sm font-medium transition touch-target ${
                      paymentMethod === "airtel"
                        ? "border-red-500 bg-red-50 text-red-800"
                        : "border-gray-200"
                    }`}
                  >
                    Airtel Money
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="pay-phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Mobile Money Number
                </label>
                <input
                  id="pay-phone"
                  type="tel"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                  placeholder="+260971234567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
                />
              </div>

              {payMsg && (
                <p
                  className={`text-sm ${
                    payMsg.includes("failed") ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {payMsg}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedPlan(null);
                    setPayMsg("");
                  }}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 touch-target"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPayment}
                  disabled={paying}
                  className="flex-1 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 touch-target"
                >
                  {paying ? "Processing..." : "Pay Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
