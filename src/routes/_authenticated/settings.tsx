import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/constants";
import { membersQuery } from "@/lib/queries";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { useActiveWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { Page, PageHeader } from "@/components/app/page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — CreatorOS AI" }] }),
  component: SettingsPage,
});

const TIMEZONES = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
  } catch {
    return ["UTC"];
  }
})();

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b py-5 last:border-b-0 sm:grid-cols-[220px_1fr] sm:gap-8">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ProfileTab() {
  const { user, profile, refresh } = useActiveWorkspace();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [busy, setBusy] = useState(false);
  const provider = user.app_metadata?.provider === "google" ? "Google" : "Email";

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() || null }).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error("Could not update your profile."); return; }
    await refresh();
    toast.success("Profile updated");
  }

  return (
    <div className="surface px-5">
      <Row label="Display name" hint="Shown to teammates in this workspace.">
        <div className="flex max-w-md gap-2">
          <Input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          <Button onClick={save} disabled={busy || name === (profile?.display_name ?? "")}>{busy && <Loader2 className="animate-spin" />} Save</Button>
        </div>
      </Row>
      <Row label="Email"><p className="text-[13px]">{user.email}</p></Row>
      <Row label="Sign-in method"><Badge variant="muted">{provider}</Badge></Row>
    </div>
  );
}

function WorkspaceTab() {
  const { workspace, isAdmin, role, workspaces, switchWorkspace, refresh } = useActiveWorkspace();
  const [name, setName] = useState(workspace.name);
  const [language, setLanguage] = useState(workspace.default_language);
  const [timezone, setTimezone] = useState(workspace.timezone);
  const [busy, setBusy] = useState(false);
  const dirty = name !== workspace.name || language !== workspace.default_language || timezone !== workspace.timezone;

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("workspaces").update({ name: name.trim().slice(0, 80), default_language: language, timezone }).eq("id", workspace.id);
    setBusy(false);
    if (error) { toast.error("Could not update the workspace."); return; }
    await refresh();
    toast.success("Workspace updated");
  }

  async function remove() {
    const other = workspaces.find((w) => w.id !== workspace.id);
    if (!other) return;
    const { error } = await supabase.from("workspaces").delete().eq("id", workspace.id);
    if (error) { toast.error("Could not delete the workspace."); return; }
    await switchWorkspace(other.id);
    toast.success("Workspace deleted");
  }

  return (
    <div className="space-y-6">
      <fieldset disabled={!isAdmin} className="surface px-5">
        <Row label="Workspace name"><Input className="max-w-md" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></Row>
        <Row label="Default language" hint="Pre-selected in Script and SEO Studio.">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="max-w-xs bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </Row>
        <Row label="Timezone" hint="Used for scheduling and the content calendar.">
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="max-w-xs bg-card"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Row>
        <div className="flex items-center justify-end gap-3 py-4">
          {!isAdmin && <span className="mr-auto text-[12px] text-muted-foreground">Only owners and admins can change workspace settings.</span>}
          <Button onClick={save} disabled={!dirty || busy || !name.trim()}>{busy && <Loader2 className="animate-spin" />} Save changes</Button>
        </div>
      </fieldset>

      {role === "owner" && (
        <div className="surface border-destructive/30 px-5">
          <Row label="Delete workspace" hint="Permanently deletes scripts, SEO packages and providers in this workspace.">
            {workspaces.length < 2 ? (
              <p className="text-[13px] text-muted-foreground">You can't delete your only workspace. Create another one first.</p>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline" className="text-destructive">Delete “{workspace.name}”</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this workspace?</AlertDialogTitle>
                    <AlertDialogDescription>All scripts, SEO packages, AI providers and stored keys in “{workspace.name}” will be permanently deleted. This can't be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete workspace</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </Row>
        </div>
      )}
    </div>
  );
}

function MembersTab() {
  const { workspace, user } = useActiveWorkspace();
  const members = useQuery(membersQuery(workspace.id));
  return (
    <div className="space-y-3">
      {members.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <ul className="surface divide-y">
          {members.data?.map((m) => {
            const name = m.profile?.display_name ?? "Member";
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="size-8 rounded-md">
                  {m.profile?.avatar_url && <AvatarImage src={m.profile.avatar_url} alt="" />}
                  <AvatarFallback className="rounded-md text-[11px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-[13px] font-medium">{name}{m.user_id === user.id && <span className="ml-1.5 font-normal text-muted-foreground">(you)</span>}</span>
                <Badge variant={m.role === "owner" ? "signal" : "muted"} className="capitalize">{m.role}</Badge>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[12px] text-muted-foreground">Inviting teammates is coming with team support. Roles (owner, admin, editor, viewer) are already enforced on every action.</p>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <div className="surface px-5">
      <Row label="Theme" hint="Saved on this device.">
        <div className="grid max-w-md grid-cols-3 gap-2">
          {options.map((o) => (
            <button key={o.value} onClick={() => setTheme(o.value)} className={cn("flex flex-col items-center gap-2 rounded-lg border bg-card px-3 py-4 text-[13px] transition-colors hover:bg-accent", theme === o.value && "border-foreground/40 ring-1 ring-foreground/20")}>
              <o.icon className="size-4" /> {o.label}
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}

function SettingsPage() {
  const { workspace } = useActiveWorkspace();
  return (
    <Page>
      <PageHeader title="Settings" description="Your profile, workspace and preferences." />
      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="workspace"><WorkspaceTab key={workspace.id} /></TabsContent>
        <TabsContent value="members"><MembersTab /></TabsContent>
        <TabsContent value="appearance"><AppearanceTab /></TabsContent>
      </Tabs>
    </Page>
  );
}
