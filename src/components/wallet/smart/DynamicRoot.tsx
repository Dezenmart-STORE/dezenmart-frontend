import type { ReactNode } from "react";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "../../../config/chains";
import { queryClient } from "../../../config/queryClient";
import { DYNAMIC_ENV_ID } from "../../../config/smartWallet";
import { DynamicReadyContext } from "./dynamicReady";

/**
 * The Dynamic-enabled web3 provider tree. Loaded lazily and ONLY when
 * VITE_DYNAMIC_ENV_ID is set, so the SDK never enters the default bundle.
 *
 * Dynamic must wrap Wagmi for the wagmi connector to bridge the embedded wallet
 * into the app's existing useAccount / signing flows.
 */
export default function DynamicRoot({ children }: { children: ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            <DynamicReadyContext.Provider value={true}>
              {children}
            </DynamicReadyContext.Provider>
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}
