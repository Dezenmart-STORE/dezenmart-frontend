import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaTruck, FaCheck, FaStar, FaSearch } from "react-icons/fa";
import { HiExclamationTriangle, HiCheckBadge } from "react-icons/hi2";
import {
  useGetAllProvidersQuery,
  useGetAvailableProvidersQuery,
  useGetProviderPricingRulesQuery,
} from "../../../store/api";
import type {
  AvailableProvider,
  DeliveryAddress,
  DeliveryQuote,
  LogisticsSort,
  Product,
  RouteInput,
} from "../../../utils/types";
import {
  LEGACY_ORIGIN,
  DEFAULT_WEIGHT_PER_UNIT,
  LOGISTICS_SORTS,
} from "../../../config/logistics";
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

const LogisticsProviderSelector: React.FC<Props> = ({
  product,
  deliveryAddress,
  quantity,
  selectedProvider,
  onProviderSelect,
}) => {
  const [sort, setSort] = useState<LogisticsSort>("price");
  const [search, setSearch] = useState("");
  const [quotes, setQuotes] = useState<Record<string, DeliveryQuote | null>>({});
  const [expanded, setExpanded] = useState(false);

  // Origin + weight (fall back to legacy defaults for older products).
  const fromState = product.state || LEGACY_ORIGIN.state;
  const fromLga = product.lga || LEGACY_ORIGIN.lga;
  const weight = (product.weight || DEFAULT_WEIGHT_PER_UNIT) * Math.max(1, quantity);

  const route = useMemo<RouteInput>(
    () => ({ fromState, fromLga, toState: deliveryAddress.state, toLga: deliveryAddress.lga }),
    [fromState, fromLga, deliveryAddress.state, deliveryAddress.lga]
  );

  const { data: providers = [], isLoading, isFetching, isError, refetch } = useGetAllProvidersQuery()
    // useGetAvailableProvidersQuery({
    //   fromState,
    //   fromLga,
    //   toState: deliveryAddress.state,
    //   toLga: deliveryAddress.lga,
    //   weight,
    // });

  const tokenSymbol = product.paymentToken || "USDT";

  // Each row reports its computed quote up so we can sort by price/speed.
  const reportQuote = useCallback((id: string, quote: DeliveryQuote | null) => {
    setQuotes((prev) => {
      const prevQ = prev[id];
      if (id in prev && prevQ?.cost === quote?.cost && prevQ?.daysMin === quote?.daysMin) {
        return prev;
      }
      return { ...prev, [id]: quote };
    });
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? providers.filter((p) => p.name.toLowerCase().includes(q)) : providers;
    const withIndex = filtered.map((p, i) => ({ p, i }));
    withIndex.sort((a, b) => {
      if (sort === "rating") return (b.p.rating || 0) - (a.p.rating || 0) || a.i - b.i;
      const qa = quotes[a.p._id];
      const qb = quotes[b.p._id];
      if (sort === "days") {
        return (qa?.daysMin ?? Infinity) - (qb?.daysMin ?? Infinity) || a.i - b.i;
      }
      return (qa?.cost ?? Infinity) - (qb?.cost ?? Infinity) || a.i - b.i;
    });
    return withIndex.map((x) => x.p);
  }, [providers, search, sort, quotes]);

  // Auto-select the first provider once, if none chosen.
  useEffect(() => {
    if (!selectedProvider && providers.length > 0) {
      onProviderSelect(providers[0]);
    }
  }, [providers, selectedProvider, onProviderSelect]);

  // Keep the selected provider's cost in sync once its quote resolves.
  useEffect(() => {
    if (!selectedProvider) return;
    const q = quotes[selectedProvider._id];
    if (q && (q.cost !== selectedProvider.cost || q.estimatedDays !== selectedProvider.estimatedDays)) {
      onProviderSelect({ ...selectedProvider, cost: q.cost, estimatedDays: q.estimatedDays });
    }
  }, [quotes, selectedProvider, onProviderSelect]);

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
          selected
          onSelect={() => setExpanded(true)}
          onQuote={reportQuote}
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
      {!isLoading && !isError && providers.length > 1 && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {LOGISTICS_SORTS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSort(option.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sort === option.value
                    ? "bg-red-600 text-white"
                    : "bg-[#292B30] text-gray-400 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {providers.length > SEARCH_THRESHOLD && (
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
      ) : providers.length === 0 ? (
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
              selected={selectedProvider?.walletAddress === provider.walletAddress}
              onSelect={handleSelect}
              onQuote={reportQuote}
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
  selected: boolean;
  onSelect: (provider: AvailableProvider) => void;
  onQuote: (id: string, quote: DeliveryQuote | null) => void;
}

const ProviderRow: React.FC<RowProps> = ({
  provider,
  route,
  weight,
  tokenSymbol,
  selected,
  onSelect,
  onQuote,
}) => {
  const { data: rules, isLoading } = useGetProviderPricingRulesQuery(provider._id, {
    skip: !provider._id,
  });

  const quote = useMemo(
    () => computeDeliveryQuote(rules, route, weight),
    [rules, route, weight]
  );

  // Report the computed quote up for sorting.
  useEffect(() => {
    onQuote(provider._id, quote);
  }, [provider._id, quote, onQuote]);

  const cost = quote?.cost ?? provider.cost;
  const estimatedDays = quote?.estimatedDays ?? provider.estimatedDays;

  const handleSelect = () => onSelect({ ...provider, cost, estimatedDays });

  return (
    <motion.button
      type="button"
      onClick={handleSelect}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
        selected
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
            ) : cost != null ? (
              <div className="text-red-500 font-semibold text-sm">
                {cost} {tokenSymbol}
              </div>
            ) : (
              <div className="text-gray-500 text-xs">Price n/a</div>
            )}
          </div>
          {selected && <FaCheck className="text-red-500 w-4 h-4" />}
        </div>
      </div>
    </motion.button>
  );
};

export default LogisticsProviderSelector;
