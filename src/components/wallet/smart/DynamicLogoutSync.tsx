import { useCallback, useEffect, useRef } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useDisconnect } from "wagmi";
import { useAuth } from "../../../context/AuthContext";

/**
 * Keeps the Dynamic wallet session tied to the DezenMart session.
 *
 * Two jobs:
 *  1. On logout, end the Dynamic session AND drop the wagmi connection, so a
 *     shared device keeps no wallet access.
 *  2. Guard against a stale session leaking across accounts: if the signed-in
 *     DezenMart user is not the same person as the live Dynamic session (email
 *     mismatch), tear the wallet session down so account B never inherits
 *     account A's embedded wallet. This is the safety net for a logout that
 *     didn't fully land (races, a failed teardown, a restored tab).
 *
 * Renders nothing; lazy-loaded and mounted whenever Dynamic is ready.
 */
export default function DynamicLogoutSync() {
  const { isAuthenticated, user: appUser } = useAuth();
  const { handleLogOut, user: dynamicUser } = useDynamicContext();
  const { disconnect } = useDisconnect();
  const wasAuthed = useRef(isAuthenticated);
  // Avoid firing repeatedly while an async teardown settles.
  const tearingDown = useRef(false);

  const tearDown = useCallback(async () => {
    if (tearingDown.current) return;
    tearingDown.current = true;
    try {
      disconnect();
    } catch {
      /* ignore */
    }
    try {
      await handleLogOut();
    } catch {
      /* best-effort; nothing to surface */
    } finally {
      // Let the SDK settle before this guard can run again.
      setTimeout(() => {
        tearingDown.current = false;
      }, 1500);
    }
  }, [disconnect, handleLogOut]);

  // 1. App logout -> end the wallet session. Not gated on `dynamicUser`: at the
  //    moment of transition it can briefly read null and we'd skip the teardown.
  useEffect(() => {
    if (wasAuthed.current && !isAuthenticated) void tearDown();
    wasAuthed.current = isAuthenticated;
  }, [isAuthenticated, tearDown]);

  // 2. Cross-account guard: a live Dynamic session for a different email than
  //    the signed-in user means a previous account's wallet is still attached.
  useEffect(() => {
    if (!isAuthenticated || !dynamicUser) return;
    const appEmail = appUser?.email?.trim().toLowerCase();
    const dynEmail = dynamicUser.email?.trim().toLowerCase();
    if (appEmail && dynEmail && appEmail !== dynEmail) void tearDown();
  }, [isAuthenticated, appUser?.email, dynamicUser, tearDown]);

  return null;
}
