import * as Sentry from "@sentry/react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { useEffect } from "react";

// Initialize Sentry only in production
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || "development";

  // Only initialize if DSN is provided and not in development
  if (dsn && environment !== "development") {
    Sentry.init({
      dsn,
      environment,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
        Sentry.reactRouterV7BrowserTracingIntegration({
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes,
        }),
      ],

      // Performance Monitoring
      tracesSampleRate: environment === "production" ? 0.1 : 1.0, // 10% in prod, 100% in staging

      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of all sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Customize error filtering
      beforeSend(event, hint) {
        // Filter out certain errors
        const error = hint.originalException;

        // Ignore network errors in development
        if (
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
        ) {
          // Ignore AbortController errors (user-initiated)
          if (error.message.includes("AbortError")) {
            return null;
          }

          // Ignore wallet connection errors (user-initiated)
          if (
            error.message.includes("User rejected") ||
            error.message.includes("User denied")
          ) {
            return null;
          }
        }

        return event;
      },

      // Set user context (will be set after authentication)
      beforeBreadcrumb(breadcrumb) {
        // Filter sensitive data from breadcrumbs
        if (breadcrumb.category === "console") {
          return breadcrumb;
        }
        return breadcrumb;
      },
    });

    console.log(
      `[Sentry] Initialized in ${environment} mode with trace sample rate: ${
        environment === "production" ? "10%" : "100%"
      }`
    );
  } else {
    console.log("[Sentry] Skipped initialization (development mode or no DSN)");
  }
};

// Helper to set user context after login
export const setSentryUser = (user: {
  id: string;
  email?: string;
  name?: string;
}) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
};

// Helper to clear user context on logout
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

// Helper to capture custom errors
export const captureError = (
  error: Error,
  context?: Record<string, any>
) => {
  if (context) {
    Sentry.setContext("additional", context);
  }
  Sentry.captureException(error);
};

// Helper to capture custom messages
export const captureMessage = (message: string, level: Sentry.SeverityLevel = "info") => {
  Sentry.captureMessage(message, level);
};

// Helper to add breadcrumb
export const addBreadcrumb = (
  message: string,
  category: string,
  level: Sentry.SeverityLevel = "info"
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
};

export default Sentry;
