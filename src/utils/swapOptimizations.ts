import { LRUCache } from "lru-cache";

// Quote caching system
export const quoteCache = new LRUCache<string, any>({
  max: 100,
  ttl: 30000, // 30 seconds
});

// Route caching for trading pairs
export const routeCache = new LRUCache<string, any>({
  max: 500,
  ttl: 300000, // 5 minutes
});

// Debounced quote fetching to prevent API spam
export const createDebouncedQuoteFetcher = (
  fetchFn: Function,
  delay: number = 500
) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: any[]) => {
    clearTimeout(timeoutId);
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fetchFn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
};

// Gas estimation
export const estimateGas = async (
  contract: any,
  method: string,
  args: any[],
  fallbackGas: bigint = BigInt(500000)
): Promise<bigint> => {
  try {
    const estimated = await contract.estimateGas[method](...args);
    return (estimated * BigInt(120)) / BigInt(100); // 20% buffer
  } catch (error) {
    console.warn("Gas estimation failed, using fallback:", error);
    return fallbackGas;
  }
};

// Token balance validation
export const validateTokenBalance = async (
  tokenContract: any,
  userAddress: string,
  requiredAmount: bigint,
  maxRetries: number = 3
): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const balance = await tokenContract.balanceOf(userAddress);
      return balance >= requiredAmount;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return false;
};

// Network status monitoring
export const createNetworkMonitor = (
  onNetworkChange: (chainId: number) => void
) => {
  if (typeof window !== "undefined" && window.ethereum) {
    window.ethereum.on("chainChanged", (chainId: string) => {
      onNetworkChange(parseInt(chainId, 16));
    });
  }
};

// Transaction monitoring
export const monitorTransaction = async (
  publicClient: any,
  hash: string,
  maxWaitTime: number = 300000 // 5 minutes
): Promise<any> => {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: hash as `0x${string}`,
      timeout: maxWaitTime,
    });

    if (receipt.status === "success") {
      return receipt;
    } else {
      throw new Error("Transaction failed");
    }
  } catch (error: any) {
    if (error.message?.includes("timeout")) {
      throw new Error(
        "Transaction confirmation timeout. Please check your transaction status manually."
      );
    }
    throw error;
  }
};
