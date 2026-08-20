-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "ae_segment_mappings" (
    "id" UUID NOT NULL,
    "ae_name" VARCHAR(160) NOT NULL,
    "ae_name_key" VARCHAR(160) NOT NULL,
    "segment" VARCHAR(120) NOT NULL,
    "changed_by" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ae_segment_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ae_segment_mapping_audit" (
    "id" UUID NOT NULL,
    "mapping_id" UUID NOT NULL,
    "ae_name" VARCHAR(160) NOT NULL,
    "from_segment" VARCHAR(120),
    "to_segment" VARCHAR(120) NOT NULL,
    "reason" VARCHAR(500),
    "changed_by" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ae_segment_mapping_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_overrides" (
    "id" UUID NOT NULL,
    "opportunity_id" VARCHAR(18) NOT NULL,
    "opportunity_name" VARCHAR(255) NOT NULL,
    "from_category" VARCHAR(80) NOT NULL,
    "to_category" VARCHAR(80) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "changed_by" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_override_current" (
    "opportunity_id" VARCHAR(18) NOT NULL,
    "override_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_override_current_pkey" PRIMARY KEY ("opportunity_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ae_segment_mappings_ae_name_key_key" ON "ae_segment_mappings"("ae_name_key");

-- CreateIndex
CREATE INDEX "ae_mapping_audit_mapping_created_at_idx" ON "ae_segment_mapping_audit"("mapping_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "category_overrides_opportunity_created_at_idx" ON "category_overrides"("opportunity_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "category_override_current_override_id_key" ON "category_override_current"("override_id");

-- AddForeignKey
ALTER TABLE "ae_segment_mapping_audit" ADD CONSTRAINT "ae_segment_mapping_audit_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "ae_segment_mappings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_override_current" ADD CONSTRAINT "category_override_current_override_id_fkey" FOREIGN KEY ("override_id") REFERENCES "category_overrides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
