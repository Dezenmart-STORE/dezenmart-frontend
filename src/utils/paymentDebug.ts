/**
 * Payment flow debugger - dev-only, tree-shaken in production.
 */

const IS_DEV = import.meta.env.DEV;

interface DebugStep {
  step: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

class PaymentDebugger {
  private sessionId = "";
  private steps: DebugStep[] = [];

  startSession(context: string): string {
    this.sessionId = `pay_${Date.now().toString(36)}`;
    this.steps = [];
    this.log("session:start", { context, sessionId: this.sessionId });
    return this.sessionId;
  }

  log(step: string, data?: Record<string, unknown>): void {
    if (!IS_DEV) return;
    const entry: DebugStep = { step, data, timestamp: Date.now() };
    this.steps.push(entry);
    console.debug(`[Payment:${this.sessionId}] ${step}`, data ?? "");
  }

  error(step: string, error: unknown, data?: Record<string, unknown>): void {
    if (!IS_DEV) return;
    console.error(`[Payment:${this.sessionId}] ERROR at ${step}`, {
      error,
      ...data,
    });
    this.steps.push({
      step: `ERROR:${step}`,
      data: { error: String(error), ...data },
      timestamp: Date.now(),
    });
  }

  getTrace(): DebugStep[] {
    return [...this.steps];
  }

  getDuration(): number {
    if (this.steps.length < 2) return 0;
    return this.steps[this.steps.length - 1].timestamp - this.steps[0].timestamp;
  }
}

// Singleton - components just import and use
export const paymentDebug = new PaymentDebugger();

// Expose in dev console for manual inspection
if (IS_DEV && typeof window !== "undefined") {
  (window as any).__paymentDebug = paymentDebug;
}
