import { useSyncExternalStore, useCallback } from "react";
import { ratesStore, TOKEN_FIAT_MAP } from "../core/ratesStore";

export { TOKEN_FIAT_MAP };

/**
 * Token → USD exchange rates.
 *
 * Subscribes to the module-level ratesStore singleton via useSyncExternalStore,
 * so every component always sees the same data and React can safely batch
 * updates in concurrent mode.
 *
 * The store refreshes every 2 minutes, on window focus, and on network
 * reconnect — no component needs to trigger this manually.
 */
export function usePrices() {
  const { rates, fiatRates, userFiat, isFetching, updatedAt } =
    useSyncExternalStore(ratesStore.subscribe, ratesStore.getSnapshot);

  /** Convert a token amount to USD. */
  const toUSD = useCallback(
    (amount: number, symbol: string): number => {
      if (symbol === "USD" || symbol === "FIAT") return amount;
      const rate = rates[symbol];
      return rate !== undefined ? amount * rate : 0;
    },
    [rates]
  );

  /**
   * Convert an amount from one currency to another.
   * Accepts token symbols (cUSD, USDT, CELO…), "USD", or "FIAT".
   * "FIAT" always refers to the user's local fiat currency (from geolocation).
   */
  const convertPrice = useCallback(
    (amount: number, from: string, to: string): number => {
      if (from === to || !amount || isNaN(amount)) return amount || 0;

      // Step 1: normalise to USD
      let usdAmount: number;
      if (from === "USD") {
        usdAmount = amount;
      } else if (from === "FIAT") {
        const localRate = fiatRates[`USD_${userFiat}`] ?? 1;
        usdAmount = amount / localRate;
      } else {
        const rate = rates[from];
        usdAmount = rate !== undefined ? amount * rate : amount;
      }

      // Step 2: USD → target currency
      if (to === "USD") return usdAmount;
      if (to === "FIAT") {
        const localRate = fiatRates[`USD_${userFiat}`] ?? 1;
        return usdAmount * localRate;
      }

      const toRate = rates[to];
      return toRate !== undefined && toRate > 0 ? usdAmount / toRate : usdAmount;
    },
    [rates, fiatRates, userFiat]
  );

  /** Format a price amount with its currency symbol. */
  const formatPrice = useCallback(
    (amount: number, currency: string): string => {
      if (isNaN(amount)) return "—";

      if (currency === "G$") {
        return `G$${amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 3,
        })}`;
      }

      if (currency === "FIAT") {
        try {
          return new Intl.NumberFormat(navigator.language, {
            style: "currency",
            currency: userFiat,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(amount);
        } catch {
          return `${amount.toFixed(2)} ${userFiat}`;
        }
      }

      const fiatCode = TOKEN_FIAT_MAP[currency];
      if (fiatCode) {
        try {
          return new Intl.NumberFormat(navigator.language, {
            style: "currency",
            currency: fiatCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 3,
          }).format(amount);
        } catch {
          return `${amount.toFixed(2)} ${currency}`;
        }
      }

      // CELO or unknown tokens — show raw amount + symbol
      return `${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      })} ${currency}`;
    },
    [userFiat]
  );

  /** Format a USD amount as "$X.XX". */
  const formatUSD = useCallback(
    (usd: number): string => (isNaN(usd) ? "$0.00" : `$${usd.toFixed(2)}`),
    []
  );

  /**
   * Best secondary fiat currency for a given token.
   * Avoids showing the same denomination twice:
   * e.g. cUSD ("USD") + user fiat "USD" → returns "EUR" instead.
   */
  const getSecondaryFiat = useCallback(
    (tokenSymbol: string): string => {
      const tokenFiat = TOKEN_FIAT_MAP[tokenSymbol];
      if (tokenFiat === userFiat) return "USD";
      if (tokenFiat === "USD" && userFiat === "USD") return "EUR";
      return userFiat;
    },
    [userFiat]
  );

  return {
    toUSD,
    formatUSD,
    convertPrice,
    formatPrice,
    getSecondaryFiat,
    rates,
    userFiat,
    isFetching,
    updatedAt,
    refreshRates: ratesStore.refresh,
  };
}
