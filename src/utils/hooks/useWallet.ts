import { useContext, useCallback, useMemo } from "react";
import { WalletContext } from "../../context/WalletContext";
import type { WalletContextType } from "../../context/WalletContext";

type UseWalletHook = Pick<
  WalletContextType,
  | "account"
  | "chainId"
  | "balance"
  | "walletType"
  | "isConnected"
  | "isConnecting"
  | "connect"
  | "connectMetaMask"
  | "connectGoogle"
  | "connectEmail"
  | "connectPhone"
  | "connectPasskey"
  | "connectGuest"
  | "switchChain"
  | "disconnect"
>;

export function useWallet(): UseWalletHook {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");

  const {
    account,
    chainId,
    balance,
    walletType,
    isConnected,
    isConnecting,
    connect: defaultConnect,
    connectMetaMask,
    connectGoogle,
    connectEmail: ctxConnectEmail,
    connectPhone: ctxConnectPhone,
    connectPasskey,
    connectGuest,
    switchChain,
    disconnect,
  } = ctx;

  const connect = useCallback((): Promise<
    | string
    | {
        address: string;
        preAuth?: boolean;
        type?: string;
      }
  > => {
    return defaultConnect();
  }, [defaultConnect]);

  const connectEmail = useCallback(
    (email: string, code?: string) => ctxConnectEmail(email, code),
    [ctxConnectEmail]
  );

  const connectPhone = useCallback(
    (phone: string, code?: string) => ctxConnectPhone(phone, code),
    [ctxConnectPhone]
  );

  return useMemo(
    () => ({
      account,
      chainId,
      balance,
      walletType,
      isConnected,
      isConnecting,
      connect,
      connectMetaMask,
      connectGoogle,
      connectEmail,
      connectPhone,
      connectPasskey,
      connectGuest,
      switchChain,
      disconnect,
    }),
    [
      account,
      chainId,
      balance,
      walletType,
      isConnected,
      isConnecting,
      connect,
      connectMetaMask,
      connectGoogle,
      connectEmail,
      connectPhone,
      connectPasskey,
      connectGuest,
      switchChain,
      disconnect,
    ]
  );
}
