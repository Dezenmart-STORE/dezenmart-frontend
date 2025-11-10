/**
 * Service Worker Registration
 *
 * Handles PWA service worker registration, updates, and lifecycle events.
 * Works with Vite PWA plugin and Workbox.
 */

import { registerSW } from 'virtual:pwa-register';

export interface ServiceWorkerConfig {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: Error) => void;
}

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

/**
 * Register service worker with lifecycle callbacks
 */
export const registerServiceWorker = (config?: ServiceWorkerConfig) => {
  // Only register in production or if explicitly enabled in dev
  if (import.meta.env.DEV && !import.meta.env.VITE_SW_DEV) {
    console.log('[PWA] Service worker disabled in development');
    return;
  }

  try {
    updateSW = registerSW({
      immediate: true,

      onNeedRefresh() {
        console.log('[PWA] New content available, please refresh');
        config?.onNeedRefresh?.();

        // Show update notification to user
        if (confirm('New version available! Click OK to update.')) {
          updateSW?.(true); // Reload page after update
        }
      },

      onOfflineReady() {
        console.log('[PWA] App ready to work offline');
        config?.onOfflineReady?.();
      },

      onRegistered(registration) {
        console.log('[PWA] Service worker registered', registration);
        config?.onRegistered?.(registration);

        // Check for updates every hour
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // 1 hour
        }
      },

      onRegisterError(error) {
        console.error('[PWA] Service worker registration failed', error);
        config?.onRegisterError?.(error as Error);
      },
    });
  } catch (error) {
    console.error('[PWA] Service worker registration error', error);
  }
};

/**
 * Manually trigger service worker update
 */
export const triggerSWUpdate = async (reloadPage = true) => {
  if (updateSW) {
    await updateSW(reloadPage);
  }
};

/**
 * Check if app is running as installed PWA
 */
export const isPWAInstalled = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

/**
 * Check if service worker is supported
 */
export const isServiceWorkerSupported = (): boolean => {
  return 'serviceWorker' in navigator;
};

/**
 * Get current service worker registration
 */
export const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration || null;
  } catch (error) {
    console.error('[PWA] Error getting service worker registration', error);
    return null;
  }
};

/**
 * Unregister service worker (for debugging)
 */
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      return await registration.unregister();
    }
    return false;
  } catch (error) {
    console.error('[PWA] Error unregistering service worker', error);
    return false;
  }
};

/**
 * Skip waiting and activate new service worker immediately
 */
export const skipWaitingAndActivate = async () => {
  const registration = await getServiceWorkerRegistration();
  if (registration?.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
};
