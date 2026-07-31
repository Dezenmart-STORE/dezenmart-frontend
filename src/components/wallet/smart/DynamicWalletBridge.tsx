import { useEffect } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useSmartWallet } from "../../../context/SmartWalletContext";

/**
 * Bridges the Dynamic embedded wallet to our backend: whenever Dynamic has a
 * primary (embedded) wallet for the signed-in user, link it via /wallet/setup.
 * Renders nothing. Loaded lazily and only when the feature is enabled.
 */
export default function DynamicWalletBridge() {
  const { primaryWallet, user } = useDynamicContext();
  const { registerEmbeddedWallet } = useSmartWallet();

  useEffect(() => {
    const address = primaryWallet?.address;
    if (address) registerEmbeddedWallet(address, user?.userId);
  }, [primaryWallet?.address, user?.userId, registerEmbeddedWallet]);

  return null;
}
