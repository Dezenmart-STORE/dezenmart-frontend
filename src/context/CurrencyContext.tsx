import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
} from "react";
import { useWeb3 } from "./Web3Context";
import { useCurrencyConverter } from "../utils/hooks/useCurrencyConverter";

type SecondaryCurrency = "TOKEN" | "FIAT";

interface CurrencyContextType {
  secondaryCurrency: SecondaryCurrency;
  toggleSecondaryCurrency: () => void;
  selectedTokenSymbol: string;
  fiatCurrency: string;
  displayCurrency: string;
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
  const { userCountry } = useCurrencyConverter();

  // Initialize state from localStorage or default to "FIAT"
  const [secondaryCurrency, setSecondaryCurrency] = useState<SecondaryCurrency>(
    () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return (stored as SecondaryCurrency) || "FIAT";
      } catch (error) {
        console.warn(
          "Failed to load secondary currency from localStorage:",
          error
        );
        return "FIAT";
      }
    }
  );

  // Persist to localStorage whenever secondaryCurrency changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, secondaryCurrency);
    } catch (error) {
      console.warn("Failed to save secondary currency to localStorage:", error);
    }
  }, [secondaryCurrency]);

  const toggleSecondaryCurrency = () => {
    setSecondaryCurrency((prev) => (prev === "FIAT" ? "TOKEN" : "FIAT"));
  };

  const selectedTokenSymbol = wallet.selectedToken.symbol;

  // Check if fiat currency matches the stable token
  const fiatCurrency = useMemo(() => {
    const tokenWithoutPrefix = selectedTokenSymbol.replace(/^c/, "");
    return userCountry === tokenWithoutPrefix ? "USD" : userCountry;
  }, [userCountry, selectedTokenSymbol]);

  // Display currency for UI
  const displayCurrency = useMemo(() => {
    if (secondaryCurrency === "TOKEN") {
      return selectedTokenSymbol;
    }
    return fiatCurrency;
  }, [secondaryCurrency, selectedTokenSymbol, fiatCurrency]);

  const value = {
    secondaryCurrency,
    toggleSecondaryCurrency,
    selectedTokenSymbol,
    fiatCurrency,
    displayCurrency,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
