// src/config/paymentProviders.ts
//
// Public, client-safe keys for fiat payment providers. All three are
// "publishable"/"public" keys — safe to ship in the client bundle, same as
// VITE_THIRDWEB_CLIENT_ID or VITE_QUIDAX_PUBLIC_KEY elsewhere in this repo.
// Never put a secret/private key behind a VITE_ variable — those belong on
// the backend only.
//
// Add to .env.local / .env.example:
//
//   VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxxxxxxxxxxxxx-X
//   VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//
// Until a key is set, that provider's checkout falls back to the in-app
// mock/simulate screen so the flow still works end-to-end in dev.
//
// FLUTTERWAVE V3 vs V4 — READ BEFORE FILLING THIS IN:
// The `flutterwave-react-v3` package (and VITE_FLUTTERWAVE_PUBLIC_KEY below)
// is for Flutterwave's v3 API, which issues a client-safe Public Key
// (format "FLWPUBK_TEST-...-X") specifically for browser popups. Newer
// Flutterwave accounts are onboarded onto v4, whose dashboard only shows a
// Client ID / Client Secret / Encryption Key — an OAuth2 client-credentials
// setup where the secret must NEVER reach the browser. There is no safe
// client-only popup for v4; its checkout still needs a backend to exchange
// client_id + client_secret for a token before creating the session. If
// your dashboard only offers v4 credentials, leave this unset — Flutterwave
// will stay on the demo/simulate screen (same as Stripe) until the backend
// can do that exchange server-side.

import type { FiatProvider } from "../services/fiatPaymentService";

export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as
  | string
  | undefined;
export const FLUTTERWAVE_PUBLIC_KEY = import.meta.env
  .VITE_FLUTTERWAVE_PUBLIC_KEY as string | undefined;
export const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY as
  | string
  | undefined;

/**
 * Whether a real, live checkout popup can be used for this provider.
 * Stripe is intentionally never "live" here — its standard integration
 * requires a backend-created Checkout Session/PaymentIntent, so faking a
 * client-only Stripe popup would just teach the wrong pattern. It stays on
 * the mock screen until the backend endpoint exists.
 */
export function isProviderLive(provider: FiatProvider): boolean {
  switch (provider) {
    case "paystack":
      return !!PAYSTACK_PUBLIC_KEY;
    case "flutterwave":
      return !!FLUTTERWAVE_PUBLIC_KEY;
    case "stripe":
      return false;
  }
}
