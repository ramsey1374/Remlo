import {
  createPublicClient,
  http,
} from "viem";

import {
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  sepolia,
} from "viem/chains";

export const clients = {
  Base_Sepolia:
    createPublicClient({
      chain: baseSepolia,
      transport: http(
        "https://base-sepolia-rpc.publicnode.com"
      ),
    }),

  Arbitrum_Sepolia:
    createPublicClient({
      chain: arbitrumSepolia,
      transport: http(
        "https://arbitrum-sepolia-rpc.publicnode.com"
      ),
    }),

  Optimism_Sepolia:
    createPublicClient({
      chain: optimismSepolia,
      transport: http(
        "https://optimism-sepolia-rpc.publicnode.com"
      ),
    }),

  Ethereum_Sepolia:
    createPublicClient({
      chain: sepolia,
      transport: http(
        "https://ethereum-sepolia-rpc.publicnode.com"
      ),
    }),
};