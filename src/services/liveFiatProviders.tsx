// src/services/liveFiatProviders.ts
//
// Thin wrapper around Paystack's client SDK for opening a real checkout
// popup. Flutterwave is hook-based (flutterwave-react-v3) so its wiring
// lives directly in FiatPaymentFlow.tsx instead of here — hooks can only be
// called from React components/hooks, not plain functions.
//
// SECURITY NOTE: a successful client-side callback here means the popup
// *reported* success — it is NOT proof of payment. Before connecting a real
// backend, wire FiatPaymentFlow's confirmPayment() to call your
// `/payments/fiat/verify` endpoint, which must re-verify the transaction
// server-side against the provider's API using your secret key. Never
// release goods/escrow based on the client callback alone — the same rule
// PaymentFlow already follows for on-chain purchaseId confirmation.

export interface LaunchPaystackParams {
  publicKey: string;
  email: string;
  /** Amount in the currency's major unit (e.g. 1738.46 for NGN) */
  amount: number;
  currency: string;
  reference: string;
}

export interface LaunchResult {
  status: "success" | "cancelled";
  reference: string;
  transactionId?: string | number;
}

export async function launchPaystackCheckout(
  params: LaunchPaystackParams,
): Promise<LaunchResult> {
  // Lazy-loaded so the SDK isn't downloaded until someone actually picks
  // Paystack — same pattern this repo already uses for the Dynamic SDK.
  const { default: PaystackPop } = await import("@paystack/inline-js");
  const paystack = new PaystackPop();

  return new Promise((resolve) => {
    paystack.newTransaction({
      key: params.publicKey,
      email: params.email,
      amount: Math.round(params.amount * 100), // Paystack expects kobo (or cents)
      currency: params.currency,
      ref: params.reference,
      onSuccess: (transaction: { reference: string; transaction?: string }) => {
        resolve({
          status: "success",
          reference: transaction.reference ?? params.reference,
          transactionId: transaction.transaction,
        });
      },
      onCancel: () => {
        resolve({ status: "cancelled", reference: params.reference });
      },
    });
  });
}
