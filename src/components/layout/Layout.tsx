import Header from "./Header.tsx";
import Footer from "./Footer.tsx";
import MobileNavigation from "./MobileNavigation.tsx";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import ErrorBoundary from "../error/ErrorBoundary.tsx";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Pages that should not display header/footer
  const isAuthPage = ["/login", "/auth/google"].includes(location.pathname);

  useEffect(() => {
    if (location.pathname === "/auth/google") {
      console.log("On auth/google page, URL:");
    }
  }, [location.pathname, navigate]);

  return (
    <>
      {!isAuthPage && <Header />}
      <ErrorBoundary>
        <main className="min-h-screen pb-16 md:pb-0">{children}</main>
      </ErrorBoundary>
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
