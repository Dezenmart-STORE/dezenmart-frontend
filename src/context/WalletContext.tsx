"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { ethers } from "ethers";
import { inAppWallet } from "thirdweb/wallets";
import { createThirdwebClient, defineChain } from "thirdweb";

export type WalletType = "eoa" | "smart" | null;

// Chain definitions
const supportedChains = {
  
  celoAlfajores: defineChain({
    id: 44787,
    name: "Celo Alfajores Testnet",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    rpc: "https://alfajores-forno.celo-testnet.org",
    blockExplorers: [
      {
        name: "Celo Explorer",
        url: "https://alfajores-blockscout.celo-testnet.org",
      },
    ],
  }),
};

// Persistent storage
const walletStorage = {
  getItem: async (key: string) => localStorage.getItem(`WALLET_${key}`),
  setItem: async (key: string, value: string) =>
    localStorage.setItem(`WALLET_${key}`, value),
  removeItem: async (key: string) => localStorage.removeItem(`WALLET_${key}`),
};

// ThirdWeb client
const thirdwebClient = createThirdwebClient({
  clientId:
    import.meta.env.VITE_THIRDWEB_CLIENT_ID ||
    "b81c12c8d9ae57479a26c52be1d198eb",
});

// Context shape
export interface WalletContextType {
  account: string | null;
  chainId: number;
  balance: string | null;
  walletType: WalletType;
  isConnected: boolean;
  isConnecting: boolean;
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  connectMetaMask: () => Promise<string>;
  connectEmail: (
    email: string,
    code?: string
  ) => Promise<{ address: string; preAuth?: boolean; type?: string }>;
  connectPhone: (
    phone: string,
    code?: string
  ) => Promise<{ address: string; preAuth?: boolean; type?: string }>;
  connectGoogle: () => Promise<{
    address: string;
    preAuth?: boolean;
    type?: string;
  }>;
  connectPasskey: () => Promise<{
    address: string;
    preAuth?: boolean;
    type?: string;
  }>;
  connectGuest: () => Promise<{
    address: string;
    preAuth?: boolean;
    type?: string;
  }>;
  switchChain: (chainId: number) => Promise<void>;
  disconnect: () => void;
  connect: () => Promise<
    | string
    | {
        address: string;
        preAuth?: boolean;
        type?: string;
      }
  >;
}

export const WalletContext = createContext<WalletContextType | undefined>(
  undefined
);

// Provider
interface WalletProviderProps {
  children: ReactNode;
  defaultChainId?: number;
}

export function WalletProvider({
  children,
  defaultChainId = 4202,
}: WalletProviderProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number>(defaultChainId);
  const [balance, setBalance] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | any>(null);

  // inAppWallet instance (memoized per chain)
  const smartWallet = useMemo(
    () =>
      inAppWallet({
        smartAccount: {
          chain:supportedChains.celoAlfajores,
               sponsorGas: true,
        },
        auth: {
          mode: "popup",
          options: ["google", "email", "phone", "passkey", "guest", "wallet"],
          defaultSmsCountryCode: "NG",
          passkeyDomain:
            typeof window !== "undefined"
              ? window.location.hostname
              : "localhost",
        },
        hidePrivateKeyExport: true,
        metadata: {
          image: { src: "/favicon.png", alt: "Logo", width: 100, height: 100 },
        },
        storage: walletStorage,
      }),
    [chainId]
  );

  // Retry utility with exponential backoff
  const withRetry = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      maxRetries = 3,
      delay = 1000
    ): Promise<T> => {
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          return await fn();
        } catch (err: any) {
          attempt++;
          if (attempt >= maxRetries || !err.message.includes("Failed to fetch"))
            throw err;
          await new Promise((res) =>
            setTimeout(res, delay * 2 ** (attempt - 1))
          );
        }
      }
      throw new Error("Retry attempts exhausted");
    },
    []
  );

  // Fetch & format balance
  const fetchBalance = useCallback(
    async (addr: string, prov: ethers.Provider) => {
      try {
        const wei = await prov.getBalance(addr);
        const eth = parseFloat(ethers.formatEther(wei)).toFixed(4);
        const sym = chainId === 44787 ? "CELO" : "ETH";
        setBalance(`${eth} ${sym}`);
      } catch {
        setBalance("Error");
      }
    },
    [chainId]
  );

  // Reset all wallet state
  const reset = useCallback(() => {
    setAccount(null);
    setBalance(null);
    setProvider(null);
    setSigner(null);
    setWalletType(null);
    setIsConnected(false);
    localStorage.removeItem("WALLET_walletType");
    localStorage.removeItem("WALLET_account");
    localStorage.removeItem("WALLET_chainId");
  }, []);

  // Initialize from localStorage
  useEffect(() => {
    (async () => {
      const wt = localStorage.getItem("WALLET_walletType") as WalletType;
      const acc = localStorage.getItem("WALLET_account");
      const cid = localStorage.getItem("WALLET_chainId");
      if (wt && acc) {
        setWalletType(wt);
        setAccount(acc);
        setChainId(cid ? +cid : defaultChainId);
        setIsConnected(true);

        if (wt === "eoa" && window.ethereum) {
          const bp = new ethers.BrowserProvider(window.ethereum);
          const s = await bp.getSigner();
          setProvider(bp);
          setSigner(s);
          await fetchBalance(acc, bp);
        } else if (wt === "smart") {
          const chain =supportedChains.celoAlfajores;
          const rp = new ethers.JsonRpcProvider(chain.rpc);
          setProvider(rp);
          await fetchBalance(acc, rp);
        }
      }
      setIsInitialized(true);
    })();
  }, [defaultChainId, fetchBalance, chainId]);

  // MetaMask event handlers
  useEffect(() => {
    if (walletType !== "eoa" || !window.ethereum) return;
    const onAccounts = (addrs: string[]) =>
      addrs.length ? setAccount(addrs[0]) : reset();
    const onChain = (hex: string) => setChainId(parseInt(hex, 16));
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, [walletType, reset]);

  // Core connect implementations
  const connectMetaMask = useCallback(async (): Promise<string> => {
    if (!window.ethereum) throw new Error("Install MetaMask");
    setIsConnecting(true);
    try {
      const bp = new ethers.BrowserProvider(window.ethereum);
      const [acc] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const net = await bp.getNetwork();
      const s = await bp.getSigner();
      setProvider(bp);
      setSigner(s);
      setAccount(acc);
      setChainId(Number(net.chainId));
      setWalletType("eoa");
      setIsConnected(true);
      localStorage.setItem("WALLET_walletType", "eoa");
      localStorage.setItem("WALLET_account", acc);
      localStorage.setItem("WALLET_chainId", net.chainId.toString());
      await fetchBalance(acc, bp);
      return acc;
    } finally {
      setIsConnecting(false);
    }
  }, [fetchBalance]);

  const smartConnect = useCallback(
    async (
      strategy: "google" | "email" | "phone" | "passkey" | "guest",
      opts?: any
    ): Promise<{ address: string; preAuth?: boolean; type?: string }> => {
      setIsConnecting(true);
      try {
        const chainDef =
          chainId === 44787
            ? supportedChains.celoAlfajores
            : supportedChains.celoAlfajores;
          

        // For email/phone, opts may contain verificationCode
        const connOpts: any = {
          client: thirdwebClient,
          chain: chainDef,
          strategy,
        };
        if (strategy === "email")
          (connOpts.email = opts.email),
            (connOpts.verificationCode = opts.verificationCode);
        if (strategy === "phone")
          (connOpts.phoneNumber = opts.phoneNumber),
            (connOpts.verificationCode = opts.verificationCode);

        const w = await withRetry(() => smartWallet.connect(connOpts));
        const rp = new ethers.JsonRpcProvider(chainDef.rpc[0]);

        setProvider(rp);
        setSigner(w);
        setAccount(w.address);
        setWalletType("smart");
        setIsConnected(true);

        localStorage.setItem("WALLET_walletType", "smart");
        localStorage.setItem("WALLET_account", w.address);
        localStorage.setItem("WALLET_chainId", chainDef.id.toString());

        await fetchBalance(w.address, rp);
        return { address: w.address };
      } finally {
        setIsConnecting(false);
      }
    },
    [chainId, fetchBalance, smartWallet, withRetry]
  );

  const connectGoogle = useCallback(
    () => smartConnect("google"),
    [smartConnect]
  );
  const connectEmail = useCallback(
    (email: string, code?: string) =>
      smartConnect("email", { email, verificationCode: code }),
    [smartConnect]
  );
  const connectPhone = useCallback(
    (phone: string, code?: string) =>
      smartConnect("phone", { phoneNumber: phone, verificationCode: code }),
    [smartConnect]
  );
  const connectPasskey = useCallback(
    () => smartConnect("passkey"),
    [smartConnect]
  );
  const connectGuest = useCallback(() => smartConnect("guest"), [smartConnect]);
  const connect = useCallback(
    async () => (window.ethereum ? connectMetaMask() : connectGuest()),
    [connectMetaMask, connectGuest]
  );

  // Chain switching
  const switchChain = useCallback(
    async (newChainId: number) => {
      if (walletType === "eoa" && window.ethereum) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${newChainId.toString(16)}` }],
          });
        } catch (err: any) {
          if (err.code === 4902) {
            const def =
              newChainId === 44787
                ? supportedChains.celoAlfajores
                : supportedChains.celoAlfajores;
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${newChainId.toString(16)}`,
                  chainName: def.name,
                  nativeCurrency: def.nativeCurrency,
                  rpcUrls: def.rpc,
                  blockExplorerUrls: def.blockExplorers?.map((e) => e.url),
                },
              ],
            });
          } else throw err;
        }
      }
      setChainId(newChainId);
      localStorage.setItem("WALLET_chainId", newChainId.toString());
      if (account && provider) await fetchBalance(account, provider);
    },
    [walletType, account, provider, fetchBalance]
  );

  // Disconnect
  const disconnect = useCallback(async () => {
    try {
      await smartWallet.disconnect();
    } catch (err) {
      console.error("Failed to disconnect smart wallet:", err);
    }
    reset();
    setIsConnecting(false);
  }, [reset, smartWallet]);

  // Context value
  const value = useMemo(
    () => ({
      account,
      chainId,
      balance,
      walletType,
      isConnected,
      isConnecting,
      provider,
      signer,
      connectMetaMask,
      connectEmail,
      connectPhone,
      connectGoogle,
      connectPasskey,
      connectGuest,
      switchChain,
      disconnect,
      connect,
    }),
    [
      account,
      chainId,
      balance,
      walletType,
      isConnected,
      isConnecting,
      provider,
      signer,
      connectMetaMask,
      connectEmail,
      connectPhone,
      connectGoogle,
      connectPasskey,
      connectGuest,
      switchChain,
      disconnect,
      connect,
    ]
  );

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"></div>
      </div>
    );
  }

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
