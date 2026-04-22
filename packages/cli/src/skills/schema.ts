import { z } from "zod";

export const skillManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  category: z.string().min(1),
  description: z.string().default(""),
  requires: z
    .object({
      bins: z.array(z.string().min(1)).default([]),
    })
    .default({ bins: [] }),
  jobs: z
    .array(
      z.object({
        id: z.string().min(1),
        schedule: z.string().min(1).optional(),
        handler: z.string().min(1),
        mutexKey: z.string().min(1).optional(),
      }),
    )
    .default([]),
});

export type SkillManifest = z.infer<typeof skillManifestSchema>;

export type InstalledSkill = {
  id: string;
  dir: string;
  manifest: SkillManifest;
  enabled: boolean;
};
