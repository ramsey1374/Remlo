import { NextResponse } from "next/server";

import {
  createPublicClient,
  http,
} from "viem";

import {
  baseSepolia,
  arbitrumSepolia,
  sepolia,
  optimismSepolia,
} from "viem/chains";

const clients = [
  createPublicClient({
    chain: baseSepolia,
    transport: http(),
  }),

  createPublicClient({
    chain: arbitrumSepolia,
    transport: http(),
  }),

  createPublicClient({
    chain: sepolia,
    transport: http(),
  }),

  createPublicClient({
    chain: optimismSepolia,
    transport: http(),
  }),
];

export async function POST(req: Request) {
  try {
    const { id, txHash } =
      await req.json();

    let receipt = null;

    // -----------------------------------
    // SEARCH ALL CHAINS
    // -----------------------------------
    for (const client of clients) {
      try {
        receipt =
          await client.getTransactionReceipt({
            hash: txHash,
          });

        if (receipt) break;
      } catch (_) {}
    }

    if (
      receipt &&
      receipt.status === "success"
    ) {
      await fetch(
        "http://localhost:3000/api/mark-paid",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({ id }),
        }
      );

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json({
      success: false,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "verification failed",
      },
      {
        status: 500,
      }
    );
  }
}