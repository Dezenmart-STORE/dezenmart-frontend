import { useEffect, useState, startTransition } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { needsReloadForDynamic } from "../config/smartWallet";
import { useGetUserProfileQuery } from "../store/api";
import Loadscreen from "./Loadscreen";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [shouldFetch, setShouldFetch] = useState(false);

  // Only fetch profile after token is set
  const { data: userProfile } = useGetUserProfileQuery(undefined, {
    skip: !shouldFetch,
  });

  useEffect(() => {
    const processAuth = async () => {
      try {
        const token = searchParams.get("token");
        const userId = searchParams.get("userId");

        if (!token || !userId) {
          throw new Error("Authentication failed: Missing token or user ID");
        }

        localStorage.setItem("auth_token", token);
        // Trigger the profile fetch after token is stored
        setShouldFetch(true);
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
        setIsProcessing(false);
      }
    };

    processAuth();
  }, [searchParams]);

  // Handle successful profile fetch
  useEffect(() => {
    if (userProfile && shouldFetch) {
      const token = searchParams.get("token");
      if (token) {
        handleAuthCallback(token, userProfile);
        if (needsReloadForDynamic()) {
          // Full navigation, not a router push: the Dezen wallet's provider tree
          // is only mounted for page loads that start with a session, and this
          // page load started without one. replace() also drops the ?token= URL
          // from history. This screen is already a full-page loader, so the hard
          // navigation is invisible.
          window.location.replace("/");
        } else {
          startTransition(() => {
            navigate("/", { replace: true });
          });
        }
      }
    }
  }, [userProfile, shouldFetch, searchParams, handleAuthCallback, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-Dark">
        <div className="bg-[#292B30] p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-Red text-2xl font-bold mb-4">
            Authentication Error
          </h2>
          <p className="text-white mb-6">{error}</p>
          <button
            onClick={() => startTransition(() => navigate("/login"))}
            className="bg-Red text-white px-4 py-2 rounded hover:bg-opacity-90 transition-all w-full"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return <Loadscreen />;
  }

  return null;
};

export default AuthCallback;
