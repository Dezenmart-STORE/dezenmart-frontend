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

/**
 * TEMP (demo): when no provider can be quoted for the route, the order is still
 * sent with this real, active logistics provider id so a purchase can complete
 * in front of an audience. Replace with a provider id of your choice, and remove
 * once quoting reliably returns a provider for every route.
 */
export const DEMO_FALLBACK_PROVIDER_ID = "68de34e03f8224ade098a2eb"; // Dezenmart Logistics
