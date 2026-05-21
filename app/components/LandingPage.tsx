"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

function RemloLogo({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/remlo-logo.png"
      alt="Remlo"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}

function ArcLogo({ size = 20 }: { size?: number }) {
  return (
    <img
      src="/arc-logo.JPG"
      alt="Arc"
      width={size}
      height={size}
      style={{ objectFit: "contain", borderRadius: "4px" }}
    />
  );
}

// Mock pay page card matching image 3
function PayPageMockup() {
  return (
    <div
      className="relative w-full max-w-[340px] rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #13131a 0%, #0d0d14 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 0 0 1px rgba(99,102,241,0.1), 0 32px 64px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-5 text-center border-b border-white/[0.06]">
        <div className="text-white font-semibold text-sm mb-0.5">Ramsey</div>
        <div className="text-white/40 text-xs font-mono">0x8F0F1E...D62</div>
        <div className="text-white/25 text-xs mt-1">is requesting payment</div>
        <div className="text-white/40 text-xs mt-4 mb-1">Amount</div>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-white text-4xl font-black tracking-tight">
            2.00
          </span>
          <span className="text-white/40 text-xl font-semibold">USDC</span>
        </div>
      </div>

      {/* Meta */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex flex-col gap-2.5">
        {[
          { label: "Invoice ID", value: "1aa523" },
          { label: "Recipient", value: "0x8F0F1E...D62", mono: true },
          { label: "Settlement", value: "Arc Testnet", accent: true },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center">
            <span className="text-white/30 text-xs">{row.label}</span>
            <span
              className={`text-xs font-medium ${
                row.accent
                  ? "text-indigo-400"
                  : row.mono
                  ? "font-mono text-white/60"
                  : "text-white/60"
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <div className="text-white/25 text-[10px] font-semibold uppercase tracking-widest mb-3">
          How it works
        </div>
        <div className="flex items-center justify-between">
          {[
            { icon: "💲", label: "You pay USDC", sub: "from any network" },
            { icon: "✦", label: "We find best", sub: "network for you" },
            { icon: "arc", label: "We settle on", sub: "Arc Testnet" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="text-center">
                <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center mx-auto mb-1.5 text-sm">
                  {step.icon === "arc" ? <ArcLogo size={22} /> : step.icon}
                </div>
                <div className="text-white/50 text-[9px] leading-tight">
                  {step.label}
                </div>
                <div className="text-white/25 text-[8px]">{step.sub}</div>
              </div>
              {i < 2 && (
                <div className="text-white/10 text-xs mx-0.5 mb-3">···</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pay section */}
      <div className="px-6 py-4">
        <div className="text-white font-semibold text-sm mb-3">
          Pay with USDC
        </div>
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span className="text-white/40 text-xs">Connected:</span>
          <span className="text-white/70 text-xs font-mono">
            0x8F0F1E...D62
          </span>
        </div>
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-emerald-400 text-xs">
            8.00 USDC found on Base Sepolia — ready to pay
          </span>
        </div>
        <div
          className="w-full py-3 rounded-xl text-center text-white text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
        >
          Pay 2.00 USDC →
        </div>
        <div className="text-center text-white/20 text-[10px] mt-2">
          USDC sent from best chain. We'll handle everything for you.
        </div>
      </div>

      {/* Glow */}
      <div
        className="absolute -top-20 -right-20 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push("/create-invoice");
    }
  }, [isConnected, router]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "#0d0d14", fontFamily: "system-ui, sans-serif" }}
    >
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* NAV */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12"
        style={{
          height: "60px",
          background: "rgba(13,13,20,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <RemloLogo size={28} />
          <span className="text-white font-bold text-base tracking-tight">
            Remlo
          </span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollTo("how-it-works")}
            className="text-white/50 hover:text-white text-sm transition-colors"
          >
            How it works
          </button>
          <button
            onClick={() => scrollTo("benefits")}
            className="text-white/50 hover:text-white text-sm transition-colors"
          >
            Benefits
          </button>
        </div>

        {/* Built on Arc badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03]">
          <ArcLogo size={14} />
          <span className="text-white/50 text-xs">Built on Arc Network</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left */}
          <div className="flex-1 max-w-xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-xs font-medium"
              style={{
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.2)",
                color: "#a5b4fc",
              }}
            >
              <ArcLogo size={12} />
              Built on Arc Network
            </div>

            <h1
              className="font-black leading-[1.05] mb-6"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", letterSpacing: "-1.5px" }}
            >
              Universal USDC
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #a5b4fc 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Checkout
              </span>
            </h1>

            <p className="text-white/50 text-lg leading-relaxed mb-8 max-w-md">
              Create invoice links. We automatically find USDC in your payer's
              wallet — they click pay, and you receive USDC on Arc Network.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3 mb-10">
              {[
                { icon: "⚡", label: "Automatic USDC detection" },
                { icon: "🔵", label: "Always settles to Arc Network" },
                { icon: "🔗", label: "Shareable payment links" },
              ].map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/60"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span>{f.icon}</span>
                  {f.label}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
                    style={{
                      background:
                        "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      boxShadow: "0 8px 32px rgba(99,102,241,0.3)",
                    }}
                  >
                    Create Invoice →
                  </button>
                )}
              </ConnectButton.Custom>
            </div>
          </div>

          {/* Right — Pay page mockup */}
          <div className="flex-shrink-0 w-full lg:w-auto flex justify-center lg:justify-end">
            <PayPageMockup />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="font-black mb-3"
              style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", letterSpacing: "-0.8px" }}
            >
              How Remlo Works
            </h2>
            <p className="text-white/40 text-base">
              A seamless multichain payment experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
            {[
              {
                num: "1",
                icon: "📄",
                title: "Create Invoice",
                desc: "Create an invoice link with the amount you want to receive.",
              },
              {
                num: "2",
                icon: "🔗",
                title: "Share Link",
                desc: "Share the payment link with your payer anywhere.",
              },
              {
                num: "3",
                icon: "🔍",
                title: "We Find USDC",
                desc: "Remlo automatically scans the payer's wallet across multiple chains.",
              },
              {
                num: "4",
                icon: "⚡",
                title: "Payer Clicks Pay",
                desc: "They approve the payment — no need to switch chains.",
              },
              {
                num: "5",
                icon: "✓",
                title: "You Receive USDC",
                desc: "You get USDC on Arc Network. Fast, secure, and unified.",
              },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div
                  className="rounded-2xl p-5 h-full"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mb-4"
                    style={{
                      background: "rgba(99,102,241,0.15)",
                      color: "#a5b4fc",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    {step.num}
                  </div>
                  <div className="text-2xl mb-3">{step.icon}</div>
                  <div className="text-white font-semibold text-sm mb-2">
                    {step.title}
                  </div>
                  <div className="text-white/40 text-xs leading-relaxed">
                    {step.desc}
                  </div>
                </div>
                {i < 4 && (
                  <div className="hidden md:block absolute top-8 -right-2 text-white/10 text-sm z-10">
                    ···
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Powered by banner */}
          <div
            className="flex items-center justify-center gap-2 py-3 px-6 rounded-full mx-auto w-fit"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <ArcLogo size={14} />
            <span className="text-white/40 text-xs">
              Powered by Circle · Settled on Arc Network
            </span>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="py-24 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="font-black mb-3"
              style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", letterSpacing: "-0.8px" }}
            >
              Why Builders Choose Remlo
            </h2>
            <p className="text-white/40 text-base">
              Infrastructure for the future of payments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: "🌐",
                title: "Accept from Any Chain",
                desc: "Your payer can pay from any supported chain. Remlo handles the complexity.",
                color: "rgba(99,102,241,0.15)",
                border: "rgba(99,102,241,0.2)",
              },
              {
                icon: "⚡",
                title: "Automatic USDC Detection",
                desc: "We scan the payer's wallet and find the best USDC balance automatically.",
                color: "rgba(251,191,36,0.08)",
                border: "rgba(251,191,36,0.15)",
              },
              {
                icon: "🛡",
                title: "Secure & Non-Custodial",
                desc: "Remlo never holds your funds. Payments are secure, transparent, and non-custodial.",
                color: "rgba(52,211,153,0.08)",
                border: "rgba(52,211,153,0.15)",
              },
              {
                icon: "📊",
                title: "Built for Scale",
                desc: "Built on modern infra. Designed for builders, web3 apps, and global businesses.",
                color: "rgba(99,102,241,0.1)",
                border: "rgba(99,102,241,0.15)",
              },
            ].map((b) => (
              <div
                key={b.title}
                className="rounded-2xl p-6 flex items-start gap-4"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: b.color, border: `1px solid ${b.border}` }}
                >
                  {b.icon}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm mb-1.5">
                    {b.title}
                  </div>
                  <div className="text-white/40 text-sm leading-relaxed">
                    {b.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORTED CHAINS */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-5xl mx-auto text-center">
          <h2
            className="font-black mb-3"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", letterSpacing: "-0.8px" }}
          >
            Supported Chains
          </h2>
          <p className="text-white/40 text-base mb-12">
            More chains. More liquidity. One seamless payment.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { name: "Arbitrum", color: "#28A0F0", symbol: "ARB" },
              { name: "Base", color: "#0052FF", symbol: "BASE" },
              { name: "Ethereum", color: "#8B8FF8", symbol: "ETH" },
            ].map((chain) => (
              <div
                key={chain.name}
                className="flex items-center gap-3 px-5 py-3 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: chain.color }}
                >
                  {chain.symbol.slice(0, 1)}
                </div>
                <span className="text-white/80 text-sm font-medium">
                  {chain.name}
                </span>
              </div>
            ))}
            <div
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white/30 text-sm"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              And more...
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 px-6 md:px-12">
        <div
          className="max-w-5xl mx-auto rounded-3xl p-12 md:p-16 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(13,13,20,0.8) 60%)",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          {/* Decorative R */}
          <div
            className="absolute right-8 bottom-0 text-[200px] font-black leading-none select-none pointer-events-none"
            style={{
              color: "rgba(99,102,241,0.06)",
              fontFamily: "system-ui",
            }}
          >
            R
          </div>

          <div className="relative z-10 max-w-lg">
            <h2
              className="font-black mb-4 leading-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 3rem)", letterSpacing: "-1px" }}
            >
              Start accepting USDC
              <br />
              <span className="text-white/60">the smart way.</span>
            </h2>
            <p className="text-white/40 text-base mb-8">
              Create invoice links and get paid on Arc Network.
            </p>

            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={openConnectModal}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
                  style={{
                    background:
                      "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                    boxShadow: "0 8px 32px rgba(99,102,241,0.3)",
                  }}
                >
                  Connect Wallet
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="px-6 md:px-12 py-12"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <RemloLogo size={24} />
                <span className="text-white font-bold text-sm">Remlo</span>
              </div>
              <p className="text-white/30 text-xs leading-relaxed max-w-xs">
                Universal USDC Checkout.
                <br />
                Accept from any chain.
                <br />
                Settle on Arc Network.
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3 mt-4">
                <a
                  href="https://x.com/remloapp"
                  target="_blank"
                  className="text-white/30 hover:text-white transition-colors text-xs"
                >
                  𝕏 Twitter
                </a>
              </div>
            </div>

            {/* Copyright */}
            <div className="text-white/20 text-xs">
              © 2026 Remlo. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
