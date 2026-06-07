"use client";

import { useEffect, useRef, useState } from "react";
import { setCookie, getCookie } from "cookies-next";
import Link from "next/link";
import type { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import { supabase } from "@/lib/db";
import { useToast } from "@/lib/toast";

const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID as string;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string;

type Wallet = {
  id: string;
  address: string;
  blockchain: string;
  state: string;
};

type Transaction = {
  id: string;
  amount: number;
  recipient: string;
  tx_hash: string | null;
  created_at: string;
};

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

export default function CircleWalletPage() {
  const sdkRef = useRef<W3SSdk | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceInput, setInvoiceInput] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const { toast } = useToast();

  // ── INIT SDK ──
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
        const onLoginComplete = (err: unknown, result: any) => {
          if (cancelled) return;
          if (err) {
            const e = err as any;
            setError(e.message || "Google login failed");
            return;
          }
          const token = result.userToken;
          setUserToken(token);
          setCookie("circleUserToken", token);
          loadWalletAndTransactions(token);
        };

        const sdk = new W3SSdk(
          {
            appSettings: { appId: APP_ID },
            loginConfigs: {
              deviceToken: getCookie("deviceToken") as string || "",
              deviceEncryptionKey: getCookie("deviceEncryptionKey") as string || "",
              google: {
                clientId: GOOGLE_CLIENT_ID,
                redirectUri: typeof window !== "undefined" ? window.location.origin : "",
                selectAccountPrompt: true,
              },
            },
          },
          onLoginComplete
        );
        sdkRef.current = sdk;
        if (!cancelled) setSdkReady(true);

        // If we have a stored token, try to restore session
        const restoredToken = getCookie("circleUserToken") as string | undefined;
        if (restoredToken) {
          setUserToken(restoredToken);
          loadWalletAndTransactions(restoredToken);
        }
      } catch (e) {
        console.error("SDK init failed", e);
        if (!cancelled) setError("Failed to initialize Circle SDK");
      }
    };
    void init();
    return () => { cancelled = true; };
  }, []);

  async function handleGoogleLogin() {
    if (!sdkRef.current || !sdkReady) return;
    setLoading(true);
    try {
      const deviceId = await sdkRef.current.getDeviceId();
      const res = await fetch("/api/circle/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createDeviceToken", deviceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get device token");

      const { deviceToken, deviceEncryptionKey } = data;
      setCookie("deviceToken", deviceToken);
      setCookie("deviceEncryptionKey", deviceEncryptionKey);

      // KEEP THIS AS IS - updateConfigs is correct
      sdkRef.current.updateConfigs({
        appSettings: { appId: APP_ID },
        loginConfigs: {
          deviceToken,
          deviceEncryptionKey,
          google: {
            clientId: GOOGLE_CLIENT_ID,
            redirectUri: window.location.origin,
            selectAccountPrompt: true,
          },
        },
      });

      // WRONG - remove this:
      // sdkRef.current.socialLogin({ provider: "google" as any });

      // CORRECT - use this:
      await sdkRef.current.performLogin("google" as any);

    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadWalletAndTransactions(token: string) {
    try {
      const res = await fetch("/api/circle/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "listWallets", userToken: token }),
      });
      const data = await res.json();

      if (!res.ok) {
        await initializeAndCreateWallet(token);
        return;
      }

      const wallets: Wallet[] = data.wallets ?? [];
      const arcWallet = wallets.find((w) => w.blockchain === "ARC-TESTNET" && w.state === "LIVE");

      if (arcWallet) {
        setWallet(arcWallet);
        await loadBalance(token, arcWallet.id);
        await loadTransactions(arcWallet.address);
      } else {
        await initializeAndCreateWallet(token);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load wallet");
    }
  }

  async function initializeAndCreateWallet(token: string) {
    try {
      const res = await fetch("/api/circle/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initializeUser", userToken: token }),
      });
      const data = await res.json();

      if (!res.ok && data?.code !== 155106) {
        throw new Error(data.error || "Failed to initialize user");
      }

      const challengeId = data.challengeId;
      if (challengeId && sdkRef.current) {
        sdkRef.current.execute(challengeId, async (err, result) => {
          if (err) {
            setError("Wallet creation failed: " + (err as any).message);
            return;
          }
          await loadWalletAndTransactions(token);
        });
      } else {
        await loadWalletAndTransactions(token);
      }
    } catch (e: any) {
      setError(e.message || "Failed to create wallet");
    }
  }

  async function loadBalance(token: string, walletId: string) {
    try {
      const res = await fetch("/api/circle/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getTokenBalance", userToken: token, walletId }),
      });
      const data = await res.json();
      const balances = (data.tokenBalances as any[]) ?? [];
      const usdc = balances.find((t) =>
        (t.token?.symbol || "").includes("USDC") ||
        (t.token?.name || "").includes("USDC")
      );
      setUsdcBalance(usdc?.amount ?? "0");
    } catch {
      setUsdcBalance("0");
    }
  }

  async function loadTransactions(walletAddress: string) {
    try {
      const { data, error } = await supabase
        .from("payment_intents")
        .select("id, amount, recipient, tx_hash, created_at")
        .eq("recipient", walletAddress)
        .neq("tx_hash", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
    } catch (e) {
      console.error("Failed to load transactions", e);
    }
  }

  async function handleLookupInvoice() {
    setSelectedInvoice(null);
    setTransactionError(null);
    if (!invoiceInput.trim()) return;

    try {
      let invoiceId = invoiceInput.trim();
      if (invoiceId.includes("/pay/")) {
        invoiceId = invoiceInput.split("/pay/")[1].split("?")[0];
      }

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (error || !data) {
        setTransactionError("Invoice not found");
        return;
      }

      setSelectedInvoice(data);
    } catch (e: any) {
      setTransactionError("Failed to look up invoice: " + e.message);
    }
  }

  async function copyAddress() {
    if (wallet?.address) {
      await navigator.clipboard.writeText(wallet.address);
      toast("Copied! Address copied to clipboard", "success");
    }
  }

  function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // Not signed in
  if (!userToken) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center px-4 py-12">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-500/5 blur-[100px] pointer-events-none" />
        <div className="w-full max-w-sm relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <RemloLogo size={120} />
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">Circle Wallet</h1>
          <p className="text-white/40 text-sm mb-8">
            No crypto extension needed. Sign in with Google to access your embedded wallet.
          </p>
          <button
            onClick={handleGoogleLogin}
            disabled={!sdkReady || loading}
            className="w-full max-w-sm py-3.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-3 mx-auto"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          <p className="text-white/20 text-xs text-center mt-8">
            Powered by Circle · Secured on Arc Network
          </p>
        </div>
      </div>
    );
  }

  // Wallet loaded
  return (
    <div className="min-h-screen bg-[#0d0d14] pb-24 md:pb-0">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-[200px] fixed left-0 top-0 h-screen flex-col bg-[#0d0d14] border-r border-white/[0.06] p-4 gap-8">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <RemloLogo size={24} />
          <span className="text-white font-bold text-sm">Remlo</span>
        </Link>
        <nav className="flex flex-col gap-2">
          {[
            { label: "Create Invoice", icon: "+", href: "/create-invoice" },
            { label: "Invoices", icon: "☰", href: "/invoices" },
            { label: "Payments", icon: "↕", href: "/payments" },
            { label: "Analytics", icon: "📊", href: "/analytics" },
            { label: "Settings", icon: "⚙", href: "/settings" },
            { label: "Circle Wallet", icon: "◈", href: "/circle-wallet" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                item.href === "/circle-wallet"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-white/60 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#13131a] border-t border-white/[0.06] flex items-center justify-around h-20">
        {[
          { label: "Create", icon: "+", href: "/create-invoice" },
          { label: "Invoices", icon: "☰", href: "/invoices" },
          { label: "Payments", icon: "↕", href: "/payments" },
          { label: "Settings", icon: "⚙", href: "/settings" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 text-white/60 hover:text-white text-xs"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div className="md:ml-[200px] px-4 md:px-8 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-white text-2xl md:text-3xl font-bold">Circle Wallet</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              wallet?.state === "LIVE"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}>
              {wallet?.state === "LIVE" ? "Active" : "Pending"}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* Two column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Left column */}
          <div className="flex flex-col gap-4">
            {/* Wallet Details Card */}
            <div className="bg-[#13131a] border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Wallet Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-xs">Network</span>
                  <span className="text-indigo-400 text-sm font-medium">Arc Testnet</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-xs">Address</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-sm font-mono">
                      {wallet?.address.slice(0, 8)}...{wallet?.address.slice(-4)}
                    </span>
                    <button
                      onClick={copyAddress}
                      className="text-white/30 hover:text-white text-xs transition-colors"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-xs">Type</span>
                  <span className="text-white/60 text-sm">User-Controlled</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-xs">Auth</span>
                  <span className="text-white/60 text-sm">Google</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-xs">Blockchain</span>
                  <span className="text-white/60 text-sm font-mono">ARC-TESTNET</span>
                </div>
              </div>
            </div>

            {/* USDC Balance Card */}
            <div className="bg-[#13131a] border border-white/[0.06] rounded-2xl p-6">
              <div className="text-white/40 text-xs uppercase tracking-wider mb-2">USDC Balance</div>
              <div className="flex items-baseline mb-1">
                <div className="text-white text-4xl font-black tracking-tight">
                  {usdcBalance ?? "0"}
                </div>
                <span className="text-white/40 text-2xl ml-2">USDC</span>
              </div>
              <p className="text-white/30 text-xs mb-4">on Arc Testnet</p>
              <div className="flex gap-2">
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 text-xs rounded-xl px-4 py-2.5 transition-colors text-center"
                >
                  Get Testnet USDC
                </a>
                <button
                  onClick={() => wallet?.id && userToken && loadBalance(userToken, wallet.id)}
                  className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 text-xs rounded-xl px-4 py-2.5 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Quick Pay Card */}
            <div className="bg-[#13131a] border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-1">Pay an Invoice</h2>
              <p className="text-white/40 text-xs mb-4">Enter a Remlo payment link or invoice ID</p>
              <input
                type="text"
                placeholder="e.g. https://remloapp.vercel.app/pay/abc123"
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-indigo-500/50 focus:outline-none transition-colors mb-2"
              />
              <button
                onClick={handleLookupInvoice}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm py-2.5 font-medium transition-all"
              >
                Look Up
              </button>

              {transactionError && (
                <div className="mt-3 text-red-400 text-xs bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                  {transactionError}
                </div>
              )}

              {selectedInvoice && (
                <div className="mt-3 bg-[#0d0d14] border border-white/[0.06] rounded-xl p-4">
                  <div className="mb-3">
                    <div className="text-white font-bold text-sm">{selectedInvoice.amount} USDC</div>
                    {selectedInvoice.description && (
                      <div className="text-white/40 text-xs mt-1">{selectedInvoice.description}</div>
                    )}
                    <div className="text-white/60 font-mono text-xs mt-2">
                      To: {selectedInvoice.receiver?.slice(0, 8)}...{selectedInvoice.receiver?.slice(-4)}
                    </div>
                  </div>
                  <Link
                    href={`/pay/${selectedInvoice.id}`}
                    className="w-full bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs py-2.5 font-medium transition-all inline-block text-center"
                  >
                    Pay {selectedInvoice.amount} USDC
                  </Link>
                </div>
              )}
            </div>

            {/* About Card */}
            <div className="bg-[#13131a] border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-white font-semibold text-sm mb-4">About Circle Wallets</h2>
              <div className="space-y-3">
                {[
                  { icon: "🔐", title: "Your keys, your wallet", desc: "Circle uses MPC — no private key exposure" },
                  { icon: "📧", title: "Linked to your email", desc: "Same Google account always loads the same wallet" },
                  { icon: "🌐", title: "Settles on Arc", desc: "All payments settle on Arc Testnet via Circle" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    <div>
                      <div className="text-white/60 text-xs font-semibold">{item.title}</div>
                      <div className="text-white/30 text-xs mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions Card */}
        <div className="bg-[#13131a] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-white font-semibold">Recent Transactions</h2>
          </div>
          {transactions.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-white/25 text-sm mb-2">No transactions yet</p>
              <p className="text-white/15 text-xs">Pay an invoice above to see your history here</p>
            </div>
          ) : (
            <div>
              {transactions.map((tx) => (
                <div key={tx.id} className="px-6 py-4 flex justify-between items-center border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <div>
                    <div className="text-white/70 text-xs font-mono">{tx.id.slice(0, 12)}...</div>
                    <div className="text-white/25 text-xs mt-1">{timeAgo(tx.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-400 font-bold text-sm">{tx.amount} USDC</span>
                    {tx.tx_hash && (
                      <a
                        href={`https://testnet.arcscan.app/tx/${tx.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-white/60 text-xs transition-colors"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
