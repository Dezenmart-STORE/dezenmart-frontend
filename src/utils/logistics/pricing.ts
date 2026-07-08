import type {
  PricingRule,
  PricingWeightTier,
  DeliveryType,
  DeliveryQuote,
  RouteInput,
} from "../types";

const norm = (s?: string) => (s ?? "").trim().toLowerCase();

/**
 * Delivery type is derived from the route: same LGA → intra_lga, same state →
 * intra_state, otherwise inter_state. This selects which pricing rule applies.
 */
export function resolveDeliveryType(route: RouteInput): DeliveryType {
  const sameState = norm(route.fromState) === norm(route.toState);
  const sameLga = norm(route.fromLga) === norm(route.toLga);
  if (sameState && sameLga) return "intra_lga";
  if (sameState) return "intra_state";
  return "inter_state";
}

/** A rule matches when its deliveryType matches and any explicit from/to
 *  fields it specifies match the route (blank fields act as wildcards). */
function ruleMatches(rule: PricingRule, route: RouteInput, type: DeliveryType): boolean {
  if (norm(rule.deliveryType) !== type) return false;
  const ok = (ruleVal: string | undefined, routeVal: string) =>
    !ruleVal || !ruleVal.trim() || norm(ruleVal) === norm(routeVal);
  return (
    ok(rule.fromState, route.fromState) &&
    ok(rule.fromLga, route.fromLga) &&
    ok(rule.toState, route.toState) &&
    ok(rule.toLga, route.toLga)
  );
}

/** Prefer the most specific matching rule (most non-empty from/to fields). */
function specificity(rule: PricingRule): number {
  return [rule.fromState, rule.fromLga, rule.toState, rule.toLga].filter(
    (v) => v && v.trim()
  ).length;
}

/** Tier whose [min,max] contains the weight; max ≤ 0 (or missing) = unbounded. */
function tierForWeight(
  weight: number,
  tiers: PricingWeightTier[]
): PricingWeightTier | undefined {
  const sorted = [...(tiers ?? [])].sort((a, b) => a.minWeight - b.minWeight);
  const match = sorted.find(
    (t) => weight >= t.minWeight && (t.maxWeight > 0 ? weight <= t.maxWeight : true)
  );
  return match ?? sorted[sorted.length - 1];
}

function formatDays(min?: number, max?: number): string | undefined {
  if (min == null && max == null) return undefined;
  if (min != null && max != null) {
    return min === max ? `${min} day${min === 1 ? "" : "s"}` : `${min}–${max} days`;
  }
  const v = (min ?? max) as number;
  return `${v} day${v === 1 ? "" : "s"}`;
}

/**
 * Compute the delivery cost for a route + weight from a provider's pricing rules.
 * Returns null when no rule/tier applies (UI shows "Price n/a").
 * Total = matching weight tier price + insuranceFee + packagingFee.
 */
export function computeDeliveryQuote(
  rules: PricingRule[] | undefined,
  route: RouteInput,
  weight: number
): DeliveryQuote | null {
  if (!rules || rules.length === 0) return null;

  const deliveryType = resolveDeliveryType(route);
  const candidates = rules
    .filter((r) => r.isActive !== false && ruleMatches(r, route, deliveryType))
    .sort((a, b) => specificity(b) - specificity(a));

  const rule = candidates[0];
  if (!rule) return null;

  const tier = tierForWeight(weight, rule.weightTiers ?? []);
  if (!tier) return null;

  const base = Number(tier.price) || 0;
  const insuranceFee = Number(rule.insuranceFee) || 0;
  const packagingFee = Number(rule.packagingFee) || 0;

  return {
    cost: base + insuranceFee + packagingFee,
    estimatedDays: formatDays(rule.estimatedDaysMin, rule.estimatedDaysMax),
    daysMin: rule.estimatedDaysMin ?? rule.estimatedDaysMax,
    deliveryType,
    breakdown: { base, insuranceFee, packagingFee },
  };
}
