/**
 * Kill switch for the card / bank (fiat) payment method.
 *
 * OFF BY DEFAULT, and that is deliberate. services/fiatPaymentService.ts is
 * still a stub: it never contacts Paystack, Flutterwave or Stripe, it invents a
 * reference and returns whatever outcome the caller asks for. The checkout step
 * renders a "Simulate Successful Payment" button.
 *
 * That button is wired to a REAL backend mutation - ViewOrderDetail's fiat
 * onSuccess calls updateOrderStatus({ status: "accepted", paymentMethod:
 * "fiat" }) and retries three times. So with the flow live in production, any
 * buyer could mark an order paid, with a fabricated reference, having
 * transferred nothing. Hence opt-in rather than opt-out: a missing or
 * misspelled env var has to fail closed.
 *
 * Set VITE_FIAT_PAYMENT=on locally to develop against the mock. Turn it on in
 * production only once initializeFiatPayment / verifyFiatPayment call the
 * backend, and verification happens server-side against the provider's own
 * verify endpoint (never trusting a status posted by the client).
 */
export const FIAT_PAYMENT_ENABLED =
  (import.meta.env.VITE_FIAT_PAYMENT as string | undefined)?.trim().toLowerCase() === "on";
