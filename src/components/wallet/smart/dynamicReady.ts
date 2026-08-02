import { createContext, useContext } from "react";

/**
 * True only inside DynamicRoot, i.e. below a mounted <DynamicContextProvider>.
 *
 * SmartWalletProvider renders the original (Dynamic-less) tree as the Suspense
 * fallback while DynamicRoot's chunk loads. Anything that calls a Dynamic hook
 * (DynamicWalletBridge) must wait for this to be true, otherwise the hook throws
 * "must be used within <DynamicContextProvider>" during that window.
 *
 * This module holds NO SDK imports so it can be imported from the eager bundle
 * without pulling Dynamic in.
 */
export const DynamicReadyContext = createContext(false);

export const useDynamicReady = () => useContext(DynamicReadyContext);
