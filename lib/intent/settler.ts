import { supabase } from "@/lib/db";
import type { PaymentIntent } from "./types";

export async function settleIntent({
  intent,
  txHash,
  chainId,
}: {
  intent: PaymentIntent;
  txHash: string;
  chainId: number;
}) {
  const normalizedIntent: PaymentIntent = {
    ...intent,
    createdAt: intent.createdAt ?? Date.now(),
  };

  const chainMap: Record<number, string> = {
    11155111: "Ethereum Sepolia",
    421614: "Arbitrum Sepolia",
    84532: "Base Sepolia",
  };

  // Upsert payment intent
  const { error: intentError } = await supabase
    .from("payment_intents")
    .upsert({
      id: normalizedIntent.id,
      recipient: normalizedIntent.recipient,
      amount: normalizedIntent.amount,
      token: normalizedIntent.token,
      status: "settled",
      tx_hash: txHash,
      chain_id: chainId,
      created_at: new Date().toISOString(),
    });

  if (intentError) {
    throw new Error(`Intent update failed: ${intentError.message}`);
  }

  // Update invoice
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .update({ status: "settled", paid: true, tx_hash: txHash })
    .eq("id", normalizedIntent.id)
    .select("*")
    .single();

  if (invoiceError) {
    console.error("Invoice update failed:", invoiceError.message);
  }

  // Fire webhook if receiver has one configured
  try {
    if (invoiceData?.receiver) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("webhook_url, webhook_secret")
        .eq("address", invoiceData.receiver)
        .single();

      if (settings?.webhook_url) {
        const payload = {
          event: "payment.settled",
          invoice_id: normalizedIntent.id,
          amount: String(normalizedIntent.amount),
          token: "USDC",
          payer: normalizedIntent.recipient,
          recipient: invoiceData.receiver,
          source_chain: chainMap[chainId] ?? `Chain ${chainId}`,
          settlement: "Arc Testnet",
          tx_hash: txHash,
          description: invoiceData.description ?? null,
          timestamp: new Date().toISOString(),
        };

        // Fire webhook via our API route (runs server-side, no CORS)
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            webhookUrl: settings.webhook_url,
            secret: settings.webhook_secret ?? null,
            payload,
          }),
        });

        console.log("[WEBHOOK FIRED]", settings.webhook_url);
      }
    }
  } catch (webhookErr) {
    // Never block payment completion because of webhook failure
    console.error("[WEBHOOK FAILED]", webhookErr);
  }

  return {
    success: true,
    intentId: normalizedIntent.id,
    txHash,
    chainId,
  };
}
