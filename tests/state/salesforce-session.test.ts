import {
  clearSalesforceSession,
  getDisplayName,
  getSalesforceCredentials,
  getSalesforceSession,
  hasSalesforceCredentials,
  normalizeSalesforceInstanceUrl,
  saveDisplayName,
  saveSalesforceCredentials,
  SALESFORCE_SESSION_CHANGE_EVENT,
  subscribeToSalesforceSessionChanges,
} from "@/state/salesforce-session";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Salesforce session storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("stores credentials and self-reported identity for this tab only", () => {
    const persistentStorageWrite = vi.spyOn(window.localStorage, "setItem");

    saveSalesforceCredentials({
      sessionId: "  FAKE_SESSION_TOKEN_DO_NOT_LOG  ",
      instanceUrl: "https://example.my.salesforce.com/",
    });
    saveDisplayName("  Ada Example  ");

    expect(getSalesforceSession()).toEqual({
      sessionId: "FAKE_SESSION_TOKEN_DO_NOT_LOG",
      instanceUrl: "https://example.my.salesforce.com",
      displayName: "Ada Example",
    });
    expect(persistentStorageWrite).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain("FAKE_SESSION_TOKEN_DO_NOT_LOG");
  });

  it("clears every session value on explicit logout", () => {
    saveSalesforceCredentials({
      sessionId: "FAKE_SESSION_TOKEN_DO_NOT_LOG",
      instanceUrl: "https://example.my.salesforce.com",
    });
    saveDisplayName("Ada Example");

    clearSalesforceSession();

    expect(getSalesforceCredentials()).toBeNull();
    expect(getDisplayName()).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("provides a value-free change signal and boolean React snapshot", () => {
    const listener = vi.fn();
    const capturedEvents: Event[] = [];
    const capture = (event: Event) => capturedEvents.push(event);
    window.addEventListener(SALESFORCE_SESSION_CHANGE_EVENT, capture);
    const unsubscribe = subscribeToSalesforceSessionChanges(listener);

    expect(hasSalesforceCredentials()).toBe(false);
    saveSalesforceCredentials({
      sessionId: "FAKE_SESSION_TOKEN_DO_NOT_LOG",
      instanceUrl: "https://example.my.salesforce.com",
    });
    expect(hasSalesforceCredentials()).toBe(true);
    saveDisplayName("Ada Example");
    clearSalesforceSession();
    expect(hasSalesforceCredentials()).toBe(false);

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener.mock.calls).toEqual([[], [], []]);
    expect(capturedEvents).toHaveLength(3);
    expect(capturedEvents.every((event) => !("detail" in event))).toBe(true);

    unsubscribe();
    window.removeEventListener(SALESFORCE_SESSION_CHANGE_EVENT, capture);
  });

  it("only accepts HTTPS Salesforce-owned instance origins", () => {
    expect(
      normalizeSalesforceInstanceUrl(
        "https://example.sandbox.my.salesforce.com/path",
      ),
    ).toBe("https://example.sandbox.my.salesforce.com");

    expect(() =>
      normalizeSalesforceInstanceUrl("https://attacker.example"),
    ).toThrow("valid HTTPS Salesforce instance URL");
    expect(() =>
      normalizeSalesforceInstanceUrl("http://example.my.salesforce.com"),
    ).toThrow("valid HTTPS Salesforce instance URL");
  });
});
