import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";
import { UserProfile } from "../utils/types";
import { setSentryUser, clearSentryUser } from "../utils/sentry.config";
// import { useWallet } from "../utils/hooks/useWallet";

interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  exp: number;
  id?: string;
  walletAddress?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (provider: string) => void;
  loginInPopup: () => Promise<void>;
  // loginWithWallet: (walletAddress: string) => Promise<void>;
  handleUserUpdate: (userData: any) => void;
  handleAuthCallback: (token: string, userData: any) => void;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const storage = localStorage;
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const { account } = useWallet();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = storage.getItem(TOKEN_KEY);
        const storedUser = storage.getItem(USER_KEY);

        if (token && storedUser) {
          // Verify token hasn't expired
          try {
            const decoded = jwtDecode<JwtPayload>(token);
            const currentTime = Date.now() / 1000;

            if (decoded.exp < currentTime) {
              clearAuthState();
              // console.log("Token expired, clearing auth state");
            } else {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
              setSentryUser({ id: parsedUser._id, name: parsedUser.name, email: parsedUser.email });
            }
          } catch (error) {
            console.error("Invalid token:", error);
            clearAuthState();
          }
        } else {
          // console.log("No token or user found in storage");
        }
      } catch (error) {
        // console.error("Error checking auth status:", error);
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const clearAuthState = () => {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
    setUser(null);
    clearSentryUser();
  };

  const login = (provider: string) => {
    const API_URL = import.meta.env.VITE_API_URL;
    const FRONTEND_URL = window.location.origin; // Automatically gets current URL

    if (provider === "google") {
      // Use current origin in development, production URL in production
      const origin = import.meta.env.MODE === 'development'
        ? FRONTEND_URL  // localhost:5173 (or whatever port is running)
        : 'https://dezenmart.netlify.app';

      const redirectUrl = `${API_URL}/auth/google?origin=${encodeURIComponent(origin)}`;

      console.log("🔐 OAuth Login:");
      console.log("   API:", API_URL);
      console.log("   Redirect to:", origin);
      console.log("   Mode:", import.meta.env.MODE);

      window.location.href = redirectUrl;
    }
  };

  // const loginWithWallet = async (walletAddress: any) => {
  //   try {
  //     setIsLoading(true);
  //     console.log("Wallet login attempted with:", walletAddress);

  //     // TODO: Implement actual wallet authentication API call

  //     return walletAddress;
  //   } catch (error) {
  //     console.error("Error logging in with wallet:", error);
  //     throw error;
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // useEffect(() => {
  //   const attemptWalletLogin = async () => {
  //     if (account && !user && !isLoading) {
  //       try {
  //         await loginWithWallet(account);
  //       } catch (error) {
  //         console.error("Auto wallet login failed:", error);
  //       }
  //     }
  //   };

  //   attemptWalletLogin();
  // }, [account, user, isLoading]);

  const NUDGE_ACCOUNT_KEY = "nudge_last_account";

  const saveLastAccount = (userData: UserProfile) => {
    try {
      localStorage.setItem(NUDGE_ACCOUNT_KEY, JSON.stringify({
        name: userData.name,
        email: userData.email,
        picture: typeof userData.profileImage === "string" ? userData.profileImage : null,
      }));
    } catch {}
  };

  const refreshAuthFromStorage = () => {
    try {
      const token = storage.getItem(TOKEN_KEY);
      const storedUser = storage.getItem(USER_KEY);
      if (!token || !storedUser) return;
      const decoded = jwtDecode<JwtPayload>(token);
      if (decoded.exp < Date.now() / 1000) return;
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setSentryUser({ id: parsedUser._id, name: parsedUser.name, email: parsedUser.email });
      saveLastAccount(parsedUser);
    } catch {}
  };

  const loginInPopup = (): Promise<void> => {
    return new Promise((resolve) => {
      const API_URL = import.meta.env.VITE_API_URL;
      const origin = import.meta.env.MODE === "development"
        ? window.location.origin
        : "https://dezenmart.netlify.app";

      const url = `${API_URL}/auth/google?origin=${encodeURIComponent(origin)}`;
      const w = 500, h = 620;
      const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
      const top = Math.round(window.screenY + (window.outerHeight - h) / 2);

      // localStorage is keyed by origin and survives the popup's cross-origin
      // OAuth journey (Google servers). window.opener and window.name are both
      // cleared by Chrome 88+/Edge/FF on cross-origin navigation so we can't
      // use either. This flag is the only reliable way AuthCallback can know
      // it is running inside a popup rather than a full-page navigation.
      localStorage.setItem("dezen-auth-popup", "1");

      const popup = window.open(
        url,
        "google-auth",
        `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      );

      if (!popup) {
        localStorage.removeItem("dezen-auth-popup");
        window.location.href = url;
        resolve();
        return;
      }

      let settled = false;
      const handleSuccess = () => {
        if (settled) return;
        settled = true;
        cleanup();
        refreshAuthFromStorage();
        resolve();
      };

      // BroadcastChannel is the primary signal - works across same-origin
      // windows without needing window.opener.
      let bc: BroadcastChannel | null = null;
      try {
        bc = new BroadcastChannel("dezen-auth");
        bc.onmessage = (e) => {
          if (e.data?.type === "DEZEN_AUTH_SUCCESS") handleSuccess();
        };
      } catch {}

      // Keep postMessage as a fallback for browsers where opener survives.
      const onMessage = (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type !== "DEZEN_AUTH_SUCCESS") return;
        handleSuccess();
      };
      window.addEventListener("message", onMessage);

      // Poll for the popup being closed without completing auth (user dismissed).
      const poll = setInterval(() => {
        if (popup.closed) {
          cleanup();
          resolve();
        }
      }, 500);

      const cleanup = () => {
        clearInterval(poll);
        window.removeEventListener("message", onMessage);
        localStorage.removeItem("dezen-auth-popup");
        bc?.close();
        bc = null;
      };
    });
  };

  const handleAuthCallback = (token: string, userData: UserProfile) => {
    try {
      storage.setItem(TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify(userData));
      setUser(userData);
      setSentryUser({ id: userData._id, name: userData.name, email: userData.email });
      saveLastAccount(userData);
    } catch (error) {
      console.error("Error in handleAuthCallback:", error);
      clearAuthState();
    }
  };

  const handleUserUpdate = (userData: UserProfile) => {
    try {
      storage.setItem(USER_KEY, JSON.stringify(userData));

      setUser(userData);
    } catch (error) {
      console.error("Error in handleUserUpdate:", error);
    }
  };

  const logout = () => {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (
        key.startsWith("terms_status_") ||
        key.startsWith("terms_timestamp_")
      ) {
        localStorage.removeItem(key);
      }
    });
    clearAuthState();
  };

  const getToken = (): string | null => {
    return storage.getItem(TOKEN_KEY);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginInPopup,
    // loginWithWallet,
    handleAuthCallback,
    handleUserUpdate,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
