export {};
declare module "*.svg" {
  import React from "react";
  export const ReactComponent: React.ElementType;
  const src: string;
  export default src;
}

declare global {
  interface GooglePromptNotification {
    isNotDisplayed?: () => boolean;
    isSkippedMoment?: () => boolean;
  }

  interface GoogleIdentity {
    initialize: (config: {
      client_id: string;
      callback: (resp: { credential?: string }) => void;
      auto_select?: boolean;
      cancel_on_tap_outside?: boolean;
    }) => void;
    prompt: (listener?: (notification: GooglePromptNotification) => void) => void;
    cancel?: () => void;
  }

  interface Window {
    /** Google Identity Services (One Tap), loaded on demand by useGoogleOneTap. */
    google?: { accounts?: { id?: GoogleIdentity } };
    /** Google Analytics gtag, present only when GA is configured. */
    gtag?: (...args: unknown[]) => void;
    /** Dev-only console helpers registered by utils/dev/mockAuth. */
    enableMockAuth?: () => void;
    disableMockAuth?: () => void;
    /** EIP-1193 provider injected by MetaMask, MiniPay, and other wallets. */
    ethereum:
      | (import("viem").EIP1193Provider & {
          /** Set to `true` when running inside the MiniPay browser. */
          isMiniPay?: boolean;
          /** Set to `true` when MetaMask is the injected provider. */
          isMetaMask?: boolean;
        })
      | undefined;
    connectMetaMask: () => Promise<string>;
    connectGoogle: () => Promise<string>;
    connectEmail: (
      email: string,
      verificationCode?: string
    ) => Promise<{ preAuth?: boolean; type?: string; address?: string } | void>;
    connectPhone: (
      phone: string,
      verificationCode?: string
    ) => Promise<{ preAuth?: boolean; type?: string; address?: string } | void>;
    connectPasskey: () => Promise<string>;
    connectGuest: () => Promise<string>;
  }
}
