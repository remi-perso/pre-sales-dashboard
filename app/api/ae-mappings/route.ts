import { NextResponse, type NextRequest } from "next/server";

import type { AeMappingsResponse, SaveAeMappingResponse } from "@/db/contracts";
import { apiError, databaseError, readJson, validationError } from "@/db/http";
import { getPrismaClient } from "@/db/prisma";
import { serializeAeMapping, serializeAeMappingAudit } from "@/db/serializers";
import { inSerializableTransaction } from "@/db/transaction";
import {
  historyQuerySchema,
  normalizeAeName,
  saveAeMappingSchema,
} from "@/db/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<AeMappingsResponse> | NextResponse> {
  const query = historyQuerySchema.safeParse({
    includeHistory:
      request.nextUrl.searchParams.get("includeHistory") ?? undefined,
    historyLimit: request.nextUrl.searchParams.get("historyLimit") ?? undefined,
  });
  if (!query.success) {
    return validationError(query.error);
  }

  try {
    const prisma = getPrismaClient();
    const [mappings, history] = await Promise.all([
      prisma.aeSegmentMapping.findMany({ orderBy: { aeName: "asc" } }),
      query.data.includeHistory
        ? prisma.aeSegmentMappingAudit.findMany({
            orderBy: { createdAt: "desc" },
            take: query.data.historyLimit,
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json(
      {
        mappings: mappings.map(serializeAeMapping),
        history: history.map(serializeAeMappingAudit),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<SaveAeMappingResponse> | NextResponse> {
  const body = saveAeMappingSchema.safeParse(await readJson(request));
  if (!body.success) {
    return validationError(body.error);
  }

  const { aeName, aeNameKey } = normalizeAeName(body.data.aeName);

  try {
    const result = await inSerializableTransaction(async (transaction) => {
      const existing = await transaction.aeSegmentMapping.findUnique({
        where: { aeNameKey },
      });

      const mapping = existing
        ? await transaction.aeSegmentMapping.update({
            where: { id: existing.id },
            data: {
              aeName,
              segment: body.data.segment,
              changedBy: body.data.changedBy,
            },
          })
        : await transaction.aeSegmentMapping.create({
            data: {
              aeName,
              aeNameKey,
              segment: body.data.segment,
              changedBy: body.data.changedBy,
            },
          });

      const auditEntry = await transaction.aeSegmentMappingAudit.create({
        data: {
          mappingId: mapping.id,
          aeName,
          fromSegment: existing?.segment ?? null,
          toSegment: body.data.segment,
          reason: body.data.reason,
          changedBy: body.data.changedBy,
        },
      });

      return { mapping, auditEntry, created: existing === null };
    });

    return NextResponse.json(
      {
        mapping: serializeAeMapping(result.mapping),
        auditEntry: serializeAeMappingAudit(result.auditEntry),
        created: result.created,
      },
      {
        status: result.created ? 201 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(): Promise<NextResponse> {
  return apiError(
    405,
    "METHOD_NOT_ALLOWED",
    "Mappings are retained for auditability and cannot be deleted.",
  );
}
