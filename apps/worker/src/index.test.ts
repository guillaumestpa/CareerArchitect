import { describe, expect, it } from "vitest";

describe("worker entrypoint smoke test", () => {
  it("runs without throwing", async () => {
    await expect(import("./index.js")).resolves.toBeDefined();
  });
});
