import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiGlobeAlt,
  HiArrowsRightLeft,
  HiExclamationTriangle,
  HiCheckCircle,
  HiChevronDown,
} from "react-icons/hi2";
import Button from "../common/Button";
import { useNetworkSwitch } from "../../utils/hooks/useNetworkSwitch";
import { useWeb3 } from "../../context/Web3Context";
import {
  SUPPORTED_CHAINS,
  TARGET_CHAIN,
  getChainMetadata,
  CHAIN_METADATA,
} from "../../utils/config/web3.config";
import { useSnackbar } from "../../context/SnackbarContext";

interface NetworkSwitcherProps {
  selectedChainId?: number;
  onChainSelect?: (chainId: number) => void;
  showCurrentNetwork?: boolean;
  variant?: "dropdown" | "grid" | "inline";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({
  selectedChainId,
  onChainSelect,
  showCurrentNetwork = true,
  variant = "dropdown",
  size = "md",
  className = "",
  disabled = false,
}) => {
  const { wallet } = useWeb3();
  const { showSnackbar } = useSnackbar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { switchNetwork, isSwitching, isOnSupportedNetwork, currentChainId } =
    useNetworkSwitch({
      onSuccess: (chainId) => {
        onChainSelect?.(chainId);
        setIsDropdownOpen(false);
        showSnackbar(
          `Switched to ${getChainMetadata(chainId)?.name}`,
          "success"
        );
      },
      onError: (error) => {
        showSnackbar(error.message, "error");
      },
    });

  const currentChain = useMemo(() => {
    return currentChainId ? getChainMetadata(currentChainId) : null;
  }, [currentChainId]);

  const targetChainId = selectedChainId || currentChainId || TARGET_CHAIN.id;
  const isOnCorrectNetwork = currentChainId === targetChainId;
  const needsSwitch = !isOnSupportedNetwork() || !isOnCorrectNetwork;

  const handleNetworkSwitch = useCallback(
    async (chainId: number) => {
      if (chainId === currentChainId) {
        onChainSelect?.(chainId);
        setIsDropdownOpen(false);
        return;
      }

      await switchNetwork(chainId);
    },
    [currentChainId, switchNetwork, onChainSelect]
  );

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-base px-4 py-3",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (variant === "inline" && showCurrentNetwork) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {currentChain && (
          <div className="flex items-center gap-2">
            {currentChain.icon ? (
              <img
                src={currentChain.icon}
                alt={currentChain.shortName}
                className={`${iconSizes[size]} rounded-full`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div
                className={`${iconSizes[size]} rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white`}
              >
                {currentChain.shortName.charAt(0)}
              </div>
            )}
            <span className="text-gray-300 font-medium">
              {currentChain.name}
            </span>
          </div>
        )}

        {needsSwitch && (
          <Button
            title="Switch Network"
            icon={<HiArrowsRightLeft className={iconSizes[size]} />}
            onClick={() => handleNetworkSwitch(TARGET_CHAIN.id)}
            disabled={disabled || isSwitching}
            className={`bg-Red hover:bg-Red/80 text-white ${sizeClasses[size]} transition-all duration-200`}
          />
        )}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className={`space-y-3 ${className}`}>
        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <HiGlobeAlt className={iconSizes[size]} />
          Select Network
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_CHAINS.map((chain) => {
            const metadata = CHAIN_METADATA[chain.id];
            const isActive = currentChainId === chain.id;
            const isSelected = targetChainId === chain.id;
            const isPrimary = chain.id === TARGET_CHAIN.id;

            return (
              <button
                key={chain.id}
                onClick={() => handleNetworkSwitch(chain.id)}
                disabled={disabled || isSwitching}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? "border-Red bg-Red/20 text-Red"
                    : isActive
                    ? "border-green-500 bg-green-500/20 text-green-300"
                    : isPrimary
                    ? "border-Red/30 bg-Red/10 text-Red/80 hover:border-Red/50"
                    : "border-gray-700/50 bg-gray-800/50 text-gray-400 hover:border-gray-600"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-2">
                  {metadata?.icon ? (
                    <img
                      src={metadata.icon}
                      alt={metadata.shortName}
                      className={`${iconSizes[size]} rounded-full`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className={`${iconSizes[size]} rounded-full bg-gray-500 flex items-center justify-center text-xs font-bold text-white`}
                    >
                      {metadata?.shortName?.charAt(0) || "?"}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{metadata?.name}</div>
                    <div className="text-xs opacity-75">
                      {metadata?.shortName}
                    </div>
                  </div>
                  {isActive && (
                    <HiCheckCircle
                      className={`${iconSizes[size]} text-green-500`}
                    />
                  )}
                  {isSwitching && targetChainId === chain.id && (
                    <div
                      className={`${iconSizes[size]} border-2 border-Red border-t-transparent rounded-full animate-spin`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={disabled || isSwitching}
        className={`flex items-center gap-2 bg-Dark border border-Red/20 rounded-lg hover:border-Red/40 transition-all duration-200 ${sizeClasses[size]} disabled:opacity-50 disabled:cursor-not-allowed w-full justify-between`}
      >
        <div className="flex items-center gap-2">
          {currentChain?.icon ? (
            <img
              src={currentChain.icon}
              alt={currentChain.shortName}
              className={`${iconSizes[size]} rounded-full`}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <HiGlobeAlt className={`${iconSizes[size]} text-gray-400`} />
          )}
          <span className="text-white font-medium">
            {currentChain?.name || "Select Network"}
          </span>
          {!isOnSupportedNetwork() && (
            <HiExclamationTriangle
              className={`${iconSizes[size]} text-yellow-400`}
            />
          )}
        </div>

        {isSwitching ? (
          <div
            className={`${iconSizes[size]} border-2 border-Red border-t-transparent rounded-full animate-spin`}
          />
        ) : (
          <HiChevronDown
            className={`${iconSizes[size]} text-gray-400 transition-transform ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 bg-[#1a1c20] border border-Red/30 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            {SUPPORTED_CHAINS.map((chain, index) => {
              const metadata = CHAIN_METADATA[chain.id];
              const isActive = currentChainId === chain.id;
              const isPrimary = chain.id === TARGET_CHAIN.id;

              return (
                <motion.button
                  key={chain.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleNetworkSwitch(chain.id)}
                  disabled={disabled || isSwitching}
                  className={`w-full px-3 py-2.5 text-left hover:bg-Red/10 transition-all duration-200 flex items-center gap-3 ${
                    isActive
                      ? "bg-Red/20 text-white border-l-2 border-Red"
                      : "text-gray-300"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {metadata?.icon ? (
                    <img
                      src={metadata.icon}
                      alt={metadata.shortName}
                      className={`${iconSizes[size]} rounded-full flex-shrink-0`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className={`${iconSizes[size]} rounded-full bg-gray-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
                    >
                      {metadata?.shortName?.charAt(0) || "?"}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{metadata?.name}</div>
                    <div className="text-xs opacity-75">
                      {metadata?.shortName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPrimary && (
                      <span className="text-xs text-Red/60 bg-Red/20 px-2 py-0.5 rounded-full">
                        PRIMARY
                      </span>
                    )}
                    {isActive && (
                      <HiCheckCircle
                        className={`${iconSizes[size]} text-green-500`}
                      />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NetworkSwitcher;
