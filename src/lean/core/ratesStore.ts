/**
 * ratesStore — module-level singleton for exchange rates.
 *
 * Starts fetching at import. Refreshes every 2 minutes, on window focus,
 * and on network reconnection. Persists to localStorage (1-hour TTL) so
 * cold starts show real rates immediately instead of pegged fallbacks.
 *
 * Implements subscribe/getSnapshot for React 18 useSyncExternalStore.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_IDS: Record<string, string> = {
  USDT: "tether",
  cUSD: "celo-dollar",
  cEUR: "celo-euro",
  cREAL: "celo-real-creal",
  "G$": "gooddollar",
  CELO: "celo",
};

/** Fallback token→USD rates used before live data arrives. */
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

/** Token → corresponding fiat currency ISO code. */
export const TOKEN_FIAT_MAP: Record<string, string> = {
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
  "G$": "USD",
  USDT: "USD",
};

const GEO_KEY = "dezen_user_geo";
const GEO_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

const RATES_KEY = "dezen_rates_cache";
const RATES_EXPIRY = 60 * 60 * 1000; // 1 hour — used for cold-start warm-up only

const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes
const FOCUS_SKIP_THRESHOLD = 60 * 1000; // skip focus refresh if data is < 1 min old

// ---------------------------------------------------------------------------
// Snapshot type
// ---------------------------------------------------------------------------

export interface RatesSnapshot {
  /** token → USD rate, e.g. { CELO: 0.72, cEUR: 1.09 } */
  rates: Record<string, number>;
  /** USD → fiat rates via tether proxy, e.g. { USD_NGN: 1650, USD_EUR: 0.92 } */
  fiatRates: Record<string, number>;
  /** User's local fiat code from geolocation (e.g. "NGN", "GBP") */
  userFiat: string;
  /** True while a CoinGecko request is in flight */
  isFetching: boolean;
  /** Unix ms of last successful live fetch (0 = only pegged rates loaded) */
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Geolocation helpers
// ---------------------------------------------------------------------------

function getCachedGeo(): string | null {
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { currency: string; ts: number };
    if (Date.now() - data.ts < GEO_EXPIRY) return data.currency;
  } catch { /* ignore */ }
  return null;
}

async function fetchGeo(): Promise<string> {
  const cached = getCachedGeo();
  if (cached) return cached;
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    const data = await res.json() as { currency?: string };
    const currency = data.currency ?? "USD";
    localStorage.setItem(GEO_KEY, JSON.stringify({ currency, ts: Date.now() }));
    return currency;
  } catch {
    return "USD";
  }
}

// ---------------------------------------------------------------------------
// Cold-start: warm from localStorage so first render shows real rates
// ---------------------------------------------------------------------------

function loadFromStorage(): Partial<RatesSnapshot> | null {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as RatesSnapshot;
    if (Date.now() - data.updatedAt < RATES_EXPIRY) return data;
  } catch { /* ignore */ }
  return null;
}

const stored = loadFromStorage();

let snapshot: RatesSnapshot = {
  rates: stored?.rates ?? { ...PEGGED_RATES },
  fiatRates: stored?.fiatRates ?? {},
  userFiat: stored?.userFiat ?? getCachedGeo() ?? "USD",
  isFetching: false,
  updatedAt: stored?.updatedAt ?? 0,
};

// ---------------------------------------------------------------------------
// Observer — subscribe/getSnapshot for useSyncExternalStore
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((l) => l());
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function getSnapshot(): RatesSnapshot {
  return snapshot;
}

function setSnapshot(update: Partial<RatesSnapshot>): void {
  snapshot = { ...snapshot, ...update };
  notify();
}

// ---------------------------------------------------------------------------
// Fetch logic
// ---------------------------------------------------------------------------

let fetchInProgress = false;

export async function refresh(): Promise<void> {
  if (fetchInProgress) return;
  fetchInProgress = true;
  setSnapshot({ isFetching: true });

  try {
    const userFiat = await fetchGeo();

    // Build vs_currencies: user fiat + all token-native fiats + USD baseline
    const fiatCurrencies = Array.from(new Set(Object.values(TOKEN_FIAT_MAP)));
    const vsCurrencies = [
      ...new Set([
        userFiat.toLowerCase(),
        ...fiatCurrencies.map((c) => c.toLowerCase()),
        "usd",
      ]),
    ].join(",");

    const ids = Object.values(TOKEN_IDS).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrencies}&precision=8`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) {
      setSnapshot({ isFetching: false });
      return;
    }

    const data = await res.json() as Record<string, Record<string, number>>;

    // Update token → USD rates
    const rates = { ...snapshot.rates };
    for (const [symbol, cgId] of Object.entries(TOKEN_IDS)) {
      if (data[cgId]?.usd) rates[symbol] = data[cgId].usd;
    }

    // Build fiat rates via tether (≈ $1 proxy)
    const fiatRates: Record<string, number> = { "USD_USD": 1 };
    const tetherData = data.tether ?? {};
    for (const [fiatCode, rate] of Object.entries(tetherData)) {
      if (typeof rate === "number") {
        fiatRates[`USD_${fiatCode.toUpperCase()}`] = rate;
      }
    }

    const updatedAt = Date.now();

    // Persist for next cold start
    try {
      localStorage.setItem(RATES_KEY, JSON.stringify({ rates, fiatRates, userFiat, updatedAt }));
    } catch { /* storage quota — skip silently */ }

    setSnapshot({ rates, fiatRates, userFiat, updatedAt, isFetching: false });
  } catch {
    setSnapshot({ isFetching: false });
  } finally {
    fetchInProgress = false;
  }
}

// ---------------------------------------------------------------------------
// Bootstrap — runs once when this module is first imported
// ---------------------------------------------------------------------------

refresh();
setInterval(() => refresh(), REFRESH_INTERVAL);

if (typeof window !== "undefined") {
  window.addEventListener("focus", () => {
    if (Date.now() - snapshot.updatedAt > FOCUS_SKIP_THRESHOLD) refresh();
  });
  window.addEventListener("online", () => refresh());
}

/** Public store object. Pass to useSyncExternalStore or call refresh() manually. */
export const ratesStore = { subscribe, getSnapshot, refresh };
