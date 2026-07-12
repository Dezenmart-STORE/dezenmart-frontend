import type { LogisticsSort } from "../utils/types";

/**
 * Fallbacks for products created before origin/weight were captured.
 * `/logistics/available` requires fromState, fromLga and weight. New products
 * now carry `state` / `lga` / `weight` (set in the create-product form), but
 * older listings don't - they fall back to these so a buyer can still see
 * route-priced providers.
 *
 * TODO: remove once every product carries state / lga / weight.
 */
export const LEGACY_ORIGIN = { state: "Lagos", lga: "Ikeja" } as const;
export const DEFAULT_WEIGHT_PER_UNIT = 1; // kg

export const LOGISTICS_SORTS: { value: LogisticsSort; label: string }[] = [
  { value: "price", label: "Cheapest" },
  { value: "days", label: "Fastest" },
  { value: "rating", label: "Top rated" },
];
