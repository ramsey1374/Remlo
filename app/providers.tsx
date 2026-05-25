"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arbitrumSepolia, baseSepolia, sepolia } from "@reown/appkit/networks";
import { ToastProvider } from "@/lib/toast";

const projectId = "2580423081bdcfca1cb7a583a8ec375f";

const metadata = {
  name: "Remlo",
  description: "Universal USDC Checkout. Pay from any chain, settle on Arc Network.",
  url: "https://remloapp.vercel.app",
  icons: ["https://remloapp.vercel.app/remlo-logo.png"],
};

const networks = [arbitrumSepolia, baseSepolia, sepolia] as any;

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#6366f1",
    "--w3m-border-radius-master": "12px",
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
