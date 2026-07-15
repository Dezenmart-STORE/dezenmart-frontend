import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import { googleIcon } from "../../pages";
import { useAuth } from "../../context/AuthContext";
import { useGoogleOneTap, GOOGLE_ONE_TAP_ENABLED } from "../../hooks/useGoogleOneTap";

const DISMISSED_KEY = "nudge_dismissed_at";
const LAST_ACCOUNT_KEY = "nudge_last_account";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const APPEAR_DELAY_MS = 3000;

interface LastAccount {
  name: string;
  email: string;
  picture: string | null;
}

interface LoginNudgeProps {
  onVisibilityChange: (visible: boolean) => void;
}

const Avatar: React.FC<{ account: LastAccount }> = ({ account }) => {
  if (account.picture) {
    return (
      <img
        src={account.picture}
        alt={account.name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-Red flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
      {account.name.charAt(0).toUpperCase()}
    </div>
  );
};

const LoginNudge: React.FC<LoginNudgeProps> = ({ onVisibilityChange }) => {
  const { isAuthenticated, isLoading, loginInPopup, loginWithGoogleCredential } = useAuth();
  const [visible, setVisible] = useState(false); // fallback card
  const [canShow, setCanShow] = useState(false); // cooldown + delay passed
  const [busy, setBusy] = useState(false);
  const [lastAccount, setLastAccount] = useState<LastAccount | null>(null);
  const promptedRef = useRef(false);

  // Exchange a One Tap credential for our session (no reload/navigation).
  const handleCredential = useCallback(
    async (credential: string) => {
      setBusy(true);
      try {
        await loginWithGoogleCredential(credential);
        // isAuthenticated flips -> the nudge and its consumers update in place.
      } catch (err) {
        console.error("One Tap sign-in failed:", err);
        setVisible(true); // fall back to the manual card
      } finally {
        setBusy(false);
      }
    },
    [loginWithGoogleCredential]
  );

  const { ready, prompt, cancel } = useGoogleOneTap({
    enabled: GOOGLE_ONE_TAP_ENABLED && !isLoading && !isAuthenticated,
    onCredential: handleCredential,
    onUnavailable: () => setVisible(true),
  });

  // Decide whether we're allowed to nudge yet (cooldown + delay).
  useEffect(() => {
    if (isLoading || isAuthenticated) return;

    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < COOLDOWN_MS) return;
    }

    try {
      const stored = localStorage.getItem(LAST_ACCOUNT_KEY);
      if (stored) setLastAccount(JSON.parse(stored));
    } catch {
      /* ignore */
    }

    const timer = setTimeout(() => setCanShow(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  // Show the Google One Tap prompt (or the fallback card) once allowed.
  useEffect(() => {
    if (!canShow || isAuthenticated) return;
    if (GOOGLE_ONE_TAP_ENABLED) {
      if (ready && !promptedRef.current) {
        promptedRef.current = true;
        prompt();
      }
    } else {
      setVisible(true);
    }
  }, [canShow, ready, isAuthenticated, prompt]);

  // Hide everything once signed in.
  useEffect(() => {
    if (isAuthenticated) {
      setVisible(false);
      cancel();
    }
  }, [isAuthenticated, cancel]);

  useEffect(() => {
    onVisibilityChange(visible);
  }, [visible, onVisibilityChange]);

  const dismiss = useCallback(() => {
    setVisible(false);
    cancel();
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  }, [cancel]);

  // Card action: re-trigger One Tap when enabled, else the popup flow.
  const handleCardLogin = useCallback(async () => {
    if (GOOGLE_ONE_TAP_ENABLED) {
      prompt();
      return;
    }
    setBusy(true);
    try {
      await loginInPopup();
    } finally {
      setBusy(false);
    }
  }, [loginInPopup, prompt]);

  if (isLoading || isAuthenticated) return null;

  const firstName = lastAccount?.name.split(" ")[0] ?? "";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="fixed bottom-16 left-2 right-2 md:bottom-4 md:left-auto md:right-4 md:w-80 bg-[#1C1D22] border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden"
          role="dialog"
          aria-label="Sign in prompt"
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <p className="text-white text-sm font-semibold">
              {lastAccount ? "Welcome back" : "Sign in to Dezenmart"}
            </p>
            <button
              onClick={dismiss}
              className="text-gray-500 hover:text-white transition-colors p-1 -mr-1 rounded-full"
              aria-label="Dismiss"
            >
              <FiX className="text-base" />
            </button>
          </div>

          <div className="px-4 pb-5 pt-2">
            {lastAccount ? (
              <>
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 mb-3">
                  <Avatar account={lastAccount} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{lastAccount.name}</p>
                    <p className="text-gray-400 text-xs truncate">{lastAccount.email}</p>
                  </div>
                </div>

                <button
                  onClick={handleCardLogin}
                  disabled={busy}
                  className="w-full bg-Red hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {busy ? "Signing in…" : `Continue as ${firstName}`}
                </button>

                <button
                  onClick={handleCardLogin}
                  disabled={busy}
                  className="w-full text-gray-500 hover:text-gray-300 disabled:opacity-50 text-xs mt-2.5 py-1 transition-colors"
                >
                  Use a different account
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-400 text-xs mb-3">
                  Buy and sell on a top dezentralized marketplace.
                </p>
                <button
                  onClick={handleCardLogin}
                  disabled={busy}
                  className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <img src={googleIcon} alt="" className="w-4 h-4" />
                  {busy ? "Signing in…" : "Continue with Google"}
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginNudge;
