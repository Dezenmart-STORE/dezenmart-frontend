import { Token, CurrencyAmount, Percent } from "@uniswap/sdk-core";
import { Pool, Route, Trade } from "@uniswap/v3-sdk";
import { FeeAmount } from "./config/uniswap.config";
import { STABLE_TOKENS, getTokenAddress } from "./config/web3.config";

// Create a Token instance from our StableToken config
export function createTokenInstance(
  tokenSymbol: string,
  chainId: number
): Token | null {
  const tokenConfig = STABLE_TOKENS.find((t) => t.symbol === tokenSymbol);
  if (!tokenConfig) return null;

  const address = getTokenAddress(tokenConfig, chainId);
  if (!address) return null;

  return new Token(
    chainId,
    address,
    tokenConfig.decimals,
    tokenConfig.symbol,
    tokenConfig.name
  );
}

// Parse percent from basis points
export function parseSlippagePercent(slippageBps: number): Percent {
  return new Percent(slippageBps, 10000);
}

// Format price impact as percentage string
export function formatPriceImpact(priceImpact: Percent): string {
  return `${priceImpact.multiply(100).toFixed(2)}%`;
}

// Check if price impact is too high
export function isPriceImpactHigh(priceImpact: Percent): boolean {
  const threshold = new Percent(5, 100); // 5%
  return priceImpact.greaterThan(threshold);
}

// Check if price impact is severe
export function isPriceImpactSevere(priceImpact: Percent): boolean {
  const threshold = new Percent(15, 100); // 15%
  return priceImpact.greaterThan(threshold);
}

// Get readable route path
export function getRoutePath(tokens: Token[]): string[] {
  return tokens.map((token) => token.symbol || token.address);
}

//Extract route path from Uniswap route object
export function extractRouteTokens(route: any): Token[] {
  const tokens: Token[] = [];

  try {
    if ("tokenPath" in route && Array.isArray(route.tokenPath)) {
      route.tokenPath.forEach((token: any) => {
        if (token && "address" in token) {
          tokens.push(token);
        }
      });
    }
  } catch (error) {
    console.warn("Error extracting route tokens:", error);
  }

  return tokens;
}

// Calculate minimum amount out with slippage
export function calculateMinAmountOut(
  amountOut: CurrencyAmount<Token>,
  slippageTolerance: Percent
): CurrencyAmount<Token> {
  const slippageAdjustment = new Percent(1).subtract(slippageTolerance);
  return CurrencyAmount.fromRawAmount(
    amountOut.currency,
    amountOut.multiply(slippageAdjustment).quotient
  );
}

// Format currency amount for display
export function formatCurrencyAmount(
  amount: CurrencyAmount<Token>,
  significantDigits: number = 6
): string {
  return amount.toSignificant(significantDigits);
}

//Get all possible fee tiers for pool discovery
export function getAllFeeTiers(): FeeAmount[] {
  return [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];
}

//Estimate gas cost in native token
export function estimateGasCost(
  gasLimit: bigint,
  gasPrice: bigint,
  decimals: number = 18
): string {
  const cost = gasLimit * gasPrice;
  return (Number(cost) / Math.pow(10, decimals)).toFixed(6);
}

//Check if tokens are equivalent
export function tokensEqual(tokenA: Token, tokenB: Token): boolean {
  return (
    tokenA.chainId === tokenB.chainId &&
    tokenA.address.toLowerCase() === tokenB.address.toLowerCase()
  );
}

//Sort tokens by address (required for pool lookups)
export function sortTokens(tokenA: Token, tokenB: Token): [Token, Token] {
  return tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
}

//Validate swap parameters
export interface SwapValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateSwapParams(
  inputToken: Token | null,
  outputToken: Token | null,
  amount: string
): SwapValidationResult {
  if (!inputToken || !outputToken) {
    return { isValid: false, error: "Invalid tokens" };
  }

  if (tokensEqual(inputToken, outputToken)) {
    return { isValid: false, error: "Cannot swap same token" };
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { isValid: false, error: "Invalid amount" };
  }

  return { isValid: true };
}

//Format transaction hash for display
export function formatTxHash(hash: string, length: number = 10): string {
  if (hash.length < length * 2) return hash;
  return `${hash.substring(0, length)}...${hash.substring(
    hash.length - length
  )}`;
}

//Calculate price from amounts
export function calculatePrice(
  amountIn: CurrencyAmount<Token>,
  amountOut: CurrencyAmount<Token>
): string {
  const price =
    parseFloat(amountOut.toExact()) / parseFloat(amountIn.toExact());
  return price.toFixed(6);
}

//Get execution price from trade
export function getExecutionPrice(trade: Trade<Token, Token, any>): string {
  return trade.executionPrice.toSignificant(6);
}

//Check if quote is stale
export function isQuoteStale(
  timestamp: number,
  maxAgeMs: number = 15000
): boolean {
  return Date.now() - timestamp > maxAgeMs;
}

//get currency symbol
export function getCurrencySymbol(currency: any): string {
  if (!currency) return "Unknown";

  if (currency.symbol) {
    return currency.symbol;
  }

  if ("address" in currency && currency.address) {
    return `${currency.address.substring(0, 6)}...${currency.address.substring(
      38
    )}`;
  }

  return "Unknown";
}

// Check if a currency has an address (is a token)
export function hasAddress(currency: any): boolean {
  return (
    currency && "address" in currency && typeof currency.address === "string"
  );
}

// extract address from currency
export function extractAddress(currency: any): string | null {
  if (hasAddress(currency)) {
    return currency.address;
  }
  return null;
}
