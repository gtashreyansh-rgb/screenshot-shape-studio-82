import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type SessionData = {
  user: User;
  profile: Profile | null;
  workspaces: (Workspace & { role: WorkspaceRole })[];
};

export const sessionQuery = queryOptions({
  queryKey: ["session-data"],
  queryFn: async (): Promise<SessionData> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Not signed in");
    const user = userData.user;
    const [{ data: profile }, { data: memberships, error }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("workspace_members").select("role, workspace:workspaces(*)").eq("user_id", user.id),
    ]);
    if (error) throw new Error("Could not load your workspaces.");
    const workspaces = (memberships ?? [])
      .filter((m) => m.workspace)
      .map((m) => ({ ...(m.workspace as Workspace), role: m.role }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { user, profile, workspaces };
  },
  staleTime: 60_000,
});

type WorkspaceContextValue = SessionData & {
  workspace: (Workspace & { role: WorkspaceRole }) | null;
  role: WorkspaceRole | null;
  canEdit: boolean;
  isAdmin: boolean;
  switchWorkspace: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data } = useSuspenseQuery(sessionQuery);
  const queryClient = useQueryClient();
  const workspace =
    data.workspaces.find((w) => w.id === data.profile?.active_workspace_id) ?? data.workspaces[0] ?? null;
  const role = workspace?.role ?? null;

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["session-data"] });
  }, [queryClient]);

  const switchWorkspace = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("profiles").update({ active_workspace_id: id }).eq("id", data.user.id);
      if (error) throw new Error("Could not switch workspace.");
      await queryClient.invalidateQueries();
    },
    [data.user.id, queryClient],
  );

  return (
    <WorkspaceContext.Provider
      value={{
        ...data,
        workspace,
        role,
        canEdit: role === "owner" || role === "admin" || role === "editor",
        isAdmin: role === "owner" || role === "admin",
        switchWorkspace,
        refresh,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

/** Active workspace, guaranteed present (the shell renders a recovery state otherwise). */
export function useActiveWorkspace() {
  const ctx = useWorkspace();
  if (!ctx.workspace) throw new Error("No workspace available");
  return { ...ctx, workspace: ctx.workspace };
}
