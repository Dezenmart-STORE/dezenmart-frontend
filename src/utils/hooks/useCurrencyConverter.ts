import { useState, useEffect, useCallback } from "react";

export type Currency = "USDT" | "CELO" | "FIAT" | string;

interface ExchangeRates {
  [key: string]: number;
  lastUpdated: number;
}

// Default fallback rates
const DEFAULT_RATES: Omit<ExchangeRates, "lastUpdated"> = {
  USDT_CELO: 0.5,
  USDT_FIAT: 1,
  CELO_FIAT: 2,
  // Add default rates for stable tokens (1:1 with FIAT for stable tokens)
  cUSD_FIAT: 1,
  cEUR_FIAT: 0.85,
  cREAL_FIAT: 0.2,
  cKES_FIAT: 0.007,
  PUSO_FIAT: 0.018,
  cCOP_FIAT: 0.00025,
  eXOF_FIAT: 0.0017,
  cNGN_FIAT: 0.0024,
  cJPY_FIAT: 0.0067,
  cCHF_FIAT: 1.1,
  cZAR_FIAT: 0.055,
  cGBP_FIAT: 1.27,
  cAUD_FIAT: 0.67,
  cCAD_FIAT: 0.74,
  cGHS_FIAT: 0.083,
};

// Cache keys
const CACHE_KEYS = {
  RATES: "currency_exchange_rates",
  GEO: "user_geo_data",
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
};

export const useCurrencyConverter = () => {
  const [rates, setRates] = useState<ExchangeRates>(() => {
    const cachedRates = localStorage.getItem(CACHE_KEYS.RATES);
    if (cachedRates) {
      try {
        const parsed = JSON.parse(cachedRates);
        if (Date.now() - parsed.lastUpdated < 60 * 60 * 1000) {
          return parsed;
        }
      } catch (e) {
        // Invalid cache, ignore
      }
    }
    return { ...DEFAULT_RATES, lastUpdated: 0 };
  });

  const [loading, setLoading] = useState<boolean>(true);
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
        // Invalid cache, ignore
      }
    }
    return "USD";
  });

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USDT");

  const fetchRates = useCallback(
    async (forceRefresh = false) => {
      if (
        !forceRefresh &&
        rates.lastUpdated &&
        Date.now() - rates.lastUpdated < 5 * 60 * 1000
      ) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let localCurrency = userCountry;
        let shouldUpdateGeo = true;

        // Get geolocation data
        try {
          const cachedGeo = localStorage.getItem(CACHE_KEYS.GEO);
          const shouldRefreshGeo =
            !cachedGeo || JSON.parse(cachedGeo).lastUpdated;
          Date.now() - 24 * 60 * 60 * 1000;

          if (shouldRefreshGeo) {
            const geoResponse = await fetch("https://ipapi.co/json/");
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
            } else {
              shouldUpdateGeo = false;
            }
          } else {
            shouldUpdateGeo = false;
          }
        } catch (geoError) {
          console.warn("Failed to fetch geolocation data:", geoError);
          shouldUpdateGeo = false;
        }

        if (!shouldUpdateGeo && userCountry !== "USD") {
          localCurrency = userCountry;
        }

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

        // Build currency list for API call
        const stableCurrencies = Object.values(STABLE_TOKEN_TO_FIAT_MAP).join(
          ","
        );
        const allCurrencies = `${localCurrency.toLowerCase()},usd,${stableCurrencies.toLowerCase()}`;

        const response = await fetchWithRetry(
          `https://api.coingecko.com/api/v3/simple/price?ids=tether,celo&vs_currencies=${allCurrencies}`
        );

        const data = await response.json();

        // Calculate base rates
        const usdtToFiat =
          data.tether[localCurrency.toLowerCase()] || data.tether.usd;
        const celoToFiat =
          data.celo[localCurrency.toLowerCase()] || data.celo.usd;
        const usdtToCelo = data.tether.usd / data.celo.usd;

        const newRates: ExchangeRates = {
          USDT_CELO: usdtToCelo,
          USDT_FIAT: usdtToFiat,
          CELO_FIAT: celoToFiat,
          lastUpdated: Date.now(),
        };

        // Add stable token rates
        Object.entries(STABLE_TOKEN_TO_FIAT_MAP).forEach(
          ([token, fiatCurrency]) => {
            const tokenToLocalFiat =
              data.tether[fiatCurrency.toLowerCase()] || 1;
            const localFiatToUserFiat =
              data.tether[localCurrency.toLowerCase()] || data.tether.usd;

            // If stable token currency matches user's local currency, rate is 1:1
            if (fiatCurrency === localCurrency) {
              newRates[`${token}_FIAT`] = 1;
            } else {
              // Convert stable token to user's local currency
              newRates[`${token}_FIAT`] =
                tokenToLocalFiat / localFiatToUserFiat;
            }

            // Add stable token to USDT rate
            newRates[`${token}_USDT`] = newRates[`${token}_FIAT`] / usdtToFiat;

            // Add stable token to CELO rate
            newRates[`${token}_CELO`] = newRates[`${token}_FIAT`] / celoToFiat;
          }
        );

        setRates(newRates);
        localStorage.setItem(CACHE_KEYS.RATES, JSON.stringify(newRates));
      } catch (err) {
        setError((err as Error).message || "Failed to fetch exchange rates");

        const cachedRates = localStorage.getItem(CACHE_KEYS.RATES);
        if (cachedRates) {
          try {
            setRates(JSON.parse(cachedRates));
          } catch (e) {
            setRates({ ...DEFAULT_RATES, lastUpdated: Date.now() });
          }
        } else {
          setRates({ ...DEFAULT_RATES, lastUpdated: Date.now() });
        }
      } finally {
        setLoading(false);
      }
    },
    [userCountry, rates.lastUpdated]
  );

  const convertPrice = useCallback(
    (price: number, from: Currency, to: Currency): number => {
      if (from === to) return price;
      if (isNaN(price) || price === 0) return 0;

      const rateKey = `${from}_${to}`;
      const reverseRateKey = `${to}_${from}`;

      // Direct rate lookup
      if (rates[rateKey]) {
        return price * rates[rateKey];
      }

      // Reverse rate lookup
      if (rates[reverseRateKey]) {
        return price / rates[reverseRateKey];
      }

      // Handle stable token conversions
      if (STABLE_TOKEN_TO_FIAT_MAP[from as string] && to === "FIAT") {
        const fiatCurrency = STABLE_TOKEN_TO_FIAT_MAP[from as string];
        if (fiatCurrency === userCountry) {
          return price; // 1:1 conversion
        }
        return price * (rates[`${from}_FIAT`] || 1);
      }

      if (from === "FIAT" && STABLE_TOKEN_TO_FIAT_MAP[to as string]) {
        const fiatCurrency = STABLE_TOKEN_TO_FIAT_MAP[to as string];
        if (fiatCurrency === userCountry) {
          return price; // 1:1 conversion
        }
        return price / (rates[`${to}_FIAT`] || 1);
      }

      // Cross-conversion via USD for stable tokens
      if (
        STABLE_TOKEN_TO_FIAT_MAP[from as string] &&
        STABLE_TOKEN_TO_FIAT_MAP[to as string]
      ) {
        const fromRate = rates[`${from}_FIAT`] || 1;
        const toRate = rates[`${to}_FIAT`] || 1;
        return (price * fromRate) / toRate;
      }

      // Fallback conversions
      switch (`${from}_${to}`) {
        case "USDT_CELO":
          return price * (rates.USDT_CELO || DEFAULT_RATES.USDT_CELO);
        case "USDT_FIAT":
          return price * (rates.USDT_FIAT || DEFAULT_RATES.USDT_FIAT);
        case "CELO_USDT":
          return price / (rates.USDT_CELO || DEFAULT_RATES.USDT_CELO);
        case "CELO_FIAT":
          return price * (rates.CELO_FIAT || DEFAULT_RATES.CELO_FIAT);
        case "FIAT_USDT":
          return price / (rates.USDT_FIAT || DEFAULT_RATES.USDT_FIAT);
        case "FIAT_CELO":
          return price / (rates.CELO_FIAT || DEFAULT_RATES.CELO_FIAT);
        default:
          return price;
      }
    },
    [rates, userCountry]
  );

  const formatPrice = useCallback(
    (price: number, currency: Currency): string => {
      if (isNaN(price)) return "—";

      // Handle stable tokens
      if (STABLE_TOKEN_TO_FIAT_MAP[currency as string]) {
        const fiatCurrency = STABLE_TOKEN_TO_FIAT_MAP[currency as string];
        try {
          return new Intl.NumberFormat(navigator.language, {
            style: "currency",
            currency: fiatCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(price);
        } catch (e) {
          return `${price.toFixed(2)} ${currency}`;
        }
      }

      if (currency === "USDT") {
        return new Intl.NumberFormat(navigator.language, {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(price);
      }

      if (currency === "CELO") {
        return `${price.toLocaleString(navigator.language, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })} CELO`;
      }

      // Format fiat with local currency symbol
      return new Intl.NumberFormat(navigator.language, {
        style: "currency",
        currency: userCountry,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    },
    [userCountry]
  );

  const refreshRates = useCallback(() => {
    return fetchRates(true);
  }, [fetchRates]);

  useEffect(() => {
    if (!rates.lastUpdated || Date.now() - rates.lastUpdated > 5 * 60 * 1000) {
      setLoading(true);
    } else {
      setLoading(false);
    }

    fetchRates();

    const interval = setInterval(() => fetchRates(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates]);

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
    lastUpdated: rates.lastUpdated,
  };
};
