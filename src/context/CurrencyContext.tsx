import { createContext, useContext, useState, ReactNode } from "react";
import { useWeb3 } from "./Web3Context";
import { useCurrencyConverter } from "../utils/hooks/useCurrencyConverter";

type SecondaryCurrency = "TOKEN" | "FIAT";

interface CurrencyContextType {
  secondaryCurrency: SecondaryCurrency;
  toggleSecondaryCurrency: () => void;
  selectedTokenSymbol: string;
  fiatCurrency: string;
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
    useState<SecondaryCurrency>("TOKEN");

  const toggleSecondaryCurrency = () => {
    setSecondaryCurrency((prev) => (prev === "TOKEN" ? "FIAT" : "TOKEN"));
  };

  // If fiat currency matches the stable token, display USD as fallback
  const fiatCurrency =
    userCountry === wallet.selectedToken.symbol.replace(/^c/, "")
      ? "USD"
      : userCountry;

  const value = {
    secondaryCurrency,
    toggleSecondaryCurrency,
    selectedTokenSymbol: wallet.selectedToken.symbol,
    fiatCurrency,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
