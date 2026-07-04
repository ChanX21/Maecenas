"use client";

import { useEffect, useState } from "react";
import { DynamicProvider } from "@dynamic-labs-sdk/react-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initializeClient } from "@dynamic-labs-sdk/client";
import {
  dynamicClient,
  isDynamicConfigured
} from "@/lib/dynamic-client";
import { MaecenasWalletProvider } from "@/components/wallet/maecenas-wallet-provider";

export function AppWalletProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (!isDynamicConfigured || dynamicClient.initStatus !== "uninitialized") return;
    void initializeClient(dynamicClient);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicProvider client={dynamicClient}>
        <MaecenasWalletProvider>{children}</MaecenasWalletProvider>
      </DynamicProvider>
    </QueryClientProvider>
  );
}
