import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";
import { UserProfile } from "../utils/types";
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
        // ||
        // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MGY0NmM1MjA1YmFjZTdhYjM0ZmMwMyIsImVtYWlsIjoic2FtdWVsYWRlYm9sYW95ZW51Z2FAZ21haWwuY29tIiwiaWF0IjoxNzQ5NjYwMzA5LCJleHAiOjE3NTAyNjUxMDl9.rKJNOrr2c4g9nqMWpCtwzDt_1Ij2glD1fQ_UCqlS4MA";
        const storedUser = storage.getItem(USER_KEY);
        //   || {
        //   milestones: { sales: 0, purchases: 0 },
        //   orders: [],
        //   _id: "680f46c5205bace7ab34fc03",
        //   googleId: "112614201578661238185",
        //   email: "samueladebolaoyenuga@gmail.com",
        //   name: "Samuel Oyenuga",
        //   profileImage:
        //     "https://lh3.googleusercontent.com/a/ACg8ocIa_dOWUI6f1D7zAZ5snzGz-An9zlbIO0oVjOhFrukH7Th0z1Sk=s96-c",
        //   isMerchant: false,
        //   rating: 0,
        //   totalPoints: 70,
        //   availablePoints: 70,
        //   referralCount: 1,
        //   isReferralCodeUsed: false,
        //   referralCode: "P55OB250",
        //   createdAt: "2025-04-28T09:13:41.349Z",
        //   updatedAt: "2025-06-07T10:04:16.269Z",
        //   __v: 0,
        //   address: "2828 Parker St",
        //   dateOfBirth: "1998-12-08T00:00:00.000Z",
        //   phoneNumber: "09136577132",
        //   lastRewardCalculation: "2025-06-07T10:04:16.269Z",
        // };

        if (token && storedUser) {
          // Verify token hasn't expired
          try {
            const decoded = jwtDecode<JwtPayload>(token);
            const currentTime = Date.now() / 1000;

            if (decoded.exp < currentTime) {
              clearAuthState();
              // console.log("Token expired, clearing auth state");
            } else {
              const parsedUser =
                typeof storedUser === "string"
                  ? JSON.parse(storedUser)
                  : storedUser;
              setUser(parsedUser);
              // console.log(
              //   "User authenticated from local storage:",
              //   parsedUser.email
              // );
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
  };

  const login = (provider: string) => {
    const API_URL = import.meta.env.VITE_API_URL;
    // const FRONTEND_URL = window.location.origin;

    if (provider === "google") {
      // storage.setItem("auth_redirect", window.location.origin);

      const redirectUrl = `${API_URL}/auth/google`;
      // ?frontend=${FRONTEND_URL}
      // console.log("Redirecting to:", redirectUrl);
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

  const handleAuthCallback = (token: string, userData: UserProfile) => {
    try {
      // Store authentication data
      storage.setItem(TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify(userData));

      setUser(userData);
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
    // console.log("Logging out");
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
