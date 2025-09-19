import React from 'react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

const WalletConnection: React.FC = () => {
  const { connected, publicKey } = useWallet();

  return (
    <div className="wallet-connection">
      <div className="wallet-buttons">
        {!connected ? (
          <WalletMultiButton />
        ) : (
          <div className="connected-wallet">
            <div className="wallet-info">
              <span className="wallet-address">
                {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
              </span>
            </div>
            <WalletDisconnectButton />
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnection;