// Deployment configuration checks.
//
// Two failures motivated this module. A production boot with AUTH_SECRET or
// IP_HASH_SALT unset starts happily and silently weakens security. And a
// NEXT_PUBLIC_APP_URL pointing at the wrong origin sends payment callbacks to
// somewhere that is not this app, so payments never settle and nothing
// anywhere reports an error.
//
// The rules are pure functions over a plain environment object so they can be
// tested without spawning a server.

export type EnvIssue = { key: string; message: string };
export type EnvReport = { errors: EnvIssue[]; warnings: EnvIssue[] };

export type EnvMode = "production" | "development";

type Env = Record<string, string | undefined>;

function value(env: Env, key: string): string | undefined {
  const v = env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

/**
 * Inspect an environment for missing or dangerous configuration.
 *
 * Errors are fatal in production. Warnings are always advisory — a
 * development machine legitimately runs without SMTP or a payment provider.
 */
export function checkEnv(env: Env, mode: EnvMode): EnvReport {
  const errors: EnvIssue[] = [];
  const warnings: EnvIssue[] = [];
  const production = mode === "production";

  if (!value(env, "DATABASE_URL")) {
    errors.push({ key: "DATABASE_URL", message: "No database connection string." });
  }

  // Short secrets are worse than absent ones: they look configured.
  const authSecret = value(env, "AUTH_SECRET");
  if (!authSecret) {
    errors.push({ key: "AUTH_SECRET", message: "Session JWTs cannot be signed without it." });
  } else if (authSecret.length < 32) {
    const issue = { key: "AUTH_SECRET", message: "Use at least 32 characters." };
    (production ? errors : warnings).push(issue);
  }

  const salt = value(env, "IP_HASH_SALT");
  if (!salt) {
    const issue = {
      key: "IP_HASH_SALT",
      message: "Scanner IPs would be hashed with an empty salt.",
    };
    (production ? errors : warnings).push(issue);
  }

  const appUrl = value(env, "NEXT_PUBLIC_APP_URL");
  if (!appUrl) {
    const issue = {
      key: "NEXT_PUBLIC_APP_URL",
      message: "QR codes and payment callbacks need the public origin.",
    };
    (production ? errors : warnings).push(issue);
  } else {
    let parsed: URL | null = null;
    try {
      parsed = new URL(appUrl);
    } catch {
      errors.push({ key: "NEXT_PUBLIC_APP_URL", message: "Not a valid absolute URL." });
    }
    if (parsed && production && parsed.protocol !== "https:") {
      errors.push({ key: "NEXT_PUBLIC_APP_URL", message: "Must be https in production." });
    }
    if (parsed && production && /^localhost$|^127\./.test(parsed.hostname)) {
      errors.push({ key: "NEXT_PUBLIC_APP_URL", message: "Still points at localhost." });
    }
  }

  // The demo gateway settles payments without taking money. config.ts already
  // refuses it when PAYMENT_MODE is live; this catches the likelier mistake of
  // deploying to production having never set PAYMENT_MODE at all.
  if (production && value(env, "PAYMENT_MODE") !== "live") {
    errors.push({
      key: "PAYMENT_MODE",
      message: 'Must be "live" in production, or the demo gateway fulfils orders for free.',
    });
  }

  if (!value(env, "SMTP_HOST")) {
    warnings.push({
      key: "SMTP_HOST",
      message: "No mail transport: relay messages and scan alerts will not be delivered.",
    });
  }

  if (production && !value(env, "MAINTENANCE_SECRET")) {
    warnings.push({
      key: "MAINTENANCE_SECRET",
      message: "/api/maintenance is disabled, so expiry warnings never run.",
    });
  }

  return { errors, warnings };
}

/**
 * Whether the request's own origin disagrees with the configured one.
 *
 * This is the check that would have caught a payment callback being handed to
 * a different app listening on the port NEXT_PUBLIC_APP_URL names. Returns a
 * message to log, or null when they agree.
 */
export function appUrlMismatch(requestHost: string | null, configuredUrl: string): string | null {
  if (!requestHost) return null;

  let configuredHost: string;
  try {
    configuredHost = new URL(configuredUrl).host;
  } catch {
    return `NEXT_PUBLIC_APP_URL is not a valid URL: ${configuredUrl}`;
  }

  if (requestHost.toLowerCase() === configuredHost.toLowerCase()) return null;

  return (
    `This app is being served from ${requestHost}, but NEXT_PUBLIC_APP_URL says ` +
    `${configuredHost}. QR codes and payment callbacks will point at ${configuredHost} — ` +
    `if something else is listening there, payments will never settle.`
  );
}

/**
 * Validate the running process's environment, throwing in production.
 *
 * Called from instrumentation.ts, so a misconfigured production deployment
 * fails at boot rather than at the first customer's checkout.
 */
export function assertEnv(env: Env = process.env, mode?: EnvMode): EnvReport {
  const resolved: EnvMode = mode ?? (env.NODE_ENV === "production" ? "production" : "development");
  const report = checkEnv(env, resolved);

  for (const w of report.warnings) {
    console.warn(`[env] ${w.key}: ${w.message}`);
  }

  if (report.errors.length > 0) {
    const detail = report.errors.map((e) => `  - ${e.key}: ${e.message}`).join("\n");
    if (resolved === "production") {
      throw new Error(`Refusing to start with an invalid environment:\n${detail}`);
    }
    console.warn(`[env] configuration problems:\n${detail}`);
  }

  return report;
}
