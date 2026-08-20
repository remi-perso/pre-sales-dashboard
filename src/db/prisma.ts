import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("DATABASE_URL is not configured.");
    this.name = "DatabaseConfigurationError";
  }
}

const globalForPrisma = globalThis as unknown as {
  sharedDataPrisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new DatabaseConfigurationError();
  }

  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    max: 5,
  });
  return new PrismaClient({ adapter });
}

/** Lazily constructs the pool so fixture-only builds do not require Postgres. */
export function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.sharedDataPrisma;
  if (existing) {
    return existing;
  }

  const prisma = createPrismaClient();
  // One pool per warm Node.js isolate prevents connection exhaustion in both
  // local hot reload and serverless production runtimes.
  globalForPrisma.sharedDataPrisma = prisma;

  return prisma;
}
