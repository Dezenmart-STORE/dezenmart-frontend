import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// CoinGecko token ID mapping
// ---------------------------------------------------------------------------
const TOKEN_IDS: Record<string, string> = {
  USDT: "tether",
  cUSD: "celo-dollar",
  cEUR: "celo-euro",
  cREAL: "celo-real-creal",
  "G$": "gooddollar",
  CELO: "celo",
};

// Stablecoins pegged to known fiat (token -> USD rate)
const PEGGED_RATES: Record<string, number> = {
  USDT: 1,
  cUSD: 1,
  cEUR: 1.08,
  cREAL: 0.18,
  cKES: 0.0065,
  cNGN: 0.00063,
  cGBP: 1.27,
  cJPY: 0.0067,
  cCHF: 1.13,
  cZAR: 0.055,
  cAUD: 0.66,
  cCAD: 0.74,
  cCOP: 0.00024,
  eXOF: 0.0016,
  PUSO: 0.018,
  cGHS: 0.062,
  "G$": 0.00015,
  CELO: 0.5,
  USD: 1,
};

// Token -> corresponding fiat currency code
export const TOKEN_FIAT_MAP: Record<string, string> = {
  cUSD: "USD", cEUR: "EUR", cREAL: "BRL", cKES: "KES",
  PUSO: "PHP", cCOP: "COP", eXOF: "XOF", cNGN: "NGN",
  cJPY: "JPY", cCHF: "CHF", cZAR: "ZAR", cGBP: "GBP",
  cAUD: "AUD", cCAD: "CAD", cGHS: "GHS", "G$": "USD", USDT: "USD",
};

// ---------------------------------------------------------------------------
// Geolocation cache
// ---------------------------------------------------------------------------
const GEO_KEY = "dezen_user_geo";
const GEO_EXPIRY = 24 * 60 * 60 * 1000;

function getCachedGeo(): string | null {
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.ts < GEO_EXPIRY) return data.currency;
  } catch { /* ignore */ }
  return null;
}

async function fetchGeo(): Promise<string> {
  const cached = getCachedGeo();
  if (cached) return cached;
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const currency = data.currency || "USD";
    localStorage.setItem(GEO_KEY, JSON.stringify({ currency, ts: Date.now() }));
    return currency;
  } catch {
    return "USD";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PriceCache {
  rates: Record<string, number>;
  fiatRates: Record<string, number>; // e.g. USD_NGN, USD_EUR
  userFiat: string; // user's local fiat code
  updatedAt: number;
}

const STALE_TIME = 5 * 60 * 1000;

/**
 * Token -> USD conversion rates with full multi-currency support.
 * Provides convertPrice(amount, from, to) and formatPrice(amount, currency).
 */
export function usePrices() {
  const [cache, setCache] = useState<PriceCache>({
    rates: { ...PEGGED_RATES },
    fiatRates: {},
    userFiat: getCachedGeo() || "USD",
    updatedAt: Date.now(),
  });
  const fetchingRef = useRef(false);

  // Fetch live rates + geolocation
  const fetchLiveRates = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const userFiat = await fetchGeo();
      const fiatCurrencies = Array.from(new Set(Object.values(TOKEN_FIAT_MAP)));
      const vsCurrencies = [...new Set([userFiat.toLowerCase(), ...fiatCurrencies.map(c => c.toLowerCase()), "usd"])].join(",");

      const ids = Object.values(TOKEN_IDS).join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrencies}&precision=8`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!res.ok) {
        fetchingRef.current = false;
        return;
      }

      const data = await res.json();

      setCache((prev) => {
        const updated = { ...prev.rates };
        const fiatRates: Record<string, number> = {};

        // Update token->USD rates from live data
        for (const [symbol, cgId] of Object.entries(TOKEN_IDS)) {
          if (data[cgId]?.usd) {
            updated[symbol] = data[cgId].usd;
          }
        }

        // Extract fiat rates from tether (≈USD)
        const tetherData = data.tether || {};
        for (const [fiatCode, rate] of Object.entries(tetherData)) {
          if (typeof rate === "number" && fiatCode !== "usd") {
            fiatRates[`USD_${fiatCode.toUpperCase()}`] = rate;
          }
        }
        // USD->USD = 1
        fiatRates["USD_USD"] = 1;

        // User local fiat rate
        const localRate = tetherData[userFiat.toLowerCase()];
        if (typeof localRate === "number") {
          fiatRates[`USD_${userFiat.toUpperCase()}`] = localRate;
        }

        return { rates: updated, fiatRates, userFiat, updatedAt: Date.now() };
      });
    } catch {
      // Network failure is fine — pegged rates still work
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Refresh on mount if stale
  useEffect(() => {
    if (Date.now() - cache.updatedAt > STALE_TIME) {
      fetchLiveRates();
    }
  }, []);

  /**
   * Convert a token amount to USD.
   */
  const toUSD = useCallback(
    (amount: number, symbol: string): number => {
      if (symbol === "USD" || symbol === "FIAT") return amount;
      const rate = cache.rates[symbol];
      if (rate === undefined) return 0;
      return amount * rate;
    },
    [cache.rates]
  );

  /**
   * Convert amount from one currency to another.
   * Supports token symbols (cUSD, USDT, etc.), "USD", "FIAT".
   */
  const convertPrice = useCallback(
    (amount: number, from: string, to: string): number => {
      if (from === to || !amount || isNaN(amount)) return amount || 0;

      // Convert from -> USD first
      let usdAmount: number;
      if (from === "USD") {
        usdAmount = amount;
      } else if (from === "FIAT") {
        // FIAT -> USD divide by local fiat rate
        const localRate = cache.fiatRates[`USD_${cache.userFiat}`] || 1;
        usdAmount = amount / localRate;
      } else {
        const fromRate = cache.rates[from];
        usdAmount = fromRate !== undefined ? amount * fromRate : amount;
      }

      // Convert USD -> to
      if (to === "USD") return usdAmount;
      if (to === "FIAT") {
        const localRate = cache.fiatRates[`USD_${cache.userFiat}`] || 1;
        return usdAmount * localRate;
      }

      const toRate = cache.rates[to];
      if (toRate !== undefined && toRate > 0) {
        return usdAmount / toRate;
      }

      return usdAmount; // fallback: return USD amount
    },
    [cache.rates, cache.fiatRates, cache.userFiat]
  );

  /**
   * Format a price with currency symbol for display.
   */
  const formatPrice = useCallback(
    (amount: number, currency: string): string => {
      if (isNaN(amount)) return "—";

      // Good Dollar special case
      if (currency === "G$") {
        return `G$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;
      }

      // FIAT: use user's local currency
      if (currency === "FIAT") {
        try {
          return new Intl.NumberFormat(navigator.language, {
            style: "currency",
            currency: cache.userFiat,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(amount);
        } catch {
          return `${amount.toFixed(2)} ${cache.userFiat}`;
        }
      }

      // Token that maps to a fiat code -> format as that fiat
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

      // CELO or unknown tokens
      return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ${currency}`;
    },
    [cache.userFiat]
  );

  /**
   * Format a USD amount as a display string.
   */
  const formatUSD = useCallback((usd: number): string => {
    if (Number.isNaN(usd)) return "$0.00";
    return `$${usd.toFixed(2)}`;
  }, []);

  /**
   * Get the best secondary fiat currency for a given token.
   * Avoids showing the same currency twice.
   */
  const getSecondaryFiat = useCallback(
    (tokenSymbol: string): string => {
      const tokenFiat = TOKEN_FIAT_MAP[tokenSymbol];
      if (tokenFiat === cache.userFiat) return "USD";
      if (tokenFiat === "USD" && cache.userFiat === "USD") return "EUR";
      return cache.userFiat;
    },
    [cache.userFiat]
  );

  return {
    toUSD,
    formatUSD,
    convertPrice,
    formatPrice,
    getSecondaryFiat,
    rates: cache.rates,
    userFiat: cache.userFiat,
    refreshRates: fetchLiveRates,
  };
}
