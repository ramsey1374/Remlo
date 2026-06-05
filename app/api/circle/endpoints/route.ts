import { NextResponse } from "next/server";

const CIRCLE_BASE_URL = "https://api.circle.com";
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY as string;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...params } = body ?? {};

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    switch (action) {
      case "createDeviceToken": {
        const { deviceId } = params;
        if (!deviceId) {
          return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
        }
        const response = await fetch(
          `${CIRCLE_BASE_URL}/v1/w3s/users/social/token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CIRCLE_API_KEY}`,
            },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              deviceId,
            }),
          }
        );
        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        return NextResponse.json(data.data, { status: 200 });
      }

      case "initializeUser": {
        const { userToken } = params;
        if (!userToken) {
          return NextResponse.json({ error: "Missing userToken" }, { status: 400 });
        }
        const response = await fetch(
          `${CIRCLE_BASE_URL}/v1/w3s/user/initialize`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CIRCLE_API_KEY}`,
              "X-User-Token": userToken,
            },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              accountType: "SCA",
              blockchains: ["ARC-TESTNET"],
            }),
          }
        );
        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        return NextResponse.json(data.data, { status: 200 });
      }

      case "listWallets": {
        const { userToken } = params;
        if (!userToken) {
          return NextResponse.json({ error: "Missing userToken" }, { status: 400 });
        }
        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets`, {
          method: "GET",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken,
          },
        });
        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        return NextResponse.json(data.data, { status: 200 });
      }

      case "getTokenBalance": {
        const { userToken, walletId } = params;
        if (!userToken || !walletId) {
          return NextResponse.json(
            { error: "Missing userToken or walletId" },
            { status: 400 }
          );
        }
        const response = await fetch(
          `${CIRCLE_BASE_URL}/v1/w3s/wallets/${walletId}/balances`,
          {
            method: "GET",
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${CIRCLE_API_KEY}`,
              "X-User-Token": userToken,
            },
          }
        );
        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        return NextResponse.json(data.data, { status: 200 });
      }

      case "sendUsdc": {
        // Transfer USDC from user wallet to invoice recipient
        const { userToken, walletId, recipientAddress, amount } = params;
        if (!userToken || !walletId || !recipientAddress || !amount) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }
        // Convert amount to token units (USDC has 6 decimals)
        const amountInUnits = (parseFloat(amount) * 1_000_000).toFixed(0);
        const response = await fetch(
          `${CIRCLE_BASE_URL}/v1/w3s/user/transactions/transfer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CIRCLE_API_KEY}`,
              "X-User-Token": userToken,
            },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              destinationAddress: recipientAddress,
              refId: `remlo-${Date.now()}`,
              amounts: [amountInUnits],
              feeLevel: "MEDIUM",
              tokenId: "USDC",
              walletId,
            }),
          }
        );
        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        // Returns challengeId — user must complete challenge via SDK
        return NextResponse.json(data.data, { status: 200 });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in /api/circle/endpoints:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}
