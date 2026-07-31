// Parse an RTK Query error from the wallet endpoints into a friendly message
// plus the extra fields the backend returns (attempts, lockout).
export interface WalletError {
  message: string;
  attemptsRemaining?: number;
  lockedUntil?: string;
}

export function parseWalletError(err: unknown, fallback = "Something went wrong. Please try again."): WalletError {
  const body = (err as { data?: { message?: string; data?: { attemptsRemaining?: number; lockedUntil?: string } } })?.data;
  return {
    message: body?.message || fallback,
    attemptsRemaining: body?.data?.attemptsRemaining,
    lockedUntil: body?.data?.lockedUntil,
  };
}
