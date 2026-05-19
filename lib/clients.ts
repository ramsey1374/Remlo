import { fallback, http } from "viem";

export const baseTransport = fallback([
  http("https://rpc.ankr.com/base_sepolia"),
  http("https://base-sepolia.public.blastapi.io"),
  http("https://sepolia.base.org"),
]);