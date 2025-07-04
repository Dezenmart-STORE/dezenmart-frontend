import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useUserManagement } from "../utils/hooks/useUser";

interface TermsContextType {
  showTermsModal: boolean;
  hasAcceptedTerms: boolean | null;
  isLoading: boolean;
  acceptTerms: () => Promise<void>;
  checkTermsStatus: () => Promise<void>;
}

const TermsContext = createContext<TermsContextType | undefined>(undefined);

const TERMS_STATUS_KEY = "terms_status";
const TERMS_TIMESTAMP_KEY = "terms_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const TermsProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const {
    hasAcceptedTerms: userHasAcceptedTerms,
    acceptTerms: acceptUserTerms,
    checkTermsStatus: checkUserTermsStatus,
  } = useUserManagement();

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load cached terms status
  const loadCachedTermsStatus = (): boolean | null => {
    if (!isAuthenticated || !user) return null;

    const cached = localStorage.getItem(`${TERMS_STATUS_KEY}_${user._id}`);
    const timestamp = localStorage.getItem(
      `${TERMS_TIMESTAMP_KEY}_${user._id}`
    );

    if (cached && timestamp) {
      const now = Date.now();
      const cachedTime = parseInt(timestamp);

      if (now - cachedTime < CACHE_DURATION) {
        return cached === "true";
      }
    }

    return null;
  };

  // Cache terms status
  const cacheTermsStatus = (status: boolean) => {
    if (!user) return;

    localStorage.setItem(`${TERMS_STATUS_KEY}_${user._id}`, status.toString());
    localStorage.setItem(
      `${TERMS_TIMESTAMP_KEY}_${user._id}`,
      Date.now().toString()
    );
  };

  // Clear terms cache
  const clearTermsCache = () => {
    if (!user) return;

    localStorage.removeItem(`${TERMS_STATUS_KEY}_${user._id}`);
    localStorage.removeItem(`${TERMS_TIMESTAMP_KEY}_${user._id}`);
  };

  // Check terms status
  const checkTermsStatus = async () => {
    if (!isAuthenticated || !user || isLoading) return;

    // Try cache first
    const cachedStatus = loadCachedTermsStatus();
    if (cachedStatus !== null) {
      setHasAcceptedTerms(cachedStatus);
      setShowTermsModal(!cachedStatus);
      return;
    }

    setIsLoading(true);
    try {
      await checkUserTermsStatus(false, true);
      const status = userHasAcceptedTerms ?? false;
      setHasAcceptedTerms(status);
      setShowTermsModal(!status);
      cacheTermsStatus(status);
    } catch (error) {
      console.error("Failed to check terms status:", error);
      setHasAcceptedTerms(false);
      setShowTermsModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Accept terms
  const acceptTerms = async () => {
    if (!isAuthenticated || isLoading) return;

    setIsLoading(true);
    try {
      await acceptUserTerms(false, false);
      setHasAcceptedTerms(true);
      setShowTermsModal(false);
      cacheTermsStatus(true);
    } catch (error) {
      console.error("Failed to accept terms:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // check terms status when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      checkTermsStatus();
    } else {
      // Clear state when user logs out
      setHasAcceptedTerms(null);
      setShowTermsModal(false);
      if (user) {
        clearTermsCache();
      }
    }
  }, [isAuthenticated, user?._id]);

  // Sync with user management hook
  useEffect(() => {
    if (
      userHasAcceptedTerms !== undefined &&
      userHasAcceptedTerms !== hasAcceptedTerms
    ) {
      setHasAcceptedTerms(userHasAcceptedTerms);
      setShowTermsModal(!userHasAcceptedTerms);
      if (user) {
        cacheTermsStatus(userHasAcceptedTerms);
      }
    }
  }, [userHasAcceptedTerms, hasAcceptedTerms, user]);

  const value = {
    showTermsModal,
    hasAcceptedTerms,
    isLoading,
    acceptTerms,
    checkTermsStatus,
  };

  return (
    <TermsContext.Provider value={value}>{children}</TermsContext.Provider>
  );
};

export const useTerms = () => {
  const context = useContext(TermsContext);
  if (context === undefined) {
    throw new Error("useTerms must be used within a TermsProvider");
  }
  return context;
};
