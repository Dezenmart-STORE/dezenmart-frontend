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
  hasAcceptedTerms: boolean;
  isLoading: boolean;
  acceptTerms: () => Promise<void>;
  // checkTermsStatus: () => void;
}

const TermsContext = createContext<TermsContextType | undefined>(undefined);

export const TermsProvider = ({ children }: { children: ReactNode }) => {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    handleUserUpdate,
  } = useAuth();
  const {
    acceptTerms: acceptUserTerms,
    isLoading: userLoading,
    fetchProfile,
    selectedUser,
  } = useUserManagement();

  const [isLoading, setIsLoading] = useState(false);

  const hasAcceptedTerms = useMemo(() => {
    return user?.hasAcceptedTerms ?? false;
  }, [user?.hasAcceptedTerms]);

  const showTermsModal = useMemo(() => {
    return isAuthenticated && !authLoading && !hasAcceptedTerms;
  }, [isAuthenticated, authLoading, hasAcceptedTerms]);

  const acceptTerms = useCallback(async () => {
    if (!isAuthenticated || isLoading || userLoading) {
      return;
    }

    setIsLoading(true);
    try {
      await acceptUserTerms(false);
      await fetchProfile();
      handleUserUpdate(selectedUser);
    } catch (error) {
      console.error("Failed to accept terms:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isLoading, userLoading, acceptUserTerms]);

  const contextValue = useMemo(
    () => ({
      showTermsModal,
      hasAcceptedTerms,
      isLoading: isLoading || userLoading,
      acceptTerms,
      // checkTermsStatus,
    }),
    [
      showTermsModal,
      hasAcceptedTerms,
      isLoading,
      userLoading,
      acceptTerms,
      // checkTermsStatus,
    ]
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
