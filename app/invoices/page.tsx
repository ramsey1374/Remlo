"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import RemloWalletModal from "../components/RemloWalletModal";
import { supabase } from "@/lib/db";
import { IconPlus, IconInvoices, IconPayments, IconAnalytics, IconSettings, IconCopy, IconCheck, IconDoc, IconMenu, IconGlobe } from "../components/Icons";
import { useToast } from "@/lib/toast";
import * as Sentry from "@sentry/nextjs";

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

type Invoice = {
  id: string;
  amount: number;
  receiver: string;
  paid: boolean;
  status: string | null;
  created_at: string | null;
  expires_at: string | null;
  tx_hash: string | null;
  description?: string | null;
  notes?: string | null;
};

type PaymentIntent = {
  id: string;
  recipient: string;
  amount: number;
  token: string;
  tx_hash: string | null;
  chain_id: number | null;
  status: string | null;
  created_at: string;
};

function chainName(chainId: number | null) {
  const map: Record<number, string> = {
    11155111: "Eth Sepolia", 421614: "Arb Sepolia", 84532: "Base Sepolia",
  };
  return chainId ? map[chainId] ?? `Chain ${chainId}` : "—";
}

function formatInvoiceId(id: string) {
  const upper = id.toUpperCase();
  if (upper.length <= 8) return `INV-${upper}`;
  return `INV-${upper.slice(0, 4)}...${upper.slice(-4)}`;
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; dot: string }> = {
    settled: { label: "Settled", color: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20", dot: "bg-indigo-400" },
    pending: { label: "Pending", color: "bg-amber-500/10 text-amber-400 border border-amber-500/20", dot: "bg-amber-400" },
    expired: { label: "Expired", color: "bg-red-500/10 text-red-400 border border-red-500/20", dot: "bg-red-400" },
  };
  const s = map[status?.toLowerCase()] ?? map["pending"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export default function InvoicesPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const { toast } = useToast();
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [isRemloModalOpen, setIsRemloModalOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "settled" | "expired">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!address) return;
    if (!silent) setLoading(true);
    setNetworkError(false);
    try {
      const { data: invData, error: invError } = await supabase
        .from("invoices").select("*").eq("receiver", address)
        .order("created_at", { ascending: false });

      if (invError) throw invError;

      const { data: intentData, error: intentError } = await supabase
        .from("payment_intents").select("*")
        .order("created_at", { ascending: false });

      if (intentError) throw intentError;

      // Auto-expire
      const now = new Date();
      const toExpire = (invData ?? []).filter(
        (inv) => inv.expires_at && new Date(inv.expires_at) < now
          && inv.status !== "settled" && inv.status !== "expired"
      );
      if (toExpire.length > 0) {
        await supabase.from("invoices").update({ status: "expired" })
          .in("id", toExpire.map((i) => i.id));
        toExpire.forEach((inv) => { inv.status = "expired"; });
      }

      setInvoices(invData ?? []);
      setIntents(intentData ?? []);
      setLastRefresh(new Date());
    } catch (err: any) {
      Sentry.captureException(err);
      if (!navigator.onLine || err?.message?.includes("fetch")) {
        setNetworkError(true);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!address) return;
    fetchData();
  }, [address, fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!address) return;
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [address, fetchData]);

  // Online/offline
  useEffect(() => {
    const handleOnline = () => { setNetworkError(false); fetchData(); };
    const handleOffline = () => setNetworkError(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, [fetchData]);

  async function copyInvoiceLink(id: string) {
    const link = `${window.location.origin}/pay/${id}`;
    await navigator.clipboard.writeText(link);
    setCopied(id);
    toast("Payment link copied!", "success");
    setTimeout(() => setCopied(null), 2000);
  }

  async function exportCSV() {
    if (!address) return;
    setExporting(true);
    try {
      const url = `/api/export-csv?address=${address}`;
      const res = await fetch(url);
      if (!res.ok) { toast("No invoices to export.", "warning"); return; }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `remlo-invoices-${address.slice(0, 6)}.csv`;
      a.click();
      toast("CSV exported successfully!", "success");
    } catch (err) {
      Sentry.captureException(err);
      toast("Export failed. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  }

  const rows = invoices.map((inv) => {
    const intent = intents.find((p) => p.id === inv.id);
    const rawStatus = inv.paid ? "settled" : inv.status ?? intent?.status ?? "pending";
    const status = rawStatus === "confirmed" ? "settled" : rawStatus;
    return { ...inv, intent, status };
  });

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const counts = {
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    settled: rows.filter((r) => r.status === "settled").length,
    expired: rows.filter((r) => r.status === "expired").length,
  };

  const totalVolume = rows.filter((r) => r.status === "settled").reduce((s, r) => s + r.amount, 0);
  const pendingVolume = rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const expiredVolume = rows.filter((r) => r.status === "expired").reduce((s, r) => s + r.amount, 0);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-sm w-full">
          <div className="flex items-center justify-center mb-10"><RemloLogo size={120} /></div>
          <h1 className="text-white text-3xl font-bold tracking-tight mb-3">Connect your wallet</h1>
          <p className="text-white/40 text-sm leading-relaxed mb-8">Connect to view your invoices.</p>
          <>
            <button onClick={() => setIsRemloModalOpen(true)}
              className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all text-sm">
              Connect Wallet
            </button>
            <RemloWalletModal isOpen={isRemloModalOpen} onClose={() => setIsRemloModalOpen(false)} />
          </>
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
            { label: "Invoices", icon: <IconInvoices />, href: "/invoices", active: true },
            { label: "Payments", icon: <IconPayments />, href: "/payments" },
            { label: "Analytics", icon: <IconAnalytics />, href: "/analytics" },
            { label: "Settings", icon: <IconSettings />, href: "/settings" },
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

      <main className="flex-1 p-4 md:p-8 overflow-x-hidden pb-24 md:pb-8">
        <div className="flex md:hidden items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <RemloLogo size={28} />
        
          </div>
          <a href="/create-invoice" className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-lg">+ Create</a>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-white text-xl md:text-2xl font-bold tracking-tight mb-1">Invoices</h1>
            <p className="text-white/40 text-sm">
              All payments settle on Arc.
              <span className="text-white/20 ml-2 text-xs">
                Refreshed {formatTimeAgo(lastRefresh.toISOString())}
              </span>
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button onClick={exportCSV} disabled={exporting}
              className="ui-button-secondary text-xs py-2 px-3 disabled:opacity-40">
              {exporting ? "Exporting..." : "↓ Export CSV"}
            </button>
            <a href="/create-invoice"
              className="ui-button-primary text-sm py-2.5 px-4">
              + Create Invoice
            </a>
          </div>
        </div>

        {networkError && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center mb-6">
            <div className="text-2xl mb-2"><IconGlobe size={28} /></div>
            <div className="text-red-400 font-semibold text-sm mb-1">No Internet Connection</div>
            <button onClick={() => fetchData()}
              className="ui-button-secondary text-xs mt-3">
              Try Again
            </button>
          </div>
        )}

        {!networkError && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total Invoices", value: counts.all, sub: `${totalVolume.toFixed(2)} USDC settled`, color: "text-white" },
                { label: "Pending", value: counts.pending, sub: `${pendingVolume.toFixed(2)} USDC`, color: "text-amber-400" },
                { label: "Settled to Arc", value: counts.settled, sub: `${totalVolume.toFixed(2)} USDC`, color: "text-indigo-400" },
                { label: "Expired", value: counts.expired, sub: `${expiredVolume.toFixed(2)} USDC`, color: "text-red-400" },
              ].map((stat) => (
                <div key={stat.label} className="ui-card p-4 md:p-5">
                  <div className="text-white/40 text-xs mb-2">{stat.label}</div>
                  <div className={`text-2xl md:text-3xl font-black tracking-tight mb-1 ${stat.color}`}>{stat.value}</div>
                  <div className="text-white/30 text-xs">{stat.sub}</div>
                </div>
              ))}
            </div>

            <div className="ui-card overflow-hidden">
              <div className="flex items-center gap-1 px-4 md:px-6 py-4 border-b border-white/[0.06] overflow-x-auto">
                {(["all", "pending", "settled", "expired"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`ui-button-secondary text-xs py-1.5 px-2.5 transition-all capitalize whitespace-nowrap ${
                      filter === f ? "bg-white/[0.08] text-white" : "text-white/30 hover:text-white/60"
                    }`}>
                    {f}
                    <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                      filter === f ? "bg-white/10 text-white/70" : "bg-white/[0.04] text-white/30"
                    }`}>{counts[f]}</span>
                  </button>
                ))}
                {/* Mobile export */}
                <button onClick={exportCSV} disabled={exporting}
                  className="ml-auto flex-shrink-0 ui-button-secondary text-xs disabled:opacity-40 md:hidden">
                  ↓ CSV
                </button>
              </div>

              {loading ? (
                <div className="py-20 text-center text-white/25 text-sm animate-pulse">Loading invoices...</div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.04]">
                          {["Invoice", "Amount", "Status", "Source Chain", "Created", "Actions"].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold text-white/25 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((row) => (
                          <React.Fragment key={row.id}>
                            <tr
                              className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                              <td className="px-6 py-4">
                                <div className="text-white text-sm font-semibold font-mono">{formatInvoiceId(row.id)}</div>
                                <div className="text-white/30 text-xs mt-0.5 font-mono">To: {row.receiver?.slice(0, 6)}...{row.receiver?.slice(-4)}</div>
                                {row.description && (
                                  <div className="text-white/25 text-xs mt-0.5 truncate max-w-[160px]">{row.description}</div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-white text-sm font-bold">{row.amount.toFixed(2)} USDC</div>
                              </td>
                              <td className="px-6 py-4">
                                <StatusBadge status={row.status} />
                                <div className="text-white/25 text-xs mt-1">
                                  {row.status === "settled" ? "On Arc" : row.status === "pending" ? "Waiting for payment" : row.status === "expired" ? "Link expired" : "—"}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {row.intent?.chain_id ? (
                                  <div className="flex items-center gap-2 text-white/50 text-xs font-mono">
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      row.intent.chain_id === 421614 ? "bg-sky-400" :
                                      row.intent.chain_id === 84532 ? "bg-blue-500" : "bg-purple-400"
                                    }`} />
                                    {chainName(row.intent.chain_id)}
                                    <span className="text-white/20">→ Arc</span>
                                  </div>
                                ) : <span className="text-white/20 text-xs">—</span>}
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-white/50 text-xs">{formatTimeAgo(row.created_at)}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <a href={`/invoices/${row.id}`}
                                    className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white text-xs font-semibold rounded-lg transition-all">
                                    View
                                  </a>
                                  <button onClick={() => copyInvoiceLink(row.id)} title="Copy link"
                                    className="w-7 h-7 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.1] text-white/50 hover:text-white rounded-lg transition-all text-xs">
                                    {copied === row.id ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                  </button>
                                  {row.notes && (
                                    <button onClick={() => setExpandedNotes(expandedNotes === row.id ? null : row.id)}
                                      title="View private notes"
                                      className="w-7 h-7 flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all text-xs">
                                      <IconDoc size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {/* Private notes row */}
                            {expandedNotes === row.id && row.notes && (
                              <tr key={`${row.id}-notes`} className="border-b border-white/[0.04] bg-amber-500/5">
                                <td colSpan={6} className="px-6 py-3">
                                  <div className="flex items-start gap-2">
                                    <span className="text-amber-400 text-xs flex-shrink-0"><IconDoc size={14} /> Private note:</span>
                                    <span className="text-amber-300/70 text-xs leading-relaxed">{row.notes}</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-20 text-center text-white/25 text-sm">
                              No invoices found.{" "}
                              <a href="/create-invoice" className="text-indigo-400 hover:text-indigo-300">Create one →</a>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {filtered.map((row) => (
                      <div key={row.id} className="ui-card p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-white text-sm font-semibold font-mono">{formatInvoiceId(row.id)}</div>
                            <div className="text-white/30 text-xs font-mono">To: {row.receiver?.slice(0, 6)}...{row.receiver?.slice(-4)}</div>
                          </div>
                          <StatusBadge status={row.status} />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div>
                            <div className="text-white font-bold text-sm">{row.amount.toFixed(2)} USDC</div>
                            <div className="text-white/30 text-xs">{formatTimeAgo(row.created_at)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={`/invoices/${row.id}`}
                              className="px-3 py-1.5 bg-white/[0.06] text-white/70 text-xs font-semibold rounded-lg">View</a>
                            <button onClick={() => copyInvoiceLink(row.id)}
                              className="w-7 h-7 flex items-center justify-center bg-white/[0.06] text-white/50 rounded-lg text-xs">
                              {copied === row.id ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </button>
                          </div>
                        </div>
                        {row.notes && (
                          <div className="mt-2 px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                              <span className="text-amber-400/70 text-xs"><IconDoc size={14} /> {row.notes}</span>
                            </div>
                        )}
                      </div>
                    ))}
                    {filtered.length === 0 && (
                      <div className="px-4 py-16 text-center text-white/25 text-sm">
                        No invoices found.{" "}
                        <a href="/create-invoice" className="text-indigo-400">Create one →</a>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#13131a] border-t border-white/[0.06] flex z-50">
          <a href="/create-invoice" className="flex-1 flex flex-col items-center justify-center py-3 text-white/40">
            <IconPlus /><span className="text-[10px] mt-0.5">Create</span>
          </a>
          <a href="/invoices" className="flex-1 flex flex-col items-center justify-center py-3 text-indigo-400">
            <IconInvoices /><span className="text-[10px] mt-0.5">Invoices</span>
          </a>
          <a href="/payments" className="flex-1 flex flex-col items-center justify-center py-3 text-white/40">
            <IconPayments /><span className="text-[10px] mt-0.5">Payments</span>
          </a>
          <a href="/settings" className="flex-1 flex flex-col items-center justify-center py-3 text-white/40">
            <IconSettings /><span className="text-[10px] mt-0.5">Settings</span>
          </a>
        </div>
      </main>
    </div>
  );
}
