"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useSwitchChain } from "wagmi";
import { useParams } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { getUnifiedBalances } from "@/lib/unified-balance";
import { pickBestChain } from "@/lib/solver";
import { settleToArc } from "@/lib/arc-settlement";
import { settleIntent } from "@/lib/intent/settler";
import { supabase } from "@/lib/db";
import { IconGlobe, IconX, IconShield, IconDoc, IconCheck, IconSearch } from "../../components/Icons";

function RemloLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <img src="/remlo-logo.png" alt="Remlo" width={size} height={size} style={{ objectFit: "contain" }} />
      <span className="text-white font-bold text-base tracking-tight">Remlo</span>
    </div>
  );
}
function ArcLogo({ size = 28 }: { size?: number }) {
  return <img src="/arc-logo.jpg" alt="Arc" width={size} height={size} style={{ objectFit: "contain", borderRadius: "6px" }} />;
}
function USDCLogo({ size = 24 }: { size?: number }) {
  return <img src="/usdc-logo.png" alt="USDC" width={size} height={size} style={{ objectFit: "contain", borderRadius: "50%" }} />;
}

function chainName(chainId: number | null) {
  const map: Record<number, string> = { 11155111: "Eth Sepolia", 421614: "Arb Sepolia", 84532: "Base Sepolia" };
  return chainId ? map[chainId] ?? `Chain ${chainId}` : null;
}
function chainDotColor(chainId: number | null) {
  const map: Record<number, string> = { 11155111: "bg-purple-400", 421614: "bg-sky-400", 84532: "bg-blue-500" };
  return chainId ? map[chainId] ?? "bg-white/30" : "bg-white/10";
}
function arcExplorerUrl(txHash: string | null) {
  return txHash ? `https://testnet.arcscan.app/tx/${txHash}` : null;
}

function generateReceipt({ invoiceId, amount, from, recipient, txHash, chain, timestamp }: any) {
  const content = `
════════════════════════════════
         REMLO PAYMENT RECEIPT
════════════════════════════════
Date:        ${timestamp}
Invoice ID:  ${invoiceId}
────────────────────────────────
FROM:        ${from}
TO:          ${recipient}
AMOUNT:      ${amount} USDC
SOURCE:      ${chain}
SETTLEMENT:  Arc Testnet
────────────────────────────────
TX HASH:
${txHash ?? "Pending"}
────────────────────────────────
Powered by Remlo
════════════════════════════════`.trim();
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `remlo-receipt-${invoiceId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PayPage() {
  const { address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const params = useParams();
  const invoiceIdFromUrl = params?.id as string;
  const prevAddressRef = useRef<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");
  const [paid, setPaid] = useState(false);
  const [invoice, setInvoice] = useState<any>(undefined);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [detectedChainId, setDetectedChainId] = useState<number | null>(null);
  const [detectedBalance, setDetectedBalance] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [paidChain, setPaidChain] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Custom amount + tip
  const [settings, setSettings] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"full" | "partial" | "tip">("full");

  useEffect(() => {
    if (!invoiceIdFromUrl) return;
    loadInvoice();
  }, [invoiceIdFromUrl]);
  const [creatorName, setCreatorName] = useState<string | null>(null);


  async function loadInvoice() {
    try {
      const { data, error } = await supabase
        .from("invoices").select("*").eq("id", invoiceIdFromUrl).single();

      if (error || !data) { setInvoiceError("Invoice not found."); setInvoice(null); return; }

      if (data.expires_at && new Date(data.expires_at) < new Date() && !data.paid) {
        setIsExpired(true); setInvoice(data);
        await supabase.from("invoices").update({ status: "expired" }).eq("id", data.id);
        return;
      }

      if (data.paid || data.status === "settled") { setInvoice(data); setPaid(true); return; }

      const recipient = data.receiver;
      if (!recipient || recipient === "0x0000000000000000000000000000000000000000") {
        setInvoiceError("Invalid invoice recipient."); setInvoice(null); return;
      }

      setInvoice({ ...data, recipient });

      // Load creator display name
const { data: creatorSettings } = await supabase
  .from("user_settings")
  .select("display_name")
  .eq("address", data.receiver)
  .single();
if (creatorSettings?.display_name) {
  setCreatorName(creatorSettings.display_name);
}


      // Load receiver's settings (partial/tip config)
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("allow_partial, allow_tip")
        .eq("address", data.receiver)
        .single();

      setSettings(settingsData ?? null);

      localStorage.setItem("invoice", JSON.stringify({
        id: data.id, amount: String(data.amount),
        receiver: data.receiver, recipient: data.receiver, token: "",
      }));
    } catch (err: any) {
      if (!navigator.onLine || err?.message?.includes("fetch")) {
        setNetworkError(true);
      } else {
        setInvoiceError("Failed to load invoice.");
      }
      setInvoice(null);
    }
  }

  useEffect(() => {
    if (prevAddressRef.current && prevAddressRef.current !== address) {
      setStage(""); setDetectedChainId(null); setDetectedBalance(null); setBalanceError(null);
    }
    prevAddressRef.current = address;
  }, [address]);

  useEffect(() => {
    if (!address || !invoice || paid || isExpired) return;
    setDetectedChainId(null); setDetectedBalance(null); setBalanceError(null);
    (async () => {
      try {
        const balances = await getUnifiedBalances(address);
        const withBalance = balances.filter((b: any) => b.balance > 0);
        if (withBalance.length === 0) { setBalanceError("No USDC found in this wallet. Please top up and try again."); return; }
        const amountNeeded = effectiveAmount();
        const sufficient = withBalance.filter((b: any) => b.balance >= amountNeeded);
        if (sufficient.length === 0) {
          const best = withBalance.sort((a: any, b: any) => b.balance - a.balance)[0];
          setDetectedChainId(best.chainId); setDetectedBalance(best.balance.toFixed(2));
          setBalanceError(`Insufficient balance. You have ${best.balance.toFixed(2)} USDC on ${best.name} but need ${amountNeeded} USDC.`);
          return;
        }
        const best = sufficient.sort((a: any, b: any) => b.balance - a.balance)[0];
        setDetectedChainId(best.chainId); setDetectedBalance(best.balance.toFixed(2)); setBalanceError(null);
      } catch (err) {
        setBalanceError(!navigator.onLine ? "No internet connection." : "Failed to scan balances. Please try again.");
      }
    })();
  }, [address, invoice, paid, isExpired, customAmount, tipAmount, paymentMode]);

  function effectiveAmount(): number {
    if (!invoice) return 0;
    const base = Number(invoice.amount);
    if (paymentMode === "partial" && customAmount) return Math.min(parseFloat(customAmount) || 0, base);
    if (paymentMode === "tip") return base + (parseFloat(tipAmount) || 0);
    return base;
  }

  const asAddress = (addr: string) => addr as `0x${string}`;

  async function handlePay() {
    try {
      if (!address) throw new Error("Wallet not connected");
      if (!invoice) throw new Error("Invoice not loaded");
      if (!window.ethereum) throw new Error("No wallet detected");
      if (!navigator.onLine) throw new Error("No internet connection");
      if (balanceError?.includes("Insufficient")) throw new Error("No chain has sufficient USDC");

      const finalAmount = effectiveAmount();
      if (finalAmount <= 0) throw new Error("Invalid payment amount");

      setLoading(true);
      setStage("Scanning unified balance...");
      const balances = await getUnifiedBalances(address);
      const best = pickBestChain(balances, finalAmount);
      if (!best?.usdc) throw new Error("No valid chain found");

      setStage(`Switching to ${best.chain.name}...`);
      await switchChainAsync({ chainId: best.chainId });

      setStage("Executing payment...");
      const result = await settleToArc({
        chainId: best.chainId,
        amount: String(finalAmount),
        recipient: asAddress(invoice.recipient),
        address,
        onStage: setStage,
      });

      if (result.hash) setTxHash(result.hash);
      setPaidChain(chainName(best.chainId));

      setStage("Settling intent...");
      try {
        await settleIntent({
          intent: {
            id: invoice.id,
            recipient: asAddress(invoice.recipient),
            amount: String(finalAmount),
            token: asAddress(best.usdc),
            createdAt: Date.now(),
          },
          txHash: result.hash ?? "pending",
          chainId: best.chainId,
        });
      } catch (e) { console.error("settleIntent failed:", e); }

      setPaid(true);
      setStage("Payment complete");
    } catch (err: any) {
      console.error(err);
      const raw = err?.message ?? "";
      let friendly = "Payment failed. Please try again.";
      if (raw.includes("No internet") || !navigator.onLine) friendly = "No internet connection. Please check your network.";
      else if (raw.includes("User rejected") || raw.includes("rejected the request")) friendly = "Transaction cancelled. You rejected the request in your wallet.";
      else if (raw.includes("Timed out") || raw.includes("ONCHAIN_TRANSACTION_REVERTED")) friendly = "Transaction timed out. Please try again.";
      else if (raw.includes("Deposit not confirmed")) friendly = "Deposit is taking longer than expected. Please try again.";
      else if (raw.includes("No chain has sufficient")) friendly = "Insufficient USDC balance to cover this payment.";
      else if (raw.includes("Mint failure")) friendly = "Settlement on Arc failed. Please try paying again.";
      else if (raw.includes("No wallet detected")) friendly = "No wallet detected. Please install MetaMask or another wallet.";
      else if (raw.includes("No valid chain")) friendly = "No chain found with sufficient USDC. Please top up your balance.";
      setStage(`Error: ${friendly}`);
    } finally {
      setLoading(false);
    }
  }

  // States
  if (networkError) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="text-2xl mb-3"><IconGlobe size={28} /></div>
            <div className="text-white font-bold mb-2">No Internet Connection</div>
            <div className="text-white/40 text-sm mb-6">Please check your network and try again.</div>
          <button onClick={() => window.location.reload()}
            className="ui-button-primary text-sm px-6 py-3">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-6">
            <RemloLogo size={90} />
            <span className="text-red-400 text-xs font-semibold bg-red-400/10 px-2.5 py-1 rounded-full border border-red-400/20">Expired</span>
          </div>
          <div className="ui-card p-8 border-red-500/20 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <IconX size={28} />
            </div>
            <div className="text-white text-xl font-bold mb-2">Invoice Expired</div>
            <div className="text-white/40 text-sm mb-2">
              This invoice for <span className="text-white font-semibold">{invoice?.amount} USDC</span> has expired and is no longer valid.
            </div>
            {invoice?.expires_at && (
              <div className="text-white/25 text-xs">
                Expired on {new Date(invoice.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (invoice === undefined) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
        <div className="text-white/40 text-sm animate-pulse">Loading invoice...</div>
      </div>
    );
  }

  if (invoice === null) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-red-400 text-sm mb-4">{invoiceError ?? "Invoice could not be loaded"}</div>
          <button onClick={() => window.location.reload()}
            className="ui-button-secondary text-sm px-6 py-3">Try Again</button>
        </div>
      </div>
    );
  }

  const finalAmount = effectiveAmount();

  return (
    <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center px-4 py-12">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="w-full max-w-sm relative z-10">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <RemloLogo size={28} />
            
          </div>
          <span className="text-emerald-400 text-xs font-semibold bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20"><IconShield size={12} /> Secure</span>
        </div>

        {paid ? (
          <div className="ui-card p-6">
            <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <IconCheck size={28} />
                </div>
              <div className="text-white text-xl font-bold mb-1">Payment Complete</div>
              <div className="text-white/40 text-sm">{finalAmount.toFixed(2)} USDC sent and settling on Arc Testnet.</div>
            </div>
            <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl px-4 py-3 text-xs font-mono text-white/40 mb-4">
              <div className="flex justify-between mb-1.5"><span>From</span><span className="text-white/60">{address?.slice(0, 8)}...{address?.slice(-4)}</span></div>
              <div className="flex justify-between mb-1.5"><span>To</span><span className="text-white/60">{(invoice.recipient ?? invoice.receiver)?.slice(0, 8)}...{(invoice.recipient ?? invoice.receiver)?.slice(-4)}</span></div>
              <div className="flex justify-between mb-1.5"><span>Amount</span><span className="text-white/60">{finalAmount.toFixed(2)} USDC</span></div>
              {paymentMode === "tip" && parseFloat(tipAmount) > 0 && (
                <div className="flex justify-between mb-1.5"><span>Includes tip</span><span className="text-white/60">{parseFloat(tipAmount).toFixed(2)} USDC</span></div>
              )}
              <div className="flex justify-between mb-1.5"><span>Source</span><span className="text-white/60">{paidChain ?? "—"}</span></div>
              
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => generateReceipt({
                invoiceId: invoice.id, amount: finalAmount.toFixed(2),
                from: address ?? "Unknown", recipient: invoice.recipient ?? invoice.receiver,
                txHash, chain: paidChain ?? "Unknown", timestamp: new Date().toLocaleString(),
              })}
                className="ui-button-secondary w-full text-xs py-2.5 flex items-center justify-center gap-2">
                <IconDoc size={14} /> Download Receipt
              </button>
              {txHash && arcExplorerUrl(txHash) && (
                <a href={arcExplorerUrl(txHash)!} target="_blank" rel="noopener noreferrer"
                  className="ui-button-secondary w-full text-xs py-2.5 flex items-center justify-center gap-2">
                  View on Arc Explorer ↗
                </a>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="ui-card overflow-hidden mb-3">

              {/* Amount hero */}
<div className="px-6 py-8 text-center border-b border-white/[0.06] relative">
  <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
  {/* Creator identity */}
  {(creatorName || invoice.receiver) && (
    <div className="mb-4">
      <div className="text-white font-semibold text-sm">
        {creatorName ?? `${invoice.receiver?.slice(0, 6)}...${invoice.receiver?.slice(-4)}`}
      </div>
      {creatorName && (
        <div className="text-white/30 text-xs font-mono mt-0.5">
          {invoice.receiver?.slice(0, 8)}...{invoice.receiver?.slice(-4)}
        </div>
      )}
      <div className="text-white/25 text-xs mt-1">is requesting payment</div>
    </div>
  )}
  <div className="text-white/40 text-xs mb-2">Amount</div>
  <div className="text-white text-4xl sm:text-5xl font-black tracking-tight">
    {Number(invoice.amount).toFixed(2)}
    <span className="text-white/40 text-xl sm:text-2xl ml-2">USDC</span>
  </div>
  {invoice.description && (
    <div className="text-white/40 text-sm mt-3">{invoice.description}</div>
  )}
</div>


              {/* Meta */}
              <div className="px-5 py-4 border-b border-white/[0.06] flex flex-col gap-2.5">
                {[
                  { label: "Invoice ID", value: invoice.id },
                  { label: "Recipient", value: (invoice.recipient ?? invoice.receiver)?.slice(0, 8) + "..." + (invoice.recipient ?? invoice.receiver)?.slice(-4), mono: true },
                  { label: "Settlement", value: "Arc Testnet", accent: true },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-white/30 text-xs">{row.label}</span>
                    <span className={`text-xs font-medium ${row.accent ? "text-indigo-400" : row.mono ? "font-mono text-white/60" : "text-white/60"}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* How it works */}
              <div className="px-5 py-5 border-b border-white/[0.06]">
                <div className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-4">How it works</div>
                <div className="flex items-center justify-between">
                  {[
                    { type: "usdc", label: "You pay USDC", sub: "from any network" },
                    { type: "spark", label: "We find the best", sub: "network for you" },
                    { type: "arc", label: "We settle it on", sub: "Arc Testnet" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-1 sm:gap-2">
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2">
                          {step.type === "arc" ? <ArcLogo size={40} /> :
                           step.type === "usdc" ? <USDCLogo size={40} /> :
                           <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center"><IconSearch size={20} /></div>}
                        </div>
                        <div className="text-white/60 text-[10px] sm:text-[11px] font-medium">{step.label}</div>
                        <div className="text-white/25 text-[9px] sm:text-[10px]">{step.sub}</div>
                      </div>
                      {i < 2 && <div className="text-white/10 text-base sm:text-lg mb-4">···</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pay section */}
              <div className="px-5 py-5">
                

                {/* Custom amount / tip options */}
                {(settings?.allow_partial || settings?.allow_tip) && (
                  <div className="mb-3">
                    <div className="flex gap-2 mb-3">
                      <button onClick={() => setPaymentMode("full")}
                        className={`ui-button-secondary flex-1 text-xs ${
                          paymentMode === "full" ? "bg-indigo-500 text-white" : "text-white/50 hover:text-white"
                        }`}>
                        Full ({invoice.amount} USDC)
                      </button>
                      {settings?.allow_partial && (
                        <button onClick={() => setPaymentMode("partial")}
                          className={`ui-button-secondary flex-1 text-xs ${
                            paymentMode === "partial" ? "bg-indigo-500 text-white" : "text-white/50 hover:text-white"
                          }`}>
                          Partial
                        </button>
                      )}
                      {settings?.allow_tip && (
                        <button onClick={() => setPaymentMode("tip")}
                          className={`ui-button-secondary flex-1 text-xs ${
                            paymentMode === "tip" ? "bg-indigo-500 text-white" : "text-white/50 hover:text-white"
                          }`}>
                          + Tip
                        </button>
                      )}
                    </div>

                    {paymentMode === "partial" && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 bg-[#0d0d14] border border-white/[0.08] rounded-xl px-3 py-2.5 focus-within:border-indigo-500/50 transition-colors">
                          <input type="number" placeholder={`Max ${invoice.amount}`}
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            max={invoice.amount}
                            className="flex-1 bg-transparent text-white text-sm font-bold outline-none placeholder:text-white/20" />
                          <span className="text-white/40 text-xs">USDC</span>
                        </div>
                        <p className="text-white/25 text-xs mt-1">Enter an amount up to {invoice.amount} USDC</p>
                      </div>
                    )}

                    {paymentMode === "tip" && (
                      <div className="mb-3">
                        <div className="text-white/40 text-xs mb-1.5">Add tip on top of {invoice.amount} USDC</div>
                        <div className="flex gap-2 mb-2">
                          {["1", "2", "5"].map((tip) => (
                            <button key={tip} onClick={() => setTipAmount(tip)}
                              className={`ui-button-secondary flex-1 text-xs ${
                                tipAmount === tip ? "bg-indigo-500 text-white" : "text-white/50 hover:text-white"
                              }`}>
                              +{tip} USDC
                            </button>
                          ))}
                        </div>
                        <div className="ui-input flex items-center gap-2">
                          <span className="text-white/40 text-xs">Custom:</span>
                          <input type="number" placeholder="0.00"
                            value={tipAmount}
                            onChange={(e) => setTipAmount(e.target.value)}
                            className="flex-1 bg-transparent text-white text-sm font-bold outline-none placeholder:text-white/20" />
                          <span className="text-white/40 text-xs">USDC</span>
                        </div>
                      </div>
                    )}

                    {/* Total display */}
                    {(paymentMode !== "full") && finalAmount > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 bg-indigo-500/5 border border-indigo-500/20 rounded-xl mb-3">
                        <span className="text-white/50 text-xs">You will pay</span>
                        <span className="text-white font-bold text-sm">{finalAmount.toFixed(2)} USDC</span>
                      </div>
                    )}
                  </div>
                )}

                {isConnected && address && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] flex-shrink-0" />
                    <span className="text-white/40 text-xs">Connected:</span>
                    <span className="text-white/70 text-xs font-mono truncate">{address.slice(0, 8)}...{address.slice(-4)}</span>
                  </div>
                )}

                {isConnected && balanceError && (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/5 border border-red-500/20 rounded-xl mb-3">
                    <IconX size={16} />
                    <span className="text-red-400 text-xs leading-relaxed">{balanceError}</span>
                  </div>
                )}

                {isConnected && detectedChainId && !balanceError && (
                  <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 py-2.5 mb-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${chainDotColor(detectedChainId)}`} />
                    <span className="text-emerald-400 text-xs font-medium">
                      {detectedBalance} USDC found on {chainName(detectedChainId)} — Ready to pay
                    </span>
                  </div>
                )}

                {isConnected && !detectedChainId && !balanceError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-3">
                    <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <span className="text-white/40 text-xs">Scanning for USDC across chains...</span>
                  </div>
                )}

                {stage && !paid && (
                  <div className={`flex items-start gap-2 px-3 py-2.5 border rounded-xl mb-3 ${
                    stage.startsWith("Error:") ? "bg-red-500/5 border-red-500/20" : "bg-white/[0.03] border-white/[0.06]"
                  }`}>
                    {loading && !stage.startsWith("Error:") && (
                      <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                    )}
                    {stage.startsWith("Error:") && <span className="text-red-400 flex-shrink-0"><IconX size={16} /></span>}
                    <span className={`text-xs leading-relaxed ${stage.startsWith("Error:") ? "text-red-400" : "text-white/50"}`}>
                      {stage.startsWith("Error:") ? stage.replace(/^Error:\s*/, "") : stage}
                    </span>
                  </div>
                )}

                {isConnected ? (
                  <button onClick={handlePay} disabled={loading || !!balanceError || (paymentMode === "partial" && !customAmount)}
                    className="ui-button-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? "Processing..." : `Pay ${finalAmount > 0 ? finalAmount.toFixed(2) : Number(invoice.amount).toFixed(2)} USDC →`}
                  </button>
                ) : (
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <button onClick={openConnectModal}
                        className="ui-button-primary w-full text-sm">
                        Connect Wallet
                      </button>
                    )}
                  </ConnectButton.Custom>
                )}

                <p className="text-white/20 text-xs text-center mt-3">
                  USDC sent from best chain. We'll handle everything for you.
                </p>
              </div>
            </div>
           
          </>
        )}
      </div>
    </div>
  );
}
