export interface SwapError {
  code: string;
  message: string;
  details?: string;
  recoverable: boolean;
  userAction?: string;
}

export const parseSwapError = (error: any): SwapError => {
  const message = error?.message || error?.toString() || "";

  // Network errors
  if (message.includes("network") || message.includes("connection")) {
    return {
      code: "NETWORK_ERROR",
      message: "Network connection issue",
      details: "Please check your internet connection and try again.",
      recoverable: true,
      userAction: "retry",
    };
  }

  // Insufficient balance
  if (message.includes("insufficient") && message.includes("balance")) {
    return {
      code: "INSUFFICIENT_BALANCE",
      message: "Insufficient token balance",
      details: "You don't have enough tokens to complete this swap.",
      recoverable: false,
      userAction: "add_funds",
    };
  }

  // Allowance issues
  if (
    message.includes("allowance") ||
    message.includes("transferFrom failed")
  ) {
    return {
      code: "ALLOWANCE_ERROR",
      message: "Token approval required",
      details: "Please approve the token spend and try again.",
      recoverable: true,
      userAction: "approve",
    };
  }

  // Slippage exceeded
  if (message.includes("slippage") || message.includes("price")) {
    return {
      code: "SLIPPAGE_EXCEEDED",
      message: "Price moved beyond acceptable range",
      details:
        "Market conditions changed. Please try again or increase slippage tolerance.",
      recoverable: true,
      userAction: "retry_or_adjust_slippage",
    };
  }

  // Pair not available
  if (message.includes("pair") || message.includes("route")) {
    return {
      code: "PAIR_NOT_AVAILABLE",
      message: "Trading pair not available",
      details:
        "This token pair cannot be swapped directly. Try routing through CELO.",
      recoverable: true,
      userAction: "use_different_route",
    };
  }

  // User rejection
  if (message.includes("rejected") || message.includes("denied")) {
    return {
      code: "USER_REJECTED",
      message: "Transaction cancelled",
      details: "You cancelled the transaction.",
      recoverable: true,
      userAction: "retry",
    };
  }

  // Gas estimation failed
  if (message.includes("gas") || message.includes("UNPREDICTABLE_GAS_LIMIT")) {
    return {
      code: "GAS_ESTIMATION_FAILED",
      message: "Cannot estimate transaction cost",
      details:
        "Unable to calculate gas fees. Please check your balance and try again.",
      recoverable: true,
      userAction: "check_balance_and_retry",
    };
  }

  // Default error
  return {
    code: "UNKNOWN_ERROR",
    message: "Swap failed",
    details: message || "An unexpected error occurred.",
    recoverable: true,
    userAction: "retry",
  };
};

export const getErrorActionText = (userAction?: string): string => {
  switch (userAction) {
    case "retry":
      return "Try Again";
    case "approve":
      return "Approve Tokens";
    case "add_funds":
      return "Add Funds";
    case "retry_or_adjust_slippage":
      return "Adjust Slippage";
    case "use_different_route":
      return "Change Route";
    case "check_balance_and_retry":
      return "Check Balance";
    default:
      return "Try Again";
  }
};
