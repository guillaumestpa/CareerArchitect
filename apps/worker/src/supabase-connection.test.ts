import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  describeKeyShape,
  parseServerEnv,
  parseSupabaseEnv,
  requireServerEnv,
  requireSupabaseEnv,
} from "./supabase-env.js";

// Scope: "is the Supabase project correctly provisioned and reachable from code".
// No schema, data model, or business logic is asserted here — none exists yet.
//
// SECRET SAFETY: never assert on a key's value. A failing `expect(key).toMatch(...)`
// prints the received value into the test output. Every assertion below runs over a
// derived descriptor (shape, status, boolean) instead.

const PUBLISHABLE = "sb_publishable_0123456789abcdefghijklmnopq";
const SECRET = "sb_secret_0123456789abcdefghijklmnopq";
const VALID = {
  NEXT_PUBLIC_SUPABASE_URL: "https://examplerefexampleref.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: PUBLISHABLE,
  SUPABASE_SERVICE_ROLE_KEY: SECRET,
};

describe("Supabase env vars", () => {
  it("are present and well-formed in the current environment", () => {
    // Fails loudly with a message naming the offending variable if .env is
    // missing or incomplete. This is the guard the task asked for.
    const env = requireSupabaseEnv();

    expect(new URL(env.url).hostname.endsWith(".supabase.co")).toBe(true);
    expect(describeKeyShape(env.anonKey)).not.toBe("unknown");
    expect(describeKeyShape(env.serviceRoleKey)).not.toBe("unknown");
    expect(env.anonKey === env.serviceRoleKey).toBe(false);
  });

  it("expose a server-only accessor that does not require the client key", () => {
    // apps/worker never uses the client key, and worker.yml does not supply it.
    const serverOnly = { ...VALID, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined };
    expect(() => parseServerEnv(serverOnly)).not.toThrow();
    expect(() => parseSupabaseEnv(serverOnly)).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY is not set/);
    expect(requireServerEnv().url).toBe(requireSupabaseEnv().url);
  });

  it.each([
    ["NEXT_PUBLIC_SUPABASE_URL", "is not set"],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "is not set"],
    ["SUPABASE_SERVICE_ROLE_KEY", "is not set"],
  ])("throws naming %s when it is missing", (key, expected) => {
    expect(() => parseSupabaseEnv({ ...VALID, [key]: undefined })).toThrow(
      new RegExp(`${key}.*${expected}`),
    );
  });

  it("throws when a variable is set but empty", () => {
    expect(() => parseSupabaseEnv({ ...VALID, SUPABASE_SERVICE_ROLE_KEY: "" })).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY is set but empty/,
    );
  });

  it("throws when the URL is malformed or not https", () => {
    expect(() => parseSupabaseEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL is not a valid URL/,
    );
    expect(() =>
      parseSupabaseEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_URL: "http://abc.supabase.co" }),
    ).toThrow(/must use https/);
  });

  it.each([
    ["a lookalike host", "https://evil-supabase.co"],
    ["a suffix-confusion host", "https://abc.supabase.co.evil.com"],
    ["userinfo confusion", "https://abc.supabase.co@evil.com"],
  ])("rejects %s", (_label, url) => {
    expect(() => parseSupabaseEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_URL: url })).toThrow(
      /must end in \.supabase\.co/,
    );
  });

  it.each([
    ["a dashboard path", "https://abc.supabase.co/project/xyz/settings/api"],
    ["a query string", "https://abc.supabase.co/?foo=bar"],
    ["a fragment", "https://abc.supabase.co#frag"],
    ["a port", "https://abc.supabase.co:1234"],
    ["embedded credentials", "https://user:pw@abc.supabase.co"],
  ])("rejects a URL carrying %s", (_label, url) => {
    expect(() => parseSupabaseEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_URL: url })).toThrow(
      /must be just the project origin/,
    );
  });

  it("normalises a bare origin with a trailing slash", () => {
    const env = parseSupabaseEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co/" });
    expect(env.url).toBe("https://abc.supabase.co");
  });

  it("throws when a key has surrounding whitespace", () => {
    expect(() =>
      parseSupabaseEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_ANON_KEY: ` ${PUBLISHABLE}\n` }),
    ).toThrow(/leading or trailing whitespace/);
  });

  it.each([
    ["gibberish", "hunter2"],
    ["a truncated secret key", "sb_secret_"],
    ["a truncated publishable key", "sb_publishable_"],
    ["a degenerate JWT", "eyJ.."],
  ])("throws when a key is %s", (_label, bad) => {
    expect(() => parseSupabaseEnv({ ...VALID, SUPABASE_SERVICE_ROLE_KEY: bad })).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY is not a recognised Supabase key/,
    );
  });

  it("throws when the client and server keys are swapped", () => {
    // The dangerous case: NEXT_PUBLIC_ vars are inlined into the browser bundle,
    // so a secret key in the client slot would ship to every visitor.
    expect(() =>
      parseSupabaseEnv({
        ...VALID,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: SECRET,
        SUPABASE_SERVICE_ROLE_KEY: PUBLISHABLE,
      }),
    ).toThrow(/likely swapped/);
  });

  it("throws when a secret key sits in the browser-exposed variable", () => {
    expect(() =>
      parseSupabaseEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_ANON_KEY: `${SECRET}x` }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY holds an sb_secret_ key/);
  });

  it("throws when the client and server keys are identical", () => {
    expect(() =>
      parseSupabaseEnv({ ...VALID, SUPABASE_SERVICE_ROLE_KEY: PUBLISHABLE }),
    ).toThrow(/are identical|likely swapped/);
  });

  it.each([
    ["malformed", "definitely-not-a-key-value"],
    ["whitespace-padded", ` ${SECRET} `],
    ["swapped into the server slot", PUBLISHABLE],
  ])("does not leak the key value when it is %s", (_label, bad) => {
    // The bad value must be the one that triggers the throw, otherwise this test
    // is vacuous: validation short-circuits on the first failing variable.
    try {
      parseSupabaseEnv({ ...VALID, SUPABASE_SERVICE_ROLE_KEY: bad });
      expect.unreachable("expected a validation error");
    } catch (error) {
      expect((error as Error).message.includes(bad.trim())).toBe(false);
    }
  });
});

describe("Supabase project reachability", () => {
  // Resolved lazily per test: calling this at describe scope would run during
  // collection and take the whole file down, hiding the env tests above.
  const env = () => requireSupabaseEnv();

  // Endpoint choice matters, and two distinct behaviours are used for two jobs:
  //   - /auth/v1/health and /rest/v1/<missing table> answer for ANY valid key
  //     tier, so they prove reachability + authentication. A bogus key gets 401.
  //   - /rest/v1/ (PostgREST root) requires a SECRET-tier key, so it 401s for a
  //     valid client key. That asymmetry is what proves each key is the tier its
  //     variable name promises — see the tier test below.
  // None of this needs a schema, which suits an empty project.
  const KEYS: [string, () => string][] = [
    ["client key", () => env().anonKey],
    ["server key", () => env().serviceRoleKey],
  ];

  it.each(KEYS)("answers the auth health endpoint with the %s", async (_label, getKey) => {
    const response = await fetch(`${env().url}/auth/v1/health`, {
      headers: { apikey: getKey() },
    });

    // Status only — never the key or the body.
    expect(response.status).toBe(200);
  });

  it.each(KEYS)("authenticates against PostgREST with the %s", async (_label, getKey) => {
    const response = await fetch(`${env().url}/rest/v1/__career_architect_probe__?select=*`, {
      headers: { apikey: getKey() },
    });

    expect(response.status).toBe(404);
  });

  it("confirms each key is the privilege tier its variable name promises", async () => {
    const { url, anonKey, serviceRoleKey } = env();
    const root = (key: string) => fetch(`${url}/rest/v1/`, { headers: { apikey: key } });

    // The PostgREST root is secret-tier only. Equal or reversed statuses here
    // would mean the keys are swapped or mis-provisioned.
    const [client, server] = await Promise.all([root(anonKey), root(serviceRoleKey)]);

    expect(client.status).toBe(401);
    expect(server.status).toBe(200);
  });

  it("rejects a bogus key, proving the endpoint really is authenticating", async () => {
    const response = await fetch(`${env().url}/rest/v1/__career_architect_probe__?select=*`, {
      headers: { apikey: "sb_secret_bogus" },
    });

    expect(response.status).toBe(401);
  });

  it("reaches the project through a supabase-js client", async () => {
    const { url, serviceRoleKey } = env();
    const client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // No tables exist yet, so query one that is guaranteed not to exist. A
    // "relation not found" response is a *success* signal here: the request
    // reached PostgREST and was authenticated. An auth failure or a network
    // error would look entirely different.
    const { error, status } = await client
      .from("__career_architect_probe__")
      .select("*")
      .limit(1);

    expect(error).not.toBeNull();
    expect([401, 403]).not.toContain(status);
    // PGRST205 = table not found in schema cache; 42P01 = undefined_table.
    expect(["PGRST205", "42P01"]).toContain(error?.code);
  });
});
