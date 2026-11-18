/**
 * Release switches, read once at build time.
 *
 * Bank transfer (naira via Pandascrow) stays off until the legal pages are
 * revised, the backend questions are answered and a sandbox order has been
 * seen end to end. Off unless the env var is exactly "true", so a missing or
 * mistyped value can never switch it on by accident.
 */
export const BANK_TRANSFER_ENABLED = import.meta.env.VITE_ENABLE_BANK_TRANSFER === "true";
