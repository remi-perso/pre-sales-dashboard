import { z } from "zod";

import { WON_CATEGORY_VALUES } from "./contracts";

const trimmedText = (label: string, maxLength: number) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(maxLength, `${label} must be ${maxLength} characters or fewer.`);

export const opportunityIdSchema = trimmedText("Opportunity ID", 18);

export const saveAeMappingSchema = z
  .object({
    aeName: trimmedText("AE name", 160),
    segment: trimmedText("Segment", 120),
    changedBy: trimmedText("Changed by", 120),
    reason: trimmedText("Reason", 500).optional(),
  })
  .strict();

export const saveCategoryOverrideSchema = z
  .object({
    opportunityId: opportunityIdSchema,
    opportunityName: trimmedText("Opportunity name", 255),
    inferredCategory: z.enum(WON_CATEGORY_VALUES, {
      error: "Inferred category is not recognized.",
    }),
    toCategory: z.enum(WON_CATEGORY_VALUES, {
      error: "Override category is not recognized.",
    }),
    reason: trimmedText("Reason", 1000).min(
      3,
      "Reason must be at least 3 characters.",
    ),
    changedBy: trimmedText("Changed by", 120),
  })
  .strict();

export const historyQuerySchema = z.object({
  includeHistory: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  historyLimit: z.coerce.number().int().min(1).max(250).default(100),
});

export type SaveAeMappingInput = z.infer<typeof saveAeMappingSchema>;
export type SaveCategoryOverrideInput = z.infer<
  typeof saveCategoryOverrideSchema
>;

/**
 * Salesforce user names are treated case-insensitively for fallback mapping.
 * NFKC and whitespace normalization prevent visually duplicate shared rows.
 */
export function normalizeAeName(value: string): {
  aeName: string;
  aeNameKey: string;
} {
  const aeName = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  return {
    aeName,
    aeNameKey: aeName.toLocaleLowerCase("en-GB"),
  };
}
