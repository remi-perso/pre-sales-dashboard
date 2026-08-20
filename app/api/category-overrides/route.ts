import { NextResponse, type NextRequest } from "next/server";

import type {
  CategoryOverridesResponse,
  SaveCategoryOverrideResponse,
} from "@/db/contracts";
import { databaseError, readJson, validationError } from "@/db/http";
import { getPrismaClient } from "@/db/prisma";
import { serializeCategoryOverride } from "@/db/serializers";
import { inSerializableTransaction } from "@/db/transaction";
import {
  historyQuerySchema,
  opportunityIdSchema,
  saveCategoryOverrideSchema,
} from "@/db/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<CategoryOverridesResponse> | NextResponse> {
  const opportunityIdValue =
    request.nextUrl.searchParams.get("opportunityId") ?? undefined;
  const opportunityId = opportunityIdSchema
    .optional()
    .safeParse(opportunityIdValue);
  if (!opportunityId.success) {
    return validationError(opportunityId.error);
  }

  const historyQuery = historyQuerySchema.safeParse({
    includeHistory:
      request.nextUrl.searchParams.get("includeHistory") ?? undefined,
    historyLimit: request.nextUrl.searchParams.get("historyLimit") ?? undefined,
  });
  if (!historyQuery.success) {
    return validationError(historyQuery.error);
  }

  const includeHistory = request.nextUrl.searchParams.has("includeHistory")
    ? historyQuery.data.includeHistory
    : opportunityId.data !== undefined;
  const where = opportunityId.data
    ? { opportunityId: opportunityId.data }
    : undefined;

  try {
    const prisma = getPrismaClient();
    const [currentRows, history] = await Promise.all([
      prisma.categoryOverrideCurrent.findMany({
        where,
        include: { override: true },
        orderBy: { updatedAt: "desc" },
      }),
      includeHistory
        ? prisma.categoryOverride.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: historyQuery.data.historyLimit,
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json(
      {
        overrides: currentRows.map(({ override }) =>
          serializeCategoryOverride(override),
        ),
        history: history.map(serializeCategoryOverride),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<SaveCategoryOverrideResponse> | NextResponse> {
  const body = saveCategoryOverrideSchema.safeParse(await readJson(request));
  if (!body.success) {
    return validationError(body.error);
  }

  try {
    const override = await inSerializableTransaction(async (transaction) => {
      const current = await transaction.categoryOverrideCurrent.findUnique({
        where: { opportunityId: body.data.opportunityId },
        include: { override: true },
      });
      const fromCategory =
        current?.override.toCategory ?? body.data.inferredCategory;

      const auditEntry = await transaction.categoryOverride.create({
        data: {
          opportunityId: body.data.opportunityId,
          opportunityName: body.data.opportunityName,
          fromCategory,
          toCategory: body.data.toCategory,
          reason: body.data.reason,
          changedBy: body.data.changedBy,
        },
      });

      await transaction.categoryOverrideCurrent.upsert({
        where: { opportunityId: body.data.opportunityId },
        create: {
          opportunityId: body.data.opportunityId,
          overrideId: auditEntry.id,
        },
        update: { overrideId: auditEntry.id },
      });

      return auditEntry;
    });

    return NextResponse.json(
      { override: serializeCategoryOverride(override) },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return databaseError(error);
  }
}
