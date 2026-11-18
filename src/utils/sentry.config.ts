import type * as SentryNS from "@sentry/react";

/**
 * Sentry, loaded after the page is up instead of in the startup bundle.
 *
 * @sentry/react is ~95 KB gzipped. Imported statically it sat in the entry
 * chunk every visitor downloads before the first paint, although nothing
 * needs it until something goes wrong. It is now fetched once the window
 * `load` event has fired and the browser is idle.
 *
 * Every helper below keeps its old signature. Calls made before Sentry has
 * loaded are queued and replayed in order once it is ready, so an early error
 * or the signed-in user is not lost. When Sentry is not enabled (development,
 * or no valid DSN) the queue is dropped and the package is never downloaded.
 */

type SentryModule = typeof SentryNS;
type Call = (s: SentryModule) => void;

let sentry: SentryModule | null = null;
let state: "pending" | "loading" | "ready" | "off" = "pending";
const queue: Call[] = [];
const MAX_QUEUE = 50;

function run(call: Call) {
  if (state === "off") return;
  if (sentry) {
    call(sentry);
    return;
  }
  if (queue.length < MAX_QUEUE) queue.push(call);
}

function whenIdleAfterLoad(fn: () => void) {
  const idle = () => {
    const ric = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (ric) ric(fn, { timeout: 3000 });
    else setTimeout(fn, 1);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}

function beforeSend(event: SentryNS.ErrorEvent, hint: SentryNS.EventHint) {
  const error = hint.originalException;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    // User-initiated aborts and wallet rejections are not bugs.
    if (error.message.includes("AbortError")) return null;
    if (error.message.includes("User rejected") || error.message.includes("User denied")) return null;
  }
  return event;
}

// Initialize Sentry only in production
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || "development";

  // A valid Sentry DSN is exactly https://<publicKey>@<host>/<projectId>.
  // Guard against a malformed value (e.g. the project URL accidentally
  // concatenated with the DSN) so Sentry doesn't spam the console with CORS
  // and 404 envelope errors against a broken endpoint.
  const isValidDsn = typeof dsn === "string" && /^https:\/\/[^@/]+@[^/]+\/\d+$/.test(dsn.trim());

  if (!isValidDsn || environment === "development") {
    state = "off";
    queue.length = 0;
    console.log("[Sentry] Skipped initialization (development mode or no DSN)");
    return;
  }

  if (state !== "pending") return;
  state = "loading";

  whenIdleAfterLoad(() => {
    import("@sentry/react")
      .then((mod) => {
        mod.init({
          dsn,
          environment,
          tracesSampleRate: environment === "production" ? 0.1 : 1.0, // 10% in prod, 100% in staging
          beforeSend,
        });
        sentry = mod;
        state = "ready";
        for (const call of queue.splice(0)) call(mod);
        console.log(
          `[Sentry] Initialized in ${environment} mode with trace sample rate: ${
            environment === "production" ? "10%" : "100%"
          }`
        );
      })
      .catch((err) => {
        // Monitoring must never break the app (e.g. the chunk is blocked).
        state = "off";
        queue.length = 0;
        console.warn("[Sentry] Failed to load", err);
      });
  });
};

// Only the account id reaches Sentry: name and email are personal data the
// privacy notice doesn't cover, and the id is enough to find the account.
export const setSentryUser = (user: { id: string }) => {
  run((s) => s.setUser({ id: user.id }));
};

// Helper to clear user context on logout
export const clearSentryUser = () => {
  run((s) => s.setUser(null));
};

// Helper to capture custom errors
export const captureError = (error: unknown, context?: Record<string, unknown>) => {
  // A scope per error, so one report's context never leaks into the next.
  run((s) =>
    s.withScope((scope) => {
      if (context) scope.setContext("additional", context);
      s.captureException(error);
    })
  );
};

// Helper to capture custom messages
export const captureMessage = (message: string, level: "info" | "warning" | "error" = "info") => {
  run((s) => s.captureMessage(message, level));
};

// Helper to add breadcrumb
export const addBreadcrumb = (
  message: string,
  category: string,
  level: "info" | "warning" | "error" = "info"
) => {
  const timestamp = Date.now() / 1000;
  run((s) => s.addBreadcrumb({ message, category, level, timestamp }));
};
