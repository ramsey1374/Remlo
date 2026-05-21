"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { supabase } from "@/lib/db";
import { IconPlus, IconInvoices, IconPayments, IconAnalytics, IconSettings, IconMenu, IconCheck, IconCircle } from "../../components/Icons";

function RemloLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <img src="/remlo-logo.png" alt="Remlo" width={size} height={size} style={{ objectFit: "contain" }} />
      <span className="text-white font-bold text-base tracking-tight">Remlo</span>
    </div>
  );
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
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function chainName(chainId: number | null) {
  const map: Record<number, string> = {
    11155111: "Ethereum Sepolia", 421614: "Arbitrum Sepolia", 84532: "Base Sepolia",
  };
  return chainId ? map[chainId] ?? `Chain ${chainId}` : "—";
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

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [intent, setIntent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).single();
      const { data: intentData } = await supabase.from("payment_intents").select("*").eq("id", id).single();
      setInvoice(inv ?? null);
      setIntent(intentData ?? null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/pay/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
        <div className="text-white/40 text-sm animate-pulse">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
        <div className="text-red-400 text-sm">Invoice not found.</div>
      </div>
    );
  }

  const isExpired = invoice.expires_at && new Date(invoice.expires_at) < new Date()
    && invoice.status !== "settled";
  const status = invoice.paid ? "settled" : isExpired ? "expired" : invoice.status ?? intent?.status ?? "pending";
  const normalizedStatus = status === "confirmed" ? "settled" : status;

  const steps = [
    {
      key: "created", label: "Invoice Created",
      desc: "Invoice is created and ready for payment.",
      done: true, active: false,
      time: formatTimeAgo(invoice.created_at),
    },
    {
      key: "received", label: "Payment Received",
      desc: "Payment detected and confirming on source chain.",
      done: ["settled"].includes(normalizedStatus),
      active: normalizedStatus === "pending" && !!intent,
      sub: intent ? `Best network: ${chainName(intent.chain_id)}` : null,
    },
    {
      key: "settled", label: "Settled to Arc",
      desc: "Transaction completed on Arc Testnet.",
      done: normalizedStatus === "settled",
      active: false,
      sub: normalizedStatus === "settled" ? `You received ${invoice.amount.toFixed(2)} USDC.` : null,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#0d0d14]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[220px] min-h-screen flex-col ui-card px-0 py-0">
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
        {address && (
          <div className="px-3 py-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="text-white/70 text-xs font-mono flex-1 truncate">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
            <button onClick={() => disconnect()}
              className="w-full text-center text-xs text-white/30 hover:text-white/60 py-1 transition-colors">
              Disconnect
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8">
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
              onClick={() => setMobileDropdownOpen((c) => !c)}
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

        <div className="flex items-center justify-between mb-6">
          <a href="/invoices" className="text-white/30 hover:text-white/60 text-sm transition-colors">
            ← Back to Invoices
          </a>
          <div className="text-white/30 text-xs font-mono">
            {formatInvoiceId(String(id))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Left */}
          <div className="ui-card p-6">
            <div className="mb-6">
              <div className="text-white text-4xl font-black tracking-tight mb-2">
                {invoice.amount.toFixed(2)} USDC
              </div>
              <StatusBadge status={normalizedStatus} />
              {normalizedStatus === "settled" && (
                <div className="text-indigo-400 text-xs mt-1">On Arc Testnet</div>
              )}
              {normalizedStatus === "expired" && (
                <div className="text-red-400 text-xs mt-1">
                  Expired {formatTimeAgo(invoice.expires_at)}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-5">
              {invoice.description && (
                <div>
                  <div className="text-white/30 text-xs mb-0.5">Description</div>
                  <div className="text-white/70 text-sm">{invoice.description}</div>
                </div>
              )}
              {[
                { label: "Receiver", value: invoice.receiver?.slice(0, 10) + "..." + invoice.receiver?.slice(-4), mono: true },
                { label: "Payer", value: intent ? intent.recipient?.slice(0, 10) + "..." + intent.recipient?.slice(-4) : "—", mono: true },
                { label: "Source Chain", value: chainName(intent?.chain_id ?? null) },
                { label: "Settlement", value: "Arc Testnet", accent: true },
                { label: "Created", value: formatTimeAgo(invoice.created_at) },
                { label: "Expires", value: invoice.expires_at ? new Date(invoice.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="text-white/30 text-xs mb-0.5">{row.label}</div>
                  <div className={`text-sm ${
                    row.accent ? "text-indigo-400 font-semibold" :
                    row.mono ? "font-mono text-xs text-white/60" : "text-white/70"
                  }`}>{row.value}</div>
                </div>
              ))}
              {intent?.tx_hash && (
                <div>
                  <div className="text-white/30 text-xs mb-0.5">Tx Hash</div>
                  <div className="text-white/60 text-xs font-mono">
                    {intent.tx_hash.slice(0, 16)}...{intent.tx_hash.slice(-6)}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-5 border-t border-white/[0.06]">
              {intent?.tx_hash && (
                <a href={`https://testnet.arcscan.app/tx/${intent.tx_hash}`} target="_blank"
                  className="ui-button-secondary text-xs py-2.5 flex-1">
                  View on Explorer ↗
                </a>
              )}
              {normalizedStatus !== "expired" && normalizedStatus !== "settled" && (
                <button onClick={copyLink}
                  className="ui-button-secondary text-xs py-2.5 flex-1 flex items-center justify-center gap-2">
                  {copied ? (<><IconCheck size={14} /> Copied!</>) : "Copy Payment Link"}
                </button>
              )}
              {normalizedStatus !== "expired" && (
                <a href={`/pay/${invoice.id}`} target="_blank"
                  className="ui-button-secondary text-xs py-2.5 flex-1">
                  Share Invoice ↗
                </a>
              )}
            </div>
          </div>

          {/* Right: lifecycle */}
          <div className="ui-card p-6">
            <h2 className="text-white font-semibold text-base mb-6">Payment Lifecycle</h2>
            <div className="flex flex-col gap-0">
              {steps.map((step, i) => (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold z-10 ${
                      step.done ? "bg-emerald-500 text-white" :
                      step.active ? "bg-amber-500 text-white" :
                      "bg-white/[0.06] text-white/20 border border-white/[0.08]"
                    }`}>
                      {step.done ? <IconCheck size={12} /> : <IconCircle size={12} />}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`w-px flex-1 my-1 ${step.done ? "bg-emerald-500/30" : "bg-white/[0.06]"}`}
                        style={{ minHeight: 24 }} />
                    )}
                  </div>
                  <div className="pb-6 flex-1">
                    <div className={`text-sm font-semibold mb-0.5 ${
                      step.done ? "text-emerald-400" :
                      step.active ? "text-amber-400" : "text-white/25"
                    }`}>{step.label}</div>
                    {step.time && <div className="text-white/30 text-xs mb-1">{step.time}</div>}
                    <div className="text-white/40 text-xs leading-relaxed">{step.desc}</div>
                    {step.sub && <div className="text-white/50 text-xs mt-0.5 font-medium">{step.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
