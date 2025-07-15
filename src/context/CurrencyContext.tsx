import { createContext, useContext, useState, ReactNode, useMemo } from "react";
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

export const CurrencyProvider = ({ children }: CurrencyProviderProps) => {
  const { wallet } = useWeb3();
  const { userCountry } = useCurrencyConverter();
  const [secondaryCurrency, setSecondaryCurrency] =
    useState<SecondaryCurrency>("FIAT");

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
