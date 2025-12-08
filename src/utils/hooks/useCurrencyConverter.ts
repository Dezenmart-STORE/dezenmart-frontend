import { useState, useEffect, useCallback, useRef } from "react";

export type Currency = "USDT" | "CELO" | "FIAT" | "USD" | string;

interface ExchangeRates {
  [key: string]: number;
  lastUpdated: number;
}

interface PriceData {
  [coinId: string]: {
    [currency: string]: number;
  };
}

// Default fallback rates (used only if API fails)
const DEFAULT_RATES: Omit<ExchangeRates, "lastUpdated"> = {
  // USD base rates (most critical for product pricing)
  USD_USD: 1.0,
  USD_USDT: 1.0,
  USD_CELO: 2.0,
  USD_cUSD: 1.0,
  USD_cEUR: 1 / 1.07,
  USD_cREAL: 1 / 0.17,
  USD_G$: 1 / 0.0001022,
  USD_cKES: 1 / 0.0078,
  USD_PUSO: 1 / 0.018,
  USD_cCOP: 1 / 0.00024,
  USD_eXOF: 1 / 0.0017,
  USD_cNGN: 1 / 0.00067,

  // USDT rates
  USDT_USD: 1.0,
  USDT_CELO: 2.0,

  // CELO rates
  CELO_USD: 0.5,

  // Stable token to USD rates
  cUSD_USD: 1.0,
  cEUR_USD: 1.07,
  cREAL_USD: 0.17,
  G$_USD: 0.0001022,
  cKES_USD: 0.0078,
  PUSO_USD: 0.018,
  cCOP_USD: 0.00024,
  eXOF_USD: 0.0017,
  cNGN_USD: 0.00067,
};

// Cache configuration
const CACHE_CONFIG = {
  RATES_KEY: "currency_exchange_rates",
  GEO_KEY: "user_geo_data",
  RATES_EXPIRY: 2 * 60 * 1000, // 2 minutes
  GEO_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  MIN_FETCH_INTERVAL: 30 * 1000, // 30 seconds
  AUTO_REFRESH_INTERVAL: 3 * 60 * 1000, // 3 minutes
};

interface GeoData {
  currency: string;
  country: string;
  lastUpdated: number;
}

// Comprehensive stable token to fiat currency mapping
export const STABLE_TOKEN_TO_FIAT_MAP: Record<string, string> = {
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

// Reverse mapping for quick lookups
export const FIAT_TO_STABLE_TOKEN_MAP: Record<string, string> = Object.entries(
  STABLE_TOKEN_TO_FIAT_MAP
).reduce((acc, [token, fiat]) => {
  if (!acc[fiat] || token.startsWith("c")) {
    acc[fiat] = token;
  }
  return acc;
}, {} as Record<string, string>);

// Helper to get cached data with expiry check
const getCachedData = <T>(key: string, maxAge: number): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.lastUpdated < maxAge) {
      return parsed;
    }
  } catch (e) {
    console.warn(`Invalid cached data for ${key}:`, e);
  }
  return null;
};

// Helper to set cached data
const setCachedData = <T extends object>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to cache data for ${key}:`, e);
  }
};

export const useCurrencyConverter = (debug = false) => {
  const log = useCallback(
    (...args: any[]) => {
      if (debug) console.log(...args);
    },
    [debug]
  );

  // Initialize rates from cache or defaults
  const [rates, setRates] = useState<ExchangeRates>(() => {
    const cached = getCachedData<ExchangeRates>(
      CACHE_CONFIG.RATES_KEY,
      CACHE_CONFIG.RATES_EXPIRY
    );
    return cached || { ...DEFAULT_RATES, lastUpdated: 0 };
  });

  // Initialize user country from cache or default to USD
  const [userCountry, setUserCountry] = useState<string>(() => {
    const cached = getCachedData<GeoData>(
      CACHE_CONFIG.GEO_KEY,
      CACHE_CONFIG.GEO_EXPIRY
    );
    return cached?.currency || "USD";
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fetchInProgressRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  /**
   * Fetch with retry logic for better reliability
   */
  const fetchWithRetry = async (
    url: string,
    retries = 2,
    timeout = 5000
  ): Promise<Response> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response;
    } catch (err) {
      if (retries > 0) {
        log(`⚠️ Retrying fetch... (${retries} attempts left)`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchWithRetry(url, retries - 1, timeout);
      }
      throw err;
    }
  };

  /**
   * Fetch user's geolocation and currency
   */
  const fetchGeolocation = async (): Promise<string> => {
    try {
      const cached = getCachedData<GeoData>(
        CACHE_CONFIG.GEO_KEY,
        CACHE_CONFIG.GEO_EXPIRY
      );
      if (cached) {
        log("📍 Using cached geolocation:", cached.currency);
        return cached.currency;
      }

      log("🌍 Fetching geolocation...");
      const response = await fetchWithRetry("https://ipapi.co/json/");
      const data = await response.json();

      const currency = data.currency || "USD";
      const geoData: GeoData = {
        currency,
        country: data.country || "US",
        lastUpdated: Date.now(),
      };

      setCachedData(CACHE_CONFIG.GEO_KEY, geoData);
      setUserCountry(currency);
      log("✅ Geolocation fetched:", currency);

      return currency;
    } catch (err) {
      console.warn("Failed to fetch geolocation:", err);
      return "USD";
    }
  };

  /**
   * Fetch live prices from CoinGecko API
   */
  const fetchLivePrices = useCallback(
    async (forceRefresh = false): Promise<ExchangeRates | null> => {
      // Prevent concurrent fetches
      if (fetchInProgressRef.current && !forceRefresh) {
        log("⏳ Price fetch already in progress");
        return null;
      }

      // Rate limiting
      const now = Date.now();
      if (
        !forceRefresh &&
        now - lastFetchTimeRef.current < CACHE_CONFIG.MIN_FETCH_INTERVAL
      ) {
        log("⏰ Using recent price data (rate limited)");
        return null;
      }

      fetchInProgressRef.current = true;
      lastFetchTimeRef.current = now;

      try {
        // Fetch geolocation
        const localCurrency = await fetchGeolocation();

        // Build comprehensive currency list for API request
        const allFiatCurrencies = Array.from(
          new Set(Object.values(STABLE_TOKEN_TO_FIAT_MAP))
        ).join(",");
        const currencyList = `${localCurrency.toLowerCase()},${allFiatCurrencies.toLowerCase()}`;

        log("🌐 Fetching live prices from CoinGecko...");

        // Fetch live prices
        const response = await fetchWithRetry(
          `https://api.coingecko.com/api/v3/simple/price?ids=tether,celo,gooddollar,celo-dollar,celo-euro,celo-brazilian-real&vs_currencies=${currencyList}&precision=8`
        );

        const data: PriceData = await response.json();
        log("📊 Live Price Data:", data);

        // Extract base rates
        const usdtToUsd = data.tether?.usd || 1.0;
        const celoToUsd = data.celo?.usd || 0.5;
        const gdToUsd = data.gooddollar?.usd || 0.0001022;
        const cUsdToUsd = data["celo-dollar"]?.usd || 1.0;
        const cEurToUsd = data["celo-euro"]?.usd || 1.07;
        const cRealToUsd = data["celo-brazilian-real"]?.usd || 0.17;

        // User's local currency exchange rate
        const usdToLocalFiat =
          data.tether?.[localCurrency.toLowerCase()] || 1.0;

        // Build comprehensive rate table
        const newRates: ExchangeRates = {
          // USD conversions (CRITICAL for product prices)
          USD_USD: 1.0,
          USD_USDT: 1 / usdtToUsd,
          USD_CELO: 1 / celoToUsd,
          USD_FIAT: usdToLocalFiat,

          // USDT conversions
          USDT_USD: usdtToUsd,
          USDT_CELO: usdtToUsd / celoToUsd,
          USDT_FIAT: usdToLocalFiat,

          // CELO conversions
          CELO_USD: celoToUsd,
          CELO_USDT: celoToUsd / usdtToUsd,
          CELO_FIAT:
            data.celo?.[localCurrency.toLowerCase()] ||
            celoToUsd * usdToLocalFiat,

          // GoodDollar
          G$_USD: gdToUsd,
          USD_G$: 1 / gdToUsd,
          G$_USDT: gdToUsd / usdtToUsd,
          G$_CELO: gdToUsd / celoToUsd,
          G$_FIAT:
            data.gooddollar?.[localCurrency.toLowerCase()] ||
            gdToUsd * usdToLocalFiat,

          // Mento Stablecoins with live data
          cUSD_USD: cUsdToUsd,
          USD_cUSD: 1 / cUsdToUsd,
          cUSD_USDT: cUsdToUsd / usdtToUsd,
          cUSD_CELO: cUsdToUsd / celoToUsd,
          cUSD_FIAT:
            data["celo-dollar"]?.[localCurrency.toLowerCase()] ||
            cUsdToUsd * usdToLocalFiat,

          cEUR_USD: cEurToUsd,
          USD_cEUR: 1 / cEurToUsd,
          cEUR_USDT: cEurToUsd / usdtToUsd,
          cEUR_CELO: cEurToUsd / celoToUsd,
          cEUR_FIAT:
            data["celo-euro"]?.[localCurrency.toLowerCase()] ||
            cEurToUsd * usdToLocalFiat,

          cREAL_USD: cRealToUsd,
          USD_cREAL: 1 / cRealToUsd,
          cREAL_USDT: cRealToUsd / usdtToUsd,
          cREAL_CELO: cRealToUsd / celoToUsd,
          cREAL_FIAT:
            data["celo-brazilian-real"]?.[localCurrency.toLowerCase()] ||
            cRealToUsd * usdToLocalFiat,

          lastUpdated: Date.now(),
        };

        // Add cross-rates for other stable tokens (maintain 1:1 peg with fiat)
        Object.entries(STABLE_TOKEN_TO_FIAT_MAP).forEach(
          ([token, fiatCode]) => {
            // Skip tokens we already have live data for
            if (["cUSD", "cEUR", "cREAL", "G$", "USDT"].includes(token)) return;

            // Get fiat exchange rate from tether data
            const fiatToUsd = data.tether?.[fiatCode.toLowerCase()];

            if (fiatToUsd) {
              const tokenToUsd = 1 / fiatToUsd; // 1 token ≈ 1 fiat unit ≈ X USD

              newRates[`${token}_USD`] = tokenToUsd;
              newRates[`USD_${token}`] = 1 / tokenToUsd; // Add reverse
              newRates[`${token}_USDT`] = tokenToUsd / usdtToUsd;
              newRates[`${token}_CELO`] = tokenToUsd / celoToUsd;
              newRates[`${token}_FIAT`] = tokenToUsd * usdToLocalFiat;
            }
          }
        );

        // Add USD to all other stable tokens
        ["cUSD", "cEUR", "cREAL", "G$"].forEach((token) => {
          const tokenToUsd = newRates[`${token}_USD`];
          if (tokenToUsd) {
            newRates[`USD_${token}`] = 1 / tokenToUsd;
          }
        });

        log("✅ Updated Exchange Rates:", newRates);

        setRates(newRates);
        setCachedData(CACHE_CONFIG.RATES_KEY, newRates);
        setError(null);

        return newRates;
      } catch (err) {
        console.error("❌ Failed to fetch live prices:", err);
        const errorMessage =
          (err as Error).message || "Failed to fetch exchange rates";
        setError(errorMessage);

        // Try to use cached data as fallback
        const cachedRates = getCachedData<ExchangeRates>(
          CACHE_CONFIG.RATES_KEY,
          Infinity // Accept any cached data in error state
        );

        if (cachedRates) {
          log("📦 Using cached rates as fallback");
          setRates(cachedRates);
          return cachedRates;
        }

        // Ultimate fallback to defaults
        log("⚠️ Using default rates");
        const fallbackRates = { ...DEFAULT_RATES, lastUpdated: Date.now() };
        setRates(fallbackRates);
        return fallbackRates;
      } finally {
        fetchInProgressRef.current = false;
      }
    },
    [log]
  );

  /**
   * Convert price between currencies with robust fallback logic
   * FIXED: Ensures USD conversions work correctly
   */
  const convertPrice = useCallback(
    (price: number, from: Currency, to: Currency): number => {
      // Early returns for simple cases
      if (from === to) return price;
      if (isNaN(price) || price === 0) return 0;

      const normalizedFrom = from.toUpperCase();
      const normalizedTo = to.toUpperCase();

      log(`🔄 Converting ${price} from ${normalizedFrom} to ${normalizedTo}`);

      // Strategy 1: Direct conversion rate
      const directKey = `${normalizedFrom}_${normalizedTo}`;
      if (rates[directKey]) {
        const result = price * rates[directKey];
        log(`✅ Direct: ${price} × ${rates[directKey]} = ${result}`);
        return result;
      }

      // Strategy 2: Reverse conversion rate
      const reverseKey = `${normalizedTo}_${normalizedFrom}`;
      if (rates[reverseKey]) {
        const result = price / rates[reverseKey];
        log(`✅ Reverse: ${price} ÷ ${rates[reverseKey]} = ${result}`);
        return result;
      }

      // Strategy 3: Convert through USD as intermediary
      const fromToUsd = rates[`${normalizedFrom}_USD`];
      const toFromUsd = rates[`USD_${normalizedTo}`];

      if (fromToUsd && toFromUsd) {
        const result = price * fromToUsd * toFromUsd;
        log(
          `✅ Via USD (method 1): ${price} × ${fromToUsd} × ${toFromUsd} = ${result}`
        );
        return result;
      }

      // Strategy 4: Another USD path
      const toToUsd = rates[`${normalizedTo}_USD`];
      if (fromToUsd && toToUsd) {
        const result = (price * fromToUsd) / toToUsd;
        log(
          `✅ Via USD (method 2): ${price} × ${fromToUsd} ÷ ${toToUsd} = ${result}`
        );
        return result;
      }

      // Strategy 5: Convert through USDT as intermediary
      const fromToUsdt = rates[`${normalizedFrom}_USDT`];
      const toToUsdt = rates[`${normalizedTo}_USDT`];

      if (fromToUsdt && toToUsdt) {
        const result = (price * fromToUsdt) / toToUsdt;
        log(`✅ Via USDT: ${price} × ${fromToUsdt} ÷ ${toToUsdt} = ${result}`);
        return result;
      }

      // Strategy 6: FIAT conversions using user's local currency
      if (normalizedTo === "FIAT") {
        const fromToFiat = rates[`${normalizedFrom}_FIAT`];
        if (fromToFiat) {
          const result = price * fromToFiat;
          log(`✅ To FIAT: ${price} × ${fromToFiat} = ${result}`);
          return result;
        }
      }

      if (normalizedFrom === "FIAT") {
        const toToFiat = rates[`${normalizedTo}_FIAT`];
        if (toToFiat) {
          const result = price / toToFiat;
          log(`✅ From FIAT: ${price} ÷ ${toToFiat} = ${result}`);
          return result;
        }
      }

      // No conversion path found - warn and return original
      // console.warn(
      //   `⚠️ No conversion path found for ${normalizedFrom} → ${normalizedTo}. Available rates:`,
      //   Object.keys(rates).filter(
      //     (k) =>
      //       k.startsWith(normalizedFrom + "_") ||
      //       k.endsWith("_" + normalizedFrom) ||
      //       k.startsWith(normalizedTo + "_") ||
      //       k.endsWith("_" + normalizedTo)
      //   )
      // );
      return price;
    },
    [rates, log]
  );

  /**
   * Format price for display with proper currency symbols
   */
  const formatPrice = useCallback(
    (
      price: number,
      currency: Currency,
      options?: Intl.NumberFormatOptions
    ): string => {
      if (isNaN(price)) return "—";

      const normalizedCurrency = currency.toUpperCase();

      // Special handling for Good Dollar - show as "G$X.XXX"
      if (normalizedCurrency === "G$") {
        const formatted = price.toLocaleString(navigator.language, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 3,
          ...options,
        });
        return `G$${formatted}`;
      }

      // Use the token's corresponding fiat for formatting
      const fiatCurrency = STABLE_TOKEN_TO_FIAT_MAP[normalizedCurrency];

      if (fiatCurrency) {
        try {
          return new Intl.NumberFormat(navigator.language, {
            style: "currency",
            currency: fiatCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 3,
            ...options,
          }).format(price);
        } catch (e) {
          // Fallback if currency code is not supported
          return `${price.toFixed(2)} ${normalizedCurrency}`;
        }
      }

      // Special handling for CELO
      if (normalizedCurrency === "CELO") {
        return `${price.toLocaleString(navigator.language, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 3,
          ...options,
        })} CELO`;
      }

      // FIAT uses user's local currency
      if (normalizedCurrency === "FIAT") {
        try {
          return new Intl.NumberFormat(navigator.language, {
            style: "currency",
            currency: userCountry,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            ...options,
          }).format(price);
        } catch (e) {
          return `${price.toFixed(2)} ${userCountry}`;
        }
      }

      // Default formatting
      return `${price.toFixed(2)} ${normalizedCurrency}`;
    },
    [userCountry]
  );

  /**
   * Get the best secondary fiat currency for a given token
   */
  const getSecondaryFiatCurrency = useCallback(
    (tokenSymbol: string): string => {
      const normalizedToken = tokenSymbol.toUpperCase();
      const tokenFiat = STABLE_TOKEN_TO_FIAT_MAP[normalizedToken];

      if (tokenFiat === userCountry) {
        return "USD";
      }

      if (tokenFiat === "USD" && userCountry === "USD") {
        return "EUR";
      }

      return userCountry;
    },
    [userCountry]
  );

  /**
   * Manual refresh with loading state management
   */
  const refreshRates = useCallback(() => {
    setLoading(true);
    return fetchLivePrices(true).finally(() => setLoading(false));
  }, [fetchLivePrices]);

  /**
   * Check if rates are stale
   */
  const areRatesStale = useCallback((): boolean => {
    return (
      !rates.lastUpdated ||
      Date.now() - rates.lastUpdated > CACHE_CONFIG.RATES_EXPIRY
    );
  }, [rates.lastUpdated]);

  // Initial fetch on mount (non-blocking)
  useEffect(() => {
    if (areRatesStale()) {
      setLoading(true);
      setTimeout(() => {
        fetchLivePrices().finally(() => setLoading(false));
      }, 0);
    }

    // Auto-refresh interval
    const interval = setInterval(() => {
      fetchLivePrices();
    }, CACHE_CONFIG.AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchLivePrices, areRatesStale]);

  return {
    rates,
    loading,
    error,
    userCountry,
    convertPrice,
    formatPrice,
    refreshRates,
    fetchLivePrices,
    getSecondaryFiatCurrency,
    areRatesStale,
    lastUpdated: rates.lastUpdated,
    isReady: !!rates.lastUpdated && !areRatesStale(),
  };
};
