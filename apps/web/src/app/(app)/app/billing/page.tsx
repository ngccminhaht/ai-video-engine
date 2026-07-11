"use client";

import { CheckCircle2, Sparkles } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    credits: 100,
    features: ["100 credits/month", "5 GB storage", "720p max", "Standard queue"],
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    credits: 500,
    features: ["500 credits/month", "50 GB storage", "1080p max", "Priority queue", "API access"],
    current: false,
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$99",
    period: "/month",
    credits: 2000,
    features: ["2000 credits/month", "500 GB storage", "1080p max", "Dedicated queue", "API access", "Custom models"],
    current: false,
  },
];

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">Billing</h1>
        <p className="text-sm text-[#666666] mt-1">Manage your subscription and payment</p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`p-6 rounded-xl border bg-white ${
              plan.recommended
                ? "border-[#111111] ring-1 ring-[#111111]"
                : "border-[#E5E5E5]"
            }`}
          >
            {plan.recommended && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#111111] text-white mb-3">
                <Sparkles className="w-3 h-3" />
                Recommended
              </span>
            )}
            <h3 className="text-lg font-semibold text-[#0A0A0A]">{plan.name}</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold text-[#0A0A0A]">{plan.price}</span>
              <span className="text-sm text-[#666666]">{plan.period}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[#666666]">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {plan.current ? (
              <div className="w-full py-2.5 rounded-lg border border-[#E5E5E5] text-center text-sm font-medium text-[#666666]">
                Current Plan
              </div>
            ) : (
              <button className="w-full py-2.5 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] transition-colors">
                Upgrade
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Payment info placeholder */}
      <div className="p-6 rounded-xl border border-[#E5E5E5] bg-[#F7F7F7]">
        <h3 className="text-sm font-medium text-[#0A0A0A] mb-2">Payment Method</h3>
        <p className="text-sm text-[#666666]">
          Payment integration will be available in a future update.
          For now, contact support to upgrade your plan.
        </p>
      </div>
    </div>
  );
}
