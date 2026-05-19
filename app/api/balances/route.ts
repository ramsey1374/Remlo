import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";

const CHAINS = [
  {
    chainId: 84532,
    name: "Base Sepolia",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    chain: baseSepolia,
    rpc: "https://sepolia.base.org",
  },
  {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    chain: arbitrumSepolia,
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
  },
  {
    chainId: 11155111,
    name: "Ethereum Sepolia",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    chain: sepolia,
    rpc: "https://ethereum-sepolia-rpc.publicnode.com",
  },
];

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  const results = await Promise.all(
    CHAINS.map(async (c) => {
      try {
        const client = createPublicClient({
          chain: c.chain,
          transport: http(c.rpc, { timeout: 10_000 }),
        });

        const raw = await client.readContract({
          address: c.usdc as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [wallet as `0x${string}`],
        });

        const balance = Number(formatUnits(raw, 6));
        console.log(`[BAL] ${c.name}`, balance);

        return { chainId: c.chainId, name: c.name, usdc: c.usdc, balance };
      } catch (err) {
        console.error(`[RPC FAIL] ${c.chainId}`, err);
        return { chainId: c.chainId, name: c.name, usdc: c.usdc, balance: 0 };
      }
    })
  );

  return NextResponse.json(results);
}
