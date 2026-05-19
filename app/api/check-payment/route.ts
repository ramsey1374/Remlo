import { NextResponse } from "next/server";
import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";

const arc = new AppKit();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const adapter = createViemAdapterFromPrivateKey({
      privateKey: process.env.PRIVATE_KEY!,
    });

    const balances = await arc.unifiedBalance.getBalances({
      sources: [{ adapter }],
      networkType: "testnet",
    });

    const totalUSDC = balances?.total || 0;

    return NextResponse.json({
      success: true,
      balance: totalUSDC,
      required: body.amount,
      paid: totalUSDC >= body.amount,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}