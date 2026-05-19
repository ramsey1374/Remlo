type RawBalance = {
  balance: number;
  chainId: number;
  name: string;
  usdc: string;
};

export function pickBestChain(
  balances: RawBalance[],
  amount: number
) {
  if (!balances?.length) {
    throw new Error("No balances found");
  }

  // -----------------------------------
  // NORMALIZE INTO EXECUTION FORMAT
  // -----------------------------------
  const normalized = balances.map((b) => {
    return {
      chain: {
        id: b.chainId,
        name: b.name,
      },
      chainId: b.chainId,
      rpcUrl: getRpcUrl(b.chainId),
      usdc: b.usdc as `0x${string}`,
      balance: b.balance,
    };
  });

  const valid = normalized.filter(
    (b) => b.balance >= amount
  );

  if (!valid.length) {
    throw new Error(
      "No chain has sufficient USDC liquidity"
    );
  }

  valid.sort((a, b) => b.balance - a.balance);

  return valid[0];
}

// -----------------------------------
// SIMPLE RPC MAP (ADD YOUR CHAINS HERE)
// -----------------------------------
function getRpcUrl(chainId: number): string {
  const map: Record<number, string> = {
    11155111:
      "https://ethereum-sepolia-rpc.publicnode.com/",
    421614:
      "https://sepolia-rollup.arbitrum.io/rpc",
    84532: "https://sepolia.base.org/",
  };

  return map[chainId] ?? "";
}