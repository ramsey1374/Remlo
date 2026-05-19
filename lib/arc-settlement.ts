import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { createWalletClient, custom, publicActions } from "viem";
import { arbitrumSepolia, sepolia, baseSepolia } from "viem/chains";

const kit = new AppKit();

function mapChainName(chainId: number) {
  switch (chainId) {
    case 11155111: return "Ethereum_Sepolia";
    case 421614: return "Arbitrum_Sepolia";
    case 84532: return "Base_Sepolia";
    default: throw new Error(`Unsupported chain: ${chainId}`);
  }
}

function getChainConfig(chainId: number) {
  switch (chainId) {
    case 11155111: return sepolia;
    case 421614: return arbitrumSepolia;
    case 84532: return baseSepolia;
    default: throw new Error(`Unsupported chain: ${chainId}`);
  }
}

export async function settleToArc({
  chainId,
  amount,
  recipient,
  address,
  onStage,
}: {
  chainId: number;
  amount: string;
  recipient: string;
  address: string;
  onStage?: (stage: string) => void;
}) {
  const chainConfig = getChainConfig(chainId);
  const sourceChain = mapChainName(chainId);

  console.log("[ARC SOURCE CHAIN]", sourceChain);

  // Fetch fresh gas fees
  const publicClient = createWalletClient({
    chain: chainConfig,
    transport: custom(window.ethereum),
  }).extend(publicActions);

  const feeData = await publicClient.estimateFeesPerGas();
  console.log("[GAS FEES]", feeData);

  // Override gas
  const originalRequest = window.ethereum.request.bind(window.ethereum);
  window.ethereum.request = async (args: any) => {
    if (args.method === "eth_sendTransaction" && args.params?.[0]) {
      args.params[0].maxFeePerGas = `0x${(feeData.maxFeePerGas! * 2n).toString(16)}`;
      args.params[0].maxPriorityFeePerGas = `0x${feeData.maxPriorityFeePerGas!.toString(16)}`;
    }
    return originalRequest(args);
  };

  const adapter = await createViemAdapterFromProvider({
    provider: window.ethereum,
  });

  // STEP 1 — DEPOSIT
  onStage?.("Approving USDC deposit...");
  let depositResult: any;
  try {
    depositResult = await kit.unifiedBalance.deposit({
      from: { adapter, chain: sourceChain },
      amount,
      token: "USDC",
      allowanceStrategy: "permit",
    });
  } finally {
    window.ethereum.request = originalRequest;
  }

  console.log("[DEPOSIT INITIATED]", depositResult);

  const txHash =
    (depositResult as any)?.transactionHash ||
    (depositResult as any)?.hash ||
    (depositResult as any)?.txHash ||
    null;

  console.log("[ARC TX HASH]", txHash);

  // STEP 2 — WAIT FOR CONFIRMATION
  onStage?.("Waiting for deposit to confirm...");
  const amountNum = parseFloat(amount);
  let confirmed = false;
  let balances: any = null;
  let attempts = 0;

  for (let i = 0; i < 40; i++) {
    attempts = i + 1;
    balances = await kit.unifiedBalance.getBalances({
      sources: { address, chains: [sourceChain] },
      networkType: "testnet",
      includePending: true,
    });

    const totalConfirmed = parseFloat(balances?.totalConfirmedBalance ?? "0");
    onStage?.(`Confirming deposit... (${attempts}/40)`);
    console.log(`[BALANCE CHECK ${attempts}] confirmed =`, totalConfirmed);

    if (totalConfirmed >= amountNum) {
      confirmed = true;
      break;
    }

    await new Promise((r) => setTimeout(r, 4000));
  }

  if (!confirmed) {
    throw new Error(`Deposit not confirmed after ${attempts} attempts. Please try again.`);
  }

  // STEP 3 — SPEND TO ARC TESTNET
  // Try forwarding service first (eliminates Arc gas popup for payer)
  // Falls back to regular spend if forwarding unavailable
  onStage?.("Settling to Arc Testnet...");
  let spendResult: any;
  let spendAttempt = 0;

  while (spendAttempt < 3) {
    try {
      spendAttempt++;
      console.log(`[SPEND ATTEMPT ${spendAttempt}]`);

      // Try forwarding spend first — payer doesn't need Arc Testnet gas
      if ((kit.unifiedBalance as any).forwardSpend) {
        onStage?.("Settling via forwarding service (no Arc gas needed)...");
        spendResult = await (kit.unifiedBalance as any).forwardSpend({
          amount,
          token: "USDC",
          from: { adapter },
          to: {
            chain: "Arc_Testnet",
            recipientAddress: recipient,
          },
        });
      } else {
        // Fallback to regular spend
        spendResult = await kit.unifiedBalance.spend({
          amount,
          token: "USDC",
          from: { adapter },
          to: {
            adapter,
            chain: "Arc_Testnet",
            recipientAddress: recipient,
          },
        });
      }

      break; // success
    } catch (err: any) {
      const isTimeout =
        err?.message?.includes("Timed out") ||
        err?.message?.includes("ONCHAIN_TRANSACTION_REVERTED");

      if (isTimeout && spendAttempt < 3) {
        console.log(`[SPEND TIMEOUT] retrying attempt ${spendAttempt + 1}...`);
        onStage?.(`Arc settlement timed out, retrying... (${spendAttempt}/3)`);
        await new Promise((r) => setTimeout(r, 5000));

        // Try SDK retry with attestation trace
        if (err?.cause?.trace && (kit.unifiedBalance as any).retry) {
          try {
            spendResult = await (kit.unifiedBalance as any).retry(err.cause.trace);
            break;
          } catch (retryErr) {
            console.log("[RETRY FAILED]", retryErr);
          }
        }
      } else {
        throw err;
      }
    }
  }

  console.log("[ARC SPEND RESULT]", spendResult);

  return {
    success: true,
    depositResult,
    spendResult,
    hash: txHash,
  };
}
