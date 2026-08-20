"use client";

import "client-only";

import {
  clearAndExpireSalesforceSession,
  getSalesforceCredentials,
} from "@/state/salesforce-session";
import { SalesforceFieldConfigurationError } from "@/salesforce/query";

const SALESFORCE_API_PATH_PREFIX = "/services/data/";
const DEFAULT_API_VERSION = "v65.0";

export class SalesforceNotConnectedError extends Error {
  constructor() {
    super("Connect to Salesforce before loading live data.");
    this.name = "SalesforceNotConnectedError";
  }
}

export class SalesforceSessionExpiredError extends Error {
  constructor() {
    super("Your Salesforce session has expired. Paste a new session ID.");
    this.name = "SalesforceSessionExpiredError";
  }
}

export class SalesforceRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(
      status === 403
        ? "Salesforce denied access to this data. Check your Salesforce permissions."
        : "Salesforce could not complete the request. Try again or check the connection settings.",
    );
    this.name = "SalesforceRequestError";
    this.status = status;
  }
}

export class SalesforceNetworkError extends Error {
  constructor() {
    super(
      "Salesforce could not be reached. Check the instance URL and Salesforce CORS allowlist.",
    );
    this.name = "SalesforceNetworkError";
  }
}

export class SalesforceResponseError extends Error {
  constructor() {
    super(
      "Salesforce returned an unreadable response. Try refreshing the data.",
    );
    this.name = "SalesforceResponseError";
  }
}

export class InvalidSalesforceRequestError extends Error {
  constructor() {
    super("The Salesforce request configuration is invalid.");
    this.name = "InvalidSalesforceRequestError";
  }
}

export function getSalesforceApiVersion(): string {
  const configured =
    process.env.NEXT_PUBLIC_SALESFORCE_API_VERSION?.trim() ??
    DEFAULT_API_VERSION;

  if (!/^v\d{2,3}\.\d+$/.test(configured)) {
    throw new InvalidSalesforceRequestError();
  }

  return configured;
}

function assertSafeSalesforcePath(path: string): void {
  if (
    !path.startsWith(SALESFORCE_API_PATH_PREFIX) ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /[\r\n]/.test(path)
  ) {
    throw new InvalidSalesforceRequestError();
  }
}

/**
 * Browser-only, read-only Salesforce request boundary. Error responses and
 * underlying network errors are intentionally not attached as causes because
 * browser/runtime diagnostics can contain Authorization header material.
 */
export async function salesforceFetch<T>(
  path: string,
  options: Pick<RequestInit, "signal"> = {},
): Promise<T> {
  if (typeof window === "undefined") {
    throw new SalesforceNotConnectedError();
  }

  assertSafeSalesforcePath(path);
  const credentials = getSalesforceCredentials();
  if (!credentials) {
    throw new SalesforceNotConnectedError();
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${credentials.sessionId}`);

  let response: Response;
  try {
    response = await window.fetch(`${credentials.instanceUrl}${path}`, {
      method: "GET",
      headers,
      signal: options.signal,
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
  } catch {
    if (options.signal?.aborted) {
      throw new DOMException(
        "The Salesforce request was aborted.",
        "AbortError",
      );
    }
    throw new SalesforceNetworkError();
  }

  if (response.status === 401) {
    // Clear first so all expiry observers see a logged-out state.
    clearAndExpireSalesforceSession("unauthorized");
    throw new SalesforceSessionExpiredError();
  }

  if (!response.ok) {
    // Do not parse/return Salesforce's body: it may echo request context.
    throw new SalesforceRequestError(response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new SalesforceResponseError();
  }
}

export function getSafeSalesforceErrorMessage(error: unknown): string {
  if (
    error instanceof SalesforceNotConnectedError ||
    error instanceof SalesforceSessionExpiredError ||
    error instanceof SalesforceRequestError ||
    error instanceof SalesforceNetworkError ||
    error instanceof SalesforceResponseError ||
    error instanceof InvalidSalesforceRequestError ||
    error instanceof SalesforceFieldConfigurationError
  ) {
    return error.message;
  }

  return "Salesforce data could not be loaded. Try again.";
}
