import { baseApi } from './baseApi';
import type {
  AvailableProvider,
  ProviderProfile,
  AvailableProvidersQuery,
  PricingRule,
  CreateQuoteParams,
  LogisticsQuote,
} from '../../utils/types';

interface StatesEnvelope {
  data?: { states?: string[] };
}
interface LgasEnvelope {
  data?: { lgas?: string[] };
}
interface ProvidersEnvelope {
  data?: { providers?: unknown[] };
}
interface PricingRulesEnvelope {
  data?: { pricingRules?: PricingRule[]; rules?: PricingRule[] } | PricingRule[];
}

type RawProvider = Record<string, unknown> & { pricing?: Record<string, unknown> };

const num = (v: unknown): number | undefined => {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

// The exact pricing field names on /logistics/available aren't locked yet, so
// normalise defensively into { cost, estimatedDays } for a stable UI shape.
const normalizeAvailable = (raw: RawProvider): AvailableProvider => {
  // Undefined (not 0) when the response carries no pricing field, so the UI can
  // tell "no price for this route" apart from a genuine zero cost.
  const cost =
    num(raw.cost) ??
    num(raw.price) ??
    num(raw.totalCost) ??
    num(raw.totalPrice) ??
    num(raw.deliveryCost) ??
    num(raw.pricing?.cost) ??
    num(raw.pricing?.price);

  const daysRaw =
    raw.estimatedDays ??
    raw.deliveryDays ??
    raw.days ??
    raw.estimatedDeliveryDays ??
    raw.pricing?.estimatedDays ??
    raw.pricing?.days;
  const estimatedDays =
    daysRaw == null
      ? undefined
      : typeof daysRaw === 'number'
      ? `${daysRaw} day${daysRaw === 1 ? '' : 's'}`
      : String(daysRaw);

  return {
    ...(raw as unknown as AvailableProvider),
    _id: String(raw._id ?? ''),
    name: String(raw.name ?? ''),
    walletAddress: String(raw.walletAddress ?? ''),
    rating: num(raw.rating) ?? 0,
    cost,
    estimatedDays,
    currency: typeof raw.currency === 'string' ? raw.currency : undefined,
  };
};

export const logisticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Nigerian states (for address + product forms).
    // Effectively static, so keep the cache for a day to avoid refetching.
    getNigerianStates: builder.query<string[], void>({
      query: () => '/logistics/locations/states',
      transformResponse: (res: StatesEnvelope) => res?.data?.states ?? [],
      keepUnusedDataFor: 86400,
    }),

    // LGAs for a given state (dependent on selected state). Also static; cached
    // per-state for a day so switching back to a state doesn't refetch.
    getStateLgas: builder.query<string[], string>({
      query: (state) => `/logistics/locations/states/${encodeURIComponent(state)}/lgas`,
      transformResponse: (res: LgasEnvelope) => res?.data?.lgas ?? [],
      keepUnusedDataFor: 86400,
    }),

    // Available providers for a specific route + weight, with pricing.
    getAvailableProviders: builder.query<AvailableProvider[], AvailableProvidersQuery>({
      query: ({ fromState, fromLga, toState, toLga, weight, sort }) => ({
        url: '/logistics/available',
        params: {
          fromState,
          fromLga,
          toState,
          toLga,
          weight,
          ...(sort ? { sort } : {}),
        },
      }),
      transformResponse: (res: ProvidersEnvelope) =>
        (res?.data?.providers ?? []).map((p) => normalizeAvailable(p as RawProvider)),
      providesTags: ['Logistics'],
    }),

    // All registered providers (profiles, no route pricing).
    getAllProviders: builder.query<ProviderProfile[], void>({
      query: () => '/logistics/providers',
      transformResponse: (res: ProvidersEnvelope) =>
        (res?.data?.providers ?? []) as ProviderProfile[],
      providesTags: ['Logistics'],
    }),

    // A provider's pricing rules - used to compute the delivery cost for a route.
    // NOTE: backend currently only exposes /providers/me/pricing-rules (provider-
    // only). This targets the planned public /providers/{id}/pricing-rules; until
    // that ships it 403/404s and the UI falls back to "Price n/a".
    getProviderPricingRules: builder.query<PricingRule[], string>({
      query: (providerId) => `/logistics/providers/${providerId}/pricing-rules`,
      transformResponse: (res: PricingRulesEnvelope) => {
        if (Array.isArray(res?.data)) return res.data;
        return res?.data?.pricingRules ?? res?.data?.rules ?? [];
      },
      providesTags: (result, error, providerId) => [
        { type: 'Logistics', id: `PRICING-${providerId}` },
      ],
    }),

    // Create a logistics quote for one provider on a route + weight.
    // Modelled as a query so each provider row's quote is deduped and cached
    // (keyed by args); selecting a provider then already holds its quoteId.
    // The exact response field names aren't locked, so normalise defensively.
    getLogisticsQuote: builder.query<LogisticsQuote, CreateQuoteParams>({
      query: (body) => ({
        url: '/logistics/quotes',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      transformResponse: (res: unknown): LogisticsQuote => {
        const r = res as Record<string, any>;
        const q = r?.data?.quote ?? r?.data ?? r?.quote ?? r ?? {};
        const days =
          q.estimatedDays ??
          q.deliveryDays ??
          (q.estimatedDaysMin != null && q.estimatedDaysMax != null
            ? `${q.estimatedDaysMin}-${q.estimatedDaysMax} days`
            : undefined);
        return {
          quoteId: String(q.quoteId ?? q._id ?? q.id ?? ''),
          deliveryFee: num(q.deliveryFee ?? q.fee ?? q.totalFee ?? q.total ?? q.amount ?? q.price),
          estimatedDays: days != null ? String(days) : undefined,
          currency: typeof q.currency === 'string' ? q.currency : undefined,
          expiresAt: q.expiresAt ?? q.expiry ?? q.expiresIn,
        };
      },
    }),
  }),
});

export const {
  useGetNigerianStatesQuery,
  useGetStateLgasQuery,
  useGetAvailableProvidersQuery,
  useGetAllProvidersQuery,
  useGetProviderPricingRulesQuery,
  useGetLogisticsQuoteQuery,
} = logisticsApi;
