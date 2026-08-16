// src/services/fiatPaymentService.ts
//
// STUBBED fiat payment service. No backend endpoints exist yet — every
// function below is a mock that simulates network latency and returns
// realistic-looking responses so the frontend flow can be built and tested
// end-to-end. The public function signatures are designed so the calling
// code (useFiatPayment) does NOT need to change when the backend lands —
// only the internals of these two functions do.
//
// ─── Wiring up the real backend later ───────────────────────────────────
//
// 1. initializeFiatPayment should become:
//
//      import { fetchWithAuth } from "./apiService";
//
//      export async function initializeFiatPayment(params: FiatPaymentParams) {
//        const result = await fetchWithAuth("/payments/fiat/initialize", {
//          method: "POST",
//          headers: { "Content-Type": "application/json" },
//          body: JSON.stringify(params),
//        });
//        return {
//          ok: result.ok,
//          error: result.error,
//          data: result.ok ? (result.data as FiatPaymentSession) : null,
//        };
//      }
//
//    The backend creates the transaction server-side with the provider's
//    secret key (Paystack/Flutterwave/Stripe SDK) and returns
//    { reference, authorizationUrl, provider }.
//
// 2. verifyFiatPayment should become:
//
//      export async function verifyFiatPayment(reference: string, provider: FiatProvider) {
//        const result = await fetchWithAuth(
//          `/payments/fiat/verify/${reference}?provider=${provider}`
//        );
//        return {
//          ok: result.ok,
//          error: result.error,
//          data: result.ok ? (result.data as FiatVerificationResult) : null,
//        };
//      }
//
//    The backend MUST call the provider's own verify-transaction endpoint
//    (never trust amount/status posted from the client) and update the
//    order's status there.
//
// 3. Once real `authorizationUrl`s come back, FiatPaymentFlow's mock
//    "provider popup" should be replaced with an actual redirect/new tab:
//    `window.location.href = checkoutUrl` (redirect flow) or
//    `window.open(checkoutUrl, "_blank")` (popup flow), and confirmPayment()
//    should be triggered either by polling verify, or when the user returns
//    to the tab (visibilitychange) / hits your configured callback route.

export type FiatProvider = "paystack" | "flutterwave" | "stripe";

export interface FiatPaymentParams {
  orderId: string;
  /** Amount in the fiat currency (e.g. 1738.46) */
  amount: number;
  /** e.g. "NGN", "USD" */
  currency: string;
  email: string;
  provider: FiatProvider;
  metadata?: Record<string, unknown>;
}

export interface FiatPaymentSession {
  /** Provider transaction reference */
  reference: string;
  /** Hosted checkout URL to redirect the user to (mocked for now) */
  authorizationUrl: string;
  provider: FiatProvider;
}

export type FiatVerificationStatus = "success" | "failed" | "pending";

export interface FiatVerificationResult {
  status: FiatVerificationStatus;
  reference: string;
  amount?: number;
  currency?: string;
}

interface ServiceResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

const SIMULATED_LATENCY_MS = 900;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateMockReference(provider: FiatProvider) {
  const prefix = { paystack: "PSK", flutterwave: "FLW", stripe: "STR" }[
    provider
  ];
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export const FIAT_PROVIDERS: {
  id: FiatProvider;
  label: string;
  blurb: string;
}[] = [
  { id: "paystack", label: "Paystack", blurb: "Card, bank transfer, USSD" },
  {
    id: "flutterwave",
    label: "Flutterwave",
    blurb: "Card, bank, mobile money",
  },
  { id: "stripe", label: "Stripe", blurb: "International cards" },
];

/**
 * Initializes a fiat payment session with the chosen provider.
 * MOCKED — see file header for how to wire up the real backend call.
 */
export async function initializeFiatPayment(
  params: FiatPaymentParams,
): Promise<ServiceResult<FiatPaymentSession>> {
  await delay(SIMULATED_LATENCY_MS);

  if (!params.email || !/\S+@\S+\.\S+/.test(params.email)) {
    return {
      ok: false,
      data: null,
      error: "A valid email is required to continue.",
    };
  }
  if (!params.amount || params.amount <= 0) {
    return { ok: false, data: null, error: "Invalid payment amount." };
  }

  const reference = generateMockReference(params.provider);

  // In production this comes from the provider's API response. For now it
  // just carries enough info for the mock checkout UI to render itself.
  const authorizationUrl = `mock://checkout?provider=${params.provider}&reference=${reference}`;

  return {
    ok: true,
    error: null,
    data: { reference, authorizationUrl, provider: params.provider },
  };
}

/**
 * Verifies a fiat payment after the user completes (or simulates) checkout.
 * MOCKED — see file header for how to wire up the real backend call.
 */
export async function verifyFiatPayment(
  reference: string,
  _provider: FiatProvider,
  /** Only used by the mock UI to let the developer simulate failure */
  simulateOutcome: "success" | "failed" = "success",
): Promise<ServiceResult<FiatVerificationResult>> {
  await delay(SIMULATED_LATENCY_MS);

  return {
    ok: true,
    error: null,
    data: { status: simulateOutcome, reference },
  };
}
