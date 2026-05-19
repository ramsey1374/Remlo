import { createPublicClient, http } from "viem";

export function getChainClient(rpcUrl: string, chain: any) {
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}