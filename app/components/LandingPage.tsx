"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AnimatedSection } from "./AnimatedSection";
import { AnimatedCard } from "./AnimatedCard";
import { AnimatedStaggerContainer } from "./AnimatedStaggerContainer";
import { fadeInUpVariant, staggerContainerVariant, viewportConfig } from "@/lib/animations";
import { IconBolt, IconCircle, IconLink, IconDoc, IconSearch, IconCheck, IconGlobe, IconShield, IconChart } from "./Icons";

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
      src="/arc-logo.jpg"
      alt="Arc"
      width={size}
      height={size}
      style={{ objectFit: "contain", borderRadius: "6px" }}
    />
  );
}

function USDCLogo({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/usdc-logo.png"
      alt="USDC"
      width={size}
      height={size}
      style={{ objectFit: "contain", borderRadius: "50%" }}
    />
  );
}

function PayPageMockup() {
  return (
    <div className="w-full max-w-sm ui-card overflow-visible relative transform-gpu will-change-transform xl:-translate-x-2 xl:rotate-[0.25deg] animate-fade-in-up border border-white/[0.04] transition-transform transform duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(99,102,241,0.12)] hover:border-indigo-400/30 hover:bg-white/[0.02]">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-indigo-500/15 to-transparent pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gradient-to-br from-indigo-500/20 to-transparent opacity-80 pointer-events-none animate-float-slow" />
      <div className="px-6 pt-6 pb-5 text-center border-b border-white/[0.06]">
        <div className="text-white font-semibold text-sm mb-1">Rogers</div>
        <div className="text-white/40 text-xs font-mono"></div>
        <div className="text-white/30 text-[11px] mt-2">is requesting payment</div>
        <div className="text-white/40 text-xs mt-4 mb-1">Amount</div>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-white text-4xl font-black tracking-tight">100</span>
          <span className="text-white/40 text-xl font-semibold">USDC</span>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-white/[0.06] space-y-3">
        {[
          { label: "Invoice ID", value: "1aa523" },
          { label: "Recipient", value: "0x8F0F1E...D62", mono: true },
          
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center text-sm">
            <span className="text-white/30">{row.label}</span>
            <span className={`text-xs font-medium ${row.mono ? "font-mono text-white/60" : "text-white/60"}`}>
                      {row.value}
                    </span>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 border-b border-white/[0.06]">
        <div className="text-white/25 text-[10px] font-semibold uppercase tracking-widest mb-3">
          How it works
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <USDCLogo size={22} />, label: "You tap PAY", sub: "from any network" },
            { icon: <IconSearch size={18} />, label: "We detect USDC", sub: "automatically in your wallet" },
            { icon: <ArcLogo size={22} />, label: "We settle on", sub: "Arc Network" },
          ].map((step, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.03] p-3 text-center">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06]">
                {step.icon}
              </div>
              <div className="text-white/60 text-[10px] font-medium">{step.label}</div>
              <div className="text-white/25 text-[9px] mt-1">{step.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4">
        
        
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-emerald-400 text-xs">
            100 USDC found on Base Sepolia — ready to pay
          </span>
        </div>
        <div className="w-full py-3 rounded-2xl text-center text-white text-sm font-bold ui-button-primary">
          Pay 100 USDC →
        </div>
      
      </div>

      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
    </div>
  );
}

export default function LandingPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [navigateAfterConnect, setNavigateAfterConnect] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogoClick = () => {
    router.push("/");
  };

  useEffect(() => {
    if (isConnected && navigateAfterConnect) {
      setNavigateAfterConnect(false);
      router.push("/create-invoice");
    }
  }, [isConnected, navigateAfterConnect, router]);

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
          height: "72px",
          background: "rgba(13,13,20,0.85)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button onClick={handleLogoClick} className="flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-80">
          <RemloLogo size={28} />
          <span className="text-white font-semibold text-base tracking-tight">
            Remlo
          </span>
        </button>

        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollTo("how-it-works")}
            className="text-white/50 hover:text-white text-sm font-medium transition-colors"
          >
            How it works
          </button>
          <button
            onClick={() => scrollTo("benefits")}
            className="text-white/50 hover:text-white text-sm font-medium transition-colors"
          >
            Benefits
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-20 pb-20 px-6 md:px-8">
        <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.2fr_0.9fr] items-center">
          {/* Left */}
          <div className="flex flex-col gap-6 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/15 text-xs font-semibold text-indigo-200 w-fit">
              <ArcLogo size={14} />
              Built on Arc Network
            </div>

            <h1 className="ui-title-large text-white tracking-tight leading-[1.02] max-w-3xl">
              Universal USDC <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-amber-300 bg-clip-text text-transparent">Checkout</span>
            </h1>

            <p className="text-white/50 text-lg leading-8 max-w-md">
              Create invoice links. We automatically find USDC in your payer’s wallet — they click pay, and you receive USDC on Arc Network.
            </p>

            <div className="flex flex-wrap gap-3 mb-3">
              {[
                { icon: <IconBolt />, label: "Automatic USDC detection" },
                { icon: <IconCircle />, label: "Always settles to Arc Network" },
                { icon: <IconLink />, label: "Shareable payment links" },
              ].map((f, i) => (
                <motion.div 
                  key={f.label}
                  className="ui-chip ui-chip-muted gap-2 text-xs text-white/70"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 + i * 0.05 }}
                >
                  {f.icon}
                  {f.label}
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <motion.button
                    onClick={() => {
                      setNavigateAfterConnect(true);
                      openConnectModal();
                    }}
                    className="ui-button-primary px-6 py-3.5 text-sm"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Create Invoice →
                  </motion.button>
                )}
              </ConnectButton.Custom>
              <motion.a 
                href="#how-it-works" 
                className="ui-button-secondary px-5 py-3 text-sm text-white/80"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                View how it works
              </motion.a>
            </div>
          </div>

          {/* Right — Pay page mockup */}
          <motion.div 
            className="flex-shrink-0 w-full lg:w-auto flex justify-center lg:justify-end mt-6 lg:mt-12 lg:self-end"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
          >
            <PayPageMockup />
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <AnimatedSection className="py-24 px-6 md:px-8 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
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

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8"
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={staggerContainerVariant}
          >
            {[
              {
                num: "1",
                icon: <IconDoc />,
                title: "Create Invoice",
                desc: "Create an invoice link with the amount you want to receive.",
              },
              {
                num: "2",
                icon: <IconLink />,
                title: "Share Link",
                desc: "Share the payment link with your payer anywhere.",
              },
              {
                num: "3",
                icon: <IconSearch />,
                title: "We Find USDC",
                desc: "Remlo automatically scans the payer's wallet across multiple chains.",
              },
              {
                num: "4",
                icon: <IconBolt />,
                title: "Payer Clicks Pay",
                desc: "They approve the payment — no need to switch chains.",
              },
              {
                num: "5",
                icon: <IconCheck />,
                title: "You Receive USDC",
                desc: "You get USDC on Arc Network. Fast, secure, and unified.",
              },
            ].map((step, i) => (
              <AnimatedCard key={i} index={i} className="relative">
                <div
                  className="rounded-2xl p-5 h-full border border-white/[0.06] transition-transform duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(99,102,241,0.12)] hover:border-indigo-400/30 hover:bg-white/[0.02]"
                  style={{
                    background: "rgba(255,255,255,0.02)",
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
              </AnimatedCard>
            ))}
          </motion.div>

          {/* Powered by banner */}
          <motion.div 
            className="flex items-center justify-center gap-2 py-3 px-6 rounded-full mx-auto w-fit"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
          >
            <ArcLogo size={14} />
            <span className="text-white/40 text-xs">Powered by Circle · Settled on Arc Network</span>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* PROBLEM → SOLUTION */}
      <AnimatedSection id="benefits" className="py-24 px-6 md:px-8 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <motion.div 
            className="space-y-8"
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={staggerContainerVariant}
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-white/60 text-xs uppercase tracking-[0.24em]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)]" />
                Why Remlo?
              </div>
              <h2 className="font-black tracking-tight text-4xl sm:text-5xl max-w-2xl">
                Payments across chains are rigid. Remlo makes them effortless.
              </h2>
              <p className="text-white/40 max-w-2xl leading-8 text-lg">
                Payers don’t need to bridge, switch networks, or manage balances manually. Merchants stop losing conversions to chain friction.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <motion.div 
                className="rounded-3xl p-6 bg-white/[0.03] border border-white/[0.06] shadow-[0_20px_90px_rgba(13,13,20,0.2)] backdrop-blur-xl transition-transform transform duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(99,102,241,0.12)] hover:border-indigo-400/30 hover:bg-white/[0.02]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                whileHover={{ y: -6 }}
              >
                <div className="text-sm uppercase tracking-[0.24em] text-white/40 mb-3">Problem</div>
                <div className="space-y-3 text-sm text-white/70">
                  <p>Paying crypto invoices across chains is fragmented.</p>
                  <p>Users must bridge, switch networks, and manually manage balances.</p>
                  <p>Merchants lose conversions because payers don’t have funds on the right chain.</p>
                </div>
              </motion.div>
              <motion.div 
                className="rounded-3xl p-6 bg-gradient-to-br from-indigo-500/10 via-slate-900/70 to-slate-950 border border-indigo-500/10 shadow-[0_20px_120px_rgba(99,102,241,0.12)] backdrop-blur-xl transition-transform transform duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(99,102,241,0.12)] hover:border-indigo-400/30 hover:bg-white/[0.02]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
                whileHover={{ y: -6 }}
              >
                <div className="text-sm uppercase tracking-[0.24em] text-indigo-200 mb-3">Solution</div>
                <div className="space-y-3 text-sm text-white/70">
                  <p>Remlo automatically detects USDC across chains.</p>
                  <p>Payer simply clicks “Pay”.</p>
                  <p>Merchant always receives USDC on Arc Network.</p>
                  <p>No bridging confusion. No chain switching confusion.</p>
                </div>
              </motion.div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <motion.a 
                href="#how-it-works" 
                className="ui-button-primary px-6 py-3.5 text-sm inline-flex items-center gap-2"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Accepting USDC
                <span className="text-xl leading-none">→</span>
              </motion.a>
              <motion.a 
                href="#supported-chains" 
                className="ui-button-secondary px-6 py-3.5 text-sm inline-flex items-center gap-2"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                Explore the ecosystem
                <span className="text-xl leading-none">→</span>
              </motion.a>
            </div>
          </motion.div>

          {/* removed Invoice checkout demo to simplify landing layout per design update */}
        </div>
      </AnimatedSection>

      {/* SUPPORTED CHAINS - redesigned to premium fintech aesthetic */}
      <AnimatedSection id="supported-chains" className="py-24 px-6 md:px-8 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.03] px-4 py-2 mb-4 text-xs uppercase tracking-[0.24em] text-white/50">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.18)]" />
            Ecosystem
          </div>
          <h2 className="font-black mb-3 text-4xl sm:text-5xl tracking-tight">Supported Chains</h2>
          <p className="text-white/40 text-base max-w-2xl mx-auto mb-8">More chains. More liquidity. One seamless payment.</p>

          {/* Chain cards container */}
          <div className="mx-auto max-w-3xl">
            <motion.div 
              className="flex flex-wrap justify-center gap-4"
              initial="hidden"
              whileInView="visible"
              viewport={viewportConfig}
              variants={staggerContainerVariant}
            >
              {[
                { name: "Arbitrum", logo: "/arbitrum-logo.png" },
                { name: "Base", logo: "/base-logo.png" },
                { name: "Ethereum", logo: "/ethereum-logo.png" },
                { name: "Optimism", logo: "/optimism-logo.png" },
                { name: "And more...", logo: null },
              ].map((c, i) => (
                <AnimatedCard key={c.name} index={i} className="w-full sm:w-48 md:w-52 lg:w-56 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-4 flex items-center gap-4 transition-transform transform hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(99,102,241,0.12)] hover:border-indigo-400/30" style={{ minWidth: 0 }}>
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.04] flex-shrink-0">
                    {c.logo ? (
                      <img
                        src={c.logo}
                        alt={`${c.name} logo`}
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center rounded-md text-white font-bold text-sm" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))' }}>
                        +
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-white font-semibold truncate">{c.name}</div>
                    
                  </div>
                </AnimatedCard>
              ))}
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* TRUST SIGNALS */}
      <AnimatedSection className="py-24 px-6 md:px-8 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <motion.div 
            className="space-y-6"
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={staggerContainerVariant}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/50 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)]" />
              Non-custodial · Wallet-native checkout
            </div>
            <div className="space-y-4">
              <h2 className="font-black text-4xl sm:text-5xl tracking-tight">The easiest way to recieve USDC across chains.</h2>
              <p className="text-white/40 max-w-2xl leading-8 text-lg mx-auto">
                Remlo keeps the payment experience minimal while providing the credibility and enterprise feel that investors and developers expect.
              </p>
            </div>

            <div className="mt-6 max-w-md mx-auto grid grid-cols-2 gap-4">
              <motion.div 
                className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-6 text-center transition-transform transform duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(99,102,241,0.12)] hover:border-indigo-400/30 hover:bg-white/[0.02]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                whileHover={{ y: -6 }}
              >
                <div className="text-white/40 uppercase text-[11px] tracking-[0.3em] mb-2">Transactions</div>
                <div className="text-3xl font-black text-white">120+</div>
                <div className="text-white/50 text-sm mt-1">invoices created</div>
              </motion.div>
              <motion.div 
                className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-6 text-center transition-transform transform duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(99,102,241,0.12)] hover:border-indigo-400/30 hover:bg-white/[0.02]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
                whileHover={{ y: -6 }}
              >
                <div className="text-white/40 uppercase text-[11px] tracking-[0.3em] mb-2">Testnet Volume</div>
                <div className="text-3xl font-black text-white">$4,200+</div>
                <div className="text-white/50 text-sm mt-1">settled on Arc</div>
              </motion.div>
            </div>
          </motion.div>

          {/* Arc Network settlement panel removed per request */}
        </div>
      </AnimatedSection>

      {/* CTA SECTION */}
      <AnimatedSection className="py-24 px-6 md:px-8 border-t border-white/[0.04]">
        <motion.div 
          className="max-w-3xl mx-auto rounded-3xl p-12 md:p-16 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(13,13,20,0.8) 60%)", border: "1px solid rgba(99,102,241,0.2)" }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={viewportConfig}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {/* Decorative R */}
          <div
            className="absolute right-8 bottom-0 text-[200px] font-black leading-none select-none pointer-events-none"
            style={{
              color: "rgba(99,102,241,0.06)",
              fontFamily: "system-ui",
            }}
          >
          </div>

          <div className="relative z-10 max-w-lg mx-auto text-center">
            <h2
              className="font-black mb-4 leading-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 3rem)", letterSpacing: "-1px" }}
            >
              Start accepting USDC
              <br />
              <span className="text-white/60">the smart way.</span>
            </h2>
            <p className="text-white/40 text-base mb-8 max-w-2xl mx-auto">
              Create invoice links and get paid on Arc Network.
            </p>

            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <motion.button
                  onClick={() => {
                    setNavigateAfterConnect(true);
                    openConnectModal();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
                  style={{
                    background:
                      "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                    boxShadow: "0 8px 32px rgba(99,102,241,0.3)",
                  }}
                  whileHover={{ y: -2, boxShadow: "0 12px 40px rgba(99,102,241,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Connect Wallet
                </motion.button>
              )}
            </ConnectButton.Custom>
          </div>
        </motion.div>
      </AnimatedSection>

      {/* FOOTER */}
      <motion.footer 
        className="px-6 md:px-8 py-8 md:py-12 border-t border-white/[0.04]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={viewportConfig}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <RemloLogo size={24} />
                <span className="text-white font-bold text-sm">Remlo</span>
              </div>
              <p className="text-white/30 text-xs leading-relaxed max-w-xs">
                Auto detect USDC.
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
              <a
                  href="https://github.com/ramsey1374/Remlo"
                  target="_blank"
                  className="text-white/30 hover:text-white transition-colors text-xs"
                >
                  GitHub
                </a>
              </div>
            </div>

            {/* Copyright */}
            <div className="text-white/20 text-xs">
              © 2026 Remlo. All rights reserved.
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
