import { useState, useEffect, useCallback, useRef } from "react";
import { divviService } from "../services/divvi.service";
import { useSnackbar } from "../../context/SnackbarContext";

interface ReferralTagParams {
  user: string;
  consumer?: string;
  providers?: string[];
}

interface TrackingData {
  transactionHash: string;
  chainId: number;
  user: string;
  consumer?: string;
  providers?: string[];
  metadata?: Record<string, any>;
}

interface UseDivviReturn {
  isReady: boolean;
  error: string | null;
  referralCode: string | null;
  generateReferralTag: (params: ReferralTagParams) => string | null;
  trackTransaction: (data: TrackingData) => Promise<boolean>;
  generateReferralLink: (referralCode: string, baseUrl?: string) => string;
  clearReferralCode: () => void;
}

export const useDivvi = (): UseDivviReturn => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const { showSnackbar } = useSnackbar();
  const initializationAttempted = useRef(false);

  useEffect(() => {
    const initializeDivvi = async () => {
      if (initializationAttempted.current) return;

      initializationAttempted.current = true;
      setError(null);

      try {
        setIsReady(divviService.isReady());

        // Extract referral code from URL on initialization
        const refCode = divviService.extractReferralFromUrl();
        if (refCode) {
          setReferralCode(refCode);
          // Store in sessionStorage for persistence across navigation
          sessionStorage.setItem("divvi_referral_code", refCode);
        } else {
          // Check if we have a stored referral code
          const storedRefCode = sessionStorage.getItem("divvi_referral_code");
          if (storedRefCode) {
            setReferralCode(storedRefCode);
          }
        }
      } catch (err: any) {
        const errorMessage =
          err?.message || "Failed to initialize Divvi service";
        setError(errorMessage);
        console.error("Divvi initialization error:", err);
      }
    };

    initializeDivvi();
  }, []);

  const generateReferralTag = useCallback(
    (params: ReferralTagParams): string | null => {
      try {
        if (!isReady) {
          console.warn(
            "Divvi service not ready. Cannot generate referral tag."
          );
          return null;
        }

        return divviService.generateReferralTag(params);
      } catch (error: any) {
        console.error("Error generating referral tag:", error);
        setError(error?.message || "Failed to generate referral tag");
        return null;
      }
    },
    [isReady]
  );

  const trackTransaction = useCallback(
    async (data: TrackingData): Promise<boolean> => {
      try {
        if (!isReady) {
          console.warn(
            "Divvi service not ready. Skipping transaction tracking."
          );
          return false;
        }

        const result = await divviService.trackTransaction(data);

        if (result.success) {
          if (process.env.NODE_ENV === "development") {
            showSnackbar("Referral tracking successful", "success");
          }
          return true;
        } else {
          console.warn("Divvi tracking failed:", result.error);
          return false;
        }
      } catch (error: any) {
        console.error("Error in trackTransaction:", error);
        return false;
      }
    },
    [isReady, showSnackbar]
  );

  const generateReferralLink = useCallback(
    (referralCode: string, baseUrl?: string): string => {
      return divviService.generateReferralLink(referralCode, baseUrl);
    },
    []
  );

  const clearReferralCode = useCallback(() => {
    setReferralCode(null);
    sessionStorage.removeItem("divvi_referral_code");
  }, []);

  return {
    isReady,
    error,
    referralCode,
    generateReferralTag,
    trackTransaction,
    generateReferralLink,
    clearReferralCode,
  };
};
