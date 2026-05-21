"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { supabase } from "@/lib/db";
import { useToast } from "@/lib/toast";
import { sanitizeDisplayName, sanitizeText, isValidUrl } from "@/lib/sanitize";
import * as Sentry from "@sentry/nextjs";
import { IconPlus, IconInvoices, IconPayments, IconAnalytics, IconSettings, IconMenu } from "../components/Icons";

function RemloLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <img src="/remlo-logo.png" alt="Remlo" width={size} height={size} style={{ objectFit: "contain" }} />
      <span className="text-white font-bold text-base tracking-tight">Remlo</span>
    </div>
  );
}

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const { toast } = useToast();
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [allowPartialPayment, setAllowPartialPayment] = useState(false);
  const [allowTip, setAllowTip] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    loadSettings();
  }, [address]);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("user_settings").select("*").eq("address", address).single();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setWebhookUrl(data.webhook_url ?? "");
        setWebhookSecret(data.webhook_secret ?? "");
        setAllowPartialPayment(data.allow_partial ?? false);
        setAllowTip(data.allow_tip ?? false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!address) return;

    // Validate webhook URL if provided
    if (webhookUrl && !isValidUrl(webhookUrl)) {
      toast("Please enter a valid webhook URL (must start with https://)", "error");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("user_settings").upsert({
        address,
        display_name: sanitizeDisplayName(displayName) || null,
        webhook_url: webhookUrl || null,
        webhook_secret: webhookSecret || null,
        allow_partial: allowPartialPayment,
        allow_tip: allowTip,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast("Settings saved!", "success");
    } catch (err) {
      Sentry.captureException(err);
      toast("Failed to save settings. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function testWebhook() {
    if (!webhookUrl) return;
    if (!isValidUrl(webhookUrl)) {
      toast("Please enter a valid webhook URL.", "error");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl,
          secret: webhookSecret || null,
          payload: {
            event: "payment.settled",
            test: true,
            invoice_id: "test-invoice",
            amount: "5.00",
            token: "USDC",
            settlement: "Arc Testnet",
            timestamp: new Date().toISOString(),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult("Webhook delivered successfully");
        toast("Test webhook sent!", "success");
      } else {
        setTestResult(`Webhook failed (status ${data.status})`);
        toast(`Webhook failed with status ${data.status}`, "error");
      }
    } catch (err) {
      setTestResult("Failed to reach webhook URL");
      toast("Could not reach webhook URL.", "error");
    } finally {
      setTesting(false);
    }
  }

  function generateSecret() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const secret = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
    setWebhookSecret(secret);
    toast("Secret generated!", "info");
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-sm w-full">
          <div className="flex items-center justify-center mb-10"><RemloLogo size={120} /></div>
          <h1 className="text-white text-3xl font-bold tracking-tight mb-3">Connect your wallet</h1>
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
            { label: "Invoices", icon: <IconInvoices />, href: "/invoices" },
            { label: "Payments", icon: <IconPayments />, href: "/payments" },
            { label: "Analytics", icon: <IconAnalytics />, href: "/analytics" },
            { label: "Settings", icon: <IconSettings />, href: "/settings", active: true },
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

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-2xl">
        <div className="flex md:hidden items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <RemloLogo size={28} />
            <span className="text-white font-bold text-base tracking-tight">Remlo</span>
          </div>
          <div className="relative">
            <button className="h-10 w-10 rounded-xl border border-white/[0.08] bg-[#13131a] text-white/70 hover:text-white transition" onClick={() => setMobileDropdownOpen((c) => !c)}>
              <IconMenu />
            </button>
            {mobileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#13131a] border border-white/[0.06] rounded-2xl shadow-lg z-50">
                {[{ label: "Invoices", href: "/invoices" },{ label: "Payments", href: "/payments" },{ label: "Analytics", href: "/analytics" },{ label: "Settings", href: "/settings" },].map((item) => (
                  <button key={item.label} type="button" onClick={() => { router.push(item.href); setMobileDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.04] transition">{item.label}</button>
                ))}
                <div className="border-t border-white/[0.06]"><button type="button" onClick={() => { disconnect(); setMobileDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 transition">Disconnect</button></div>
              </div>
            )}
          </div>
          </div>
        <div className="mb-8">
          <h1 className="text-white text-xl md:text-2xl font-bold tracking-tight mb-1">Settings</h1>
          <p className="text-white/40 text-sm">Configure your invoice preferences and notifications.</p>
        </div>

        {loading ? (
          <div className="text-white/25 text-sm animate-pulse">Loading settings...</div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* Custom branding */}
            <div className="bg-[#13131a] border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-white font-semibold text-base mb-1">Profile & Branding</h2>
              <p className="text-white/40 text-xs mb-5">
                Customize how you appear on payment pages.
              </p>

              <div>
                <label className="ui-label">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Johnson, Acme Design Studio"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                  className="ui-input"
                />
                <p className="text-white/25 text-xs mt-1.5">
                  Shown on pay page as "{displayName || "Your Name"}" alongside your wallet address.
                </p>
              </div>

              {/* Preview of how it looks on pay page */}
              <div className="mt-4 bg-[#0d0d14] border border-white/[0.06] rounded-xl p-4">
                <div className="text-white/30 text-xs mb-2">Pay page preview:</div>
                <div className="flex flex-col items-center text-center">
                  <div className="text-white font-semibold text-sm">
                    {displayName || "Your Name"}
                  </div>
                  <div className="text-white/40 text-xs font-mono mt-0.5">
                    {address?.slice(0, 8)}...{address?.slice(-4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment preferences */}
            <div className="ui-card p-6">
              <h2 className="text-white font-semibold text-base mb-1">Payment Preferences</h2>
              <p className="text-white/40 text-xs mb-5">Control how payers can pay your invoices.</p>

              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-white text-sm font-medium mb-0.5">Allow partial payments</div>
                    <div className="text-white/40 text-xs leading-relaxed">
                      Payers can pay less than the invoice amount.
                    </div>
                  </div>
                  <button onClick={() => setAllowPartialPayment(!allowPartialPayment)}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all ${allowPartialPayment ? "bg-indigo-500" : "bg-white/[0.1]"}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${allowPartialPayment ? "left-6" : "left-1"}`} />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-4 pt-4 border-t border-white/[0.06]">
                  <div>
                    <div className="text-white text-sm font-medium mb-0.5">Allow tips</div>
                    <div className="text-white/40 text-xs leading-relaxed">
                      Payers can add a tip on top of the invoice amount.
                    </div>
                  </div>
                  <button onClick={() => setAllowTip(!allowTip)}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all ${allowTip ? "bg-indigo-500" : "bg-white/[0.1]"}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${allowTip ? "left-6" : "left-1"}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Webhook */}
            <div className="ui-card p-6">
              <h2 className="text-white font-semibold text-base mb-1">Webhook</h2>
              <p className="text-white/40 text-xs mb-5">
                Receive a POST request whenever a payment is settled.
              </p>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2 block">Webhook URL</label>
                  <input type="url" placeholder="https://your-server.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-[#0d0d14] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/20 focus:border-indigo-500/50 transition-colors font-mono" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white/40 text-xs font-semibold uppercase tracking-wider">Signing Secret</label>
                    <button onClick={generateSecret} className="ui-button-secondary text-xs">Generate</button>
                  </div>
                  <input type="text" placeholder="Used to verify webhook authenticity"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="ui-input font-mono" />
                  <p className="text-white/25 text-xs mt-1.5">Check the X-Remlo-Signature header to verify requests.</p>
                </div>

                <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-4">
                  <div className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-2">Example Payload</div>
                  <pre className="text-white/50 text-xs font-mono leading-relaxed overflow-x-auto">{`{
  "event": "payment.settled",
  "invoice_id": "abc123",
  "amount": "50.00",
  "payer": "0x1234...abcd",
  "recipient": "0xabcd...1234",
  "source_chain": "Arbitrum Sepolia",
  "settlement": "Arc Testnet",
  "tx_hash": "0x...",
  "timestamp": "2026-05-17T00:00:00Z"
}`}</pre>
                </div>

                {webhookUrl && (
                  <div>
                    <button onClick={testWebhook} disabled={testing}
                      className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-white/60 hover:text-white text-xs font-semibold rounded-lg transition-all">
                      {testing ? "Sending..." : "Send test webhook"}
                    </button>
                    {testResult && (
                      <p className={`text-xs mt-2 ${testResult.toLowerCase().includes("success") ? "text-emerald-400" : "text-red-400"}`}>
                        {testResult}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button onClick={saveSettings} disabled={saving}
              className="ui-button-primary w-full py-3.5 text-sm disabled:opacity-40">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        )}

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
          <a href="/settings" className="flex-1 flex flex-col items-center justify-center py-3 text-indigo-400">
            <IconSettings /><span className="text-[10px] mt-0.5">Settings</span>
          </a>
        </div>
      </main>
    </div>
  );
}
