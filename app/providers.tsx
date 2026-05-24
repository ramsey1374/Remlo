"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseSepolia, arbitrumSepolia, sepolia } from "wagmi/chains";
import { http } from "viem";
import { ToastProvider } from "@/lib/toast";

const config = getDefaultConfig({
  appName: "Remlo",
  projectId: "2580423081bdcfca1cb7a583a8ec375f",
  appDescription: "Universal USDC Checkout. Pay from any chain, settle on Arc Network.",
  appUrl: "https://remloapp.vercel.app",
  appIcon: "https://remloapp.vercel.app/remlo-logo.png",
  chains: [baseSepolia, arbitrumSepolia, sepolia],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [sepolia.id]: http(),
  },
});


const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#6366f1",
            borderRadius: "medium",
          })}
          modalSize="compact"
          showRecentTransactions={false}
          initialChain={undefined}
        >
          <ToastProvider>
            {children}
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
