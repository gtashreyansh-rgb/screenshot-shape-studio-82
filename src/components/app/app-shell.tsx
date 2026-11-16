import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, LogOut, Monitor, Moon, Plus, Sun, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { useWorkspace } from "@/lib/workspace";
import { NAV_FOOTER, NAV_GROUPS, type NavItem } from "./nav";
import { BrandMark } from "./brand";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name: string | null | undefined) {
  return (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function NavLink({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link to={item.to}>
          <Icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
      {item.status === "planned" && (
        <SidebarMenuBadge className="font-mono text-[10px] font-normal text-subtle">Soon</SidebarMenuBadge>
      )}
      {item.status === "setup" && (
        <SidebarMenuBadge>
          <span className="size-1.5 rounded-full bg-warning" aria-label="Needs setup" />
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

function WorkspaceSwitcher() {
  const { workspace, workspaces, switchWorkspace } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
            <BrandMark />
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-[13px] font-semibold">{workspace?.name ?? "No workspace"}</span>
              <span className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {workspace?.role ?? "—"}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-eyebrow">Workspaces</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onSelect={() => {
                if (w.id === workspace?.id) return;
                switchWorkspace(w.id).catch((e: Error) => toast.error(e.message));
              }}
            >
              <span className="truncate">{w.name}</span>
              {w.id === workspace?.id && <Check className="ml-auto size-3.5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="size-3.5" /> New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

function UserMenu() {
  const { user, profile } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const name = profile?.display_name ?? user.email ?? "Account";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
          <Avatar className="size-7 rounded-md">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
            <AvatarFallback className="rounded-md bg-muted text-[11px] font-medium">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate text-[13px] font-medium">{name}</span>
            <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
          </div>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <UserRound className="size-3.5" /> Profile & settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-eyebrow">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
          <DropdownMenuRadioItem value="light"><Sun className="size-3.5" /> Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon className="size-3.5" /> Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor className="size-3.5" /> System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut className="size-3.5" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CurrentTitle() {
  const { pathname } = useLocation();
  const all = [...NAV_GROUPS.flatMap((g) => g.items), ...NAV_FOOTER];
  const item = all.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
  return <span className="truncate text-[13px] font-medium text-foreground">{item?.label ?? ""}</span>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <WorkspaceSwitcher />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-eyebrow">{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavLink key={item.to} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {NAV_FOOTER.map((item) => (
              <NavLink key={item.to} item={item} />
            ))}
          </SidebarMenu>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserMenu />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <SidebarTrigger className="size-8 text-muted-foreground" />
          <span className="h-4 w-px bg-border" />
          <CurrentTitle />
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
