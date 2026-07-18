import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaTruck, FaCheck, FaStar, FaSearch } from "react-icons/fa";
import { HiExclamationTriangle, HiCheckBadge } from "react-icons/hi2";
import {
  useGetAvailableProvidersQuery,
  useGetAllProvidersQuery,
  useGetProviderPricingRulesQuery,
  useGetLogisticsQuoteQuery,
} from "../../../store/api";
import type {
  AvailableProvider,
  DeliveryAddress,
  DeliveryQuote,
  Product,
  RouteInput,
} from "../../../utils/types";
import { LEGACY_ORIGIN, DEFAULT_WEIGHT_PER_UNIT } from "../../../config/logistics";
import { computeDeliveryQuote } from "../../../utils/logistics/pricing";
import LoadingSpinner from "../../common/LoadingSpinner";

interface Props {
  product: Product;
  deliveryAddress: DeliveryAddress;
  quantity: number;
  selectedProvider: AvailableProvider | null;
  onProviderSelect: (provider: AvailableProvider) => void;
}

const SEARCH_THRESHOLD = 4; // only show the search box beyond this many providers

// What each provider row reports back: its quote (for sorting), the quoteId
// (needed to order), and whether it can actually be quoted for this route.
interface RowInfo {
  quote: DeliveryQuote | null;
  quoteId?: string;
  status: "loading" | "ok" | "unavailable";
}

const LogisticsProviderSelector: React.FC<Props> = ({
  product,
  deliveryAddress,
  quantity,
  selectedProvider,
  onProviderSelect,
}) => {
  const [search, setSearch] = useState("");
  const [rowInfo, setRowInfo] = useState<Record<string, RowInfo>>({});
  const [expanded, setExpanded] = useState(false);

  // Origin + weight (fall back to legacy defaults for older products).
  const fromState = product.state || LEGACY_ORIGIN.state;
  const fromLga = product.lga || LEGACY_ORIGIN.lga;
  const weight = (product.weight || DEFAULT_WEIGHT_PER_UNIT) * Math.max(1, quantity);

  const route = useMemo<RouteInput>(
    () => ({ fromState, fromLga, toState: deliveryAddress.state, toLga: deliveryAddress.lga }),
    [fromState, fromLga, deliveryAddress.state, deliveryAddress.lga]
  );

  // Primary: providers that serve this route. If none, fall back to all active
  // providers and let /logistics/quotes decide who can actually deliver.
  const availableQ = useGetAvailableProvidersQuery({
    fromState,
    fromLga,
    toState: deliveryAddress.state,
    toLga: deliveryAddress.lga,
    weight,
  });
  const available = availableQ.data ?? [];
  const needFallback = !availableQ.isFetching && available.length === 0;
  const fallbackQ = useGetAllProvidersQuery(undefined, { skip: !needFallback });

  const providers = (
    available.length > 0 ? available : fallbackQ.data ?? []
  ) as AvailableProvider[];
  const isLoading = availableQ.isLoading || (needFallback && fallbackQ.isLoading);
  const isFetching = availableQ.isFetching || fallbackQ.isFetching;
  const isError = availableQ.isError && (!needFallback || fallbackQ.isError);
  const refetch = () => {
    availableQ.refetch();
    if (needFallback) fallbackQ.refetch();
  };

  const tokenSymbol = product.paymentToken || "USDT";

  // Each row reports its quote status up so we can sort, gate selection, and
  // auto-pick a provider that can actually be quoted.
  const reportInfo = useCallback((id: string, info: RowInfo) => {
    setRowInfo((prev) => {
      const p = prev[id];
      if (
        p &&
        p.status === info.status &&
        p.quoteId === info.quoteId &&
        p.quote?.cost === info.quote?.cost &&
        p.quote?.daysMin === info.quote?.daysMin
      ) {
        return prev;
      }
      return { ...prev, [id]: info };
    });
  }, []);

  // Alphabetical, with successfully-quoted providers first, then the rest.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? providers.filter((p) => p.name.toLowerCase().includes(q)) : providers;
    const rank = (id: string) => (rowInfo[id]?.status === "ok" ? 0 : 1);
    return [...filtered].sort((a, b) => {
      const r = rank(a._id) - rank(b._id);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name);
    });
  }, [providers, search, rowInfo]);

  // True once every candidate has resolved and none can be quoted.
  const noneQuotable =
    providers.length > 0 &&
    providers.every((p) => rowInfo[p._id]?.status === "unavailable");

  // Keep the selected provider's cost + quoteId in sync as its quote resolves.
  useEffect(() => {
    if (!selectedProvider) return;
    const info = rowInfo[selectedProvider._id];
    if (
      info?.status === "ok" &&
      (info.quoteId !== selectedProvider.quoteId ||
        info.quote?.cost !== selectedProvider.cost)
    ) {
      onProviderSelect({
        ...selectedProvider,
        cost: info.quote?.cost,
        estimatedDays: info.quote?.estimatedDays,
        quoteId: info.quoteId,
      });
    }
  }, [rowInfo, selectedProvider, onProviderSelect]);

  const handleSelect = useCallback(
    (p: AvailableProvider) => {
      onProviderSelect(p);
      setExpanded(false);
    },
    [onProviderSelect]
  );

  // Collapse to the chosen provider once picked, so a long list isn't always open.
  const collapsed =
    !!selectedProvider && !expanded && !isLoading && !isError && providers.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FaTruck className="text-red-500" />
          Delivery Service
        </h3>
        {collapsed ? (
          <button
            onClick={() => setExpanded(true)}
            className="text-red-500 hover:text-red-400 text-sm transition-colors"
          >
            Change
          </button>
        ) : !isLoading && !isError && providers.length > 0 ? (
          <span className="text-xs text-gray-400">
            {providers.length} option{providers.length !== 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {collapsed && selectedProvider ? (
        <ProviderRow
          provider={selectedProvider}
          route={route}
          weight={weight}
          tokenSymbol={tokenSymbol}
          deliveryAddressId={deliveryAddress._id}
          selected
          onSelect={() => setExpanded(true)}
          onReport={reportInfo}
        />
      ) : (
      <>
      {/* Route + weight transparency */}
      <p className="text-xs text-gray-500">
        Pricing for <span className="text-gray-300">{weight}kg</span> to{" "}
        <span className="text-gray-300">
          {deliveryAddress.lga}, {deliveryAddress.state}
        </span>
      </p>

      {/* Sort + search controls */}
      {!isLoading && !isError && providers.length > SEARCH_THRESHOLD && (
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search providers"
            className="w-full bg-[#1a1c20] text-white pl-9 pr-3 py-2 rounded-xl border border-[#3A3A3C] focus:border-red-500 focus:outline-none text-sm placeholder-gray-600 transition-colors"
          />
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-red-400">
              <HiExclamationTriangle className="w-5 h-5" />
              <span className="text-sm">Couldn't load delivery options</span>
            </div>
            <button
              onClick={() => refetch()}
              className="text-red-400 hover:text-red-300 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      ) : providers.length === 0 || noneQuotable ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-2 text-yellow-400">
            <HiExclamationTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">No delivery service available</p>
              <p className="text-xs mt-1">
                We don't have a provider delivering to {deliveryAddress.lga},{" "}
                {deliveryAddress.state} yet. Try another delivery address.
              </p>
            </div>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-6">
          No providers match "{search}".
        </p>
      ) : (
        <div className={`space-y-2 max-h-[20rem] overflow-y-auto pr-0.5 ${isFetching ? "opacity-60" : ""}`}>
          {visible.map((provider) => (
            <ProviderRow
              key={provider.walletAddress}
              provider={provider}
              route={route}
              weight={weight}
              tokenSymbol={tokenSymbol}
              deliveryAddressId={deliveryAddress._id}
              selected={selectedProvider?.walletAddress === provider.walletAddress}
              onSelect={handleSelect}
              onReport={reportInfo}
            />
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
};

// ── Provider row: fetches its own pricing rules & computes the route quote ──
interface RowProps {
  provider: AvailableProvider;
  route: RouteInput;
  weight: number;
  tokenSymbol: string;
  /** Saved address id (enables the real quote). Empty for a one-time address. */
  deliveryAddressId?: string;
  selected: boolean;
  onSelect: (provider: AvailableProvider) => void;
  onReport: (id: string, info: RowInfo) => void;
}

const ProviderRow: React.FC<RowProps> = ({
  provider,
  route,
  weight,
  tokenSymbol,
  deliveryAddressId,
  selected,
  onSelect,
  onReport,
}) => {
  const hasAddressId = !!deliveryAddressId;

  // Preferred path: a real quote from the backend (gives the quoteId + fee).
  // The quote is route-level (no providerId), so rows on the same route share
  // one deduped request.
  const { data: liveQuote, isFetching: quoteLoading } = useGetLogisticsQuoteQuery(
    {
      deliveryAddressId: deliveryAddressId ?? "",
      fromState: route.fromState,
      fromLga: route.fromLga,
      toState: route.toState,
      toLga: route.toLga,
      weight,
    },
    // Quotes expire, so always mint a fresh one rather than reuse a cached quote.
    { skip: !hasAddressId || !provider._id, refetchOnMountOrArgChange: true }
  );

  // Fallback for a one-time address (no id): compute a price from pricing rules.
  const { data: rules, isFetching: rulesLoading } = useGetProviderPricingRulesQuery(
    provider._id,
    { skip: hasAddressId || !provider._id }
  );
  const ruleQuote = useMemo(
    () => (hasAddressId ? null : computeDeliveryQuote(rules, route, weight)),
    [hasAddressId, rules, route, weight]
  );

  const isLoading = hasAddressId ? quoteLoading : rulesLoading;
  const cost = liveQuote?.deliveryFee ?? ruleQuote?.cost ?? provider.cost;
  const estimatedDays =
    liveQuote?.estimatedDays ?? ruleQuote?.estimatedDays ?? provider.estimatedDays;
  const quoteId = liveQuote?.quoteId;

  // A row is orderable only once it has a quoteId. Without a saved address id we
  // can't get one, so those rows are informational-only (not orderable).
  const status: RowInfo["status"] = isLoading
    ? "loading"
    : quoteId
    ? "ok"
    : "unavailable";
  const unavailable = status === "unavailable";

  const sortQuote = useMemo<DeliveryQuote | null>(() => {
    if (cost == null) return ruleQuote;
    return {
      cost,
      estimatedDays,
      daysMin: ruleQuote?.daysMin,
      deliveryType: ruleQuote?.deliveryType ?? "inter_state",
      breakdown: ruleQuote?.breakdown ?? { base: cost, insuranceFee: 0, packagingFee: 0 },
    };
  }, [cost, estimatedDays, ruleQuote]);

  useEffect(() => {
    onReport(provider._id, { quote: sortQuote, quoteId, status });
  }, [provider._id, sortQuote, quoteId, status, onReport]);

  const handleSelect = () => {
    if (unavailable) return;
    onSelect({ ...provider, cost, estimatedDays, quoteId });
  };

  return (
    <motion.button
      type="button"
      onClick={handleSelect}
      disabled={unavailable}
      whileTap={unavailable ? undefined : { scale: 0.98 }}
      className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
        unavailable
          ? "border-transparent bg-[#292B30]/50 opacity-60 cursor-not-allowed"
          : selected
          ? "border-red-600 bg-red-600/10"
          : "border-transparent bg-[#292B30] hover:border-gray-600"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{provider.name}</span>
            {provider.verificationStatus === "verified" && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <HiCheckBadge className="w-3.5 h-3.5" />
                Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            {estimatedDays && <span className="text-gray-300">{estimatedDays}</span>}
            <span className="flex items-center gap-1">
              <FaStar className="w-2.5 h-2.5 text-yellow-500" />
              {provider.rating ? provider.rating.toFixed(1) : "New"}
              {typeof provider.totalDeliveries === "number" &&
                provider.totalDeliveries > 0 &&
                ` · ${provider.totalDeliveries} deliveries`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            {isLoading ? (
              <div className="text-gray-500 text-xs">…</div>
            ) : unavailable ? (
              <div className="text-gray-500 text-xs">Unavailable</div>
            ) : cost != null ? (
              <div className="text-red-500 font-semibold text-sm">
                {cost} {tokenSymbol}
              </div>
            ) : (
              <div className="text-gray-500 text-xs">Price n/a</div>
            )}
          </div>
          {selected && !unavailable && <FaCheck className="text-red-500 w-4 h-4" />}
        </div>
      </div>
    </motion.button>
  );
};

export default LogisticsProviderSelector;
