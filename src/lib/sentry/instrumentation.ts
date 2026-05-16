/**
 * Sentry instrumentation helper.
 *
 * MVP: usa console.error + structured logs. Quando SENTRY_DSN
 * estiver setado, substitui por Sentry SDK real.
 *
 * Pra ativar Sentry real:
 * 1. npm install @sentry/nextjs
 * 2. npx @sentry/wizard@latest -i nextjs
 * 3. Setar SENTRY_DSN nas envs
 */

export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  siteId?: string;
  postId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export function captureError(error: Error | unknown, context?: ErrorContext) {
  const err = error instanceof Error ? error : new Error(String(error));
  const dsn = process.env.SENTRY_DSN;

  // Log estruturado (vai pro Vercel logs)
  console.error("[ERROR]", {
    message: err.message,
    stack: err.stack,
    name: err.name,
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? "local",
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    ...context,
  });

  // TODO: quando Sentry estiver ativo
  if (dsn) {
    // Sentry.captureException(err, { tags: context?.tags, extra: context?.extra, user: { id: context?.userId } });
  }
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: ErrorContext) {
  console.log(`[${level.toUpperCase()}]`, {
    message,
    timestamp: new Date().toISOString(),
    ...context,
  });
}

export function setUserContext(user: { id: string; email?: string; organizationId?: string } | null) {
  // TODO: Sentry.setUser
  if (!user) return;
  // Sentry.setUser({ id: user.id, email: user.email });
}

/**
 * Wrap async function com error capture.
 */
export function withErrorCapture<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (err) {
      captureError(err, context);
      throw err;
    }
  }) as T;
}
