import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";
import { useAcceptTermsMutation, useGetUserProfileQuery } from "../store/api";

interface TermsContextType {
  showTermsModal: boolean;
  hasAcceptedTerms: boolean;
  isLoading: boolean;
  acceptTerms: () => Promise<void>;
}

const TermsContext = createContext<TermsContextType | undefined>(undefined);

export const TermsProvider = ({ children }: { children: ReactNode }) => {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    handleUserUpdate,
  } = useAuth();

  const { data: selectedUser } = useGetUserProfileQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [acceptUserTerms, { isLoading: userLoading }] = useAcceptTermsMutation();

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
      const result = await acceptUserTerms().unwrap();

      if (result?.data?.user) {
        handleUserUpdate(result.data.user);
      }

      await new Promise((resolve) => setTimeout(resolve, 1800));
    } catch (error) {
      console.error("Failed to accept terms:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated,
    isLoading,
    userLoading,
    acceptUserTerms,
    handleUserUpdate,
  ]);

  const contextValue = useMemo(
    () => ({
      showTermsModal,
      hasAcceptedTerms,
      isLoading: isLoading || userLoading,
      acceptTerms,
    }),
    [showTermsModal, hasAcceptedTerms, isLoading, userLoading, acceptTerms]
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
