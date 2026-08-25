import { useEffect, useRef, useState } from "react";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";
import { useFiatPayment } from "../../hooks/useFiatPayment";
import {
  FIAT_PROVIDERS,
  type FiatProvider,
} from "../../services/fiatPaymentService";
import { launchPaystackCheckout } from "../../services/liveFiatProviders";
import {
  isProviderLive,
  PAYSTACK_PUBLIC_KEY,
  FLUTTERWAVE_PUBLIC_KEY,
} from "../../config/paymentProviders";

interface Props {
  orderId: string;
  /** Amount already converted to the fiat currency below */
  amount: number;
  /** e.g. "NGN" */
  currency: string;
  defaultEmail?: string;
  onSuccess?: (reference: string, provider: FiatProvider) => void;
  onClose?: () => void;
  productName?: string;
  productImage?: string;
}

const PROVIDER_STYLE: Record<
  FiatProvider,
  { bg: string; text: string; initial: string }
> = {
  paystack: { bg: "bg-[#00C3F7]/15", text: "text-[#00C3F7]", initial: "P" },
  flutterwave: { bg: "bg-[#F5A623]/15", text: "text-[#F5A623]", initial: "F" },
  stripe: { bg: "bg-[#635BFF]/15", text: "text-[#8b85ff]", initial: "S" },
};

function formatFiat(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Fiat checkout flow — provider selection, email capture, then:
 *   - Paystack / Flutterwave: a REAL checkout popup, when their public key
 *     env vars are set (client-side checkout doesn't need a backend to open;
 *     it needs one to verify — see confirmPayment/useFiatPayment).
 *   - Stripe, or any provider whose key isn't set yet: a mock "provider
 *     popup" screen with Simulate Success/Fail buttons, so the flow is still
 *     fully testable before keys/backend exist.
 */
export default function FiatPaymentFlow({
  orderId,
  amount,
  currency,
  defaultEmail,
  onSuccess,
  onClose,
  productName,
  productImage,
}: Props) {
  const { state, startFiatPayment, confirmPayment, reset } = useFiatPayment();
  const [provider, setProvider] = useState<FiatProvider | null>(null);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [emailError, setEmailError] = useState("");

  // Flutterwave is hook-based - config is rebuilt each render with whatever
  // we currently know; the popup only actually opens when we explicitly
  // call handleFlutterPayment() below.
  const flutterwaveConfig = {
    public_key: FLUTTERWAVE_PUBLIC_KEY ?? "",
    tx_ref: state.reference ?? `pending-${orderId}`,
    amount,
    currency,
    payment_options: "card,mobilemoney,ussd",
    customer: {
      email: email || defaultEmail || "",
      // Flutterwave's config type requires these, but the popup itself lets
      // the buyer fill in/confirm their own name and phone - safe to leave
      // generic here.
      phone_number: "",
      name: productName ?? "DezenMart buyer",
    },
    customizations: {
      title: "DezenMart",
      description: productName ?? "Order payment",
      logo: "/logo192.png", // adjust to your actual logo path in /public
    },
  };
  const handleFlutterPayment = useFlutterwave(flutterwaveConfig);

  // Guards against re-launching the popup on every re-render once we've
  // already opened it for the current reference.
  const launchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      state.step !== "awaiting-checkout" ||
      !state.provider ||
      !state.reference
    )
      return;
    if (!isProviderLive(state.provider)) return;
    if (launchedRef.current === state.reference) return;
    launchedRef.current = state.reference;

    if (state.provider === "paystack" && PAYSTACK_PUBLIC_KEY) {
      launchPaystackCheckout({
        publicKey: PAYSTACK_PUBLIC_KEY,
        email,
        amount,
        currency,
        reference: state.reference,
      }).then((result) => {
        if (result.status === "success") {
          confirmPayment("success");
        } else {
          reset(); // user closed the popup - let them pick a method again
        }
      });
    }

    if (state.provider === "flutterwave" && FLUTTERWAVE_PUBLIC_KEY) {
      handleFlutterPayment({
        callback: (response: { status: string }) => {
          closePaymentModal();
          if (
            response.status === "successful" ||
            response.status === "completed"
          ) {
            confirmPayment("success");
          } else {
            confirmPayment("failed");
          }
        },
        onClose: () => {
          reset();
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step, state.provider, state.reference]);

  const handleContinue = () => {
    if (!provider) return;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Enter a valid email to continue.");
      return;
    }
    setEmailError("");
    startFiatPayment({ orderId, amount, currency, email, provider });
  };

  // ── idle: provider + email form ──────────────────────────────────
  if (state.step === "idle") {
    return (
      <div className="space-y-4">
        {/* Product summary */}
        <div className="flex items-center gap-3 rounded-xl border border-[#292B30] bg-[#292B30] p-3">
          {productImage && (
            <img
              src={productImage}
              alt=""
              className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {productName ?? "Purchase"}
            </p>
            <p className="text-lg font-bold text-white">
              {formatFiat(amount, currency)}
            </p>
          </div>
        </div>

        {/* Provider selection */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Choose a payment provider
          </p>
          <div className="space-y-2">
            {FIAT_PROVIDERS.map((p) => {
              const style = PROVIDER_STYLE[p.id];
              const selected = provider === p.id;
              const live = isProviderLive(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    selected
                      ? "border-red-600 bg-[#292B30]"
                      : "border-[#292B30] bg-[#292B30] hover:border-[#373A3F]"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${style.bg}`}
                  >
                    <span className={`text-sm font-bold ${style.text}`}>
                      {style.initial}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {p.label}
                      </p>
                      {!live && (
                        <span className="rounded-full border border-[#373A3F] px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                          Demo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{p.blurb}</p>
                  </div>
                  <div
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      selected
                        ? "border-red-600 bg-red-600"
                        : "border-[#373A3F]"
                    }`}
                  >
                    {selected && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Email for receipt
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[#292B30] bg-[#1a1c20] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
          />
          {emailError && (
            <p className="mt-1.5 text-xs text-red-400">{emailError}</p>
          )}
        </div>

        <button
          onClick={handleContinue}
          disabled={!provider}
          className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {provider
            ? `Continue to ${FIAT_PROVIDERS.find((p) => p.id === provider)?.label}`
            : "Select a provider"}
        </button>
      </div>
    );
  }

  // ── initializing ───────────────────────────────────────────────
  if (state.step === "initializing") {
    return <LoadingState label={state.message} />;
  }

  // ── awaiting-checkout ──────────────────────────────────────────
  if (state.step === "awaiting-checkout" && state.provider) {
    const style = PROVIDER_STYLE[state.provider];
    const label =
      FIAT_PROVIDERS.find((p) => p.id === state.provider)?.label ??
      state.provider;
    const live = isProviderLive(state.provider);

    // Live provider: the real popup (Paystack/Flutterwave) is already open
    // via the effect above - just show a lightweight waiting state.
    if (live) {
      return (
        <div className="flex flex-col items-center py-10">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#292B30] border-t-red-600" />
          <p className="mt-4 text-sm text-gray-400">
            Waiting for you to complete payment in the {label} window…
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-6 rounded-xl border border-[#292B30] bg-[#292B30] px-6 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-[#373A3F]"
            >
              Cancel
            </button>
          )}
        </div>
      );
    }

    // Demo mode: no key configured (or Stripe, which always needs a backend
    // Checkout Session) - stand in with a simulate screen.
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#292B30] bg-[#1a1c20] p-5 text-center">
          <div
            className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${style.bg}`}
          >
            <span className={`text-lg font-bold ${style.text}`}>
              {style.initial}
            </span>
          </div>
          <h3 className="text-base font-semibold text-white">
            {label} Checkout (Demo)
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {formatFiat(amount, currency)}
          </p>

          <div className="mt-4 rounded-xl border border-dashed border-[#373A3F] bg-[#212428] p-4">
            <p className="text-xs text-gray-500">
              {state.provider === "stripe" ? (
                <>
                  Stripe's standard checkout needs a backend-created Checkout
                  Session, so this stands in for it until that endpoint exists.
                </>
              ) : (
                <>
                  Set{" "}
                  <code className="text-gray-400">
                    VITE_{state.provider.toUpperCase()}_PUBLIC_KEY
                  </code>{" "}
                  to open a real {label} popup here instead of this demo screen.
                </>
              )}
            </p>
          </div>

          <p className="mt-4 text-xs text-gray-600">
            Reference: {state.reference}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => confirmPayment("success")}
            className="flex-1 rounded-xl bg-green-700 py-3 text-sm font-bold text-white transition-colors hover:bg-green-600"
          >
            Simulate Successful Payment
          </button>
          <button
            onClick={() => confirmPayment("failed")}
            className="flex-1 rounded-xl border border-red-900/50 bg-red-900/20 py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-900/30"
          >
            Simulate Failure
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-[#292B30] bg-[#292B30] py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-[#373A3F]"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  // ── verifying ──────────────────────────────────────────────────
  if (state.step === "verifying") {
    return <LoadingState label={state.message} />;
  }

  // ── success ────────────────────────────────────────────────────
  if (state.step === "success") {
    return (
      <div className="flex flex-col items-center py-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-green-800/50 bg-green-900/40">
          <svg
            className="h-8 w-8 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white">Payment Successful!</h3>
        <p className="mt-2 text-sm text-gray-400">
          Your order has been confirmed.
        </p>

        <div className="mt-6 w-full space-y-2 rounded-xl border border-[#292B30] bg-[#292B30] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Amount</span>
            <span className="text-xs font-medium text-gray-300">
              {formatFiat(amount, currency)}
            </span>
          </div>
          {state.reference && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Reference</span>
              <span className="text-xs font-mono font-medium text-gray-300">
                {state.reference}
              </span>
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={() => {
              onSuccess?.(state.reference!, state.provider!);
              onClose();
            }}
            className="mt-6 w-full rounded-xl bg-[#292B30] py-3 text-sm font-bold text-white transition-colors hover:bg-[#373A3F]"
          >
            Done
          </button>
        )}
      </div>
    );
  }

  // ── error ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-800/50 bg-red-900/30">
        <svg
          className="h-8 w-8 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white">Payment Failed</h3>
      <p className="mt-2 max-w-xs text-center text-sm text-gray-400">
        {state.error}
      </p>

      <div className="mt-6 flex w-full gap-3">
        <button
          onClick={reset}
          className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700"
        >
          Try Again
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#292B30] bg-[#292B30] py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-[#373A3F]"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-10">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#292B30] border-t-red-600" />
      <p className="mt-4 text-sm text-gray-400">{label}</p>
    </div>
  );
}
