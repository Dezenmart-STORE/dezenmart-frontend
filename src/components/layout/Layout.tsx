import Header from "./Header.tsx";
import Footer from "./Footer.tsx";
import MobileNavigation from "./MobileNavigation.tsx";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAuthPage = ["/login", "/load"].includes(location.pathname);

  const navigate = useNavigate();
  // In Layout.tsx
  useEffect(() => {
    // Check if this is a redirect from Google auth
    if (location.pathname === "/auth/google") {
      // Extract token and user data from URL
      const params = new URLSearchParams(location.search);
      const token = params.get("token");
      const userData = params.get("user");

      if (token && userData) {
        try {
          // Log the raw data for debugging
          console.log("Raw token:", token);
          console.log("Raw userData:", userData);

          // Redirect to our auth callback handler
          navigate(
            `/auth-callback?token=${encodeURIComponent(
              token
            )}&user=${encodeURIComponent(userData)}`,
            { replace: true }
          );
        } catch (error) {
          console.error("Failed to process auth callback:", error);
          // Something went wrong, redirect to login
          navigate("/login", { replace: true });
        }
      } else {
        console.error("Missing token or user data in callback");
        // Something went wrong, redirect to login
        navigate("/login", { replace: true });
      }
    }
  }, [location, navigate]);

  return (
    <>
      {!isAuthPage && <Header />}
      <main className="min-h-screen pb-16 md:pb-0">{children}</main>
      {!isAuthPage && (
        <>
          <MobileNavigation />
          <Footer />
        </>
      )}
    </>
  );
};

export default Layout;
