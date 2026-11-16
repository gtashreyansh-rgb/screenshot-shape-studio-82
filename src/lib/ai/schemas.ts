import { z } from "zod";

// Strict-compatible schemas: object roots, all fields required, no bounds (counts go in prompts).
export const scriptOutputSchema = z.object({
  title: z.string(),
  hook: z.string(),
  scenes: z.array(
    z.object({
      heading: z.string(),
      narration: z.string(),
      visuals: z.string(),
      durationSeconds: z.number(),
    }),
  ),
  outro: z.string(),
});
export type ScriptOutput = z.infer<typeof scriptOutputSchema>;

export const seoOutputSchema = z.object({
  titles: z.array(z.string()),
  description: z.string(),
  tags: z.array(z.string()),
  keywords: z.array(z.string()),
  hashtags: z.array(z.string()),
  uploadTips: z.array(z.string()),
});
export type SeoOutput = z.infer<typeof seoOutputSchema>;

export type ScriptScene = ScriptOutput["scenes"][number];
