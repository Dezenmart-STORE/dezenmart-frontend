import { useEffect, useRef } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAuth } from "../../../context/AuthContext";

/**
 * Ends the Dynamic session when the DezenMart session ends, so a shared or
 * public device doesn't keep wallet access after the user logs out. Renders
 * nothing; lazy-loaded and only mounted once Dynamic is ready.
 */
export default function DynamicLogoutSync() {
  const { isAuthenticated } = useAuth();
  const { handleLogOut, user } = useDynamicContext();
  const wasAuthed = useRef(isAuthenticated);

  useEffect(() => {
    if (wasAuthed.current && !isAuthenticated && user) {
      handleLogOut().catch(() => {
        /* best-effort; nothing to surface */
      });
    }
    wasAuthed.current = isAuthenticated;
  }, [isAuthenticated, user, handleLogOut]);

  return null;
}
