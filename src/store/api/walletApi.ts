import { baseApi } from "./baseApi";

// ── Types (mirror the backend wallet spec) ─────────────────────────────────
export interface WalletStatus {
  hasWallet: boolean;
  walletAddress: string | null;
  chainId?: number;
  provider?: string;
  walletPinSet: boolean;
  securityQuestionSet: boolean;
  securityQuestion?: string;
  /** ISO timestamp while PIN entry is locked after too many attempts, else null. */
  pinLockedUntil?: string | null;
}

export interface SetupWalletParams {
  walletAddress: string;
  chainId: number;
  provider: string;
  dynamicUserId?: string;
}

export interface SetPinParams {
  pin: string;
  securityQuestion: string;
  securityAnswer: string;
}

export interface VerifyPinResult {
  txAuthToken: string;
  expiresIn: number;
}

export interface RequestOtpResult {
  otpSent: boolean;
  maskedEmail: string;
  expiresIn: number;
}

export interface CosignParams {
  txAuthToken: string;
  chainId: number;
  // The unsigned user operation (4337) or raw tx, passed straight through.
  userOp: Record<string, unknown>;
}

export interface CosignResult {
  cosignature: string;
  userOpHash?: string;
}

// The backend wraps everything as { status, data }.
const unwrap = <T,>(res: unknown): T => (res as { data?: T })?.data as T;

export const walletApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWalletStatus: builder.query<WalletStatus, void>({
      query: () => "/wallet/status",
      transformResponse: (res) => unwrap<WalletStatus>(res),
      providesTags: ["Wallet"],
    }),

    setupWallet: builder.mutation<WalletStatus, SetupWalletParams>({
      query: (body) => ({ url: "/wallet/setup", method: "POST", body }),
      transformResponse: (res) => unwrap<WalletStatus>(res),
      invalidatesTags: ["Wallet"],
    }),

    setWalletPin: builder.mutation<
      { walletPinSet: boolean; securityQuestionSet: boolean },
      SetPinParams
    >({
      query: (body) => ({ url: "/wallet/pin/set", method: "POST", body }),
      transformResponse: (res) =>
        unwrap<{ walletPinSet: boolean; securityQuestionSet: boolean }>(res),
      invalidatesTags: ["Wallet"],
    }),

    // Verify the PIN right before a transaction; returns a short-lived grant.
    // Not cached - each call must hit the backend (rate-limited server-side).
    verifyWalletPin: builder.mutation<VerifyPinResult, { pin: string }>({
      query: (body) => ({ url: "/wallet/pin/verify", method: "POST", body }),
      transformResponse: (res) => unwrap<VerifyPinResult>(res),
    }),

    requestPinResetOtp: builder.mutation<RequestOtpResult, { securityAnswer: string }>({
      query: (body) => ({
        url: "/wallet/pin/reset/request-otp",
        method: "POST",
        body,
      }),
      transformResponse: (res) => unwrap<RequestOtpResult>(res),
    }),

    confirmPinReset: builder.mutation<
      { walletPinSet: boolean },
      { otp: string; newPin: string }
    >({
      query: (body) => ({ url: "/wallet/pin/reset/confirm", method: "POST", body }),
      transformResponse: (res) => unwrap<{ walletPinSet: boolean }>(res),
      invalidatesTags: ["Wallet"],
    }),

    cosignTransaction: builder.mutation<CosignResult, CosignParams>({
      query: (body) => ({ url: "/wallet/cosign", method: "POST", body }),
      transformResponse: (res) => unwrap<CosignResult>(res),
    }),
  }),
});

export const {
  useGetWalletStatusQuery,
  useLazyGetWalletStatusQuery,
  useSetupWalletMutation,
  useSetWalletPinMutation,
  useVerifyWalletPinMutation,
  useRequestPinResetOtpMutation,
  useConfirmPinResetMutation,
  useCosignTransactionMutation,
} = walletApi;
