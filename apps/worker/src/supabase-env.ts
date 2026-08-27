/**
 * Reads and validates the Supabase environment variables this workspace needs.
 *
 * Deliberately strict: a missing or malformed value throws immediately with a
 * message naming the offending variable. Silent fallbacks here would surface
 * much later as confusing 401s or "relation does not exist" errors.
 *
 * Error messages and the descriptors below never include a key's value — they
 * are surfaced in test failures and CI logs, which must stay safe to paste.
 *
 * Scope note: only hosted `*.supabase.co` projects are accepted. A self-hosted
 * instance or a project on a Supabase custom domain would need the hostname
 * check in `validateUrl` relaxed.
 */

/** Server-side credentials. This is all apps/worker needs at runtime. */
export interface SupabaseServerEnv {
  url: string;
  serviceRoleKey: string;
}

/** Server credentials plus the browser-safe client key. */
export interface SupabaseEnv extends SupabaseServerEnv {
  anonKey: string;
}

/** Shape of a Supabase API key, used for validation and for safe reporting. */
export type KeyShape = "jwt" | "sb_publishable" | "sb_secret" | "unknown";

/**
 * Classifies a key without revealing it. Supabase is migrating from legacy JWT
 * keys (`eyJ...`) to the newer `sb_publishable_` / `sb_secret_` format, so both
 * are accepted. The length floors reject truncated pastes, which would
 * otherwise pass validation and fail much later as a runtime 401.
 */
export function describeKeyShape(key: string): KeyShape {
  if (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) return "sb_publishable";
  if (/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(key)) return "sb_secret";
  // A JWT is three non-empty base64url segments; Supabase's legacy keys start with "eyJ".
  const segments = key.split(".");
  if (key.startsWith("eyJ") && segments.length === 3 && segments.every((s) => s.length > 0)) {
    return "jwt";
  }
  return "unknown";
}

function requireVar(name: string, raw: string | undefined): string {
  if (raw === undefined) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env at the repo root and fill it in ` +
        `from your Supabase project's Settings > API page.`,
    );
  }
  if (raw !== raw.trim()) {
    throw new Error(
      `${name} has leading or trailing whitespace. dotenv already trims unquoted .env ` +
        `values, so check for quotes around a padded value — or for the shell or CI ` +
        `environment that set it.`,
    );
  }
  if (raw === "") {
    throw new Error(`${name} is set but empty. Fill it in from your Supabase project's Settings > API page.`);
  }
  return raw;
}

function validateUrl(name: string, raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${name} is not a valid URL. Expected the form https://<project-ref>.supabase.co`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`${name} must use https, got protocol "${parsed.protocol}".`);
  }
  if (!parsed.hostname.endsWith(".supabase.co")) {
    throw new Error(`${name} host must end in .supabase.co, got "${parsed.hostname}".`);
  }
  // Anything beyond the bare origin means a dashboard URL was pasted instead of
  // the API URL. Left unchecked it silently produces a broken base for every
  // request; embedded credentials would additionally ride along on each fetch.
  if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password || parsed.port) {
    throw new Error(
      `${name} must be just the project origin, with no path, query, port, or credentials. ` +
        `Expected https://<project-ref>.supabase.co`,
    );
  }
  // `origin` normalises case and drops the trailing slash.
  return parsed.origin;
}

function validateKey(name: string, raw: string): KeyShape {
  const shape = describeKeyShape(raw);
  if (shape === "unknown") {
    throw new Error(
      `${name} is not a recognised Supabase key. Expected a JWT (eyJ...) or an ` +
        `sb_publishable_/sb_secret_ key. Value withheld — check .env against Settings > API.`,
    );
  }
  return shape;
}

/**
 * Validates the server-side pair against an explicit source. Exported so tests
 * can exercise the failure paths without mutating process.env.
 */
export function parseServerEnv(source: Record<string, string | undefined>): SupabaseServerEnv {
  const url = validateUrl("NEXT_PUBLIC_SUPABASE_URL", requireVar("NEXT_PUBLIC_SUPABASE_URL", source.NEXT_PUBLIC_SUPABASE_URL));
  const serviceRoleKey = requireVar("SUPABASE_SERVICE_ROLE_KEY", source.SUPABASE_SERVICE_ROLE_KEY);

  // A swapped pair is the dangerous misconfiguration: NEXT_PUBLIC_ variables are
  // inlined into the browser bundle by Next.js, so a secret key in the client
  // slot ships to every visitor. Catch it here rather than in a breach report.
  // Legacy JWTs can't be told apart by shape alone, so they stay untiered.
  if (validateKey("SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey) === "sb_publishable") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY holds an sb_publishable_ (client) key; expected the " +
        "secret server key. The two keys are likely swapped.",
    );
  }

  return { url, serviceRoleKey };
}

/** Validates all three variables against an explicit source. */
export function parseSupabaseEnv(source: Record<string, string | undefined>): SupabaseEnv {
  const server = parseServerEnv(source);
  const anonKey = requireVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", source.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (validateKey("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey) === "sb_secret") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY holds an sb_secret_ key. Next.js inlines that " +
        "variable into the browser bundle, so it must hold the publishable (client) " +
        "key. The two keys are likely swapped.",
    );
  }

  if (anonKey === server.serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are identical. " +
        "These are different keys — one was likely pasted over the other.",
    );
  }

  return { ...server, anonKey };
}

/**
 * Server-side accessor for apps/worker. Deliberately does NOT require the client
 * key: the worker never uses it, and .github/workflows/worker.yml does not
 * supply it.
 */
export function requireServerEnv(): SupabaseServerEnv {
  return parseServerEnv(process.env);
}

/** Validates all three ambient variables. Used by tests and by client-side callers. */
export function requireSupabaseEnv(): SupabaseEnv {
  return parseSupabaseEnv(process.env);
}
