import { useState, useEffect, useCallback, useRef } from "react";

export type Currency = "USDT" | "CELO" | "FIAT" | string;

interface ExchangeRates {
  [key: string]: number;
  lastUpdated: number;
}

interface PriceData {
  [coinId: string]: {
    [currency: string]: number;
  };
}

// Coin IDs for CoinGecko API
const COIN_IDS = {
  CELO: "celo",
  USDT: "tether",
  G$: "gooddollar",
  cUSD: "celo-dollar",
  cEUR: "celo-euro",
  cREAL: "celo-brazilian-real",
};

// Default fallback rates (used only if API fails)
const DEFAULT_RATES: Omit<ExchangeRates, "lastUpdated"> = {
  USDT_CELO: 2.0,
  USDT_FIAT: 1,
  CELO_FIAT: 0.5,
  cUSD_USD: 1.0,
  cEUR_USD: 1.07,
  cREAL_USD: 0.17,
  G$_USD: 0.0001022,
};

// Cache keys
const CACHE_KEYS = {
  RATES: "currency_exchange_rates",
  GEO: "user_geo_data",
  LAST_FETCH: "last_price_fetch",
};

interface GeoData {
  currency: string;
  country: string;
  lastUpdated: number;
}

// Stable token to fiat currency mapping
const STABLE_TOKEN_TO_FIAT_MAP: Record<string, string> = {
  cUSD: "USD",
  cEUR: "EUR",
  cREAL: "BRL",
  cKES: "KES",
  PUSO: "PHP",
  cCOP: "COP",
  eXOF: "XOF",
  cNGN: "NGN",
  cJPY: "JPY",
  cCHF: "CHF",
  cZAR: "ZAR",
  cGBP: "GBP",
  cAUD: "AUD",
  cCAD: "CAD",
  cGHS: "GHS",
  G$: "USD",
  USDT: "USD",
};

export const useCurrencyConverter = () => {
  const [rates, setRates] = useState<ExchangeRates>(() => {
    const cachedRates = localStorage.getItem(CACHE_KEYS.RATES);
    if (cachedRates) {
      try {
        const parsed = JSON.parse(cachedRates);
        // Use cache if less than 2 minutes old
        if (Date.now() - parsed.lastUpdated < 2 * 60 * 1000) {
          return parsed;
        }
      } catch (e) {
        console.warn("Invalid cached rates");
      }
    }
    return { ...DEFAULT_RATES, lastUpdated: 0 };
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string>(() => {
    const cachedGeo = localStorage.getItem(CACHE_KEYS.GEO);
    if (cachedGeo) {
      try {
        const parsed = JSON.parse(cachedGeo);
        if (Date.now() - parsed.lastUpdated < 24 * 60 * 60 * 1000) {
          return parsed.currency;
        }
      } catch (e) {
        console.warn("Invalid cached geo data");
      }
    }
    return "USD";
  });

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USDT");
  const fetchInProgressRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const fetchWithRetry = async (
    url: string,
    retries = 2
  ): Promise<Response> => {
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      return response;
    } catch (err) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchWithRetry(url, retries - 1);
      }
      throw err;
    }
  };

  /**
   * Fetch live prices from CoinGecko API
   */
  const fetchLivePrices = useCallback(
    async (forceRefresh = false): Promise<ExchangeRates> => {
      // Prevent concurrent fetches
      if (fetchInProgressRef.current && !forceRefresh) {
        console.log("⏳ Price fetch already in progress");
        return rates;
      }

      // Don't fetch too frequently (min 30 seconds between fetches)
      const now = Date.now();
      if (!forceRefresh && now - lastFetchTimeRef.current < 30 * 1000) {
        console.log("⏰ Using recent price data");
        return rates;
      }

      fetchInProgressRef.current = true;
      lastFetchTimeRef.current = now;

      try {
        // Fetch geolocation if needed
        let localCurrency = userCountry;
        try {
          const cachedGeo = localStorage.getItem(CACHE_KEYS.GEO);
          const shouldRefreshGeo =
            !cachedGeo ||
            Date.now() - JSON.parse(cachedGeo).lastUpdated >
              24 * 60 * 60 * 1000;

          if (shouldRefreshGeo) {
            const geoResponse = await fetch("https://ipapi.co/json/", {
              signal: AbortSignal.timeout(5000),
            });
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              localCurrency = geoData.currency || "USD";

              const geoCache: GeoData = {
                currency: localCurrency,
                country: geoData.country || "US",
                lastUpdated: Date.now(),
              };
              localStorage.setItem(CACHE_KEYS.GEO, JSON.stringify(geoCache));
              setUserCountry(localCurrency);
            }
          }
        } catch (geoError) {
          console.warn("Failed to fetch geolocation:", geoError);
        }

        // Build comprehensive currency list
        const allFiatCurrencies = Array.from(
          new Set(Object.values(STABLE_TOKEN_TO_FIAT_MAP))
        ).join(",");
        const currencyList = `${localCurrency.toLowerCase()},${allFiatCurrencies.toLowerCase()}`;

        console.log("Fetching live prices from CoinGecko...");

        // Fetch live prices from CoinGecko
        const response = await fetchWithRetry(
          `https://api.coingecko.com/api/v3/simple/price?ids=tether,celo,gooddollar,celo-dollar,celo-euro,celo-brazilian-real&vs_currencies=${currencyList}&precision=8`
        );

        const data: PriceData = await response.json();

        console.log("📊 Live Price Data:", data);

        // Extract base rates in USD
        const usdtToUsd = data.tether?.usd || 1.0;
        const celoToUsd = data.celo?.usd || 0.25;
        const gdToUsd = data.gooddollar?.usd || 0.0001022;

        // Mento stablecoins should be very close to 1:1 with their fiat
        const cUsdToUsd = data["celo-dollar"]?.usd || 1.0;
        const cEurToUsd = data["celo-euro"]?.usd || 1.07;
        const cRealToUsd = data["celo-brazilian-real"]?.usd || 0.17;

        // User's local currency rate
        const usdToUserFiat = data.tether?.[localCurrency.toLowerCase()] || 1.0;

        const newRates: ExchangeRates = {
          // Base conversions
          USDT_USD: usdtToUsd,
          USDT_CELO: usdtToUsd / celoToUsd,
          USDT_FIAT: usdToUserFiat,

          CELO_USD: celoToUsd,
          CELO_FIAT:
            data.celo?.[localCurrency.toLowerCase()] ||
            celoToUsd * usdToUserFiat,

          // GoodDollar
          G$_USD: gdToUsd,
          G$_USDT: gdToUsd / usdtToUsd,
          G$_CELO: gdToUsd / celoToUsd,
          G$_FIAT:
            data.gooddollar?.[localCurrency.toLowerCase()] ||
            gdToUsd * usdToUserFiat,

          // Mento Stablecoins
          cUSD_USD: cUsdToUsd,
          cUSD_USDT: cUsdToUsd / usdtToUsd,
          cUSD_CELO: cUsdToUsd / celoToUsd,
          cUSD_FIAT:
            data["celo-dollar"]?.[localCurrency.toLowerCase()] ||
            cUsdToUsd * usdToUserFiat,

          cEUR_USD: cEurToUsd,
          cEUR_USDT: cEurToUsd / usdtToUsd,
          cEUR_CELO: cEurToUsd / celoToUsd,
          cEUR_FIAT:
            data["celo-euro"]?.[localCurrency.toLowerCase()] ||
            cEurToUsd * usdToUserFiat,

          cREAL_USD: cRealToUsd,
          cREAL_USDT: cRealToUsd / usdtToUsd,
          cREAL_CELO: cRealToUsd / celoToUsd,
          cREAL_FIAT:
            data["celo-brazilian-real"]?.[localCurrency.toLowerCase()] ||
            cRealToUsd * usdToUserFiat,

          lastUpdated: Date.now(),
        };

        // cross-rates for other stable tokens (these maintain peg to their fiat)
        Object.entries(STABLE_TOKEN_TO_FIAT_MAP).forEach(
          ([token, fiatCode]) => {
            if (["cUSD", "cEUR", "cREAL", "G$", "USDT"].includes(token)) return;

            // For stable tokens without live data, assume 1:1 peg with their fiat
            const fiatToUsd = data.tether?.[fiatCode.toLowerCase()] || 1.0;
            const tokenToUsd = 1 / fiatToUsd; // 1 token = 1 fiat unit = X USD

            newRates[`${token}_USD`] = tokenToUsd;
            newRates[`${token}_USDT`] = tokenToUsd / usdtToUsd;
            newRates[`${token}_CELO`] = tokenToUsd / celoToUsd;
            newRates[`${token}_FIAT`] = tokenToUsd * usdToUserFiat;
          }
        );

        console.log("✅ Updated Exchange Rates:", newRates);

        setRates(newRates);
        localStorage.setItem(CACHE_KEYS.RATES, JSON.stringify(newRates));
        setError(null);

        return newRates;
      } catch (err) {
        console.error("❌ Failed to fetch live prices:", err);
        setError((err as Error).message || "Failed to fetch exchange rates");

        // Try to use cached data
        const cachedRates = localStorage.getItem(CACHE_KEYS.RATES);
        if (cachedRates) {
          try {
            const parsed = JSON.parse(cachedRates);
            setRates(parsed);
            return parsed;
          } catch (e) {
            // Fall back to defaults
          }
        }

        const fallbackRates = { ...DEFAULT_RATES, lastUpdated: Date.now() };
        setRates(fallbackRates);
        return fallbackRates;
      } finally {
        fetchInProgressRef.current = false;
      }
    },
    [userCountry, rates]
  );

  /**
   * Convert price with live rate checking
   */
  const convertPrice = useCallback(
    (price: number, from: Currency, to: Currency): number => {
      if (from === to) return price;
      if (isNaN(price) || price === 0) return 0;

      const normalizedFrom = from.toUpperCase();
      const normalizedTo = to.toUpperCase();

      console.log(
        `🔄 Converting ${price} from ${normalizedFrom} to ${normalizedTo}`
      );

      // Direct rate lookup
      const rateKey = `${normalizedFrom}_${normalizedTo}`;
      const reverseRateKey = `${normalizedTo}_${normalizedFrom}`;

      if (rates[rateKey]) {
        const result = price * rates[rateKey];
        console.log(`✅ Direct: ${price} × ${rates[rateKey]} = ${result}`);
        return result;
      }

      if (rates[reverseRateKey]) {
        const result = price / rates[reverseRateKey];
        console.log(
          `✅ Reverse: ${price} ÷ ${rates[reverseRateKey]} = ${result}`
        );
        return result;
      }

      // Convert through USD
      const fromToUsd = rates[`${normalizedFrom}_USD`];
      const toToUsd = rates[`${normalizedTo}_USD`];

      if (fromToUsd && toToUsd) {
        const result = (price * fromToUsd) / toToUsd;
        console.log(
          `✅ Via USD: ${price} × ${fromToUsd} ÷ ${toToUsd} = ${result}`
        );
        return result;
      }

      // FIAT conversions
      if (normalizedTo === "FIAT") {
        const fromToFiat = rates[`${normalizedFrom}_FIAT`];
        if (fromToFiat) {
          return price * fromToFiat;
        }
      }

      if (normalizedFrom === "FIAT") {
        const toToFiat = rates[`${normalizedTo}_FIAT`];
        if (toToFiat) {
          return price / toToFiat;
        }
      }

      console.warn(
        `⚠️ No conversion path for ${normalizedFrom} → ${normalizedTo}`
      );
      return price;
    },
    [rates]
  );

  const formatPrice = useCallback(
    (price: number, currency: Currency): string => {
      if (isNaN(price)) return "—";

      const fiatCurrency = STABLE_TOKEN_TO_FIAT_MAP[currency as string];
      if (fiatCurrency) {
        try {
          return new Intl.NumberFormat(navigator.language, {
            style: "currency",
            currency: fiatCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          }).format(price);
        } catch (e) {
          return `${price.toFixed(2)} ${currency}`;
        }
      }

      if (currency === "USDT") {
        try {
          return new Intl.NumberFormat(navigator.language, {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          }).format(price);
        } catch (e) {
          return `$${price.toFixed(2)}`;
        }
      }

      if (currency === "CELO") {
        return `${price.toLocaleString(navigator.language, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })} CELO`;
      }

      try {
        return new Intl.NumberFormat(navigator.language, {
          style: "currency",
          currency: userCountry,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(price);
      } catch (e) {
        return `${price.toFixed(2)} ${userCountry}`;
      }
    },
    [userCountry]
  );

  const refreshRates = useCallback(() => {
    return fetchLivePrices(true);
  }, [fetchLivePrices]);

  // Initial fetch on mount
  useEffect(() => {
    const shouldFetch =
      !rates.lastUpdated || Date.now() - rates.lastUpdated > 2 * 60 * 1000;

    if (shouldFetch) {
      setLoading(true);
      fetchLivePrices().finally(() => setLoading(false));
    }

    // Auto-refresh every 3 minutes
    const interval = setInterval(() => {
      fetchLivePrices();
    }, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchLivePrices]);

  return {
    rates,
    loading,
    error,
    userCountry,
    selectedCurrency,
    setSelectedCurrency,
    convertPrice,
    formatPrice,
    refreshRates,
    fetchLivePrices,
    lastUpdated: rates.lastUpdated,
  };
};
