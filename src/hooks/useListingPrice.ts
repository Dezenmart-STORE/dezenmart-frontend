import { useCallback, useMemo } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { BANK_TRANSFER_ENABLED } from "../config/features";
import { isBankTransferListing, type Product } from "../utils/types";
import { formatNaira } from "../utils/format";

type Priced = Pick<Product, "price" | "acceptedPayments">;

/**
 * Naira per dollar for ordering listings only, while no live rate has loaded.
 * Never shown as a price: a shown naira amount needs the live rate.
 */
const SORTING_NAIRA_PER_DOLLAR = 1600;

/**
 * Prices for listings of either kind. A crypto listing's price is in US
 * dollars and follows the shopper's display currency; a bank-transfer listing
 * is priced and paid in naira, so it always shows naira.
 */
export function useListingPrice() {
  const { formatDisplayPrice, convertPrice } = useCurrency();

  // convertPrice hands the amount back unchanged when it has no rate, which
  // would show dollars as naira. A real rate is always well above 1.
  const nairaPerDollar = useMemo(() => {
    const rate = convertPrice(1, "USD", "NGNm");
    return rate > 1 ? rate : undefined;
  }, [convertPrice]);

  const isNaira = useCallback((product: Priced) => BANK_TRANSFER_ENABLED && isBankTransferListing(product), []);

  const formatListingPrice = useCallback(
    (product: Priced) => (isNaira(product) ? formatNaira(product.price) : formatDisplayPrice(product.price)),
    [isNaira, formatDisplayPrice]
  );

  /** The price in US dollars, so listings of both kinds sort and filter together. */
  const listingPriceUSD = useCallback(
    (product: Priced) =>
      isNaira(product) ? product.price / (nairaPerDollar ?? SORTING_NAIRA_PER_DOLLAR) : product.price,
    [isNaira, nairaPerDollar]
  );

  /** A dollar amount, such as a delivery quote, in naira; undefined until a rate has loaded. */
  const usdToNaira = useCallback(
    (usd: number) => (nairaPerDollar === undefined ? undefined : usd * nairaPerDollar),
    [nairaPerDollar]
  );

  return { formatListingPrice, listingPriceUSD, usdToNaira, isNaira };
}
