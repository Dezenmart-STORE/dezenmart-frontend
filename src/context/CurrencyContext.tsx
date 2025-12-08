import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { useWeb3 } from "./Web3Context";
import { useCurrencyConverter } from "../utils/hooks/useCurrencyConverter";

type SecondaryCurrency = "TOKEN" | "FIAT";

interface CurrencyContextType {
  // State
  secondaryCurrency: SecondaryCurrency;
  selectedTokenSymbol: string;
  fiatCurrency: string;
  displayCurrency: string;
  userLocalCurrency: string;

  // Actions
  toggleSecondaryCurrency: () => void;
  setSecondaryCurrency: (currency: SecondaryCurrency) => void;

  // Conversion utilities
  convertPrice: (price: number, from: string, to: string) => number;
  formatPrice: (
    price: number,
    currency: string,
    options?: Intl.NumberFormatOptions
  ) => string;

  // Display utilities
  formatTokenPrice: (price: number) => string;
  formatFiatPrice: (price: number) => string;
  formatDisplayPrice: (priceInToken: number) => string;

  // Status
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};

interface CurrencyProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "dezenmart_secondary_currency";

export const CurrencyProvider = ({ children }: CurrencyProviderProps) => {
  const { wallet } = useWeb3();
  const {
    userCountry,
    convertPrice: hookConvertPrice,
    formatPrice: hookFormatPrice,
    getSecondaryFiatCurrency,
    loading,
    error,
    isReady,
  } = useCurrencyConverter();

  // Initialize state from localStorage with validation
  const [secondaryCurrency, setSecondaryCurrencyState] =
    useState<SecondaryCurrency>(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "TOKEN" || stored === "FIAT") {
          return stored;
        }
      } catch (error) {
        console.warn(
          "Failed to load secondary currency from localStorage:",
          error
        );
      }
      return "FIAT"; // Default to FIAT
    });

  // Persist to localStorage whenever secondaryCurrency changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, secondaryCurrency);
    } catch (error) {
      console.warn("Failed to save secondary currency to localStorage:", error);
    }
  }, [secondaryCurrency]);

  const selectedTokenSymbol = wallet.selectedToken.symbol;

  /**
   * Get the appropriate fiat currency to display
   * Smart logic to avoid showing the same currency twice
   */
  const fiatCurrency = useMemo(() => {
    return getSecondaryFiatCurrency(selectedTokenSymbol);
  }, [selectedTokenSymbol, getSecondaryFiatCurrency]);

  /**
   * Display currency based on user's preference (TOKEN or FIAT)
   */
  const displayCurrency = useMemo(() => {
    return secondaryCurrency === "TOKEN" ? selectedTokenSymbol : fiatCurrency;
  }, [secondaryCurrency, selectedTokenSymbol, fiatCurrency]);

  /**
   * Toggle between TOKEN and FIAT display
   */
  const toggleSecondaryCurrency = useCallback(() => {
    setSecondaryCurrencyState((prev) => (prev === "FIAT" ? "TOKEN" : "FIAT"));
  }, []);

  /**
   * Set secondary currency with validation
   */
  const setSecondaryCurrency = useCallback((currency: SecondaryCurrency) => {
    if (currency !== "TOKEN" && currency !== "FIAT") {
      console.warn(`Invalid secondary currency: ${currency}`);
      return;
    }
    setSecondaryCurrencyState(currency);
  }, []);

  /**
   * Convert price between currencies
   */
  const convertPrice = useCallback(
    (price: number, from: string, to: string): number => {
      return hookConvertPrice(price, from, to);
    },
    [hookConvertPrice]
  );

  /**
   * Format price with currency symbol
   */
  const formatPrice = useCallback(
    (
      price: number,
      currency: string,
      options?: Intl.NumberFormatOptions
    ): string => {
      return hookFormatPrice(price, currency, options);
    },
    [hookFormatPrice]
  );

  /**
   * Format price in the selected token
   */
  const formatTokenPrice = useCallback(
    (price: number): string => {
      return formatPrice(price, selectedTokenSymbol);
    },
    [formatPrice, selectedTokenSymbol]
  );

  /**
   * Format price in the determined fiat currency
   */
  const formatFiatPrice = useCallback(
    (priceInToken: number): string => {
      const convertedPrice = convertPrice(
        priceInToken,
        selectedTokenSymbol,
        fiatCurrency
      );
      return formatPrice(convertedPrice, fiatCurrency);
    },
    [convertPrice, formatPrice, selectedTokenSymbol, fiatCurrency]
  );

  /**
   * Format price according to current display preference
   * Accepts price in token and converts/formats as needed
   */
  const formatDisplayPrice = useCallback(
    (priceInToken: number): string => {
      if (secondaryCurrency === "TOKEN") {
        return formatTokenPrice(priceInToken);
      } else {
        return formatFiatPrice(priceInToken);
      }
    },
    [secondaryCurrency, formatTokenPrice, formatFiatPrice]
  );

  const value: CurrencyContextType = {
    // State
    secondaryCurrency,
    selectedTokenSymbol,
    fiatCurrency,
    displayCurrency,
    userLocalCurrency: userCountry,

    // Actions
    toggleSecondaryCurrency,
    setSecondaryCurrency,

    // Conversion utilities
    convertPrice,
    formatPrice,

    // Display utilities
    formatTokenPrice,
    formatFiatPrice,
    formatDisplayPrice,

    // Status
    isLoading: loading,
    error,
    isReady,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
