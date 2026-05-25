"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { supabase } from "@/lib/db";
import { IconPlus, IconInvoices, IconPayments, IconAnalytics, IconSettings, IconMenu } from "../components/Icons";

function RemloLogo({ size = 28 }: { size?: number }) {
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

function chainName(chainId: number | null) {
  const map: Record<number, string> = { 11155111: "Eth Sepolia", 421614: "Arb Sepolia", 84532: "Base Sepolia" };
  return chainId ? map[chainId] ?? `Chain ${chainId}` : "Unknown";
}

export default function AnalyticsPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [intents, setIntents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    fetchData();
  }, [address]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: invData } = await supabase
        .from("invoices").select("*").eq("receiver", address);
      const { data: intentData } = await supabase
        .from("payment_intents").select("*");
      setInvoices(invData ?? []);
      setIntents(intentData ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Compute analytics
  const settled = invoices.filter((i) => i.paid || i.status === "settled");
  const pending = invoices.filter((i) => !i.paid && i.status === "pending");
  const expired = invoices.filter((i) => i.status === "expired");

  const totalVolume = settled.reduce((sum, i) => sum + Number(i.amount), 0);
  const pendingVolume = pending.reduce((sum, i) => sum + Number(i.amount), 0);
  const avgInvoice = settled.length > 0 ? totalVolume / settled.length : 0;
  const successRate = invoices.length > 0 ? Math.round((settled.length / invoices.length) * 100) : 0;

  // Chain breakdown
  const chainBreakdown = intents.reduce((acc: Record<string, number>, intent) => {
    if (intent.chain_id && intent.status === "settled") {
      const name = chainName(intent.chain_id);
      acc[name] = (acc[name] ?? 0) + Number(intent.amount);
    }
    return acc;
  }, {});

  const chainEntries = Object.entries(chainBreakdown).sort((a, b) => b[1] - a[1]);
  const chainTotal = chainEntries.reduce((sum, [, v]) => sum + v, 0);

  // Monthly volume (last 6 months)
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    settled.forEach((inv) => {
      if (!inv.created_at) return;
      const d = new Date(inv.created_at);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (months[key] !== undefined) months[key] += Number(inv.amount);
    });
    return Object.entries(months);
  })();

  const maxMonthly = Math.max(...monthlyData.map(([, v]) => v), 1);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-sm w-full">
          <div className="flex items-center justify-center mb-10"><RemloLogo size={120} /></div>
          <h1 className="text-white text-3xl font-bold tracking-tight mb-3">Connect your wallet</h1>
          <p className="text-white/40 text-sm leading-relaxed mb-8">Connect to view your analytics.</p>
          {(() => {
            const { open } = useAppKit();
            return (
              <button onClick={() => open()}
                className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all text-sm">
                Connect Wallet
              </button>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0d0d14]">
      <aside className="hidden md:flex w-[220px] min-h-screen flex-col ui-card px-0 py-0">
        <div className="flex items-center justify-center px-4 py-4 border-b border-white/[0.06]">
          <button
            type="button"
            onClick={() => router.push("/create-invoice")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-left"
          >
            <RemloLogo size={28} />
            
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {[
            { label: "Create Invoice", icon: <IconPlus />, href: "/create-invoice" },
            { label: "Invoices", icon: <IconInvoices />, href: "/invoices" },
            { label: "Payments", icon: <IconPayments />, href: "/payments" },
            { label: "Analytics", icon: <IconAnalytics />, href: "/analytics", active: true },
          ].map((item) => (
            <a key={item.label} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                item.active ? "bg-indigo-500/15 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              }`}>
              <span className="text-base opacity-70">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span className="text-white/70 text-xs font-mono flex-1 truncate">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
          <button onClick={() => disconnect()}
            className="w-full text-center text-xs text-white/30 hover:text-white/60 py-1 transition-colors">
            Disconnect
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">

        <div className="flex md:hidden items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.push("/create-invoice")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <RemloLogo size={28} />
            
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMobileDropdownOpen((current) => !current)}
              className="h-10 w-10 rounded-xl border border-white/[0.08] bg-[#13131a] text-white/70 hover:text-white transition"
            >
              <IconMenu />
            </button>
            {mobileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#13131a] border border-white/[0.06] rounded-2xl shadow-lg z-50">
                {[
                  { label: "Invoices", href: "/invoices" },
                  { label: "Payments", href: "/payments" },
                  { label: "Analytics", href: "/analytics" },
                  { label: "Settings", href: "/settings" },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      router.push(item.href);
                      setMobileDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.04] transition"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      disconnect();
                      setMobileDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 transition"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-white text-xl md:text-2xl font-bold tracking-tight mb-1">Analytics</h1>
          <p className="text-white/40 text-sm">Your payment performance overview.</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-white/25 text-sm animate-pulse">Loading analytics...</div>
        ) : (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total Volume", value: `${totalVolume.toFixed(2)}`, unit: "USDC", color: "text-indigo-400" },
                { label: "Pending Volume", value: `${pendingVolume.toFixed(2)}`, unit: "USDC", color: "text-amber-400" },
                { label: "Avg Invoice", value: `${avgInvoice.toFixed(2)}`, unit: "USDC", color: "text-white" },
                { label: "Success Rate", value: `${successRate}`, unit: "%", color: successRate >= 70 ? "text-emerald-400" : "text-amber-400" },
              ].map((m) => (
                <div key={m.label} className="ui-card p-4 md:p-5">
                  <div className="text-white/40 text-xs mb-2">{m.label}</div>
                  <div className={`text-2xl md:text-3xl font-black tracking-tight mb-0.5 ${m.color}`}>
                    {m.value}
                    <span className="text-sm font-normal ml-1 text-white/40">{m.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Volume chart */}
              <div className="ui-card p-6">
                <h2 className="text-white font-semibold text-sm mb-6">Monthly Volume (USDC)</h2>
                <div className="flex items-end gap-2 h-32">
                  {monthlyData.map(([month, value]) => (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-white/30 text-[10px] font-mono">
                        {value > 0 ? value.toFixed(0) : ""}
                      </div>
                      <div
                        className="w-full bg-indigo-500/30 hover:bg-indigo-500/50 rounded-t-md transition-all relative group"
                        style={{ height: `${Math.max((value / maxMonthly) * 100, 4)}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0d0d14] border border-white/[0.08] px-2 py-1 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {value.toFixed(2)} USDC
                        </div>
                      </div>
                      <div className="text-white/25 text-[9px]">{month.split(" ")[0]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invoice status breakdown */}
              <div className="ui-card p-6">
                <h2 className="text-white font-semibold text-sm mb-6">Invoice Breakdown</h2>
                <div className="flex flex-col gap-4">
                  {[
                    { label: "Settled", count: settled.length, total: invoices.length, color: "bg-indigo-500" },
                    { label: "Pending", count: pending.length, total: invoices.length, color: "bg-amber-500" },
                    { label: "Expired", count: expired.length, total: invoices.length, color: "bg-red-500" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/60">{item.label}</span>
                        <span className="text-white/40">{item.count} / {item.total}</span>
                      </div>
                      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all`}
                          style={{ width: item.total > 0 ? `${(item.count / item.total) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chain breakdown */}
                {chainEntries.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-white/[0.06]">
                    <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Payment Sources</h3>
                    <div className="flex flex-col gap-3">
                      {chainEntries.map(([name, volume]) => (
                        <div key={name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-white/60">{name}</span>
                            <span className="text-white/40">{volume.toFixed(2)} USDC</span>
                          </div>
                          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-400 rounded-full"
                              style={{ width: chainTotal > 0 ? `${(volume / chainTotal) * 100}%` : "0%" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent settled invoices */}
            <div className="ui-card overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06]">
                <h2 className="text-white font-semibold text-sm">Recent Settled Invoices</h2>
              </div>
              {settled.length === 0 ? (
                <div className="py-12 text-center text-white/25 text-sm">No settled invoices yet.</div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {settled.slice(0, 8).map((inv) => (
                    <div key={inv.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <span className="text-white/70 text-xs font-mono">
                          INV-{inv.id.toUpperCase().slice(0, 4)}...{inv.id.toUpperCase().slice(-4)}
                        </span>
                        {inv.description && (
                          <span className="text-white/30 text-xs ml-2">— {inv.description}</span>
                        )}
                      </div>
                      <span className="text-indigo-300 text-sm font-bold">{Number(inv.amount).toFixed(2)} USDC</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#13131a] border-t border-white/[0.06] flex z-50">
          <a href="/create-invoice" className="flex-1 flex flex-col items-center justify-center py-3 text-white/40">
            <IconPlus /><span className="text-[10px] mt-0.5">Create</span>
          </a>
          <a href="/invoices" className="flex-1 flex flex-col items-center justify-center py-3 text-white/40">
            <IconInvoices /><span className="text-[10px] mt-0.5">Invoices</span>
          </a>
          <a href="/payments" className="flex-1 flex flex-col items-center justify-center py-3 text-white/40">
            <IconPayments /><span className="text-[10px] mt-0.5">Payments</span>
          </a>
          <a href="/analytics" className="flex-1 flex flex-col items-center justify-center py-3 text-indigo-400">
            <IconAnalytics /><span className="text-[10px] mt-0.5">Analytics</span>
          </a>
        </div>
      </main>
    </div>
  );
}
