import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import { StableToken } from "../../../../config/tokens";

interface Props {
  priceUSDT: string;
  priceToken: string;
  paymentToken: string | undefined;
  tokens: StableToken[];
  onUSDTChange: (v: string) => void;
  onTokenPriceChange: (v: string) => void;
  onTokenChange: (symbol: string) => void;
  error?: string;
}

const PriceField: React.FC<Props> = ({
  priceUSDT,
  priceToken,
  paymentToken,
  tokens,
  onUSDTChange,
  onTokenPriceChange,
  onTokenChange,
  error,
}) => {
  const [tokenOpen, setTokenOpen] = useState(false);
  const selectedToken = tokens.find((t) => t.symbol === paymentToken);

  return (
    <div className="space-y-3">
      {/* Dual price inputs */}
      <div className="grid grid-cols-2 gap-2">
        {/* Box 1 — canonical USDT price (stored by backend) */}
        <div>
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
            List price
          </p>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={priceUSDT}
              onChange={(e) => onUSDTChange(e.target.value)}
              placeholder="0.00"
              aria-label="Price in USDT"
              className={`w-full bg-[#3A3C41] text-white pl-3 pr-14 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition-all ${
                error ? "ring-1 ring-red-500" : ""
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">
              USDT
            </span>
          </div>
        </div>

        {/* Box 2 — equivalent in the buyer's selected payment token */}
        <div>
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
            Buyer pays
          </p>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={priceToken}
              onChange={(e) => onTokenPriceChange(e.target.value)}
              placeholder="0.00"
              aria-label={`Price in ${paymentToken ?? "selected token"}`}
              className="w-full bg-[#3A3C41] text-white pl-3 pr-16 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              {selectedToken?.icon && (
                <img
                  src={selectedToken.icon}
                  alt=""
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                />
              )}
              <span className="text-xs font-medium text-gray-400 truncate max-w-[2.5rem]">
                {paymentToken ?? "—"}
              </span>
            </span>
          </div>
        </div>
      </div>

      <p className="text-gray-500 text-xs">
        Type in either field — the other updates instantly.
      </p>

      {error && (
        <p className="text-red-400 text-xs" role="alert">
          {error}
        </p>
      )}

      {/* Payment token selector */}
      <div className="relative">
        <label className="block text-xs text-gray-400 mb-1.5">
          Buyers pay with <span className="text-red-400">*</span>
        </label>
        <button
          type="button"
          onClick={() => setTokenOpen((o) => !o)}
          aria-expanded={tokenOpen}
          aria-haspopup="listbox"
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-[#3A3C41] rounded-xl border border-transparent hover:border-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedToken?.icon ? (
              <img
                src={selectedToken.icon}
                alt={selectedToken.symbol}
                className="w-6 h-6 rounded-full flex-shrink-0"
              />
            ) : (
              <span className="text-base flex-shrink-0">💰</span>
            )}
            <div className="text-left min-w-0">
              <p className="text-white text-sm font-medium">
                {selectedToken?.symbol ?? "Select token"}
              </p>
              <p className="text-gray-400 text-xs truncate">{selectedToken?.name}</p>
            </div>
          </div>
          <FiChevronDown
            size={16}
            className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
              tokenOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {tokenOpen && (
            <motion.div
              className="absolute top-full left-0 right-0 mt-1 bg-[#292B30] border border-[#3A3C41] rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              role="listbox"
            >
              {tokens.map((token) => (
                <button
                  key={token.symbol}
                  type="button"
                  role="option"
                  aria-selected={token.symbol === paymentToken}
                  onClick={() => {
                    onTokenChange(token.symbol);
                    setTokenOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#3A3C41] transition-colors ${
                    token.symbol === paymentToken ? "bg-red-600/15" : ""
                  }`}
                >
                  {token.icon ? (
                    <img
                      src={token.icon}
                      alt={token.symbol}
                      className="w-6 h-6 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <span className="text-base flex-shrink-0">💰</span>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-sm font-medium">{token.symbol}</p>
                    <p className="text-gray-400 text-xs truncate">{token.name}</p>
                  </div>
                  {token.symbol === paymentToken && (
                    <FiCheck size={14} className="text-red-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PriceField;
