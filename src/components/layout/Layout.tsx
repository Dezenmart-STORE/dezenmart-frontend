import Header from "./Header.tsx";
import Footer from "./Footer.tsx";
import MobileNavigation from "./MobileNavigation.tsx";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import ErrorBoundary from "../error/ErrorBoundary.tsx";
import { OfflineIndicator } from "../pwa/OfflineIndicator.tsx";
import { InstallPrompt } from "../pwa/InstallPrompt.tsx";
import { registerServiceWorker } from "../../utils/pwa/serviceWorkerRegistration";
import { setupOfflineSyncListener } from "../../utils/pwa/offlineSync";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  // Pages that should not display header/footer
  const isAuthPage = ["/login", "/auth/google"].includes(location.pathname);

  // Register service worker and setup offline sync
  useEffect(() => {
    // Register service worker
    registerServiceWorker({
      onOfflineReady: () => {
        console.log('[PWA] App is ready to work offline');
      },
      onNeedRefresh: () => {
        console.log('[PWA] New content is available');
      },
    });

    // Setup offline sync listener
    const cleanupSync = setupOfflineSyncListener();

    return () => {
      cleanupSync();
    };
  }, []);

  return (
    <>
      {/* Offline Status Indicator */}
      <OfflineIndicator showOnlineStatus={true} />

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {!isAuthPage && <Header />}
      <ErrorBoundary>
        <main className="h-full pb-16 md:pb-0">{children}</main>
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
