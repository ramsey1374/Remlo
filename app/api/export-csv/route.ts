import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!, // service key — never expose to client
);

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("receiver", address)
    .order("created_at", { ascending: false });

  const { data: intents } = await supabase
    .from("payment_intents")
    .select("*");

  const chainMap: Record<number, string> = {
    11155111: "Ethereum Sepolia",
    421614: "Arbitrum Sepolia",
    84532: "Base Sepolia",
  };

  const rows = (invoices ?? []).map((inv) => {
    const intent = (intents ?? []).find((p) => p.id === inv.id);
    return {
      "Invoice ID": inv.id.toUpperCase(),
      "Amount (USDC)": inv.amount,
      "Description": inv.description ?? "",
      "Status": inv.paid ? "Settled" : inv.status ?? "Pending",
      "Receiver": inv.receiver,
      "Payer": intent?.recipient ?? "",
      "Source Chain": intent?.chain_id ? chainMap[intent.chain_id] ?? "" : "",
      "Settlement": "Arc Testnet",
      "Tx Hash": intent?.tx_hash ?? "",
      "Created": inv.created_at ? new Date(inv.created_at).toISOString() : "",
      "Expires": inv.expires_at ? new Date(inv.expires_at).toISOString() : "",
    };
  });

  if (rows.length === 0) {
    return new NextResponse("No invoices found", { status: 404 });
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => `"${String((row as any)[h]).replace(/"/g, '""')}"`).join(",")
    ),
  ];

  const csv = csvLines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="remlo-invoices-${address.slice(0, 6)}.csv"`,
    },
  });
}
