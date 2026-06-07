"use client";

import { useEffect, useRef, useState } from "react";
import { setCookie, getCookie } from "cookies-next";
import type { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import { supabase } from "@/lib/db";

const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID as string;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string;

type Props = {
  invoice: {
    id: string;
    amount: string;
    recipient: string;
    description?: string | null;
  };
  onSuccess: (txHash: string) => void;
  onError: (message: string) => void;
};

type Wallet = {
  id: string;
  address: string;
  blockchain: string;
  state: string;
};

type Step =
  | "init"
  | "loading"
  | "wallet-ready"
  | "processing"
  | "done"
  | "error";

export default function CircleWalletPay({ invoice, onSuccess, onError }: Props) {
  const sdkRef = useRef<W3SSdk | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [step, setStep] = useState<Step>("init");
  const [status, setStatus] = useState("");
  const [userToken, setUserToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            setStep("error");
            return;
          }
          const token = result.userToken;
          setUserToken(token);
          setCookie("circleUserToken", token);
          setStep("loading");
          loadWallet(token);
        };

        const restoredToken = getCookie("circleUserToken") as string | undefined;
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
        if (restoredToken) {
          setUserToken(restoredToken);
          setStep("loading");
          loadWallet(restoredToken);
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
    setStep("loading");
    setStatus("Getting device token...");
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

      setStatus("Opening Google login...");
      // WRONG - remove this:
      // sdkRef.current.socialLogin({ provider: "google" as any });

      // CORRECT - use this:
      await sdkRef.current.performLogin("google" as any);
    } catch (e: any) {
      setError(e.message || "Login failed");
      setStep("error");
    }
  }

  async function loadWallet(token: string) {
    setStatus("Loading your wallet...");
    try {
      const res = await fetch("/api/circle/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "listWallets", userToken: token }),
      });
      const data = await res.json();

      if (!res.ok) {
        // User not initialized — create wallet
        await initializeAndCreateWallet(token);
        return;
      }

      const wallets: Wallet[] = data.wallets ?? [];
      const arcWallet = wallets.find((w) => w.blockchain === "ARC-TESTNET" && w.state === "LIVE");

      if (arcWallet) {
        setWallet(arcWallet);
        await loadBalance(token, arcWallet.id);
        setStep("wallet-ready");
      } else {
        await initializeAndCreateWallet(token);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load wallet");
      setStep("error");
    }
  }

  async function initializeAndCreateWallet(token: string) {
    setStatus("Creating your wallet...");
    try {
      const res = await fetch("/api/circle/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initializeUser", userToken: token }),
      });
      const data = await res.json();

      // 155106 = user already initialized
      if (!res.ok && data?.code !== 155106) {
        throw new Error(data.error || "Failed to initialize user");
      }

      const challengeId = data.challengeId;
      if (challengeId && sdkRef.current) {
        setStatus("Complete PIN setup to create your wallet...");
        sdkRef.current.execute(challengeId, async (err, result) => {
          if (err) {
            setError("Wallet creation failed: " + (err as any).message);
            setStep("error");
            return;
          }
          // Wallet created — load it
          await loadWallet(token);
        });
      } else {
        // Already initialized, just load
        await loadWallet(token);
      }
    } catch (e: any) {
      setError(e.message || "Failed to create wallet");
      setStep("error");
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

  async function handlePay() {
    if (!userToken || !wallet) return;
    setStep("processing");
    setStatus("Preparing payment...");
    try {
      setStatus("Signing payment...");
      const res = await fetch("/api/circle/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendUsdc",
          userToken,
          walletId: wallet.id,
          recipientAddress: invoice.recipient,
          amount: invoice.amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");

      const { challengeId } = data;
      if (challengeId && sdkRef.current) {
        setStatus("Approve in Circle wallet...");
        sdkRef.current.execute(challengeId, async (err, result) => {
          if (err) {
            onError("Payment rejected: " + (err as any).message);
            setStep("wallet-ready");
            return;
          }
          setStatus("Confirming on Arc...");
          // Update Supabase
          const txHash = (result as any)?.txHash ?? `circle-${Date.now()}`;
          await supabase.from("invoices").update({
            paid: true, status: "settled", tx_hash: txHash,
          }).eq("id", invoice.id);
          await supabase.from("payment_intents").upsert({
            id: invoice.id,
            recipient: invoice.recipient,
            amount: parseFloat(invoice.amount),
            token: "USDC",
            status: "settled",
            tx_hash: txHash,
            chain_id: null,
            created_at: new Date().toISOString(),
          });
          setStep("done");
          onSuccess(txHash);
        });
      }
    } catch (e: any) {
      onError(e.message || "Payment failed");
      setStep("wallet-ready");
    }
  }

  const hasEnoughBalance = parseFloat(usdcBalance ?? "0") >= parseFloat(invoice.amount);

  // ── UI ──

  if (step === "init") {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center mb-2">
          <div className="text-white font-semibold text-sm mb-1">Pay with Email</div>
          <div className="text-white/40 text-xs">No crypto wallet needed. Sign in with Google.</div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={!sdkReady}
          className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-white/20 text-xs text-center">
          Powered by Circle · Secured on Arc Network
        </p>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-sm text-center">{status || "Setting up your wallet..."}</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/5 border border-red-500/20 rounded-xl">
          <span className="text-red-400">⚠</span>
          <span className="text-red-400 text-xs leading-relaxed">{error}</span>
        </div>
        <button
          onClick={() => { setStep("init"); setError(null); }}
          className="w-full py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 text-xs rounded-xl transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (step === "wallet-ready") {
    return (
      <div className="flex flex-col gap-3">
        {/* Wallet info */}
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 text-xs">✓</span>
              </div>
              <span className="text-white/70 text-xs font-semibold">Circle Wallet Ready</span>
            </div>
            <span className="text-white/25 text-xs font-mono truncate md:ml-auto">
              {wallet?.address.slice(0, 6)}...{wallet?.address.slice(-4)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs">USDC Balance</span>
            <span className={`text-sm font-bold ${hasEnoughBalance ? "text-emerald-400" : "text-red-400"}`}>
              {usdcBalance ?? "0"} USDC
            </span>
          </div>

          {!hasEnoughBalance && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-red-400 text-xs">Insufficient balance</span>
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
              >
                Get testnet USDC ↗
              </a>
            </div>
          )}
        </div>

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={!hasEnoughBalance}
          className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20"
        >
          Pay {invoice.amount} USDC ⚡
        </button>

        <p className="text-white/20 text-xs text-center">
          No gas fees · Instant · Powered by Circle
        </p>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-white/50 text-xs">{status}</span>
        </div>
        <p className="text-white/20 text-xs text-center">Do not close this page</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-400 text-lg">✓</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-white font-semibold text-sm mb-1">Payment Complete</div>
          <div className="text-white/40 text-xs">Your payment has been confirmed on the Arc network.</div>
        </div>
        <p className="text-white/20 text-xs text-center">
          No gas fees · Instant · Powered by Circle
        </p>
      </div>
    );
  }

  return null;
}
