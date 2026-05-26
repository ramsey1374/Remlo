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

// Safe provider detection for mobile wallets
function getProvider(): any {
  if (typeof window === "undefined") throw new Error("No window");

  // Standard
  if (window.ethereum) return window.ethereum;

  // Bitget
  if ((window as any).bitkeep?.ethereum) return (window as any).bitkeep.ethereum;

  // Trust Wallet
  if ((window as any).trustwallet) return (window as any).trustwallet;

  // Generic injected
  if ((window as any).web3?.currentProvider) return (window as any).web3.currentProvider;

  throw new Error("No wallet detected. Please open in your wallet's browser.");
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

  const provider = getProvider();
  console.log("[PROVIDER]", provider);

  // Gas override — wrapped in try/catch so mobile failures don't block
  let originalRequest: any = null;
  try {
    const publicClient = createWalletClient({
      chain: chainConfig,
      transport: custom(provider),
    }).extend(publicActions);

    const feeData = await publicClient.estimateFeesPerGas();
    console.log("[GAS FEES]", feeData);

    originalRequest = provider.request.bind(provider);
    provider.request = async (args: any) => {
      if (args.method === "eth_sendTransaction" && args.params?.[0]) {
        try {
          args.params[0].maxFeePerGas = `0x${(feeData.maxFeePerGas! * 2n).toString(16)}`;
          args.params[0].maxPriorityFeePerGas = `0x${feeData.maxPriorityFeePerGas!.toString(16)}`;
        } catch (e) {
          console.warn("[GAS OVERRIDE FAILED]", e);
          // Continue without override on mobile
        }
      }
      return originalRequest(args);
    };
  } catch (gasErr) {
    console.warn("[GAS ESTIMATION FAILED — continuing without override]", gasErr);
    // Don't throw — let settlement proceed without gas override
  }

  const adapter = await createViemAdapterFromProvider({ provider });

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
    // Always restore original request
    if (originalRequest) {
      try { provider.request = originalRequest; } catch (e) {}
    }
  }

  console.log("[DEPOSIT INITIATED]", depositResult);

  const txHash =
    (depositResult as any)?.transactionHash ||
    (depositResult as any)?.hash ||
    (depositResult as any)?.txHash ||
    null;

  // STEP 2 — WAIT FOR CONFIRMATION
  // Increased attempts and interval for mobile (slower network)
  onStage?.("Waiting for deposit to confirm...");
  const amountNum = parseFloat(amount);
  let confirmed = false;
  const MAX_ATTEMPTS = 60; // 4 min on mobile vs 2.5 min desktop
  const POLL_INTERVAL = 5000; // 5s on mobile

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const balances = await kit.unifiedBalance.getBalances({
        sources: { address, chains: [sourceChain] },
        networkType: "testnet",
        includePending: true,
      });

      const totalConfirmed = parseFloat(
        (balances as any)?.totalConfirmedBalance ?? "0"
      );

      onStage?.(`Confirming deposit... (${i + 1}/${MAX_ATTEMPTS})`);
      console.log(`[BALANCE CHECK ${i + 1}] confirmed =`, totalConfirmed);

      if (totalConfirmed >= amountNum) {
        confirmed = true;
        break;
      }
    } catch (pollErr) {
      console.warn(`[POLL ERROR attempt ${i + 1}]`, pollErr);
      // Don't throw on poll errors — retry
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  if (!confirmed) {
    throw new Error(
      `Deposit not confirmed after ${MAX_ATTEMPTS} attempts. Please try again.`
    );
  }

  // STEP 3 — SPEND TO ARC TESTNET
  onStage?.("Settling to Arc Testnet...");
  let spendResult: any;
  let spendAttempt = 0;

  while (spendAttempt < 3) {
    try {
      spendAttempt++;
      console.log(`[SPEND ATTEMPT ${spendAttempt}]`);

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

      break;
    } catch (err: any) {
      const isTimeout =
        err?.message?.includes("Timed out") ||
        err?.message?.includes("ONCHAIN_TRANSACTION_REVERTED") ||
        err?.message?.includes("Mint failure");

      if (isTimeout && spendAttempt < 3) {
        console.log(`[SPEND TIMEOUT] retrying ${spendAttempt + 1}/3...`);
        onStage?.(`Arc settlement timed out, retrying... (${spendAttempt}/3)`);

        // Try SDK retry with attestation
        if (err?.cause?.trace && (kit.unifiedBalance as any).retry) {
          try {
            spendResult = await (kit.unifiedBalance as any).retry(err.cause.trace);
            break;
          } catch (retryErr) {
            console.log("[RETRY FAILED]", retryErr);
          }
        }

        await new Promise((r) => setTimeout(r, 6000));
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
