import { useEffect } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useSmartWallet } from "../../../context/SmartWalletContext";

/**
 * Bridges the Dezen (embedded) wallet to our backend: when Dynamic's primary
 * wallet is the EMBEDDED one, link it via /wallet/setup.
 *
 * The embedded check is essential. primaryWallet is whatever is currently
 * connected, so without it, connecting MetaMask would overwrite the stored
 * Dezen Wallet address with MetaMask's - corrupting the record and making the
 * app treat an external wallet as the user's Dezen Wallet.
 *
 * Renders nothing. Loaded lazily and only when the feature is enabled.
 */
export default function DynamicWalletBridge() {
  const { primaryWallet, user } = useDynamicContext();
  const { registerEmbeddedWallet, setDezenWalletActive } = useSmartWallet();

  const address = primaryWallet?.address;
  const isEmbedded = !!(
    primaryWallet?.connector as { isEmbeddedWallet?: boolean } | undefined
  )?.isEmbeddedWallet;

  useEffect(() => {
    if (address && isEmbedded) registerEmbeddedWallet(address, user?.userId);
  }, [address, isEmbedded, user?.userId, registerEmbeddedWallet]);

  // Let the rest of the app tell Dezen from an external wallet without pulling
  // in the Dynamic SDK.
  useEffect(() => {
    setDezenWalletActive(!!address && isEmbedded);
    return () => setDezenWalletActive(false);
  }, [address, isEmbedded, setDezenWalletActive]);

  return null;
}
