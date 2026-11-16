import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { sessionQuery, useWorkspace, WorkspaceProvider } from "@/lib/workspace";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(sessionQuery),
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  ),
  component: AuthenticatedLayout,
});

function NoWorkspaceGate({ children }: { children: React.ReactNode }) {
  const { workspace, refresh } = useWorkspace();
  if (workspace) return <>{children}</>;
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-base font-semibold">Your workspace is still being prepared</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We couldn't find a workspace for your account. Try reloading in a moment.
        </p>
        <Button size="sm" className="mt-4" onClick={() => refresh()}>
          Reload
        </Button>
      </div>
    </div>
  );
}

function AuthenticatedLayout() {
  return (
    <WorkspaceProvider>
      <AppShell>
        <NoWorkspaceGate>
          <Outlet />
        </NoWorkspaceGate>
      </AppShell>
    </WorkspaceProvider>
  );
}
