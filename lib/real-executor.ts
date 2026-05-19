import {
  erc20Abi,
  parseUnits,
} from "viem";

export async function executePayment({
  walletClient,
  publicClient,
  chainId,
  token,
  recipient,
  amount,
}: any) {
  // -----------------------------------
  // SAFETY CHECK
  // -----------------------------------
  if (!walletClient?.account) {
    throw new Error("No wallet account found");
  }

  if (!token || !recipient) {
    throw new Error("Missing token or recipient");
  }

  // -----------------------------------
  // NORMALIZE AMOUNT
  // -----------------------------------
  const safeAmount =
    typeof amount === "string"
      ? amount
      : String(amount);

  // -----------------------------------
  // EXECUTE TRANSFER
  // -----------------------------------
  const hash = await walletClient.writeContract({
    account: walletClient.account,
    chain: null, // IMPORTANT: disables strict chain binding
    address: token,
    abi: erc20Abi,
    functionName: "transfer",
    args: [
      recipient,
      BigInt(Number(safeAmount) * 1e6),
    ],
  });

  // -----------------------------------
  // WAIT CONFIRMATION
  // -----------------------------------
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
  });

  // -----------------------------------
  // RETURN RESULT
  // -----------------------------------
  return {
    success: true,
    hash,
    chainId, // from solver (NOT wallet)
    receipt,
  };
}