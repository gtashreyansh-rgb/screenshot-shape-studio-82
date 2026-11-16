// Client-safe catalog of supported AI providers. Adding a provider = add an entry here
// plus an adapter branch in adapters.server.ts.
export const PLATFORM_PROVIDER_ID = "lovable";
export const PLATFORM_TEXT_MODEL = "openai/gpt-6-astra";

export type ProviderKind = "openai" | "anthropic" | "google" | "openai_compatible";
export type Capability = "text" | "image" | "video" | "voice";

export const PROVIDERS: Record<
  ProviderKind,
  {
    name: string;
    blurb: string;
    suggestedModel: string;
    keyRequired: boolean;
    needsBaseUrl: boolean;
    keyUrl?: string;
  }
> = {
  openai: {
    name: "OpenAI",
    blurb: "GPT models with your own OpenAI API key.",
    suggestedModel: "gpt-4o-mini",
    keyRequired: true,
    needsBaseUrl: false,
    keyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Anthropic",
    blurb: "Claude models with your own Anthropic API key.",
    suggestedModel: "claude-3-5-haiku-latest",
    keyRequired: true,
    needsBaseUrl: false,
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  google: {
    name: "Google Gemini",
    blurb: "Gemini models with a Google AI Studio key. AI Studio offers a limited free tier.",
    suggestedModel: "gemini-2.0-flash",
    keyRequired: true,
    needsBaseUrl: false,
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
  openai_compatible: {
    name: "OpenAI-compatible",
    blurb: "OpenRouter, Groq, Together, or a self-hosted server (Ollama, LM Studio) exposed over HTTPS.",
    suggestedModel: "llama-3.1-8b-instant",
    keyRequired: false,
    needsBaseUrl: true,
  },
};

export const CAPABILITIES: { value: Capability; label: string; available: boolean }[] = [
  { value: "text", label: "Text generation", available: true },
  { value: "image", label: "Image generation", available: true },
  { value: "video", label: "Video generation (planned)", available: false },
  { value: "voice", label: "Voice (planned)", available: false },
];

export function providerName(kind: string): string {
  return (PROVIDERS as Record<string, { name: string }>)[kind]?.name ?? kind;
}
