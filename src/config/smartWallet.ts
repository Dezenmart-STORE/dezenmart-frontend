// Smart (embedded) wallet configuration.
//
// The whole feature is gated on VITE_DYNAMIC_ENV_ID. When it is absent the app
// behaves exactly as before: no embedded wallet, no onboarding, external wallet
// connection only. The Dynamic SDK is also lazy-loaded (see SmartWalletProvider)
// so its code isn't even downloaded until the env id is set.

/** Dynamic environment id (public value, safe in the client bundle). */
export const DYNAMIC_ENV_ID = (import.meta.env.VITE_DYNAMIC_ENV_ID as string | undefined)?.trim() || "";

/** Master switch for the embedded-wallet feature. */
export const SMART_WALLET_ENABLED = !!DYNAMIC_ENV_ID;

/** PIN constraints - keep in sync with the backend validation. */
export const PIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/** A short list of security questions offered during wallet setup. */
export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What city were you born in?",
  "What was the name of your first school?",
  "What is your favourite food?",
] as const;
