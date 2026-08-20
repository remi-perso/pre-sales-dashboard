import "dotenv/config";

import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Keeping this optional lets `prisma generate` work in fixture-only local
  // development. Migration commands still require DATABASE_URL (or DIRECT_URL).
  datasource: databaseUrl ? { url: databaseUrl } : undefined,
});
