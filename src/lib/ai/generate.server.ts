import { APICallError, NoObjectGeneratedError, Output, streamText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { ProviderError, type ResolvedTextModel } from "./adapters.server";

export function friendlyAiError(error: unknown): string {
  if (error instanceof ProviderError) return error.message;
  if (NoObjectGeneratedError.isInstance(error)) {
    return "The model replied, but not in the expected format. Try again or use a different model.";
  }
  const apiError = APICallError.isInstance(error)
    ? error
    : error && typeof error === "object" && "lastError" in error && APICallError.isInstance((error as { lastError: unknown }).lastError)
      ? ((error as { lastError: APICallError }).lastError)
      : null;
  if (apiError) {
    const status = apiError.statusCode;
    let detail = "";
    try {
      const body = JSON.parse(apiError.responseBody ?? "{}") as { message?: string; error?: { message?: string } | string };
      detail = body.message ?? (typeof body.error === "string" ? body.error : body.error?.message) ?? "";
    } catch {
      detail = "";
    }
    if (status === 402) return detail || "AI credits are used up for this workspace. Add credits to continue.";
    if (status === 429) return "The AI provider is rate limiting requests. Wait a moment and try again.";
    if (status === 401) return "The AI provider rejected the API key. Update the key in AI Providers.";
    if (status === 403) return detail || "The AI provider denied this request.";
    if (status === 404) return detail || "The selected model was not found on this provider.";
    if (status === 400) return detail || "The AI provider rejected the request.";
    return detail || `The AI provider failed (HTTP ${status ?? "unknown"}).`;
  }
  if (error instanceof Error) return error.message.slice(0, 300);
  return "AI generation failed.";
}

export async function generateStructured<T>(params: {
  resolved: ResolvedTextModel;
  instructions: string;
  prompt: string;
  schema: z.ZodType<T>;
}): Promise<{ output: T; inputTokens?: number | undefined; outputTokens?: number | undefined }> {
  const result = streamText({
    model: params.resolved.model,
    instructions: params.instructions,
    prompt: params.prompt,
    output: Output.object({ schema: params.schema }),
    providerOptions: params.resolved.providerOptions as never,
    maxRetries: 1,
  });
  const output = (await result.output) as T;
  const usage = await result.totalUsage;
  return { output, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
}

export async function logUsage(
  supabase: SupabaseClient<Database>,
  entry: {
    workspaceId: string;
    userId: string;
    resolved: Pick<ResolvedTextModel, "label" | "modelId" | "configId">;
    feature: string;
    status: "success" | "error";
    errorMessage?: string | undefined;
    latencyMs: number;
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
  },
) {
  const { error } = await supabase.from("ai_usage_events").insert({
    workspace_id: entry.workspaceId,
    created_by: entry.userId,
    provider_config_id: entry.resolved.configId,
    provider_label: entry.resolved.label,
    model: entry.resolved.modelId,
    feature: entry.feature,
    status: entry.status,
    error_message: entry.errorMessage?.slice(0, 500) ?? null,
    latency_ms: entry.latencyMs,
    input_tokens: entry.inputTokens ?? null,
    output_tokens: entry.outputTokens ?? null,
  });
  if (error) console.error("Failed to log AI usage", error.message);
}
