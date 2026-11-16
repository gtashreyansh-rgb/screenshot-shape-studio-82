import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ProviderConfig = Database["public"]["Tables"]["ai_provider_configs"]["Row"];
export type ScriptRow = Database["public"]["Tables"]["scripts"]["Row"];
export type SeoRow = Database["public"]["Tables"]["seo_packages"]["Row"];
export type UsageRow = Database["public"]["Tables"]["ai_usage_events"]["Row"];

export const providersQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: ["providers", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_provider_configs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at");
      if (error) throw new Error("Could not load AI providers.");
      return data;
    },
  });

export const scriptsQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: ["scripts", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scripts")
        .select("id, title, topic, language, tone, duration_minutes, generated_with, updated_at, created_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw new Error("Could not load scripts.");
      return data;
    },
  });

export const scriptQuery = (scriptId: string) =>
  queryOptions({
    queryKey: ["script", scriptId],
    queryFn: async () => {
      const { data, error } = await supabase.from("scripts").select("*").eq("id", scriptId).maybeSingle();
      if (error) throw new Error("Could not load the script.");
      return data;
    },
  });

export const seoQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: ["seo", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_packages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error("Could not load SEO packages.");
      return data;
    },
  });

export const usageQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: ["usage", workspaceId],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("ai_usage_events")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw new Error("Could not load AI usage.");
      return data;
    },
  });

export const membersQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: ["members", workspaceId],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at");
      if (error) throw new Error("Could not load members.");
      const ids = members.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      return members.map((m) => ({ ...m, profile: profiles?.find((p) => p.id === m.user_id) ?? null }));
    },
  });
