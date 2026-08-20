import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("DB-only routes without database configuration", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a clear 503 from the mappings endpoint", async () => {
    const { GET } = await import("../../app/api/ae-mappings/route");
    const response = await GET(
      new NextRequest("http://localhost/api/ae-mappings"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "DATABASE_NOT_CONFIGURED" },
    });
  });

  it("returns a clear 503 from the category endpoint", async () => {
    const { GET } = await import("../../app/api/category-overrides/route");
    const response = await GET(
      new NextRequest("http://localhost/api/category-overrides"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "DATABASE_NOT_CONFIGURED" },
    });
  });
});
