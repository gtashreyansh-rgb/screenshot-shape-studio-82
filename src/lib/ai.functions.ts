import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertSafeBaseUrl,
  listProviderModels,
  loadProviderConfig,
  loadProviderSecret,
  ProviderError,
  resolveTextModel,
} from "./ai/adapters.server";
import { PLATFORM_PROVIDER_ID, PLATFORM_TEXT_MODEL } from "./ai/catalog";
import { encryptSecret, keyHint } from "./ai/crypto.server";
import { friendlyAiError, generateStructured, logUsage } from "./ai/generate.server";
import { scriptOutputSchema, seoOutputSchema } from "./ai/schemas";

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>; userId: string };

async function assertRole(ctx: Ctx, workspaceId: string, roles: ("owner" | "admin" | "editor" | "viewer")[]) {
  const { data, error } = await ctx.supabase.rpc("has_workspace_role", { _workspace_id: workspaceId, _roles: roles });
  if (error || !data) throw new Error("You don't have permission to do that in this workspace.");
}

// ---------- Provider configuration ----------

const saveProviderInput = z.object({
  workspaceId: z.string().uuid(),
  id: z.string().uuid().nullable(),
  provider: z.enum(["openai", "anthropic", "google", "openai_compatible"]),
  capability: z.enum(["text", "image"]),
  label: z.string().trim().min(1).max(60),
  baseUrl: z.string().trim().max(300).nullable(),
  defaultModel: z.string().trim().min(1).max(120),
  apiKey: z.string().trim().max(500).nullable(),
});

export const saveProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveProviderInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, data.workspaceId, ["owner", "admin"]);
    let baseUrl: string | null = null;
    try {
      if (data.provider === "openai_compatible") {
        if (!data.baseUrl) throw new ProviderError("A base URL is required for OpenAI-compatible providers.");
        baseUrl = assertSafeBaseUrl(data.baseUrl);
      }
    } catch (e) {
      return { ok: false as const, error: friendlyAiError(e) };
    }
    if (!data.id && data.provider !== "openai_compatible" && !data.apiKey) {
      return { ok: false as const, error: "An API key is required for this provider." };
    }

    const fields = {
      provider: data.provider,
      capability: data.capability,
      label: data.label,
      base_url: baseUrl,
      default_model: data.defaultModel,
      status: "untested",
      last_error: null,
      ...(data.apiKey ? { key_hint: keyHint(data.apiKey) } : {}),
    };

    let configId = data.id;
    if (configId) {
      const { error } = await context.supabase
        .from("ai_provider_configs")
        .update(fields)
        .eq("id", configId)
        .eq("workspace_id", data.workspaceId);
      if (error) return { ok: false as const, error: "Could not update the provider." };
    } else {
      const { data: row, error } = await context.supabase
        .from("ai_provider_configs")
        .insert({ ...fields, workspace_id: data.workspaceId, created_by: context.userId })
        .select("id")
        .single();
      if (error || !row) return { ok: false as const, error: "Could not save the provider." };
      configId = row.id;
    }

    if (data.apiKey) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("ai_provider_secrets")
        .upsert({ config_id: configId, ciphertext: encryptSecret(data.apiKey), updated_at: new Date().toISOString() });
      if (error) return { ok: false as const, error: "Provider saved, but the key could not be stored securely." };
    }
    return { ok: true as const, id: configId };
  });

export const testProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid(), providerId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, data.workspaceId, ["owner", "admin", "editor", "viewer"]);
    const started = Date.now();
    if (data.providerId === PLATFORM_PROVIDER_ID) {
      try {
        const models = await listProviderModels({
          provider: PLATFORM_PROVIDER_ID,
          apiKey: process.env["LOVABLE_API_KEY"] ?? null,
          baseUrl: null,
        });
        const found = models.includes(PLATFORM_TEXT_MODEL);
        return {
          ok: found,
          message: found
            ? `Connected. ${models.length} models available; default model is ready.`
            : "Connected, but the default model is not available in this workspace.",
          latencyMs: Date.now() - started,
        };
      } catch (e) {
        return { ok: false, message: friendlyAiError(e), latencyMs: Date.now() - started };
      }
    }

    let ok = false;
    let message: string;
    try {
      const config = await loadProviderConfig(context.supabase, data.workspaceId, data.providerId);
      const apiKey = await loadProviderSecret(config.id);
      const models = await listProviderModels({ provider: config.provider, apiKey, baseUrl: config.base_url });
      const found = models.length === 0 || models.some((m) => m === config.default_model);
      ok = found;
      message = found
        ? `Connected. ${models.length} models listed${models.length ? `, including ${config.default_model}` : ""}.`
        : `Credentials work, but "${config.default_model}" was not in the provider's model list.`;
    } catch (e) {
      message = friendlyAiError(e);
    }
    await context.supabase
      .from("ai_provider_configs")
      .update({
        status: ok ? "ok" : "error",
        last_tested_at: new Date().toISOString(),
        last_error: ok ? null : message.slice(0, 500),
      })
      .eq("id", data.providerId)
      .eq("workspace_id", data.workspaceId);
    return { ok, message, latencyMs: Date.now() - started };
  });

// ---------- Generation ----------

const scriptInput = z.object({
  workspaceId: z.string().uuid(),
  providerId: z.string().min(1),
  topic: z.string().trim().min(3).max(500),
  language: z.string().trim().min(2).max(40),
  tone: z.string().trim().min(2).max(40),
  audience: z.string().trim().max(200),
  durationMinutes: z.number().int().min(1).max(60),
  notes: z.string().trim().max(2000),
});

export const generateScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scriptInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, data.workspaceId, ["owner", "admin", "editor"]);
    let resolved;
    try {
      resolved = await resolveTextModel(context.supabase, data.workspaceId, data.providerId);
    } catch (e) {
      return { ok: false as const, error: friendlyAiError(e) };
    }
    const sceneCount = Math.max(3, Math.min(12, Math.round(data.durationMinutes * 0.9)));
    const started = Date.now();
    try {
      const { output, inputTokens, outputTokens } = await generateStructured({
        resolved,
        schema: scriptOutputSchema,
        instructions:
          "You are a senior YouTube scriptwriter. Write original, engaging scripts that are factual and avoid clickbait claims you cannot support. Narration is the exact words spoken on camera. Visuals describe b-roll, graphics or on-screen actions. Write everything in the requested language.",
        prompt: [
          `Topic: ${data.topic}`,
          `Language: ${data.language}`,
          `Tone: ${data.tone}`,
          data.audience ? `Target audience: ${data.audience}` : null,
          `Target length: about ${data.durationMinutes} minutes of speech (roughly ${data.durationMinutes * 150} words total).`,
          `Structure: a hook of 1-3 sentences, then ${sceneCount} scenes, then a short outro with a natural call to action.`,
          "Each scene's durationSeconds should be realistic; all scenes together should approximate the target length.",
          data.notes ? `Extra notes from the creator: ${data.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });
      const latencyMs = Date.now() - started;
      const { data: row, error } = await context.supabase
        .from("scripts")
        .insert({
          workspace_id: data.workspaceId,
          created_by: context.userId,
          title: output.title.slice(0, 200) || data.topic.slice(0, 200),
          topic: data.topic,
          language: data.language,
          tone: data.tone,
          audience: data.audience || null,
          duration_minutes: data.durationMinutes,
          hook: output.hook,
          scenes: output.scenes.map((s) => ({ ...s, durationSeconds: Math.max(0, Math.round(s.durationSeconds)) })),
          outro: output.outro,
          generated_with: resolved.label,
          model: resolved.modelId,
        })
        .select("id")
        .single();
      await logUsage(context.supabase, {
        workspaceId: data.workspaceId,
        userId: context.userId,
        resolved,
        feature: "script",
        status: "success",
        latencyMs,
        inputTokens,
        outputTokens,
      });
      if (error || !row) return { ok: false as const, error: "The script was generated but could not be saved." };
      return { ok: true as const, id: row.id };
    } catch (e) {
      const message = friendlyAiError(e);
      console.error("generateScript failed", e);
      await logUsage(context.supabase, {
        workspaceId: data.workspaceId,
        userId: context.userId,
        resolved,
        feature: "script",
        status: "error",
        errorMessage: message,
        latencyMs: Date.now() - started,
      });
      return { ok: false as const, error: message };
    }
  });

const seoInput = z.object({
  workspaceId: z.string().uuid(),
  providerId: z.string().min(1),
  topic: z.string().trim().min(3).max(300),
  summary: z.string().trim().max(4000),
  language: z.string().trim().min(2).max(40),
  audience: z.string().trim().max(200),
});

export const generateSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => seoInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, data.workspaceId, ["owner", "admin", "editor"]);
    let resolved;
    try {
      resolved = await resolveTextModel(context.supabase, data.workspaceId, data.providerId);
    } catch (e) {
      return { ok: false as const, error: friendlyAiError(e) };
    }
    const started = Date.now();
    try {
      const { output, inputTokens, outputTokens } = await generateStructured({
        resolved,
        schema: seoOutputSchema,
        instructions:
          "You are a YouTube SEO specialist. Produce accurate, non-misleading metadata that follows YouTube's spam and deceptive-practices policies. Do not invent statistics or claims. Write in the requested language.",
        prompt: [
          `Video topic: ${data.topic}`,
          data.summary ? `Video summary or script excerpt:\n${data.summary}` : null,
          `Language: ${data.language}`,
          data.audience ? `Target audience: ${data.audience}` : null,
          "Return: 5 title options under 70 characters each; a description of 150-300 words whose first two lines work as a hook, with a short chapter outline placeholder if relevant; 12-20 tags; 8-12 search keywords; 3-5 hashtags starting with #; 3-5 short upload tips (thumbnail text idea, best first-24h actions, pinned comment idea).",
        ]
          .filter(Boolean)
          .join("\n"),
      });
      const latencyMs = Date.now() - started;
      const { data: row, error } = await context.supabase
        .from("seo_packages")
        .insert({
          workspace_id: data.workspaceId,
          created_by: context.userId,
          topic: data.topic,
          language: data.language,
          titles: output.titles,
          description: output.description,
          tags: output.tags,
          keywords: output.keywords,
          hashtags: output.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)),
          upload_tips: output.uploadTips,
          generated_with: resolved.label,
          model: resolved.modelId,
        })
        .select("id")
        .single();
      await logUsage(context.supabase, {
        workspaceId: data.workspaceId,
        userId: context.userId,
        resolved,
        feature: "seo",
        status: "success",
        latencyMs,
        inputTokens,
        outputTokens,
      });
      if (error || !row) return { ok: false as const, error: "Metadata was generated but could not be saved." };
      return { ok: true as const, id: row.id };
    } catch (e) {
      const message = friendlyAiError(e);
      console.error("generateSeo failed", e);
      await logUsage(context.supabase, {
        workspaceId: data.workspaceId,
        userId: context.userId,
        resolved,
        feature: "seo",
        status: "error",
        errorMessage: message,
        latencyMs: Date.now() - started,
      });
      return { ok: false as const, error: message };
    }
  });
