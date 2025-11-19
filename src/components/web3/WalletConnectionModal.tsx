import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConnect, type Connector } from "wagmi";
import { SiCoinbase, SiGoogle, SiFacebook, SiApple } from "react-icons/si";
import {
  HiDevicePhoneMobile,
  HiQuestionMarkCircle,
  HiExclamationTriangle,
  HiXMark,
  HiArrowPath,
  HiShieldCheck,
  HiEnvelope,
  HiSparkles,
} from "react-icons/hi2";
import Modal from "../common/Modal";
import Button from "../common/Button";
import WalletEducationModal from "./WalletEducationModal";
import { useWeb3 } from "../../context/Web3Context";
import { useSnackbar } from "../../context/SnackbarContext";
import { useCurrencyConverter } from "../../utils/hooks/useCurrencyConverter";
import { metamaskLogo } from "../../pages";

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showSnackbar } = useSnackbar();
  const { connectors, connect, isPending, reset } = useConnect();
  const { wallet } = useWeb3();
  const { userCountry, loading: currencyLoading } = useCurrencyConverter();

  const [showEducation, setShowEducation] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [walletConnectLoading, setWalletConnectLoading] = useState(false);

  const availableConnectors = useMemo(() => {
    return connectors.filter((connector: Connector) => {
      if (connector.name.toLowerCase().includes("walletconnect")) {
        return !!import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
      }
      return true;
    });
  }, [connectors]);

  // Separate Web2 (email/social) from traditional crypto wallets
  const web2Connectors = useMemo(() => {
    // Filter for Coinbase Smart Wallet (first Coinbase connector is smartWalletOnly)
    return availableConnectors.filter((connector: Connector, index: number) => {
      const isCoinbase = connector.name.toLowerCase().includes("coinbase");
      // First Coinbase connector is the smart wallet
      const isFirstCoinbase = isCoinbase && availableConnectors.findIndex((c: Connector) => c.name.toLowerCase().includes("coinbase")) === index;
      return isFirstCoinbase;
    });
  }, [availableConnectors]);

  const cryptoWallets = useMemo(() => {
    // Filter for traditional wallets (MetaMask, WalletConnect, and second Coinbase)
    return availableConnectors.filter((connector: Connector, index: number) => {
      const isCoinbase = connector.name.toLowerCase().includes("coinbase");
      const isFirstCoinbase = isCoinbase && availableConnectors.findIndex((c: Connector) => c.name.toLowerCase().includes("coinbase")) === index;
      // Exclude the first Coinbase connector (which is smart wallet)
      return !isFirstCoinbase;
    });
  }, [availableConnectors]);

  // Handle successful connection
  useEffect(() => {
    if (wallet.isConnected && connectingWallet) {
      setConnectingWallet(null);
      setConnectionTimeout(false);
      onClose();
      showSnackbar("Wallet connected successfully!", "success");
    }
  }, [wallet.isConnected, connectingWallet, onClose, showSnackbar]);

  // Connection timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (connectingWallet) {
      timeoutId = setTimeout(() => {
        setConnectionTimeout(true);
      }, 15000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [connectingWallet]);

  // Handle WalletConnect loading
  useEffect(() => {
    const walletConnectConnector = connectors.find((c: Connector) =>
      c.name.toLowerCase().includes("walletconnect")
    );

    if (
      walletConnectConnector &&
      connectingWallet === walletConnectConnector.name
    ) {
      setWalletConnectLoading(true);
      const timer = setTimeout(() => setWalletConnectLoading(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [connectingWallet, connectors]);

  const handleClose = () => {
    if (!connectingWallet) {
      onClose();
    }
  };

  const handleConnect = async (connector: Connector) => {
    try {
      setConnectingWallet(connector.name);
      setConnectionTimeout(false);

      // Detect mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      // Special handling for Coinbase Smart Wallet on mobile
      if (connector.name.toLowerCase().includes("coinbase") && isMobile) {
        // Add a small delay to ensure the mobile modal appears
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Special handling for WalletConnect
      if (connector.name.toLowerCase().includes("walletconnect")) {
        setWalletConnectLoading(true);
        // On mobile, WalletConnect should open wallet apps via deep linking
        if (isMobile) {
          showSnackbar("Opening wallet app...", "info");
        }
      }

      await connect({ connector });
    } catch (error: any) {
      console.error("Connection failed:", error);
      setConnectingWallet(null);
      setConnectionTimeout(false);
      setWalletConnectLoading(false);

      if (error.message?.includes("User rejected") || error.message?.includes("User closed modal")) {
        showSnackbar("Connection cancelled", "info");
      } else if (error.message?.includes("Project ID")) {
        showSnackbar("Wallet service temporarily unavailable", "error");
      } else if (error.message?.includes("Failed to connect")) {
        showSnackbar("Unable to connect. Please ensure your wallet app is installed and up to date.", "error");
      } else {
        showSnackbar("Failed to connect wallet. Please try again.", "error");
      }
    }
  };

  const handleCancelConnection = () => {
    reset();
    setConnectingWallet(null);
    setConnectionTimeout(false);
    setWalletConnectLoading(false);
  };

  const handleRetryConnection = () => {
    setConnectionTimeout(false);
    const connector = connectors.find((c: Connector) => c.name === connectingWallet);
    if (connector) {
      handleConnect(connector);
    }
  };

  const isSmartWallet = (connector: Connector, index: number) => {
    const isCoinbase = connector.name.toLowerCase().includes("coinbase");
    const isFirstCoinbase = isCoinbase && availableConnectors.findIndex((c: Connector) => c.name.toLowerCase().includes("coinbase")) === index;
    return isFirstCoinbase;
  };

  const getWalletIcon = (connector: Connector, index: number) => {
    const name = connector.name.toLowerCase();

    // Check if this is the smart wallet (first Coinbase connector)
    if (isSmartWallet(connector, index)) {
      return <SiCoinbase className="w-8 h-8 text-blue-500" />;
    }

    // Traditional crypto wallets
    if (name.includes("metamask")) {
      return <img src={metamaskLogo} alt="Metamask" className="w-8 h-8" />;
    } else if (name.includes("coinbase")) {
      return <SiCoinbase className="w-8 h-8 text-blue-500" />;
    } else if (name.includes("walletconnect")) {
      return <HiDevicePhoneMobile className="w-8 h-8 text-blue-400" />;
    }

    return <HiDevicePhoneMobile className="w-8 h-8 text-gray-400" />;
  };

  const getWalletName = (connector: Connector, index: number) => {
    if (isSmartWallet(connector, index)) {
      return "Coinbase Smart Wallet";
    }
    return connector.name;
  };

  const getWalletDescription = (connector: Connector, index: number) => {
    const name = connector.name.toLowerCase();

    // Check if this is the smart wallet (first Coinbase)
    if (isSmartWallet(connector, index)) {
      return "Sign in with email, phone, or passkeys - no traditional crypto wallet needed";
    }

    // Traditional crypto wallets
    if (name.includes("walletconnect")) {
      return "Connect with 300+ mobile wallet apps via QR code or deep link";
    } else if (name.includes("metamask")) {
      return "Most popular browser extension wallet for Web3";
    } else if (name.includes("coinbase")) {
      return "Coinbase browser extension or mobile wallet app";
    }

    return "Connect your crypto wallet";
  };

  const getConnectionMessage = () => {
    if (!connectingWallet) return null;

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    const isSmartWalletConnecting = connectingWallet.toLowerCase().includes("coinbase") &&
      availableConnectors.findIndex((c: Connector) => c.name === connectingWallet) === 0;

    if (connectingWallet.toLowerCase().includes("walletconnect")) {
      return {
        title: "Connecting to WalletConnect",
        message: isMobile
          ? "Opening your wallet app... If nothing happens, make sure your preferred wallet app is installed on your device."
          : "Scan the QR code with your mobile wallet app to connect. Make sure both devices are connected to the internet.",
        loading: walletConnectLoading,
      };
    }

    if (isSmartWalletConnecting) {
      return {
        title: "Setting Up Your Coinbase Smart Wallet",
        message: isMobile
          ? "Complete the setup in the Coinbase window or app. You can sign in with email, phone, or passkeys (Face ID/Touch ID)."
          : "Complete the setup in the popup window. You can sign in with email, phone, or passkeys for instant wallet creation.",
        loading: true,
      };
    }

    if (connectionTimeout) {
      return {
        title: "Connection Taking Too Long?",
        message: isMobile
          ? "Make sure your wallet app is running and hasn't crashed. Close and reopen your wallet app, then try again. Also ensure your wallet is connected to the Celo network."
          : "Make sure your wallet extension is running and hasn't crashed. Refresh your browser or restart the wallet extension, then try again. Also ensure your wallet is connected to the Celo network.",
        timeout: true,
      };
    }

    return {
      title: `Connecting to ${connectingWallet}`,
      message: isMobile
        ? "Check your wallet app for connection request. Make sure the app is installed and up to date."
        : "Check your wallet extension for connection request. You may need to approve the connection in the extension popup.",
      loading: true,
    };
  };

  const connectionMessage = getConnectionMessage();

  if (showEducation) {
    return (
      <WalletEducationModal
        isOpen={isOpen}
        onClose={() => setShowEducation(false)}
        onBack={() => setShowEducation(false)}
      />
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Sign In to Get Started"
      maxWidth="md:max-w-lg"
      showCloseButton={!connectingWallet}
    >
      <div className="space-y-6">
        {/* Connection Status */}
        <AnimatePresence>
          {connectionMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                connectionMessage.timeout
                  ? "bg-Red/10 border-Red/30"
                  : "bg-Red/5 border-Red/20"
              }`}
            >
              <div className="flex items-start gap-3">
                {connectionMessage.loading && (
                  <div className="w-5 h-5 border-2 border-Red border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                )}
                {connectionMessage.timeout && (
                  <HiExclamationTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-Red" />
                )}
                <div className="flex-1">
                  <h4 className="font-medium mb-1 text-white">
                    {connectionMessage.title}
                  </h4>
                  <p className="text-sm text-gray-300">
                    {connectionMessage.message}
                  </p>

                  {connectionMessage.timeout && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        title="Retry Connection"
                        icon={<HiArrowPath className="w-4 h-4" />}
                        onClick={handleRetryConnection}
                        className="bg-Red hover:bg-Red/80 text-white text-sm px-3 py-1.5 transition-all duration-200"
                      />
                      <Button
                        title="Cancel"
                        icon={<HiXMark className="w-4 h-4" />}
                        onClick={handleCancelConnection}
                        className="bg-Dark hover:bg-Dark/80 text-white text-sm px-3 py-1.5 transition-all duration-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Introduction */}
        {!connectingWallet && (
          <div className="text-center space-y-4">
            <p className="text-gray-300">
              Choose your preferred way to start shopping with crypto
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-Red bg-Red/10 rounded-lg p-3 border border-Red/20">
              <HiShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>
                Secure payments in {userCountry || "your local currency"} • No
                fees • Instant settlement
              </span>
            </div>
          </div>
        )}

        {/* Coinbase Smart Wallet Options */}
        {!connectingWallet && web2Connectors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <SiCoinbase className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-white">Coinbase Smart Wallet</h3>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                Recommended for beginners
              </span>
            </div>
            <p className="text-sm text-gray-400 -mt-1">
              No crypto wallet? No problem! Create a secure wallet instantly with your email, phone, or passkeys (Face ID/Windows Hello). Perfect for mobile and desktop.
            </p>

            {web2Connectors.map((connector: Connector, idx: number) => {
              const connectorIndex = availableConnectors.findIndex((c: Connector) => c.id === connector.id);
              return (
                <motion.div
                  key={connector.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <button
                    onClick={() => handleConnect(connector)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 text-white hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200"
                  >
                    {getWalletIcon(connector, connectorIndex)}
                    <div className="flex-1 text-left">
                      <h3 className="font-medium">{getWalletName(connector, connectorIndex)}</h3>
                      <p className="text-sm opacity-75">
                        {getWalletDescription(connector, connectorIndex)}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Divider */}
        {!connectingWallet && web2Connectors.length > 0 && cryptoWallets.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-700/50" />
            <span className="text-xs text-gray-500">OR</span>
            <div className="flex-1 h-px bg-gray-700/50" />
          </div>
        )}

        {/* Traditional Crypto Wallet Options */}
        {!connectingWallet && cryptoWallets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Crypto Wallets</h3>
              <span className="text-xs bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded-full">
                For experienced users
              </span>
            </div>
            <p className="text-sm text-gray-400 -mt-1">
              Already have a crypto wallet? Connect MetaMask, Coinbase Wallet, or other supported wallets.
            </p>

            {cryptoWallets.map((connector: Connector, idx: number) => {
              const connectorIndex = availableConnectors.findIndex((c: Connector) => c.id === connector.id);
              return (
                <motion.div
                  key={connector.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <button
                    onClick={() => handleConnect(connector)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border bg-Dark hover:bg-Dark/80 border-gray-700/50 text-white hover:border-Red/30 hover:shadow-lg hover:shadow-Red/5 transition-all duration-200"
                  >
                    {getWalletIcon(connector, connectorIndex)}
                    <div className="flex-1 text-left">
                      <h3 className="font-medium">{getWalletName(connector, connectorIndex)}</h3>
                      <p className="text-sm opacity-75">
                        {getWalletDescription(connector, connectorIndex)}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-Red rounded-full animate-pulse" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Connecting state - show wallet being connected */}
        {connectingWallet && (() => {
          const connector = availableConnectors.find((c: Connector) => c.name === connectingWallet);
          const connectorIndex = availableConnectors.findIndex((c: Connector) => c.name === connectingWallet);
          if (!connector) return null;

          return (
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <button
                  disabled
                  className="w-full flex items-center gap-4 p-4 rounded-xl border bg-Red/20 border-Red/50 text-white shadow-lg shadow-Red/10"
                >
                  {getWalletIcon(connector, connectorIndex)}
                  <div className="flex-1 text-left">
                    <h3 className="font-medium">{getWalletName(connector, connectorIndex)}</h3>
                    <p className="text-sm opacity-75">
                      {getWalletDescription(connector, connectorIndex)}
                    </p>
                  </div>
                  <div className="w-5 h-5 border-2 border-Red border-t-transparent rounded-full animate-spin" />
                </button>
              </motion.div>
            </div>
          );
        })()}

        {/* Cancel Connection Button */}
        {connectingWallet && !connectionTimeout && (
          <Button
            title="Cancel Connection"
            icon={<HiXMark className="w-4 h-4" />}
            onClick={handleCancelConnection}
            className="flex items-center justify-center w-full bg-Dark hover:bg-Dark/80 text-white py-2.5 transition-all duration-200"
          />
        )}

        {/* Help Section */}
        {!connectingWallet && (
          <div className="border-t border-gray-700/50 pt-4 space-y-3">
            <Button
              title="New to wallets? Learn the basics"
              icon={<HiQuestionMarkCircle className="w-4 h-4" />}
              onClick={() => setShowEducation(true)}
              className="flex items-center justify-center w-full bg-transparent border border-Red/30 text-gray-300 hover:bg-Red/5 hover:text-white hover:border-Red/50 transition-all duration-200"
            />

            <p className="text-xs text-gray-500 text-center">
              Your wallet stays secure - we never store your private keys
            </p>
          </div>
        )}

        {/* Error Display */}
        <AnimatePresence>
          {wallet.error && !connectingWallet && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-Red/10 border border-Red/30 rounded-lg"
            >
              <p className="text-Red text-sm">{wallet.error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};

export default WalletConnectionModal;
