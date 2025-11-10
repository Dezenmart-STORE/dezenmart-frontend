/**
 * Swap Error Handler
 * Converts technical swap errors into user-friendly messages
 */

export interface SwapErrorInfo {
  title: string;
  message: string;
  suggestion?: string;
  recoverable: boolean;
}

export class SwapError extends Error {
  public readonly title: string;
  public readonly suggestion?: string;
  public readonly recoverable: boolean;
  public readonly originalError?: Error;

  constructor(
    message: string,
    title: string = "Swap Failed",
    suggestion?: string,
    recoverable: boolean = true,
    originalError?: Error
  ) {
    super(message);
    this.name = "SwapError";
    this.title = title;
    this.suggestion = suggestion;
    this.recoverable = recoverable;
    this.originalError = originalError;
  }

  toErrorInfo(): SwapErrorInfo {
    return {
      title: this.title,
      message: this.message,
      suggestion: this.suggestion,
      recoverable: this.recoverable,
    };
  }
}

/**
 * Parse raw error and convert to user-friendly SwapError
 */
export function parseSwapError(error: unknown, context?: string): SwapError {
  const errorStr = String(error).toLowerCase();
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Insufficient funds errors
  if (
    errorStr.includes("insufficient") &&
    (errorStr.includes("funds") || errorStr.includes("balance"))
  ) {
    return new SwapError(
      "You don't have enough tokens to complete this swap.",
      "Insufficient Funds",
      "Please check your balance and try a smaller amount.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // Insufficient gas errors
  if (errorStr.includes("gas") && errorStr.includes("insufficient")) {
    return new SwapError(
      "You don't have enough CELO to pay for transaction fees.",
      "Insufficient Gas",
      "Please add CELO to your wallet to cover gas fees.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // User rejected transaction
  if (
    errorStr.includes("user rejected") ||
    errorStr.includes("user denied") ||
    errorStr.includes("user cancelled")
  ) {
    return new SwapError(
      "Transaction was cancelled.",
      "Transaction Cancelled",
      undefined,
      true,
      error instanceof Error ? error : undefined
    );
  }

  // Slippage tolerance exceeded
  if (
    errorStr.includes("slippage") ||
    errorStr.includes("price movement") ||
    errorStr.includes("too old")
  ) {
    return new SwapError(
      "Price changed too much during the swap.",
      "Price Changed",
      "Please try again with a higher slippage tolerance or wait a moment.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // Liquidity errors
  if (
    errorStr.includes("liquidity") ||
    errorStr.includes("insufficient reserves")
  ) {
    return new SwapError(
      "Not enough liquidity available for this swap.",
      "Insufficient Liquidity",
      "Try a smaller amount or use a different token pair.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // Token approval errors
  if (errorStr.includes("allowance") || errorStr.includes("approval")) {
    return new SwapError(
      "Token approval is required before swapping.",
      "Approval Required",
      "Please approve the token and try again.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // Network errors
  if (
    errorStr.includes("network") ||
    errorStr.includes("connection") ||
    errorStr.includes("timeout")
  ) {
    return new SwapError(
      "Network connection issue occurred.",
      "Network Error",
      "Please check your internet connection and try again.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // RPC errors
  if (errorStr.includes("rpc") || errorStr.includes("provider")) {
    return new SwapError(
      "Unable to connect to the blockchain network.",
      "Connection Error",
      "Please try again in a moment.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // Wrong network
  if (
    errorStr.includes("wrong network") ||
    errorStr.includes("unsupported chain")
  ) {
    return new SwapError(
      "You're connected to the wrong network.",
      "Wrong Network",
      "Please switch to Celo network in your wallet.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // Transaction failed
  if (
    errorStr.includes("transaction failed") ||
    errorStr.includes("reverted")
  ) {
    return new SwapError(
      "The transaction failed during execution.",
      "Transaction Failed",
      "Please try again. If the problem persists, try a different amount.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // Deadline exceeded
  if (errorStr.includes("deadline") || errorStr.includes("expired")) {
    return new SwapError(
      "The transaction took too long to process.",
      "Transaction Expired",
      "Please try again.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // Quote fetch errors
  if (context === "quote") {
    return new SwapError(
      "Unable to get swap quote at this time.",
      "Quote Unavailable",
      "Please wait a moment and try again.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // Protocol unavailable
  if (errorStr.includes("not ready") || errorStr.includes("unavailable")) {
    return new SwapError(
      "Swap service is temporarily unavailable.",
      "Service Unavailable",
      "Please try again in a few moments.",
      true,
      error instanceof Error ? error : undefined
    );
  }

  // Generic fallback
  return new SwapError(
    errorMessage || "An unexpected error occurred during the swap.",
    "Swap Error",
    "Please try again. If the problem persists, contact support.",
    true,
    error instanceof Error ? error : undefined
  );
}

/**
 * Format error for display to user
 */
export function formatSwapError(error: unknown, context?: string): string {
  const swapError = parseSwapError(error, context);

  if (swapError.suggestion) {
    return `${swapError.message} ${swapError.suggestion}`;
  }

  return swapError.message;
}

/**
 * Log error with context for debugging
 */
export function logSwapError(
  error: unknown,
  context: string,
  additionalInfo?: Record<string, any>
): void {
  const swapError = parseSwapError(error, context);

  console.error(`[Swap Error - ${context}]`, {
    title: swapError.title,
    message: swapError.message,
    suggestion: swapError.suggestion,
    recoverable: swapError.recoverable,
    originalError: swapError.originalError,
    ...additionalInfo,
  });
}
