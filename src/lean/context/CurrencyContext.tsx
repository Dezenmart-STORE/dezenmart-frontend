import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_TOKEN, type StableToken, TOKENS, getToken } from "../config/tokens";
import { usePrices } from "../hooks/usePrices";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DisplayMode = "token" | "fiat";
type SecondaryCurrency = "TOKEN" | "FIAT";

interface CurrencyContextValue {
  /** Currently selected display token */
  selectedToken: StableToken;
  /** Set the active token */
  setSelectedToken: (token: StableToken) => void;
  /** Toggle token or fiat display */
  displayMode: DisplayMode;
  toggleDisplayMode: () => void;
  /** Format an amount for display using current settings */
  formatAmount: (amount: number, symbol?: string) => string;
  /** Convert amount from one token to USD */
  toUSD: (amount: number, symbol: string) => number;
  /** All available tokens */
  tokens: StableToken[];

  // ── Backward-compatible  ──

  /** "TOKEN" or "FIAT" — same as displayMode but matches old API */
  secondaryCurrency: SecondaryCurrency;
  /** Shortcut for selectedToken.symbol */
  selectedTokenSymbol: string;
  /** User's best secondary fiat currency */
  fiatCurrency: string;
  /** User's local fiat currency code (from geolocation) */
  userLocalCurrency: string;
  /** Convert price between any two currencies */
  convertPrice: (price: number, from: string, to: string) => number;
  /** Format price with currency symbol */
  formatPrice: (price: number, currency: string) => string;
  /** Toggle between TOKEN and FIAT */
  toggleSecondaryCurrency: () => void;
  /** Set display preference */
  setSecondaryCurrency: (currency: SecondaryCurrency) => void;
  /** Format price in the selected token */
  formatTokenPrice: (price: number) => string;
  /** Format price in the determined fiat currency */
  formatFiatPrice: (price: number) => string;
  /** Format according to current preference */
  formatDisplayPrice: (priceInToken: number) => string;
}

const CurrencyCtx = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "dezenmart_secondary_currency";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { toUSD, formatUSD, convertPrice, formatPrice, getSecondaryFiat, userFiat } = usePrices();

  const [selectedToken, setSelectedTokenRaw] = useState<StableToken>(() => {
    try {
      const saved = localStorage.getItem("selectedToken");
      if (saved) {
        const parsed = JSON.parse(saved);
        return getToken(parsed.symbol) ?? DEFAULT_TOKEN;
      }
    } catch { /* ignore */ }
    return DEFAULT_TOKEN;
  });

  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "TOKEN") return "token";
      if (stored === "FIAT") return "fiat";
    } catch { /* ignore */ }
    return "fiat";
  });

  // Persist display mode
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, displayMode === "token" ? "TOKEN" : "FIAT");
    } catch { /* ignore */ }
  }, [displayMode]);

  const setSelectedToken = useCallback((token: StableToken) => {
    setSelectedTokenRaw(token);
    localStorage.setItem("selectedToken", JSON.stringify({ symbol: token.symbol }));
  }, []);

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode((prev) => (prev === "token" ? "fiat" : "token"));
  }, []);

  const formatAmount = useCallback(
    (amount: number, symbol?: string) => {
      const sym = symbol ?? selectedToken.symbol;
      if (displayMode === "fiat") {
        return formatUSD(toUSD(amount, sym));
      }
      return `${amount.toFixed(2)} ${sym}`;
    },
    [displayMode, selectedToken.symbol, toUSD, formatUSD]
  );

  // ── Backward-compatible  ─────────────────────────────────────

  const secondaryCurrency: SecondaryCurrency = displayMode === "token" ? "TOKEN" : "FIAT";
  const selectedTokenSymbol = selectedToken.symbol;

  const fiatCurrency = useMemo(
    () => getSecondaryFiat(selectedTokenSymbol),
    [selectedTokenSymbol, getSecondaryFiat]
  );

  const toggleSecondaryCurrency = toggleDisplayMode;

  const setSecondaryCurrency = useCallback((currency: SecondaryCurrency) => {
    setDisplayMode(currency === "TOKEN" ? "token" : "fiat");
  }, []);

  const formatTokenPrice = useCallback(
    (price: number) => formatPrice(price, selectedTokenSymbol),
    [formatPrice, selectedTokenSymbol]
  );

  const formatFiatPrice = useCallback(
    (priceInToken: number) => {
      const converted = convertPrice(priceInToken, selectedTokenSymbol, fiatCurrency);
      return formatPrice(converted, fiatCurrency);
    },
    [convertPrice, formatPrice, selectedTokenSymbol, fiatCurrency]
  );

  const formatDisplayPrice = useCallback(
    (priceInToken: number) => {
      return secondaryCurrency === "TOKEN"
        ? formatTokenPrice(priceInToken)
        : formatFiatPrice(priceInToken);
    },
    [secondaryCurrency, formatTokenPrice, formatFiatPrice]
  );

  return (
    <CurrencyCtx.Provider
      value={{
        selectedToken,
        setSelectedToken,
        displayMode,
        toggleDisplayMode,
        formatAmount,
        toUSD,
        tokens: TOKENS,
        // Backward compat
        secondaryCurrency,
        selectedTokenSymbol,
        fiatCurrency,
        userLocalCurrency: userFiat,
        convertPrice,
        formatPrice,
        toggleSecondaryCurrency,
        setSecondaryCurrency,
        formatTokenPrice,
        formatFiatPrice,
        formatDisplayPrice,
      }}
    >
      {children}
    </CurrencyCtx.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
