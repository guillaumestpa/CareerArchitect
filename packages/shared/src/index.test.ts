import { describe, expect, it } from "vitest";
import type { Ad } from "./index.js";

describe("shared package smoke test", () => {
  it("builds a stub Ad shape without throwing", () => {
    const ad: Ad = {
      dedupKey: "stub",
      company: "stub",
      firstSeenAt: "2024-01-01T00:00:00.000Z",
      lastSeenAt: "2024-01-01T00:00:00.000Z",
      rawContent: "stub",
      stale: false,
    };

    expect(ad.dedupKey).toBe("stub");
  });
});
