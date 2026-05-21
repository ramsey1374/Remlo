"use client";

import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { supabase } from "@/lib/db";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/lib/toast";
import { sanitizeText, sanitizeAmount } from "@/lib/sanitize";
import { checkRateLimit, formatResetTime } from "@/lib/rate-limit";
import * as Sentry from "@sentry/nextjs";


function RemloLogo({ size = 28 }: { size?: number }) {
  return <img src="/remlo-logo.png" alt="Remlo" width={size} height={size} style={{ objectFit: "contain" }} />;
}
function ArcLogo({ size = 28 }: { size?: number }) {
  return <img src="/arc-logo.jpg" alt="Arc" width={size} height={size} style={{ objectFit: "contain", borderRadius: "6px" }} />;
}
function USDCLogo({ size = 24 }: { size?: number }) {
  return <img src="/usdc-logo.png" alt="USDC" width={size} height={size} style={{ objectFit: "contain", borderRadius: "50%" }} />;
}

const TEMPLATES = [
  { label: "Web Design", description: "Website design and development services" },
  { label: "Consulting", description: "Consulting services" },
  { label: "Smart Contract Audit", description: "Smart contract security audit" },
  { label: "Content Writing", description: "Content writing and copywriting services" },
  { label: "UI/UX Design", description: "UI/UX design services" },
  { label: "Custom", description: "" },
];

export default function CreateInvoicePage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState(""); // private notes
  const [expiry, setExpiry] = useState("7");
  const [link, setLink] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + parseInt(expiry || "7"));
  const expiryLabel = expiryDate.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const previewId = invoiceId
    ? `INV-${invoiceId.toUpperCase().slice(0, 4)}...${invoiceId.toUpperCase().slice(-4)}`
    : "INV-XXXX...XXXX";

  async function createInvoice() {
    if (!address) return;

    // ── RATE LIMIT CHECK ──
    const rl = checkRateLimit(address);
    if (!rl.allowed) {
      toast(`Too many invoices. Try again in ${formatResetTime(rl.resetIn)}.`, "error");
      return;
    }

    // ── SANITIZE ──
    const sanitizedDescription = sanitizeText(description, 100);
    const sanitizedNotes = sanitizeText(notes, 300);
    const sanitizedAmount = sanitizeAmount(amount);

    if (!sanitizedAmount) {
      toast("Please enter a valid amount greater than 0.", "error");
      return;
    }

    setLoading(true);
    try {
      // ── COLLISION-SAFE ID ──
      let id = "";
      let attempts = 0;
      while (attempts < 5) {
        const candidate = crypto.randomUUID().slice(0, 6);
        const { data: existing } = await supabase
          .from("invoices").select("id").eq("id", candidate).single();
        if (!existing) { id = candidate; break; }
        attempts++;
      }

      if (!id) {
        toast("Failed to generate unique invoice ID. Please try again.", "error");
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiry || "7"));

      const { error } = await supabase.from("invoices").insert({
        id,
        amount: sanitizedAmount,
        receiver: address!,
        paid: false,
        status: "pending",
        description: sanitizedDescription || null,
        notes: sanitizedNotes || null,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

      if (error) {
        Sentry.captureException(error);
        toast("Failed to create invoice. Please try again.", "error");
        return;
      }

      localStorage.setItem("invoice", JSON.stringify({
        id, amount: String(sanitizedAmount), receiver: address!, token: "",
      }));

      setInvoiceId(id);
      setLink(`${window.location.origin}/pay/${id}`);
      toast(`Invoice created! ${rl.remaining} remaining this hour.`, "success");
    } catch (err) {
      Sentry.captureException(err);
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast("Payment link copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-sm w-full">
          <div className="flex items-center justify-center mb-10"><RemloLogo size={120} /></div>
          <h1 className="text-white text-3xl font-bold tracking-tight mb-3">Connect your wallet</h1>
          <p className="text-white/40 text-sm leading-relaxed mb-8">Connect to create and manage invoices.</p>
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button onClick={openConnectModal}
                className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all text-sm">
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
      <aside className="hidden md:flex w-[200px] min-h-screen bg-[#13131a] border-r border-white/[0.06] flex-col">
        <div className="flex items-center justify-center px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <RemloLogo size={28} />
            <span className="text-white font-bold text-base tracking-tight">Remlo</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {[
            { label: "Create Invoice", icon: "+", href: "/create-invoice", active: true },
            { label: "Invoices", icon: "☰", href: "/invoices" },
            { label: "Payments", icon: "↕", href: "/payments" },
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
        <div className="flex md:hidden items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <RemloLogo size={28} />
            <span className="text-white font-bold text-base tracking-tight">Remlo</span>
          </div>
          <a href="/invoices" className="text-white/40 text-sm hover:text-white transition-colors">Invoices →</a>
        </div>

        <div className="mb-6 md:mb-8">
          <h1 className="text-white text-xl md:text-2xl font-bold tracking-tight">Create Invoice</h1>
          <p className="text-white/40 text-sm mt-1">Set the amount and destination. We'll handle the rest.</p>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl">

          {/* Form */}
          <div className="bg-[#13131a] border border-white/[0.06] rounded-2xl p-4 md:p-6 flex flex-col gap-4 md:gap-5 self-start">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-base">Invoice Details</h2>
              <button onClick={() => setShowTemplates(!showTemplates)}
                className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-all">
                {showTemplates ? "Hide templates" : "Use template"}
              </button>
            </div>

            {showTemplates && (
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.label}
                    onClick={() => { setDescription(t.description); setShowTemplates(false); }}
                    className="px-3 py-2.5 bg-[#0d0d14] border border-white/[0.08] hover:border-indigo-500/40 rounded-xl text-left transition-all group">
                    <div className="text-white/70 text-xs font-semibold group-hover:text-white">{t.label}</div>
                    {t.description && <div className="text-white/30 text-[10px] mt-0.5 truncate">{t.description}</div>}
                  </button>
                ))}
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2 block">Amount</label>
              <div className="flex items-center gap-2 bg-[#0d0d14] border border-white/[0.08] rounded-xl px-4 py-3 focus-within:border-indigo-500/50 transition-colors">
                <input type="number" placeholder="0.00" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-transparent text-white text-lg font-bold outline-none placeholder:text-white/20" />
                <div className="flex items-center gap-2 bg-white/[0.06] px-3 py-1.5 rounded-lg">
                  <USDCLogo size={18} />
                  <span className="text-white text-sm font-semibold">USDC</span>
                </div>
              </div>
              <p className="text-white/25 text-xs mt-1.5">Payer will pay in USDC. We'll route automatically.</p>
            </div>

            {/* Description — public, shown to payer */}
            <div>
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Description
                <span className="text-white/20 font-normal ml-2 normal-case">(shown to payer)</span>
              </label>
              <textarea placeholder="e.g. Website development services"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={100} rows={2}
                className="w-full bg-[#0d0d14] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/20 resize-none focus:border-indigo-500/50 transition-colors" />
              <p className="text-white/25 text-xs text-right mt-1">{description.length}/100</p>
            </div>

            {/* Private notes — only visible to creator */}
            <div>
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Private Notes
                <span className="text-white/20 font-normal ml-2 normal-case">(only you can see this)</span>
              </label>
              <textarea placeholder="e.g. Client: Acme Corp, Project ref: #4521"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={300} rows={2}
                className="w-full bg-[#0d0d14] border border-white/[0.08] border-dashed rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/20 resize-none focus:border-indigo-500/50 transition-colors" />
              <p className="text-white/25 text-xs text-right mt-1">{notes.length}/300</p>
            </div>

            {/* Expiry */}
            <div>
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2 block">Invoice Expires</label>
              <div className="relative">
                <select value={expiry} onChange={(e) => setExpiry(e.target.value)}
                  className="w-full bg-[#0d0d14] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none appearance-none focus:border-indigo-500/50 transition-colors cursor-pointer">
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">▾</span>
              </div>
              <p className="text-white/25 text-xs mt-1.5">{expiryLabel}</p>
            </div>

            {/* Destination */}
            <div>
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2 block">Destination (You receive)</label>
              <div className="flex items-center justify-between bg-[#0d0d14] border border-white/[0.08] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <ArcLogo size={28} />
                  <div>
                    <div className="text-white text-sm font-semibold">Arc Testnet</div>
                    <div className="text-white/30 text-xs font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</div>
                  </div>
                </div>
                <span className="text-emerald-400 text-xs font-semibold bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20 hidden sm:inline-flex">
                  On Arc ✓
                </span>
              </div>
              <p className="text-white/25 text-xs mt-1.5">Your funds are always settled on Arc Testnet.</p>
            </div>

            <button onClick={createInvoice}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20">
              {loading ? "Creating..." : "Create Invoice"}
            </button>
          </div>

          {/* Preview + QR */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#13131a] border border-white/[0.06] rounded-2xl p-4 md:p-6">
              <h2 className="text-white font-semibold text-base mb-4 md:mb-5">Invoice Preview</h2>
              <div className="text-center mb-5 md:mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                  <USDCLogo size={32} />
                </div>
                <div className="text-white/40 text-xs mb-1">Invoice Amount</div>
                <div className="text-white text-3xl md:text-4xl font-black tracking-tight">
                  {amount ? parseFloat(amount).toFixed(2) : "0.00"} USDC
                </div>
                {description && <div className="text-white/40 text-xs mt-2">{description}</div>}
                <div className="text-white/30 text-xs mt-2">You will receive on</div>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <ArcLogo size={16} />
                  <span className="text-white font-semibold text-sm">Arc Testnet</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-4">
                {[
                  { label: "Invoice ID", value: previewId },
                  { label: "Expires", value: expiryLabel },
                  { label: "Payment", value: "Automatic routing" },
                  { label: "Payer Experience", value: "USDC sent from best chain" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-white/30 text-xs">{row.label}</span>
                    <span className="text-white/70 text-xs font-medium text-right ml-2">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#13131a] border border-white/[0.06] rounded-2xl p-4 md:p-5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-400 text-sm">🛡</span>
              </div>
              <div>
                <div className="text-white font-semibold text-sm mb-1">Smart routing enabled</div>
                <div className="text-white/40 text-xs leading-relaxed">
                  We'll find the best network with USDC and settle to Arc automatically.
                </div>
              </div>
            </div>

            {link && (
              <div className="bg-[#13131a] border border-emerald-500/20 rounded-2xl p-4 md:p-5">
                <div className="text-emerald-400 font-semibold text-sm mb-3">✓ Invoice Created — Share this link</div>
                <div className="flex items-center gap-2 bg-[#0d0d14] border border-white/[0.08] rounded-xl px-3 py-2.5 mb-4">
                  <span className="text-white/40 text-xs font-mono flex-1 truncate">{link}</span>
                  <button onClick={copyLink}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-all flex-shrink-0">
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="p-2.5 bg-white rounded-xl">
                    <QRCodeSVG value={link} size={110} bgColor="#ffffff" fgColor="#0d0d14" level="M" />
                  </div>
                  <p className="text-white/25 text-xs text-center">Scan to pay</p>
                </div>
                <a href={link} target="_blank"
                  className="block text-center text-white/30 hover:text-white/60 text-xs mt-2 transition-colors">
                  Open pay page ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#13131a] border-t border-white/[0.06] flex z-50">
        <a href="/create-invoice" className="flex-1 flex flex-col items-center justify-center py-3 text-indigo-400">
          <span className="text-lg">+</span><span className="text-[10px] mt-0.5">Create</span>
        </a>
        <a href="/invoices" className="flex-1 flex flex-col items-center justify-center py-3 text-white/40">
          <span className="text-lg">☰</span><span className="text-[10px] mt-0.5">Invoices</span>
        </a>
        <a href="/payments" className="flex-1 flex flex-col items-center justify-center py-3 text-white/40">
          <span className="text-lg">↕</span><span className="text-[10px] mt-0.5">Payments</span>
        </a>
        <a href="/settings" className="flex-1 flex flex-col items-center justify-center py-3 text-white/40">
          <span className="text-lg">⚙</span><span className="text-[10px] mt-0.5">Settings</span>
        </a>
      </div>
    </div>
  );
}
