"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AeMappingsResponse,
  ApiErrorResponse,
  CategoryOverridesResponse,
  SaveAeMappingResponse,
  SaveCategoryOverrideResponse,
  WonCategory,
} from "@/db/contracts";

class SharedDataRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "SharedDataRequestError";
    this.status = status;
    this.code = code;
  }
}

async function appJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: ApiErrorResponse | null = null;
    try {
      payload = (await response.json()) as ApiErrorResponse;
    } catch {
      // The fallback below stays deliberately generic.
    }
    throw new SharedDataRequestError(
      response.status,
      payload?.error.code ?? "SHARED_DATA_REQUEST_FAILED",
      payload?.error.message ?? "Shared data is temporarily unavailable.",
    );
  }

  return (await response.json()) as T;
}

export function useAeMappings() {
  return useQuery({
    queryKey: ["ae-mappings"],
    queryFn: () =>
      appJson<AeMappingsResponse>(
        "/api/ae-mappings?includeHistory=true&historyLimit=50",
      ),
    retry: false,
  });
}

export function useCategoryOverrides() {
  return useQuery({
    queryKey: ["category-overrides"],
    queryFn: () =>
      appJson<CategoryOverridesResponse>(
        "/api/category-overrides?includeHistory=true&historyLimit=100",
      ),
    retry: false,
  });
}

export interface SaveAeMappingVariables {
  aeName: string;
  segment: string;
  changedBy: string;
  reason?: string;
}

export function useSaveAeMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: SaveAeMappingVariables) =>
      appJson<SaveAeMappingResponse>("/api/ae-mappings", {
        method: "POST",
        body: JSON.stringify(variables),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ae-mappings"] }),
  });
}

export interface SaveCategoryOverrideVariables {
  opportunityId: string;
  opportunityName: string;
  inferredCategory: WonCategory;
  toCategory: WonCategory;
  reason: string;
  changedBy: string;
}

export function useSaveCategoryOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: SaveCategoryOverrideVariables) =>
      appJson<SaveCategoryOverrideResponse>("/api/category-overrides", {
        method: "POST",
        body: JSON.stringify(variables),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["category-overrides"] }),
  });
}

export function sharedDataErrorMessage(error: unknown): string {
  return error instanceof SharedDataRequestError
    ? error.message
    : "Shared data is temporarily unavailable.";
}

export function isDatabaseNotConfigured(error: unknown): boolean {
  return (
    error instanceof SharedDataRequestError &&
    error.code === "DATABASE_NOT_CONFIGURED"
  );
}
