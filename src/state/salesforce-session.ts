"use client";

import "client-only";

/**
 * Salesforce credentials deliberately live outside the generic Zustand store.
 * Keeping this module small makes the session-storage-only boundary easy to audit.
 */

const STORAGE_KEYS = {
  sessionId: "presales.salesforce.session-id",
  instanceUrl: "presales.salesforce.instance-url",
  displayName: "presales.user.display-name",
} as const;

export const SALESFORCE_SESSION_EXPIRED_EVENT =
  "presales:salesforce-session-expired";
export const SALESFORCE_SESSION_CHANGE_EVENT =
  "presales:salesforce-session-change";

export interface SalesforceCredentials {
  sessionId: string;
  instanceUrl: string;
}

export interface SalesforceSession extends SalesforceCredentials {
  displayName: string | null;
}

export type SalesforceSessionExpiryReason = "unauthorized";

export interface SalesforceSessionExpiryDetail {
  reason: SalesforceSessionExpiryReason;
}

export class SessionStorageUnavailableError extends Error {
  constructor() {
    super(
      "Session storage is unavailable. Allow session storage and try again.",
    );
    this.name = "SessionStorageUnavailableError";
  }
}

export class InvalidSalesforceInstanceUrlError extends Error {
  constructor() {
    super(
      "Enter a valid HTTPS Salesforce instance URL, such as https://example.my.salesforce.com.",
    );
    this.name = "InvalidSalesforceInstanceUrlError";
  }
}

function getBrowserSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function requireBrowserSessionStorage(): Storage {
  const storage = getBrowserSessionStorage();
  if (!storage) {
    throw new SessionStorageUnavailableError();
  }

  return storage;
}

/** Broadcasts only invalidation; consumers must read a fresh safe snapshot. */
function notifySalesforceSessionChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(SALESFORCE_SESSION_CHANGE_EVENT));
}

function isSalesforceHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "salesforce.com" ||
    normalized.endsWith(".salesforce.com") ||
    normalized === "force.com" ||
    normalized.endsWith(".force.com")
  );
}

export function normalizeSalesforceInstanceUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    const hasUnexpectedParts =
      url.protocol !== "https:" ||
      !isSalesforceHostname(url.hostname) ||
      Boolean(url.username) ||
      Boolean(url.password) ||
      Boolean(url.search) ||
      Boolean(url.hash);

    if (hasUnexpectedParts) {
      throw new InvalidSalesforceInstanceUrlError();
    }

    return url.origin;
  } catch (error) {
    if (error instanceof InvalidSalesforceInstanceUrlError) {
      throw error;
    }

    throw new InvalidSalesforceInstanceUrlError();
  }
}

export function saveSalesforceCredentials(
  credentials: SalesforceCredentials,
): void {
  const sessionId = credentials.sessionId.trim();
  if (!sessionId) {
    throw new Error("Paste a Salesforce session ID to connect.");
  }

  const instanceUrl = normalizeSalesforceInstanceUrl(credentials.instanceUrl);
  const storage = requireBrowserSessionStorage();

  // Separate entries let logout remove every sensitive value explicitly. Neither
  // value is copied to application state, cookies, or any persistent storage.
  try {
    storage.setItem(STORAGE_KEYS.instanceUrl, instanceUrl);
    storage.setItem(STORAGE_KEYS.sessionId, sessionId);
  } catch {
    clearSalesforceSession();
    throw new SessionStorageUnavailableError();
  }
  notifySalesforceSessionChanged();
}

export function getSalesforceCredentials(): SalesforceCredentials | null {
  const storage = getBrowserSessionStorage();
  if (!storage) {
    return null;
  }

  let sessionId: string | null;
  let instanceUrl: string | null;
  try {
    sessionId = storage.getItem(STORAGE_KEYS.sessionId);
    instanceUrl = storage.getItem(STORAGE_KEYS.instanceUrl);
  } catch {
    return null;
  }
  if (!sessionId || !instanceUrl) {
    return null;
  }

  try {
    return {
      sessionId,
      instanceUrl: normalizeSalesforceInstanceUrl(instanceUrl),
    };
  } catch {
    // Treat partially corrupted browser state as logged out.
    clearSalesforceSession();
    return null;
  }
}

export function saveDisplayName(value: string): void {
  const displayName = value.trim();
  const storage = requireBrowserSessionStorage();

  try {
    if (!displayName) {
      storage.removeItem(STORAGE_KEYS.displayName);
      notifySalesforceSessionChanged();
      return;
    }

    storage.setItem(STORAGE_KEYS.displayName, displayName);
  } catch {
    throw new SessionStorageUnavailableError();
  }
  notifySalesforceSessionChanged();
}

export function getDisplayName(): string | null {
  const storage = getBrowserSessionStorage();
  try {
    return storage?.getItem(STORAGE_KEYS.displayName) ?? null;
  } catch {
    return null;
  }
}

export function getSalesforceSession(): SalesforceSession | null {
  const credentials = getSalesforceCredentials();
  if (!credentials) {
    return null;
  }

  return { ...credentials, displayName: getDisplayName() };
}

/** Safe useSyncExternalStore snapshot: credentials never enter React state. */
export function hasSalesforceCredentials(): boolean {
  return getSalesforceCredentials() !== null;
}

/** Clears credentials and the self-reported identity on explicit logout/401. */
export function clearSalesforceSession(): void {
  const storage = getBrowserSessionStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEYS.sessionId);
    storage.removeItem(STORAGE_KEYS.instanceUrl);
    storage.removeItem(STORAGE_KEYS.displayName);
  } catch {
    // Storage may have become unavailable; there is no secondary persistence
    // location to clear or fall back to.
  }
  notifySalesforceSessionChanged();
}

/** Compatible with React's useSyncExternalStore subscribe argument. */
export function subscribeToSalesforceSessionChanges(
  listener: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const eventListener = () => listener();
  window.addEventListener(SALESFORCE_SESSION_CHANGE_EVENT, eventListener);
  return () => {
    window.removeEventListener(SALESFORCE_SESSION_CHANGE_EVENT, eventListener);
  };
}

export function notifySalesforceSessionExpired(
  reason: SalesforceSessionExpiryReason = "unauthorized",
): void {
  if (typeof window === "undefined") {
    return;
  }

  const detail: SalesforceSessionExpiryDetail = { reason };
  window.dispatchEvent(
    new CustomEvent<SalesforceSessionExpiryDetail>(
      SALESFORCE_SESSION_EXPIRED_EVENT,
      { detail },
    ),
  );
}

export function clearAndExpireSalesforceSession(
  reason: SalesforceSessionExpiryReason = "unauthorized",
): void {
  clearSalesforceSession();
  notifySalesforceSessionExpired(reason);
}

export function subscribeToSalesforceSessionExpiry(
  listener: (detail: SalesforceSessionExpiryDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const eventListener: EventListener = (event) => {
    listener((event as CustomEvent<SalesforceSessionExpiryDetail>).detail);
  };
  window.addEventListener(SALESFORCE_SESSION_EXPIRED_EVENT, eventListener);

  return () => {
    window.removeEventListener(SALESFORCE_SESSION_EXPIRED_EVENT, eventListener);
  };
}
