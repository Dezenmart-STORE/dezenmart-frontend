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

import { jwtDecode } from "jwt-decode";

/** Dynamic environment id (public value, safe in the client bundle). */
export const DYNAMIC_ENV_ID = (import.meta.env.VITE_DYNAMIC_ENV_ID as string | undefined)?.trim() || "";

/** Master switch for the embedded-wallet feature. */
export const SMART_WALLET_ENABLED = !!DYNAMIC_ENV_ID;

// ---------------------------------------------------------------------------
// Boot-time session gate
// ---------------------------------------------------------------------------
// The Dezen wallet belongs to a signed-in account: a logged-out visitor has no
// wallet to provision and no transaction to sign. Dynamic's provider tree is a
// ~2.3 MB chunk that used to load on every page view regardless, so we decide
// once per page load whether to mount it at all.
//
// This MUST be read once at module scope rather than from AuthContext:
//  1. SmartWalletProvider sits ABOVE AuthProvider in main.tsx, so no auth hook
//     is available there.
//  2. A value that flipped mid-session would swap the provider tree underneath
//     the app and remount everything. Deciding at boot keeps it stable, and
//     signing in triggers a reload instead (see needsReloadForDynamic).
//
// Mirrors AuthContext's own check: token + stored user, and an unexpired `exp`.

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

function readSessionAtBoot(): boolean {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !localStorage.getItem(USER_KEY)) return false;
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return typeof exp === "number" && exp > Date.now() / 1000;
  } catch {
    // Unparseable token or storage blocked (private mode): treat as signed out.
    // AuthContext clears the bad token, and signing in reloads us anyway.
    return false;
  }
}

/** A valid session existed when this page loaded. Constant for the page's life. */
export const HAS_SESSION_AT_BOOT = readSessionAtBoot();

/**
 * Whether Dynamic's provider tree is mounted for this page load. When false the
 * app runs on the plain wagmi tree, so anything that needs Dynamic (the Dezen
 * wallet flows) must check this rather than waiting on `dynamicReady`, which
 * will never turn true.
 */
export const DYNAMIC_MOUNTED = SMART_WALLET_ENABLED && HAS_SESSION_AT_BOOT;

/**
 * True when signing in has to reload the page to bring Dynamic up. Lets the
 * login paths skip a pointless reload when Dynamic is already mounted.
 */
export const needsReloadForDynamic = (): boolean => SMART_WALLET_ENABLED && !DYNAMIC_MOUNTED;
