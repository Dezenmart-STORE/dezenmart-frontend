import { useMemo } from "react";
import { useGasPrice } from "wagmi";
import { CHAIN_IDS } from "../config/chains";
import { usePrices } from "./usePrices";

// ---------------------------------------------------------------------------
// Gas unit estimates — conservative upper bounds for Celo transactions
// ---------------------------------------------------------------------------

/** token approval + escrow buyTrade */
const GAS_UNITS_NO_SWAP = 870_000n;

/** swap approval + swap execution + escrow approval + escrow buyTrade */
const GAS_UNITS_WITH_SWAP = 1_300_000n;

const GWEI = 1_000_000_000n;

/** 25 Gwei — conservative Celo fallback (actual is usually 5–15 Gwei) */
const FALLBACK_GAS_PRICE = 25n * GWEI;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GasEstimate {
  /** Total estimated gas cost in CELO (native token) */
  gasCelo: number;
  /**
   * Convert the gas estimate to any supported token symbol.
   * Returns CELO amount for "CELO", otherwise uses live exchange rates.
   */
  gasInToken: (symbol: string) => number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Estimates the total network fee for a payment flow on Celo.
 *
 * - Uses the live gas price from the Celo network (falls back to 25 Gwei).
 * - Converts the CELO cost to any token via live exchange rates.
 * - Pass `includeSwap=true` when the user needs a token swap before payment.
 */
export function useGasEstimate(includeSwap: boolean): GasEstimate {
  const { data: gasPriceWei } = useGasPrice({ chainId: CHAIN_IDS.CELO });
  const { convertPrice } = usePrices();

  return useMemo(() => {
    const price = gasPriceWei ?? FALLBACK_GAS_PRICE;
    const units = includeSwap ? GAS_UNITS_WITH_SWAP : GAS_UNITS_NO_SWAP;
    const gasCostWei = units * price;
    const gasCelo = Number(gasCostWei) / 1e18;

    const gasInToken = (symbol: string): number => {
      if (symbol === "CELO") return gasCelo;
      return convertPrice(gasCelo, "CELO", symbol);
    };

    return { gasCelo, gasInToken };
  }, [gasPriceWei, includeSwap, convertPrice]);
}
