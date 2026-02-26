import { useCurrency } from "../../context/CurrencyContext";

interface Props {
  className?: string;
}

/**
 * Toggle between showing prices in the selected token or USD.
 * Dark-themed to match the app's design language.
 */
export default function CurrencyToggle({ className = "" }: Props) {
  const { displayMode, toggleDisplayMode, selectedToken } = useCurrency();

  const activeSymbol = displayMode === "token" ? selectedToken.symbol : "USD";
  const nextSymbol = displayMode === "token" ? "USD" : selectedToken.symbol;

  return (
    <button
      onClick={toggleDisplayMode}
      title={`Switch to ${nextSymbol}`}
      aria-label={`Showing prices in ${activeSymbol}. Click to switch to ${nextSymbol}`}
      className={`flex items-center gap-1 rounded bg-[#373A3F] px-1.5 py-1 text-xs font-medium text-white transition-colors hover:bg-[#42464d] focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-opacity-50 md:px-2 ${className}`}
    >
      <span className="truncate max-w-[3.5rem]">{activeSymbol}</span>
      <svg className="h-3 w-3 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    </button>
  );
}
