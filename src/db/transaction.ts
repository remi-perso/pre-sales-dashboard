import { Prisma } from "@/generated/prisma/client";

import { getPrismaClient } from "./prisma";

const MAX_SERIALIZATION_ATTEMPTS = 3;

function isRetryableWriteConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

/**
 * Shared writes use serializable transactions. Retrying Prisma's documented
 * P2034 write-conflict keeps the current record and its audit entry atomic.
 */
export async function inSerializableTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const prisma = getPrismaClient();

  for (let attempt = 1; attempt <= MAX_SERIALIZATION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !isRetryableWriteConflict(error) ||
        attempt === MAX_SERIALIZATION_ATTEMPTS
      ) {
        throw error;
      }
    }
  }

  throw new Error("Serializable transaction retry loop exhausted.");
}
