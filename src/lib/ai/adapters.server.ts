import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { PLATFORM_PROVIDER_ID, PLATFORM_TEXT_MODEL, providerName } from "./catalog";
import { decryptSecret } from "./crypto.server";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

export const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

export type ResolvedTextModel = {
  model: LanguageModel;
  providerOptions?: Record<string, Record<string, unknown>>;
  label: string;
  modelId: string;
  configId: string | null;
};

export class ProviderError extends Error {}

type ProviderConfigRow = Database["public"]["Tables"]["ai_provider_configs"]["Row"];

export async function loadProviderSecret(configId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ai_provider_secrets")
    .select("ciphertext")
    .eq("config_id", configId)
    .maybeSingle();
  if (error) throw new ProviderError("Could not read the stored provider key.");
  return data ? decryptSecret(data.ciphertext) : null;
}

/** Loads a provider config through the caller's RLS-scoped client, so membership is enforced. */
export async function loadProviderConfig(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  configId: string,
): Promise<ProviderConfigRow> {
  const { data, error } = await supabase
    .from("ai_provider_configs")
    .select("*")
    .eq("id", configId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error || !data) throw new ProviderError("That AI provider was not found in this workspace.");
  return data;
}

export function assertSafeBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ProviderError("Base URL is not a valid URL.");
  }
  if (url.protocol !== "https:") throw new ProviderError("Base URL must use https://.");
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "[::1]"
  ) {
    throw new ProviderError(
      "Private or local addresses can't be reached from the cloud. Expose your server over a public HTTPS URL.",
    );
  }
  return url.toString().replace(/\/+$/, "");
}

export async function resolveTextModel(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  providerId: string,
): Promise<ResolvedTextModel> {
  if (providerId === PLATFORM_PROVIDER_ID) {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new ProviderError("Built-in AI is not configured on the server.");
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: LOVABLE_GATEWAY_URL,
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    return {
      model: provider.responses(PLATFORM_TEXT_MODEL),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
      label: "Lovable AI",
      modelId: PLATFORM_TEXT_MODEL,
      configId: null,
    };
  }

  const config = await loadProviderConfig(supabase, workspaceId, providerId);
  if (config.capability !== "text") throw new ProviderError("That provider is not configured for text generation.");
  const apiKey = await loadProviderSecret(config.id);
  const label = `${config.label} (${providerName(config.provider)})`;
  const base = { label, modelId: config.default_model, configId: config.id };

  switch (config.provider) {
    case "openai": {
      if (!apiKey) throw new ProviderError("No API key saved for this provider.");
      return { ...base, model: createOpenAI({ apiKey }).chat(config.default_model) };
    }
    case "anthropic": {
      if (!apiKey) throw new ProviderError("No API key saved for this provider.");
      return { ...base, model: createAnthropic({ apiKey })(config.default_model) };
    }
    case "google": {
      if (!apiKey) throw new ProviderError("No API key saved for this provider.");
      return { ...base, model: createGoogleGenerativeAI({ apiKey })(config.default_model) };
    }
    case "openai_compatible": {
      if (!config.base_url) throw new ProviderError("This provider has no base URL.");
      const baseURL = assertSafeBaseUrl(config.base_url);
      return {
        ...base,
        model: createOpenAI({ apiKey: apiKey ?? "not-required", baseURL }).chat(config.default_model),
      };
    }
    default:
      throw new ProviderError("Unsupported provider.");
  }
}

/** Lists models from the provider to verify a key works. Costs nothing on supported providers. */
export async function listProviderModels(params: {
  provider: string;
  apiKey: string | null;
  baseUrl: string | null;
}): Promise<string[]> {
  const { provider, apiKey, baseUrl } = params;
  let res: Response;
  if (provider === PLATFORM_PROVIDER_ID) {
    res = await fetch(`${LOVABLE_GATEWAY_URL}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
  } else if (provider === "openai" || provider === "openai_compatible") {
    const root = provider === "openai" ? "https://api.openai.com/v1" : assertSafeBaseUrl(baseUrl ?? "");
    res = await fetch(`${root}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
  } else if (provider === "anthropic") {
    res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      headers: { "x-api-key": apiKey ?? "", "anthropic-version": "2023-06-01" },
    });
  } else if (provider === "google") {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(apiKey ?? "")}`,
    );
  } else {
    throw new ProviderError("Unsupported provider.");
  }

  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    if (res.status === 401 || res.status === 403) {
      throw new ProviderError(`The provider rejected the credentials (HTTP ${res.status}).`);
    }
    throw new ProviderError(`Provider responded with HTTP ${res.status}${body ? `: ${body}` : ""}`);
  }
  const json = (await res.json()) as { data?: { id: string }[]; models?: { name: string }[] };
  if (json.models) return json.models.map((m) => m.name.replace(/^models\//, ""));
  return (json.data ?? []).map((m) => m.id);
}
