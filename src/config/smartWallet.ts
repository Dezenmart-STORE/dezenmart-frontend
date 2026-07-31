// Smart (embedded) wallet configuration.
//
// The whole feature is gated on VITE_DYNAMIC_ENV_ID. When it is absent the app
// behaves exactly as before: no embedded wallet, external wallet connection
// only. The Dynamic SDK is also lazy-loaded (see SmartWalletProvider) so its
// code isn't even downloaded until the env id is set.
//
// Wallet security & recovery are handled by Dynamic's embedded-wallet passcode
// ("Require passcode" in the dashboard) - self-custodial, prompted on new
// device/session. So there is no custom PIN/OTP/co-signer here.

/** Dynamic environment id (public value, safe in the client bundle). */
export const DYNAMIC_ENV_ID = (import.meta.env.VITE_DYNAMIC_ENV_ID as string | undefined)?.trim() || "";

/** Master switch for the embedded-wallet feature. */
export const SMART_WALLET_ENABLED = !!DYNAMIC_ENV_ID;
