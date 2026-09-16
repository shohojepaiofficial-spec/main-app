import * as Sentry from "@sentry/node";

// Same "zero-config-required, shows as not connected until keys added"
// pattern as sms.ts/meta.ts/x.ts — this app has no error-monitoring service
// wired up yet, so every path here has to degrade to a plain console.error
// rather than assume Sentry (or any DSN) exists.
export function isErrorMonitoringConfigured(): boolean {
  return !!process.env.SENTRY_DSN;
}

export function initErrorMonitoring() {
  if (!isErrorMonitoringConfigured()) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    // No performance tracing by default — this is just exception capture,
    // enabling tracing is a separate, deliberate cost/volume decision.
    tracesSampleRate: 0,
  });
}

// Always logs to the console (so local dev never loses visibility even
// without a DSN); reports to Sentry on top of that only once one is
// configured. Call this from anywhere an error is caught and handled rather
// than left to crash the process — the Express error handler, and the
// process-level uncaughtException/unhandledRejection safety net in
// server.ts.
export function reportError(err: unknown, context?: Record<string, unknown>) {
  console.error(err, context ?? "");
  if (isErrorMonitoringConfigured()) {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  }
}
