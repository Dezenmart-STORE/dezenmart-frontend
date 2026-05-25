import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import { googleIcon } from "../../pages";
import { useAuth } from "../../context/AuthContext";

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
  const { isAuthenticated, isLoading, loginInPopup } = useAuth();
  const [visible, setVisible] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [lastAccount, setLastAccount] = useState<LastAccount | null>(null);

  // Determine whether to show on mount
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
    } catch {}

    const timer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  // Hide as soon as user logs in
  useEffect(() => {
    if (isAuthenticated) setVisible(false);
  }, [isAuthenticated]);

  // Notify parent so the PWA prompt can be suppressed
  useEffect(() => {
    onVisibilityChange(visible);
  }, [visible, onVisibilityChange]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  }, []);

  const handleLogin = useCallback(async () => {
    setPopupOpen(true);
    try {
      await loginInPopup();
    } finally {
      setPopupOpen(false);
    }
  }, [loginInPopup]);

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
          // Mobile: full-width bottom sheet. Desktop: compact corner card.
          className="fixed bottom-16 left-2 right-2 md:bottom-4 md:left-auto md:right-4 md:w-80 bg-[#1C1D22] border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden"
          role="dialog"
          aria-label="Sign in prompt"
        >
          {/* Top bar */}
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
                {/* Returning user: show account card */}
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 mb-3">
                  <Avatar account={lastAccount} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {lastAccount.name}
                    </p>
                    <p className="text-gray-400 text-xs truncate">
                      {lastAccount.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={popupOpen}
                  className="w-full bg-Red hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {popupOpen ? "Opening sign-in…" : `Continue as ${firstName}`}
                </button>

                <button
                  onClick={handleLogin}
                  disabled={popupOpen}
                  className="w-full text-gray-500 hover:text-gray-300 disabled:opacity-50 text-xs mt-2.5 py-1 transition-colors"
                >
                  Use a different account
                </button>
              </>
            ) : (
              <>
                {/* Fresh user: Google button */}
                <p className="text-gray-400 text-xs mb-3">
                  Buy and sell on a top dezentralized marketplace.
                </p>
                <button
                  onClick={handleLogin}
                  disabled={popupOpen}
                  className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <img src={googleIcon} alt="" className="w-4 h-4" />
                  {popupOpen ? "Opening sign-in…" : "Continue with Google"}
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
