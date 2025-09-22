import { readContract } from "@wagmi/core";
import { formatUnits, erc20Abi } from "viem";
import { STABLE_TOKENS, getTokenAddress, TARGET_CHAIN } from "./config/web3.config";
import { wagmiConfig } from "./config/web3.config";

export interface TokenBalanceInfo {
  token: {
    name: string;
    symbol: string;
    decimals: number;
    address: Record<number, string>;
    icon?: string;
  };
  balance: string;
  formattedBalance: string;
  hasBalance: boolean;
}

export interface WalletTokenScanResult {
  availableTokens: TokenBalanceInfo[];
  totalValue: number;
  hasUSDT: boolean;
  usdtBalance: string;
  recommendedConversion?: {
    fromToken: string;
    toToken: string;
    amount: number;
    estimatedUSDT: string;
  };
}

/**
 * Scans user wallet for all supported stable tokens and their balances
 */
export async function scanWalletForStableTokens(
  userAddress: string,
  chainId: number = TARGET_CHAIN.id
): Promise<WalletTokenScanResult> {
  const availableTokens: TokenBalanceInfo[] = [];
  let totalValue = 0;
  let hasUSDT = false;
  let usdtBalance = "0";
  let recommendedConversion: WalletTokenScanResult["recommendedConversion"];

  // Check each supported stable token
  for (const token of STABLE_TOKENS) {
    try {
      const tokenAddress = getTokenAddress(token, chainId);
      if (!tokenAddress) continue;

      const balance = await readContract(wagmiConfig, {
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [userAddress as `0x${string}`],
      });

      const balanceBigInt = balance as bigint;
      const formattedBalance = formatUnits(balanceBigInt, token.decimals);
      const numericBalance = parseFloat(formattedBalance);
      const hasBalance = numericBalance > 0;

      const tokenInfo: TokenBalanceInfo = {
        token,
        balance: formattedBalance,
        formattedBalance: `${numericBalance.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: Math.min(token.decimals, 6),
        })} ${token.symbol}`,
        hasBalance,
      };

      availableTokens.push(tokenInfo);

      if (hasBalance) {
        totalValue += numericBalance; // Simplified - in real implementation, convert to USD

        if (token.symbol === "USDT") {
          hasUSDT = true;
          usdtBalance = formattedBalance;
        }
      }
    } catch (error) {
      console.warn(`Failed to check balance for ${token.symbol}:`, error);
    }
  }

  // Find the token with the highest balance (excluding USDT) for potential conversion
  const tokensWithBalance = availableTokens.filter(t => t.hasBalance && t.token.symbol !== "USDT");
  if (tokensWithBalance.length > 0 && !hasUSDT) {
    const highestBalanceToken = tokensWithBalance.reduce((prev, current) => 
      parseFloat(prev.balance) > parseFloat(current.balance) ? prev : current
    );

    recommendedConversion = {
      fromToken: highestBalanceToken.token.symbol,
      toToken: "USDT",
      amount: parseFloat(highestBalanceToken.balance),
      estimatedUSDT: highestBalanceToken.balance, // Simplified - would need actual conversion rate
    };
  }

  return {
    availableTokens,
    totalValue,
    hasUSDT,
    usdtBalance,
    recommendedConversion,
  };
}

/**
 * Checks if user has sufficient balance for a purchase
 */
export function checkSufficientBalance(
  availableTokens: TokenBalanceInfo[],
  requiredAmount: number,
  requiredToken: string = "USDT"
): {
  hasSufficientBalance: boolean;
  availableAmount: number;
  needsConversion: boolean;
  conversionRequired?: {
    fromToken: string;
    toToken: string;
    amount: number;
  };
} {
  const targetToken = availableTokens.find(t => t.token.symbol === requiredToken);
  
  if (!targetToken || !targetToken.hasBalance) {
    // Check if we can convert from other tokens
    const tokensWithBalance = availableTokens.filter(t => t.hasBalance && t.token.symbol !== requiredToken);
    
    if (tokensWithBalance.length > 0) {
      const highestBalanceToken = tokensWithBalance.reduce((prev, current) => 
        parseFloat(prev.balance) > parseFloat(current.balance) ? prev : current
      );

      return {
        hasSufficientBalance: false,
        availableAmount: 0,
        needsConversion: true,
        conversionRequired: {
          fromToken: highestBalanceToken.token.symbol,
          toToken: requiredToken,
          amount: parseFloat(highestBalanceToken.balance),
        },
      };
    }

    return {
      hasSufficientBalance: false,
      availableAmount: 0,
      needsConversion: false,
    };
  }

  const availableAmount = parseFloat(targetToken.balance);
  const hasSufficientBalance = availableAmount >= requiredAmount;

  return {
    hasSufficientBalance,
    availableAmount,
    needsConversion: false,
  };
}

/**
 * Gets the best token to use for a purchase based on available balances
 */
export function getBestTokenForPurchase(
  availableTokens: TokenBalanceInfo[],
  requiredAmount: number
): {
  token: TokenBalanceInfo;
  needsConversion: boolean;
  conversionPath?: string[];
} {
  // First, check if user has enough USDT
  const usdtToken = availableTokens.find(t => t.token.symbol === "USDT" && t.hasBalance);
  if (usdtToken && parseFloat(usdtToken.balance) >= requiredAmount) {
    return {
      token: usdtToken,
      needsConversion: false,
    };
  }

  // Check other tokens that might have sufficient balance
  const tokensWithSufficientBalance = availableTokens.filter(
    t => t.hasBalance && parseFloat(t.balance) >= requiredAmount
  );

  if (tokensWithSufficientBalance.length > 0) {
    // Return the token with the highest balance
    const bestToken = tokensWithSufficientBalance.reduce((prev, current) => 
      parseFloat(prev.balance) > parseFloat(current.balance) ? prev : current
    );

    return {
      token: bestToken,
      needsConversion: bestToken.token.symbol !== "USDT",
      conversionPath: bestToken.token.symbol !== "USDT" ? [bestToken.token.symbol, "USDT"] : undefined,
    };
  }

  // If no single token has enough balance, find the one with the highest balance for conversion
  const tokensWithBalance = availableTokens.filter(t => t.hasBalance);
  if (tokensWithBalance.length > 0) {
    const highestBalanceToken = tokensWithBalance.reduce((prev, current) => 
      parseFloat(prev.balance) > parseFloat(current.balance) ? prev : current
    );

    return {
      token: highestBalanceToken,
      needsConversion: true,
      conversionPath: [highestBalanceToken.token.symbol, "USDT"],
    };
  }

  // No tokens available
  throw new Error("No stable tokens found in wallet");
}
