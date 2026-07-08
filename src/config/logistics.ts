import type { LogisticsSort } from "../utils/types";

/**
 * Fallbacks for products created before weight/origin were captured.
 * `/logistics/available` requires fromState, fromLga and weight, but older
 * products don't carry weightPerUnit / fromState / fromLga yet. Until the
 * create-product endpoint adds them, legacy listings fall back to these so a
 * buyer can still see route-priced providers.
 *
 * TODO: remove once every product carries weightPerUnit + fromState/fromLga.
 */
export const LEGACY_ORIGIN = { state: "Lagos", lga: "Ikeja" } as const;
export const DEFAULT_WEIGHT_PER_UNIT = 1; // kg

export const LOGISTICS_SORTS: { value: LogisticsSort; label: string }[] = [
  { value: "price", label: "Cheapest" },
  { value: "days", label: "Fastest" },
  { value: "rating", label: "Top rated" },
];
