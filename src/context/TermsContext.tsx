import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    hasAcceptedTerms: userHasAcceptedTerms,
    acceptTerms: acceptUserTerms,
    checkTermsStatus: checkUserTermsStatus,
    isLoading: userLoading,
  } = useUserManagement();

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const cacheKey = useMemo(
    () => (user?._id ? `${TERMS_STATUS_KEY}_${user._id}` : null),
    [user?._id]
  );

  const timestampKey = useMemo(
    () => (user?._id ? `${TERMS_TIMESTAMP_KEY}_${user._id}` : null),
    [user?._id]
  );

  // Cache loading
  const loadCachedTermsStatus = useCallback((): boolean | null => {
    if (!isAuthenticated || !user || !cacheKey || !timestampKey) return null;

    try {
      const cached = localStorage.getItem(cacheKey);
      const timestamp = localStorage.getItem(timestampKey);

      if (cached && timestamp) {
        const now = Date.now();
        const cachedTime = parseInt(timestamp, 10);

        if (!isNaN(cachedTime) && now - cachedTime < CACHE_DURATION) {
          return cached === "true";
        }
      }
    } catch (error) {
      console.warn("Failed to load cached terms status:", error);
    }

    return null;
  }, [isAuthenticated, user, cacheKey, timestampKey]);

  // Cache storage
  const cacheTermsStatus = useCallback(
    (status: boolean) => {
      if (!user || !cacheKey || !timestampKey) return;

      try {
        localStorage.setItem(cacheKey, status.toString());
        localStorage.setItem(timestampKey, Date.now().toString());
      } catch (error) {
        console.warn("Failed to cache terms status:", error);
      }
    },
    [user, cacheKey, timestampKey]
  );

  // Clear terms cache
  const clearTermsCache = useCallback(() => {
    if (!user || !cacheKey || !timestampKey) return;

    try {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(timestampKey);
    } catch (error) {
      console.warn("Failed to clear terms cache:", error);
    }
  }, [user, cacheKey, timestampKey]);

  const checkTermsStatus = useCallback(async () => {
    if (!isAuthenticated || !user || authLoading || userLoading) {
      return;
    }

    // Try cache first
    const cachedStatus = loadCachedTermsStatus();
    if (cachedStatus !== null) {
      setHasAcceptedTerms(cachedStatus);
      setShowTermsModal(!cachedStatus);
      return;
    }

    if (isLoading) return;

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
  }, [
    isAuthenticated,
    user,
    authLoading,
    userLoading,
    isLoading,
    loadCachedTermsStatus,
    checkUserTermsStatus,
    userHasAcceptedTerms,
    cacheTermsStatus,
  ]);

  // Accept terms
  const acceptTerms = useCallback(async () => {
    if (!isAuthenticated || isLoading) return;

    setIsLoading(true);
    try {
      await acceptUserTerms(false);
      setHasAcceptedTerms(true);
      setShowTermsModal(false);
      cacheTermsStatus(true);
    } catch (error) {
      console.error("Failed to accept terms:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isLoading, acceptUserTerms, cacheTermsStatus]);

  // Handle authentication state changes
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && user) {
        // Debounce
        const timeoutId = setTimeout(() => {
          checkTermsStatus();
        }, 100);

        return () => clearTimeout(timeoutId);
      } else {
        setHasAcceptedTerms(null);
        setShowTermsModal(false);
        if (user) {
          clearTermsCache();
        }
      }
    }
  }, [
    isAuthenticated,
    user?._id,
    authLoading,
    checkTermsStatus,
    clearTermsCache,
  ]);

  // Sync with user management hook
  useEffect(() => {
    if (
      isAuthenticated &&
      userHasAcceptedTerms !== undefined &&
      userHasAcceptedTerms !== hasAcceptedTerms
    ) {
      setHasAcceptedTerms(userHasAcceptedTerms);
      setShowTermsModal(!userHasAcceptedTerms);
      if (user) {
        cacheTermsStatus(userHasAcceptedTerms);
      }
    }
  }, [
    isAuthenticated,
    userHasAcceptedTerms,
    hasAcceptedTerms,
    user,
    cacheTermsStatus,
  ]);

  const contextValue = useMemo(
    () => ({
      showTermsModal,
      hasAcceptedTerms,
      isLoading,
      acceptTerms,
      checkTermsStatus,
    }),
    [showTermsModal, hasAcceptedTerms, isLoading, acceptTerms, checkTermsStatus]
  );

  return (
    <TermsContext.Provider value={contextValue}>
      {children}
    </TermsContext.Provider>
  );
};

export const useTerms = () => {
  const context = useContext(TermsContext);
  if (context === undefined) {
    throw new Error("useTerms must be used within a TermsProvider");
  }
  return context;
};
