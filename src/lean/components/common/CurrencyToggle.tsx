import { useCurrency } from "../../context/CurrencyContext";

interface Props {
  className?: string;
}

/**
 * Simple toggle between token and fiat display.
 */
export default function CurrencyToggle({ className = "" }: Props) {
  const { displayMode, toggleDisplayMode, selectedToken } = useCurrency();

  return (
    <button
      onClick={toggleDisplayMode}
      className={`flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 ${className}`}
      title={`Showing prices in ${displayMode === "token" ? selectedToken.symbol : "USD"}`}
    >
      {displayMode === "token" ? (
        <>
          <span>{selectedToken.symbol}</span>
          <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-gray-400">$</span>
        </>
      ) : (
        <>
          <span>$</span>
          <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-gray-400">{selectedToken.symbol}</span>
        </>
      )}
    </button>
  );
}
