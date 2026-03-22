"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

const plans = [
  {
    name: "Lite",
    badge: "Early Bird",
    description: "Good for trying out",
    monthly: { price: 9.99, original: null as number | null, period: "/mo" },
    yearly: { price: 7.99, original: 9.99, period: "/mo" },
    cta: "Upgrade to Lite",
    popular: false,
    credits: { monthly: 1000, yearly: 12000 },
    screens: { monthly: "≈ 30 screens", yearly: "≈ 360 screens" },
    features: [
      "2 projects",
      "Unlimited code exports",
      "Unlimited Figma exports",
      "Export to AI builders",
    ],
  },
  {
    name: "Starter",
    badge: "30% OFF APPLIED",
    description: "For higher limits",
    monthly: { price: 17.49, original: 24.99, period: "/mo" },
    yearly: { price: 13.99, original: 24.99, period: "/mo" },
    cta: "Upgrade to Starter",
    popular: false,
    credits: { monthly: 3000, yearly: 36000 },
    screens: { monthly: "≈ 100 screens", yearly: "≈ 1,200 screens" },
    features: [
      "5 projects",
      "Unlimited code exports",
      "Unlimited Figma exports",
      "Export to AI builders",
      "Share preview links",
    ],
  },
  {
    name: "Pro",
    badge: "Early Bird",
    description: "For even higher AI limits",
    monthly: { price: 49.99, original: null as number | null, period: "/mo" },
    yearly: { price: 39.99, original: 49.99, period: "/mo" },
    cta: "Upgrade to Pro",
    popular: true,
    credits: { monthly: 20000, yearly: 240000 },
    screens: { monthly: "≈ 650 screens", yearly: "≈ 7,800 screens" },
    features: [
      "Unlimited projects",
      "Purchase additional credits",
      "Unlimited code exports",
      "Unlimited Figma exports",
      "Export to AI builders",
      "Share preview links",
      "REST API access",
    ],
  },
  {
    name: "Team",
    badge: "Early Bird",
    description: "Built for collaboration",
    monthly: { price: 69.99, original: null as number | null, period: "/user/mo" },
    yearly: { price: 55.99, original: 69.99, period: "/user/mo" },
    cta: "Upgrade to Team",
    popular: false,
    credits: { monthly: 30000, yearly: 360000 },
    screens: { monthly: "≈ 1,000 screens per seat", yearly: "≈ 12,000 screens per seat" },
    features: [
      "Everything in Pro",
      "Team collaboration",
      "Priority support",
      "Centralized billing",
    ],
  },
];

function Cell({ children, className = "", border = true }: { children: React.ReactNode; className?: string; border?: boolean }) {
  void border;
  return (
    <td className={`px-5 py-4 align-top ${className}`}>
      {children}
    </td>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="w-full bg-surface text-t-primary">
      <div className="mx-auto max-w-6xl border-x border-b-primary">
        <Header />

        {/* Hero */}
        <div className="border-b border-b-primary px-5 md:px-12 py-12 md:py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h1
              className="text-[28px] md:text-[40px] font-semibold leading-tight tracking-tight text-t-primary"
              style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}
            >
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-sm md:text-base text-t-secondary leading-relaxed max-w-md mx-auto">
              Start building for free. Upgrade when you need more AI credits and features.
            </p>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="border-b border-b-primary px-5 py-4 flex items-center justify-center gap-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-t-tertiary">Billing</span>
          <div className="inline-flex rounded border border-b-primary bg-input-bg p-0.5">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 text-[11px] font-mono font-medium uppercase tracking-wider rounded transition-colors ${
                billing === "monthly" ? "bg-input-bg text-t-primary" : "text-t-secondary hover:text-t-secondary"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-4 py-1.5 text-[11px] font-mono font-medium uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 ${
                billing === "yearly" ? "bg-input-bg text-t-primary" : "text-t-secondary hover:text-t-secondary"
              }`}
            >
              Yearly
              <span className="text-[9px] text-green-400 font-semibold">2 mo free</span>
            </button>
          </div>
        </div>

        {/* Mobile cards (stacked) */}
        <div className="lg:hidden">
          {plans.map((plan, i) => {
            const tier = plan[billing];
            return (
              <div key={plan.name} className={`px-5 py-6 ${i < plans.length - 1 ? "border-b border-b-primary" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-t-primary" style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}>{plan.name}</span>
                  {plan.popular && <span className="text-[9px] font-mono uppercase tracking-wider text-btn-primary-text bg-btn-primary-bg rounded px-1.5 py-0.5 font-semibold">Most Popular</span>}
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-t-tertiary">{plan.badge}</span>
                <p className="text-xs text-t-secondary mt-1 mb-4">{plan.description}</p>

                <div className="flex items-baseline gap-0.5 mb-1">
                  <NumberFlow value={tier.price} format={{ style: "currency", currency: "USD", minimumFractionDigits: 2 }} className="text-[32px] font-light text-t-primary font-mono leading-none" />
                  {tier.period && <span className="text-xs text-t-tertiary font-mono">{tier.period}</span>}
                </div>
                {tier.original && <span className="text-xs text-t-tertiary line-through font-mono"><NumberFlow value={tier.original} format={{ style: "currency", currency: "USD", minimumFractionDigits: 2 }} />/mo</span>}
                <p className="text-[11px] text-t-tertiary font-mono mt-1 mb-4">billed {billing}</p>

                <a href="/app" className={`flex h-10 w-full items-center justify-center rounded text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors no-underline mb-4 ${plan.popular ? "bg-btn-primary-bg text-btn-primary-text hover:opacity-90" : "border border-b-strong text-t-primary hover:bg-input-bg"}`}>{plan.cta}</a>

                <p className="text-sm font-medium text-t-primary"><NumberFlow value={plan.credits[billing]} format={{ useGrouping: true }} /> AI credits / {billing === "monthly" ? "month" : "year"}</p>
                <p className="text-xs text-t-tertiary mb-4">{plan.screens[billing]}</p>

                <span className="text-[10px] font-mono uppercase tracking-widest text-t-tertiary mb-2 block">Includes</span>
                <div className="flex flex-col gap-2">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-t-secondary flex-shrink-0"><path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <span className="text-sm text-t-secondary">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table — rows are perfectly aligned */}
        <table className="w-full hidden lg:table border-collapse border-b border-b-primary">
          <colgroup>
            {plans.map((p) => <col key={p.name} className="w-1/4" />)}
          </colgroup>

          {/* Row: Plan header */}
          <tbody>
            <tr className="border-b border-b-secondary">
              {plans.map((plan, i) => (
                <Cell key={plan.name} className={i < plans.length - 1 ? "border-r border-b-secondary" : ""}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-t-primary" style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}>{plan.name}</span>
                    {plan.popular && <span className="text-[9px] font-mono uppercase tracking-wider text-btn-primary-text bg-btn-primary-bg rounded px-1.5 py-0.5 font-semibold">Most Popular</span>}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-t-tertiary block mb-1">{plan.badge}</span>
                  <p className="text-xs text-t-secondary">{plan.description}</p>
                </Cell>
              ))}
            </tr>

            {/* Row: Price */}
            <tr className="border-b border-b-secondary">
              {plans.map((plan, i) => {
                const tier = plan[billing];
                return (
                  <Cell key={plan.name} className={`py-6 ${i < plans.length - 1 ? "border-r border-b-secondary" : ""}`}>
                    <div className="flex items-baseline gap-0.5">
                      <NumberFlow value={tier.price} format={{ style: "currency", currency: "USD", minimumFractionDigits: 2 }} className="text-[36px] font-light text-t-primary font-mono leading-none" />
                      {tier.period && <span className="text-xs text-t-tertiary font-mono">{tier.period}</span>}
                    </div>
                    {tier.original && <div className="mt-1"><span className="text-xs text-t-tertiary line-through font-mono"><NumberFlow value={tier.original} format={{ style: "currency", currency: "USD", minimumFractionDigits: 2 }} />/mo</span></div>}
                    <p className="mt-1 text-[11px] text-t-tertiary font-mono">billed {billing}</p>
                  </Cell>
                );
              })}
            </tr>

            {/* Row: CTA */}
            <tr className="border-b border-b-secondary">
              {plans.map((plan, i) => (
                <Cell key={plan.name} className={i < plans.length - 1 ? "border-r border-b-secondary" : ""}>
                  <a
                    href="/app"
                    className={`flex h-10 w-full items-center justify-center rounded text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors no-underline ${
                      plan.popular ? "bg-btn-primary-bg text-btn-primary-text hover:opacity-90" : "border border-b-strong text-t-primary hover:bg-input-bg"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </Cell>
              ))}
            </tr>

            {/* Row: Credits */}
            <tr className="border-b border-b-secondary">
              {plans.map((plan, i) => (
                <Cell key={plan.name} className={i < plans.length - 1 ? "border-r border-b-secondary" : ""}>
                  <p className="text-sm font-medium text-t-primary"><NumberFlow value={plan.credits[billing]} format={{ useGrouping: true }} /> AI credits / {billing === "monthly" ? "month" : "year"}</p>
                  <p className="mt-0.5 text-xs text-t-tertiary">{plan.screens[billing]}</p>
                </Cell>
              ))}
            </tr>

            {/* Row: Features */}
            <tr>
              {plans.map((plan, i) => (
                <Cell key={plan.name} border={false} className={`py-5 ${i < plans.length - 1 ? "border-r border-b-secondary" : ""}`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-t-tertiary mb-3 block">Includes</span>
                  <div className="flex flex-col gap-2.5">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-t-secondary flex-shrink-0"><path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span className="text-sm text-t-secondary">{f}</span>
                      </div>
                    ))}
                  </div>
                </Cell>
              ))}
            </tr>
          </tbody>
        </table>

        <Footer />
      </div>
    </div>
  );
}
