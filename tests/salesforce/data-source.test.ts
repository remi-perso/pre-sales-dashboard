import {
  salesforceFetch,
  SalesforceRequestError,
  SalesforceSessionExpiredError,
} from "@/salesforce/client";
import {
  FixtureSalesforceDataSource,
  LiveSalesforceDataSource,
  type SalesforceDataSource,
} from "@/salesforce/data-source";
import { SF_FIELDS } from "@/salesforce/fields";
import type { SalesforceOpportunityRecord } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/salesforce/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/salesforce/client")>();
  return { ...original, salesforceFetch: vi.fn() };
});

const fetchMock = vi.mocked(salesforceFetch);

function fixtureRecord(id = "006-fixture"): SalesforceOpportunityRecord {
  return {
    [SF_FIELDS.id]: id,
    [SF_FIELDS.name]: "Fixture opportunity",
    [SF_FIELDS.productLine]: "Okta",
    [SF_FIELDS.region]: "UKI",
  };
}

function expectSharedInterface(source: SalesforceDataSource): void {
  expect(typeof source.loadOpportunities).toBe("function");
  expect(typeof source.getFiscalYearStartMonth).toBe("function");
}

describe("Salesforce data sources", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("provides the same snapshot/fiscal interface for fixture mode", async () => {
    const source = new FixtureSalesforceDataSource({
      records: [fixtureRecord()],
      now: () => new Date("2026-08-20T12:00:00.000Z"),
    });
    expectSharedInterface(source);

    await expect(source.loadOpportunities()).resolves.toMatchObject({
      source: "fixtures",
      syncedAt: "2026-08-20T12:00:00.000Z",
      totalSize: 1,
      opportunities: [{ id: "006-fixture", name: "Fixture opportunity" }],
    });
    await expect(source.getFiscalYearStartMonth(2)).resolves.toEqual({
      month: 2,
      source: "configured-fallback",
    });
  });

  it("paginates live read results and maps nested API records", async () => {
    fetchMock
      .mockResolvedValueOnce({
        totalSize: 2,
        done: false,
        nextRecordsUrl: "/services/data/v65.0/query/next-page",
        records: [
          {
            Id: "006-live-1",
            Name: "Live one",
            Owner: { Name: "Owner one" },
          },
        ],
      })
      .mockResolvedValueOnce({
        totalSize: 2,
        done: true,
        records: [{ Id: "006-live-2", Name: "Live two" }],
      });
    const source = new LiveSalesforceDataSource({
      apiVersion: "v65.0",
      now: () => new Date("2026-08-20T12:00:00.000Z"),
    });
    expectSharedInterface(source);

    const snapshot = await source.loadOpportunities();

    expect(snapshot).toMatchObject({
      source: "live",
      syncedAt: "2026-08-20T12:00:00.000Z",
      totalSize: 2,
    });
    expect(snapshot.opportunities.map(({ id }) => id)).toEqual([
      "006-live-1",
      "006-live-2",
    ]);
    expect(snapshot.opportunities[0]?.ownerName).toBe("Owner one");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/services/data/v65.0/query/next-page",
      { signal: undefined },
    );
  });

  it("uses a visibly attributed fallback when Organization is not queryable", async () => {
    fetchMock.mockRejectedValue(new SalesforceRequestError(403));
    const source = new LiveSalesforceDataSource({ apiVersion: "v65.0" });

    await expect(source.getFiscalYearStartMonth(4)).resolves.toEqual({
      month: 4,
      source: "configured-fallback",
    });
  });

  it("does not hide an authentication failure behind the fiscal fallback", async () => {
    fetchMock.mockRejectedValue(new SalesforceSessionExpiredError());
    const source = new LiveSalesforceDataSource({ apiVersion: "v65.0" });

    await expect(source.getFiscalYearStartMonth(2)).rejects.toBeInstanceOf(
      SalesforceSessionExpiredError,
    );
  });
});
