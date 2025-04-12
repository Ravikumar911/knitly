import { z } from "zod";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { 
  getEmailExtractionPatterns,
  getEmailExtractionPattern,
  createEmailExtractionPattern,
  updateEmailExtractionPattern,
  deleteEmailExtractionPattern,
  type EmailExtractionPattern
} from "@workspace/database";

// Input validation schemas
const createSchema = z.object({
  emailPattern: z.string().nullish(),
  subjectPattern: z.string().nullish(),
  bodyPattern: z.string().nullish(),
  extractionType: z.string(),
  config: z.string().nullish(),
  priority: z.number().nullish(),
  isActive: z.boolean().nullish()
});

const updateSchema = createSchema.partial();

export const emailExtractionPatternsRouter = createTRPCRouter({
  // Get all active patterns
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      return await getEmailExtractionPatterns();
    }),

  // Get a single pattern by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const pattern = await getEmailExtractionPattern(input.id);
      if (!pattern) {
        throw new Error("Pattern not found");
      }
      return pattern;
    }),

  // Create a new pattern
  create: protectedProcedure
    .input(createSchema)
    .mutation(async ({ input, ctx }) => {
      const transformedInput = {
        ...input,
        emailPattern: input.emailPattern ?? null,
        subjectPattern: input.subjectPattern ?? null,
        bodyPattern: input.bodyPattern ?? null,
        config: input.config ?? null,
        priority: input.priority ?? null,
        isActive: input.isActive ?? null
      };
      return await createEmailExtractionPattern(transformedInput);
    }),

  // Update an existing pattern
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: updateSchema
    }))
    .mutation(async ({ input, ctx }) => {
      const updated = await updateEmailExtractionPattern(input.id, input.data);
      if (!updated || updated.length === 0) {
        throw new Error("Pattern not found");
      }
      return updated[0];
    }),

  // Delete a pattern
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const deleted = await deleteEmailExtractionPattern(input.id);
      if (!deleted || deleted.length === 0) {
        throw new Error("Pattern not found");
      }
      return deleted[0];
    })
}); 