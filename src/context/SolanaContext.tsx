import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  WalletModalProvider,
  WalletMultiButton,
  WalletDisconnectButton
} from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import Solana wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// DezenMart smart contract configuration
import { PROGRAM_CONFIG } from '../solana/program-config';

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: React.FC<SolanaProviderProps> = ({ children }) => {
  // Configure the network (devnet for our deployed contract)
  const network = WalletAdapterNetwork.Devnet;

  // Use our configured devnet endpoint
  const endpoint = useMemo(() => PROGRAM_CONFIG.RPC_ENDPOINT, []);

  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// Export wallet components for easy use
export { WalletMultiButton, WalletDisconnectButton };

// Export a hook to use the wallet context
export const useSolanaWallet = () => {
  const wallet = useContext(WalletProvider as any);
  return wallet;
};

export default SolanaProvider;