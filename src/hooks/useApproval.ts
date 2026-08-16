import { useCallback } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { erc20Abi, parseUnits, formatUnits } from "viem";
import { getTokenAddress, getTokenDecimals } from "../config/tokens";
import { getEscrowAddress, wagmiConfig } from "../config/chains";
import { getWalletMode } from "../config/walletMode";

interface UseApprovalReturn {
  /** Current allowance as a formatted number */
  allowance: number;
  /** Whether the spender has enough allowance for the given amount */
  isApproved: boolean;
  /** Whether an approval tx is in progress */
  isPending: boolean;
  /** Approve spending. Returns tx hash, or "0x0" if already approved. */
  approve: (useUnlimited?: boolean) => Promise<`0x${string}`>;
  /** Re-read current allowance from chain */
  refetch: () => void;
}

const MAX_UINT256 = BigInt(
  "115792089237316195423570985008687907853269984665640564039457584007913129639935"
);

/**
 * Hook for ERC20 approve + allowance for a token -> escrow spender.
 *
 * @param tokenSymbol  e.g. "USDT", "cUSD"
 * @param requiredAmount  human-readable amount needed (e.g. 25.5)
 */
export function useApproval(
  tokenSymbol: string,
  requiredAmount: number
): UseApprovalReturn {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();

  const tokenAddress = getTokenAddress(tokenSymbol, chainId);
  const decimals = getTokenDecimals(tokenSymbol);

  let escrowAddress: `0x${string}` | undefined;
  try {
    escrowAddress = getEscrowAddress(chainId) as `0x${string}`;
  } catch {
    // Chain not configured - allowance will be 0
  }

  const enabled = !!address && !!tokenAddress && !!escrowAddress;

  const { data: rawAllowance, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: enabled ? [address!, escrowAddress!] : undefined,
    query: {
      enabled,
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  });

  const allowance =
    rawAllowance !== undefined
      ? parseFloat(formatUnits(rawAllowance as bigint, decimals))
      : 0;

  const isApproved = allowance >= requiredAmount;

  const approve = useCallback(
    async (useUnlimited = false): Promise<`0x${string}`> => {
      if (!address || !tokenAddress || !escrowAddress) {
        throw new Error("Wallet not connected or token not available");
      }

      // Already approved - skip
      if (isApproved) return "0x0" as `0x${string}`;

      const approvalAmount = useUnlimited
        ? MAX_UINT256
        : (() => {
            // Exact amount + 5% buffer
            const raw = parseUnits(String(requiredAmount), decimals);
            return (raw * 105n) / 100n;
          })();

      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [escrowAddress, approvalAmount],
        gas: 150_000n,
        chainId,
        // The approval is the FIRST transaction, and where the Dezen wallet
        // fails: the request reaching Dynamic carries both gasPrice and
        // maxFeePerGas, so viem infers "legacy" and then rejects the 1559
        // fields. Pinning eip1559 keeps gasPrice out so the type is
        // unambiguous. (Forcing "legacy" was tried first and made it worse -
        // it adds gasPrice, which is the half that causes the bad inference.)
        ...(getWalletMode() === "dezen" ? { type: "eip1559" as const } : {}),
      });

      // Wait for confirmation before refreshing allowance - avoids stale "not approved" flash
      await waitForTransactionReceipt(wagmiConfig, { hash, timeout: 60_000 });
      refetch();

      return hash;
    },
    [
      address,
      tokenAddress,
      escrowAddress,
      isApproved,
      requiredAmount,
      decimals,
      chainId,
      writeContractAsync,
      refetch,
    ]
  );

  return { allowance, isApproved, isPending, approve, refetch };
}
