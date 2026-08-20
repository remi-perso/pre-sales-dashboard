import {
  InvalidSalesforceRequestError,
  salesforceFetch,
  SalesforceRequestError,
  SalesforceSessionExpiredError,
} from "@/salesforce/client";
import {
  getSalesforceSession,
  saveDisplayName,
  saveSalesforceCredentials,
  subscribeToSalesforceSessionChanges,
  subscribeToSalesforceSessionExpiry,
} from "@/state/salesforce-session";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const FAKE_TOKEN = "FAKE_SESSION_TOKEN_DO_NOT_LOG";

describe("browser-only Salesforce fetch", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    saveSalesforceCredentials({
      sessionId: FAKE_TOKEN,
      instanceUrl: "https://example.my.salesforce.com",
    });
    saveDisplayName("Ada Example");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("uses a read-only Bearer request without browser credentials", async () => {
    const fetchMock = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ records: [] })));

    await expect(
      salesforceFetch("/services/data/v65.0/query?q=SELECT%20Id"),
    ).resolves.toEqual({ records: [] });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://example.my.salesforce.com/services/data/v65.0/query?q=SELECT%20Id",
    );
    expect(init?.method).toBe("GET");
    expect(init?.credentials).toBe("omit");
    expect(init?.cache).toBe("no-store");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      `Bearer ${FAKE_TOKEN}`,
    );
  });

  it("clears the whole session before emitting a safe expiry signal on 401", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: `echo ${FAKE_TOKEN}` }), {
        status: 401,
      }),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const observer = vi.fn(() => {
      expect(getSalesforceSession()).toBeNull();
    });
    const changeObserver = vi.fn();
    const unsubscribe = subscribeToSalesforceSessionExpiry(observer);
    const unsubscribeChanges =
      subscribeToSalesforceSessionChanges(changeObserver);

    let thrown: unknown;
    try {
      await salesforceFetch("/services/data/v65.0/query?q=SELECT%20Id");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(SalesforceSessionExpiredError);
    expect((thrown as Error).message).not.toContain(FAKE_TOKEN);
    expect(getSalesforceSession()).toBeNull();
    expect(observer).toHaveBeenCalledWith({ reason: "unauthorized" });
    expect(changeObserver).toHaveBeenCalledWith();
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    unsubscribe();
    unsubscribeChanges();
  });

  it("never exposes an error response body", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: `echo ${FAKE_TOKEN}` }), {
        status: 500,
      }),
    );

    let thrown: unknown;
    try {
      await salesforceFetch("/services/data/v65.0/query?q=SELECT%20Id");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(SalesforceRequestError);
    expect((thrown as Error).message).not.toContain(FAKE_TOKEN);
  });

  it("rejects absolute or non-REST paths before a token can be sent", async () => {
    const fetchMock = vi.spyOn(window, "fetch");

    await expect(
      salesforceFetch("https://attacker.example/collect"),
    ).rejects.toBeInstanceOf(InvalidSalesforceRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
