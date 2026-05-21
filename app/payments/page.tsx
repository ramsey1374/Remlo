"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { supabase } from "@/lib/db";

function RemloLogo({ size = 28 }: { size?: number }) {
  return <img src="/remlo-logo.png" alt="Remlo" width={size} height={size} style={{ objectFit: "contain" }} />;
}

function chainName(chainId: number | null) {
  const map: Record<number, string> = { 11155111: "Eth Sepolia", 421614: "Arb Sepolia", 84532: "Base Sepolia" };
  return chainId ? map[chainId] ?? `Chain ${chainId}` : "—";
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PaymentsPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    if (!address) return;
    fetchPayments();
  }, [address]);

  async function fetchPayments() {
    if (!address) return;
    setLoading(true);
    setNetworkError(false);
    try {
      // Fetch payment intents where this wallet was the payer (recipient field)
      const { data, error } = await supabase
        .from("payment_intents")
        .select("*")
        .eq("recipient", address)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Also get invoice details for each payment
      const invoiceIds = (data ?? []).map((p) => p.id);
      let invoices: any[] = [];
      if (invoiceIds.length > 0) {
        const { data: invData } = await supabase
          .from("invoices")
          .select("*")
          .in("id", invoiceIds);
        invoices = invData ?? [];
      }

      const enriched = (data ?? []).map((p) => ({
        ...p,
        invoice: invoices.find((inv) => inv.id === p.id),
      }));

      setPayments(enriched);
    } catch (err: any) {
      if (!navigator.onLine || err?.message?.includes("fetch")) {
        setNetworkError(true);
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }

  const totalPaid = payments
    .filter((p) => p.status === "settled")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-sm w-full">
          <div className="flex items-center justify-center mb-10">
            <RemloLogo size={120} />
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight mb-3">Connect your wallet</h1>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            Connect to view your payment history.
          </p>
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button onClick={openConnectModal}
                className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20">
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0d0d14]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[200px] min-h-screen bg-[#13131a] border-r border-white/[0.06] flex-col">
        <div className="flex items-center justify-center px-4 py-4 border-b border-white/[0.06]">
          <button
            type="button"
            onClick={() => router.push("/create-invoice")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-left"
          >
            <RemloLogo size={28} />
            <span className="text-white font-bold text-base tracking-tight">Remlo</span>
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {[
            { label: "Create Invoice", icon: "+", href: "/create-invoice" },
            { label: "Invoices", icon: "☰", href: "/invoices" },
            { label: "Payments", icon: "↕", href: "/payments", active: true },
            { label: "Analytics", icon: "◎", href: "/analytics" },
            { label: "Settings", icon: "⚙", href: "/settings" },
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

        {/* Mobile top bar */}
        <div className="flex md:hidden items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.push("/create-invoice")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <RemloLogo size={28} />
            <span className="text-white font-bold text-base tracking-tight">Remlo</span>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMobileDropdownOpen((current) => !current)}
              className="h-10 w-10 rounded-xl border border-white/[0.08] bg-[#13131a] text-white/70 hover:text-white transition"
            >
              <span className="text-lg">☰</span>
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
          <h1 className="text-white text-xl md:text-2xl font-bold tracking-tight mb-1">Payment History</h1>
          <p className="text-white/40 text-sm">All payments you've made as a payer.</p>
        </div>

        {networkError && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center mb-6">
            <div className="text-2xl mb-2">📡</div>
            <div className="text-red-400 font-semibold text-sm mb-1">No Internet Connection</div>
            <button onClick={fetchPayments}
              className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 text-xs rounded-lg transition-all mt-3">
              Try Again
            </button>
          </div>
        )}

        {!networkError && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {[
                { label: "Total Payments", value: payments.length, sub: "all time" },
                { label: "Total Paid", value: `${totalPaid.toFixed(2)}`, sub: "USDC settled to Arc", accent: true },
                { label: "Pending", value: payments.filter((p) => p.status === "pending").length, sub: "awaiting settlement" },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#13131a] border border-white/[0.06] rounded-2xl p-4 md:p-5">
                  <div className="text-white/40 text-xs mb-2">{stat.label}</div>
                  <div className={`text-2xl md:text-3xl font-black tracking-tight mb-1 ${stat.accent ? "text-indigo-400" : "text-white"}`}>
                    {stat.value}
                  </div>
                  <div className="text-white/30 text-xs">{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Payment list */}
            <div className="bg-[#13131a] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06]">
                <h2 className="text-white font-semibold text-sm">All Payments</h2>
              </div>

              {loading ? (
                <div className="py-20 text-center text-white/25 text-sm animate-pulse">Loading payments...</div>
              ) : payments.length === 0 ? (
                <div className="py-20 text-center text-white/25 text-sm">
                  No payments found. Pay an invoice to see your history here.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {payments.map((payment) => (
                    <div key={payment.id} className="px-4 md:px-6 py-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white text-sm font-semibold font-mono">
                              INV-{payment.id.toUpperCase().slice(0, 4)}...{payment.id.toUpperCase().slice(-4)}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              payment.status === "settled"
                                ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${payment.status === "settled" ? "bg-indigo-400" : "bg-amber-400"}`} />
                              {payment.status === "settled" ? "Settled" : "Pending"}
                            </span>
                          </div>
                          {payment.invoice?.description && (
                            <div className="text-white/40 text-xs mb-1">{payment.invoice.description}</div>
                          )}
                          <div className="flex items-center gap-3 text-white/30 text-xs">
                            <span>To: {payment.invoice?.receiver?.slice(0, 6)}...{payment.invoice?.receiver?.slice(-4)}</span>
                            <span>·</span>
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                payment.chain_id === 421614 ? "bg-sky-400" :
                                payment.chain_id === 84532 ? "bg-blue-500" : "bg-purple-400"
                              }`} />
                              {chainName(payment.chain_id)} → Arc
                            </div>
                            <span>·</span>
                            <span>{formatTimeAgo(payment.created_at)}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-white font-bold text-sm">{Number(payment.amount).toFixed(2)} USDC</div>
                          {payment.tx_hash && (
                            <a href={`https://testnet.arcscan.app/tx/${payment.tx_hash}`} target="_blank"
                              className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors">
                              Explorer ↗
                            </a>
                          )}
                        </div>
                      </div>
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
            <span className="text-lg">+</span><span className="text-[10px] mt-0.5">Create</span>
          </a>
          <a href="/invoices" className="flex-1 flex flex-col items-center justify-center py-3 text-white/40">
            <span className="text-lg">☰</span><span className="text-[10px] mt-0.5">Invoices</span>
          </a>
          <a href="/payments" className="flex-1 flex flex-col items-center justify-center py-3 text-indigo-400">
            <span className="text-lg">↕</span><span className="text-[10px] mt-0.5">Payments</span>
          </a>
          <a href="/analytics" className="flex-1 flex flex-col items-center justify-center py-3 text-white/40">
            <span className="text-lg">◎</span><span className="text-[10px] mt-0.5">Analytics</span>
          </a>
        </div>
      </main>
    </div>
  );
}
