export const SUPPORTED_CHAINS = [
  {
    chainId: 84532,
    name: "Base Sepolia",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  },
  {
    chainId: 11155111,
    name: "Ethereum Sepolia",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  },
];

export const CHAIN_RPC: Record<number, string[]> = {
  84532: [
    "https://sepolia.base.org",
    "https://base-sepolia.g.alchemy.com/v2/demo",
  ],
  421614: [
    "https://sepolia-rollup.arbitrum.io/rpc",
    "https://arb-sepolia.g.alchemy.com/v2/demo",
  ],
  11155111: [
    "https://rpc.sepolia.org",
    "https://eth-sepolia.g.alchemy.com/v2/demo",
  ],
};
