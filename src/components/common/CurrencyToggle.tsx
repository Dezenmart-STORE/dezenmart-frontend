import { memo, useMemo } from "react";
import { IoMdSwap } from "react-icons/io";
import { useCurrency } from "../../context/CurrencyContext";

const CurrencyToggle = () => {
  const {
    secondaryCurrency,
    toggleSecondaryCurrency,
    selectedTokenSymbol,
    fiatCurrency,
    displayCurrency,
  } = useCurrency();

  const nextCurrency = useMemo(() => {
    return secondaryCurrency === "FIAT" ? selectedTokenSymbol : fiatCurrency;
  }, [secondaryCurrency, selectedTokenSymbol, fiatCurrency]);

  return (
    <>
      {fiatCurrency === selectedTokenSymbol && fiatCurrency === "USD" ? (
        <></>
      ) : (
        <button
          onClick={toggleSecondaryCurrency}
          className="flex items-center gap-1 px-1.5 md:px-2 py-1 rounded bg-[#373A3F] hover:bg-[#42464d] transition-colors focus:outline-none focus:ring-2 focus:ring-Red focus:ring-opacity-50"
          aria-label={`Toggle currency display to ${nextCurrency}`}
        >
          <span className="text-xs text-white">{displayCurrency}</span>
          <IoMdSwap className="text-white text-xs" />
        </button>
      )}
    </>
  );
};

export default memo(CurrencyToggle);
