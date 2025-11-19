import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance, type Connector } from 'wagmi';
import { TARGET_CHAIN, StableToken, DEFAULT_STABLE_TOKEN } from '../../utils/config/web3.config';
import { useSnackbar } from '../SnackbarContext';

interface WalletContextType {
  // Wallet state
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  chain: any;
  isCorrectNetwork: boolean;

  // Selected token
  selectedToken: StableToken;
  setSelectedToken: (token: StableToken) => void;

  // Balance
  celoBalance: bigint | undefined;
  refetchCeloBalance: () => void;

  // Actions
  connectWallet: (connectorId?: string) => Promise<void>;
  disconnectWallet: () => void;
  switchToCorrectChain: () => Promise<void>;

  // Available connectors
  connectors: readonly Connector[];
  connectError: Error | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showSnackbar } = useSnackbar();
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // Selected token state with localStorage persistence
  const [selectedToken, setSelectedTokenState] = useState<StableToken>(() => {
    const saved = localStorage.getItem('selectedToken');
    return saved ? JSON.parse(saved) : DEFAULT_STABLE_TOKEN;
  });

  const isCorrectNetwork = chain?.id === TARGET_CHAIN.id;

  // CELO balance for gas fees
  const { data: celoBalanceData, refetch: refetchCeloBalance } = useBalance({
    address,
    query: {
      enabled: !!address && isCorrectNetwork,
      refetchInterval: 300000, // 5 minutes
      staleTime: 240000, // 4 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  });

  const celoBalance = celoBalanceData?.value;

  // Persist selected token to localStorage
  const setSelectedToken = useCallback((token: StableToken) => {
    setSelectedTokenState(token);
    localStorage.setItem('selectedToken', JSON.stringify(token));
  }, []);

  // Connect wallet
  const connectWallet = useCallback(
    async (connectorId?: string) => {
      try {
        const connector = connectorId
          ? connectors.find((c: Connector) => c.id === connectorId)
          : connectors[0];

        if (!connector) {
          throw new Error('No wallet connector available');
        }

        await connect({ connector });
        showSnackbar('Wallet connected successfully', 'success');
      } catch (error: any) {
        console.error('Failed to connect wallet:', error);
        showSnackbar(error.message || 'Failed to connect wallet', 'error');
        throw error;
      }
    },
    [connect, connectors, showSnackbar]
  );

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    disconnect();
    showSnackbar('Wallet disconnected', 'info');
  }, [disconnect, showSnackbar]);

  // Switch to correct chain
  const switchToCorrectChain = useCallback(async () => {
    if (!switchChain) {
      showSnackbar('Chain switching not supported', 'error');
      return;
    }

    try {
      await switchChain({ chainId: TARGET_CHAIN.id });
      showSnackbar(`Switched to ${TARGET_CHAIN.name}`, 'success');
    } catch (error: any) {
      console.error('Failed to switch chain:', error);
      showSnackbar(error.message || 'Failed to switch chain', 'error');
      throw error;
    }
  }, [switchChain, showSnackbar]);

  // Auto-prompt chain switch when on wrong network
  useEffect(() => {
    if (isConnected && !isCorrectNetwork && chain) {
      showSnackbar(
        `Please switch to ${TARGET_CHAIN.name}. Current: ${chain.name}`,
        'warning'
      );
    }
  }, [isConnected, isCorrectNetwork, chain, showSnackbar]);

  // Log connection status
  useEffect(() => {
    if (isConnected && address) {
      console.log('[WalletContext] Connected:', address);
    } else if (!isConnected) {
      console.log('[WalletContext] Disconnected');
    }
  }, [isConnected, address]);

  const value = useMemo(
    () => ({
      address,
      isConnected,
      isConnecting,
      chain,
      isCorrectNetwork,
      selectedToken,
      setSelectedToken,
      celoBalance,
      refetchCeloBalance,
      connectWallet,
      disconnectWallet,
      switchToCorrectChain,
      connectors,
      connectError,
    }),
    [
      address,
      isConnected,
      isConnecting,
      chain,
      isCorrectNetwork,
      selectedToken,
      setSelectedToken,
      celoBalance,
      refetchCeloBalance,
      connectWallet,
      disconnectWallet,
      switchToCorrectChain,
      connectors,
      connectError,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

WalletProvider.displayName = 'WalletProvider';
