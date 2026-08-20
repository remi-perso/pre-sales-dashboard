import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import type { ApiErrorResponse } from "./contracts";
import { DatabaseConfigurationError } from "./prisma";

export function apiError(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string[]>,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(fields ? { fields } : {}),
      },
    },
    { status },
  );
}

export function validationError(
  error: ZodError,
): NextResponse<ApiErrorResponse> {
  return apiError(
    400,
    "VALIDATION_ERROR",
    "Check the submitted values and try again.",
    error.flatten().fieldErrors as Record<string, string[]>,
  );
}

export function databaseError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof DatabaseConfigurationError) {
    return apiError(
      503,
      "DATABASE_NOT_CONFIGURED",
      "Shared mappings and overrides are unavailable because DATABASE_URL is not configured.",
    );
  }

  // Do not serialize or log raw database errors: they can contain connection
  // details. The API exposes only a stable, non-sensitive failure message.
  return apiError(
    503,
    "DATABASE_UNAVAILABLE",
    "The shared mappings and overrides database is temporarily unavailable.",
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
