import React, { useState, useRef, useEffect, useCallback } from "react";
import { HiChevronDown, HiStar } from "react-icons/hi2";
import { useWeb3 } from "../../context/Web3Context";
import { StableToken } from "../../utils/config/web3.config";

const TokenSelector: React.FC = () => {
  const { wallet, setSelectedToken, refreshTokenBalance, availableTokens } =
    useWeb3();

  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const tokenSelectorRef = useRef<HTMLDivElement>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tokenSelectorRef.current &&
        !tokenSelectorRef.current.contains(event.target as Node)
      ) {
        setIsTokenSelectorOpen(false);
      }
    };

    if (isTokenSelectorOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTokenSelectorOpen]);

  const handleTokenSelect = useCallback(
    async (token: StableToken) => {
      if (token.symbol === wallet.selectedToken.symbol) {
        setIsTokenSelectorOpen(false);
        return;
      }

      setSelectedToken(token);
      setIsTokenSelectorOpen(false);

      // Debounced refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          await refreshTokenBalance(token.symbol);
        } catch (error) {
          console.error("Failed to refresh balance after token switch:", error);
        }
      }, 100);
    },
    [setSelectedToken, refreshTokenBalance, wallet.selectedToken.symbol]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Don't render if wallet is not connected
  if (!wallet.isConnected) {
    return null;
  }

  return (
    <div className="relative w-full" ref={tokenSelectorRef}>
      <button
        onClick={() => setIsTokenSelectorOpen(!isTokenSelectorOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#1a1c20] rounded-md border border-gray-600 hover:border-Red/30 hover:bg-Red/5 transition-all duration-200"
        aria-label="Select token"
        aria-expanded={isTokenSelectorOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm flex-shrink-0">
            {typeof wallet.selectedToken.icon === "string" &&
            wallet.selectedToken.icon ? (
              <img
                src={wallet.selectedToken.icon}
                alt={wallet.selectedToken.symbol}
                width={20}
                height={20}
                className="rounded-full"
              />
            ) : (
              "💰"
            )}
          </span>
          <span className="text-white text-sm font-medium truncate">
            {wallet.selectedToken.symbol}
          </span>
        </div>
        <HiChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
            isTokenSelectorOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isTokenSelectorOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1c20] border border-Red/30 rounded-lg shadow-xl z-[99999] max-h-64 overflow-y-auto min-w-full scrollbar-thin scrollbar-thumb-Red/30 scrollbar-track-gray-800">
          {availableTokens.map((token) => (
            <button
              key={token.symbol}
              onClick={() => handleTokenSelect(token)}
              className={`w-full flex items-center justify-between p-3 hover:bg-Red/10 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                token.symbol === wallet.selectedToken.symbol
                  ? "bg-Red/20 border-l-2 border-Red"
                  : ""
              }`}
              role="menuitem"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg flex-shrink-0">
                  {typeof token.icon === "string" && token.icon ? (
                    <img
                      src={token.icon}
                      alt={token.symbol}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  ) : (
                    "💰"
                  )}
                </span>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {token.symbol}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{token.name}</p>
                </div>
              </div>
              {token.symbol === wallet.selectedToken.symbol && (
                <HiStar className="w-4 h-4 text-Red flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TokenSelector;
