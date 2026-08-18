import { useCallback, useReducer } from "react";
import {
  initializeFiatPayment,
  verifyFiatPayment,
  type FiatProvider,
  type FiatPaymentParams,
} from "../services/fiatPaymentService";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
export type FiatPaymentStep =
  | "idle" // provider + email form
  | "initializing" // creating the payment session
  | "awaiting-checkout" // provider popup/redirect open, waiting on the user
  | "verifying" // confirming payment with the provider
  | "success"
  | "error";

interface FiatPaymentState {
  step: FiatPaymentStep;
  message: string;
  error: string | null;
  reference: string | null;
  checkoutUrl: string | null;
  provider: FiatProvider | null;
}

type Action =
  | { type: "SET_STEP"; step: FiatPaymentStep; message: string }
  | {
      type: "SESSION_CREATED";
      reference: string;
      checkoutUrl: string;
      provider: FiatProvider;
    }
  | { type: "SUCCESS"; reference: string }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

const initialState: FiatPaymentState = {
  step: "idle",
  message: "",
  error: null,
  reference: null,
  checkoutUrl: null,
  provider: null,
};

function reducer(state: FiatPaymentState, action: Action): FiatPaymentState {
  switch (action.type) {
    case "SET_STEP":
      return {
        ...state,
        step: action.step,
        message: action.message,
        error: null,
      };
    case "SESSION_CREATED":
      return {
        ...state,
        reference: action.reference,
        checkoutUrl: action.checkoutUrl,
        provider: action.provider,
      };
    case "SUCCESS":
      return {
        ...state,
        step: "success",
        message: "Payment successful!",
        reference: action.reference,
        error: null,
      };
    case "ERROR":
      return {
        ...state,
        step: "error",
        error: action.error,
        message: action.error,
      };
    case "RESET":
      return initialState;
  }
}

function labelFor(provider: FiatProvider) {
  return { paystack: "Paystack", flutterwave: "Flutterwave", stripe: "Stripe" }[
    provider
  ];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Orchestrates the fiat payment flow as a state machine:
 *
 *   idle -> initializing -> awaiting-checkout -> verifying -> success
 *                                                       ↘ error
 *
 * Mirrors usePayment's shape/conventions so both flows feel consistent to
 * work with from components.
 */
export function useFiatPayment() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const startFiatPayment = useCallback(async (params: FiatPaymentParams) => {
    dispatch({
      type: "SET_STEP",
      step: "initializing",
      message: `Connecting to ${labelFor(params.provider)}...`,
    });

    const initResult = await initializeFiatPayment(params);
    if (!initResult.ok || !initResult.data) {
      dispatch({
        type: "ERROR",
        error: initResult.error ?? "Could not start payment. Please try again.",
      });
      return;
    }

    const { reference, authorizationUrl, provider } = initResult.data;
    dispatch({
      type: "SESSION_CREATED",
      reference,
      checkoutUrl: authorizationUrl,
      provider,
    });
    dispatch({
      type: "SET_STEP",
      step: "awaiting-checkout",
      message: `Complete your payment with ${labelFor(provider)}.`,
    });
  }, []);

  const confirmPayment = useCallback(
    async (simulateOutcome: "success" | "failed" = "success") => {
      if (!state.reference || !state.provider) return;

      dispatch({
        type: "SET_STEP",
        step: "verifying",
        message: "Verifying your payment...",
      });

      const verifyResult = await verifyFiatPayment(
        state.reference,
        state.provider,
        simulateOutcome,
      );
      if (!verifyResult.ok || !verifyResult.data) {
        dispatch({
          type: "ERROR",
          error: verifyResult.error ?? "Could not verify payment.",
        });
        return;
      }

      if (verifyResult.data.status === "success") {
        dispatch({ type: "SUCCESS", reference: state.reference });
      } else if (verifyResult.data.status === "pending") {
        dispatch({
          type: "SET_STEP",
          step: "awaiting-checkout",
          message: "Payment still pending. Complete it, then check again.",
        });
      } else {
        dispatch({
          type: "ERROR",
          error: "Payment was not successful. Please try again.",
        });
      }
    },
    [state.reference, state.provider],
  );

  return {
    state,
    startFiatPayment,
    confirmPayment,
    reset,
    isActive:
      state.step !== "idle" &&
      state.step !== "success" &&
      state.step !== "error",
  };
}
