import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Check, Circle, FileText, Tags } from "lucide-react";

import { useActiveWorkspace } from "@/lib/workspace";
import { providersQuery, scriptsQuery, seoQuery, usageQuery } from "@/lib/queries";
import { EmptyState, Page, PageHeader, Section } from "@/components/app/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/overview")({
  head: () => ({ meta: [{ title: "Overview — CreatorOS AI" }] }),
  component: Overview,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Stat({ label, value, hint, loading }: { label: string; value: number | string; hint?: string | undefined; loading?: boolean }) {
  return (
    <div className="bg-card p-4">
      <p className="text-eyebrow">{label}</p>
      {loading ? <Skeleton className="mt-2 h-7 w-12" /> : <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>}
      {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Overview() {
  const { workspace, profile } = useActiveWorkspace();
  const scripts = useQuery(scriptsQuery(workspace.id));
  const seo = useQuery(seoQuery(workspace.id));
  const usage = useQuery(usageQuery(workspace.id));
  const providers = useQuery(providersQuery(workspace.id));

  const usageOk = usage.data?.filter((u) => u.status === "success").length ?? 0;
  const usageErr = usage.data?.filter((u) => u.status === "error").length ?? 0;
  const firstName = profile?.display_name?.split(" ")[0];

  const steps = [
    { done: true, label: "Create your account and workspace", to: "/settings" as const },
    { done: (scripts.data?.length ?? 0) > 0, label: "Generate your first script", to: "/scripts" as const },
    { done: (seo.data?.length ?? 0) > 0, label: "Package a video with SEO Studio", to: "/seo" as const },
    { done: (providers.data?.some((p) => p.status === "ok") ?? false), label: "Optional: add and test your own AI key", to: "/providers" as const },
    { done: false, label: "Connect a YouTube channel (needs Google OAuth setup)", to: "/channels" as const },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow={<span className="text-eyebrow">{workspace.name}</span>}
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description="Here's what's in your workspace. Everything below comes from your own saved work."
        actions={
          <Button asChild size="sm">
            <Link to="/scripts">New script <ArrowRight /></Link>
          </Button>
        }
      />

      <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        <Stat label="Scripts" value={scripts.data?.length ?? 0} loading={scripts.isLoading} />
        <Stat label="SEO packages" value={seo.data?.length ?? 0} loading={seo.isLoading} />
        <Stat label="AI requests · 30d" value={usageOk + usageErr} hint={usageErr ? `${usageErr} failed` : undefined} loading={usage.isLoading} />
        <Stat label="YouTube channels" value={0} hint="Not connected yet" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <Section title="Recent scripts" actions={<Link to="/scripts" className="text-[12px] text-muted-foreground hover:text-foreground">View all</Link>}>
            {scripts.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : scripts.data && scripts.data.length > 0 ? (
              <ul className="surface divide-y">
                {scripts.data.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <Link to="/scripts/$scriptId" params={{ scriptId: s.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/60">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{s.title}</span>
                      <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{s.duration_minutes} min · {s.language}</span>
                      <span className="text-[11px] text-subtle">{formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FileText} title="No scripts yet" description="Generate a scene-by-scene script from a topic in under a minute." action={<Button asChild size="sm" variant="outline"><Link to="/scripts">Open Script Studio</Link></Button>} />
            )}
          </Section>

          <Section title="Recent SEO packages" actions={<Link to="/seo" className="text-[12px] text-muted-foreground hover:text-foreground">View all</Link>}>
            {seo.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : seo.data && seo.data.length > 0 ? (
              <ul className="surface divide-y">
                {seo.data.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <Link to="/seo" search={{ id: p.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/60">
                      <Tags className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{(p.titles as string[])[0] ?? p.topic}</span>
                      <span className="text-[11px] text-subtle">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Tags} title="No SEO packages yet" description="Titles, descriptions, tags and hashtags for your next upload." action={<Button asChild size="sm" variant="outline"><Link to="/seo">Open SEO Studio</Link></Button>} />
            )}
          </Section>
        </div>

        <aside>
          <Section title="Getting started">
            <ol className="surface divide-y">
              {steps.map((s) => (
                <li key={s.label}>
                  <Link to={s.to} className="flex items-start gap-3 px-4 py-3 text-[13px] hover:bg-accent/60">
                    {s.done ? (
                      <span className="mt-0.5 flex size-4 items-center justify-center rounded-full bg-success text-background"><Check className="size-2.5" strokeWidth={3} /></span>
                    ) : (
                      <Circle className="mt-0.5 size-4 text-subtle" />
                    )}
                    <span className={s.done ? "text-muted-foreground line-through decoration-border" : "text-foreground"}>{s.label}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="AI activity · 30 days">
            {usage.data && usage.data.length > 0 ? (
              <ul className="space-y-2">
                {usage.data.slice(0, 6).map((u) => (
                  <li key={u.id} className="flex items-center gap-2 text-[12px]">
                    <Badge variant={u.status === "success" ? "success" : "warning"}>{u.status === "success" ? "OK" : "Failed"}</Badge>
                    <span className="capitalize">{u.feature}</span>
                    <span className="truncate text-muted-foreground">· {u.provider_label}</span>
                    <span className="ml-auto shrink-0 text-subtle">{formatDistanceToNow(new Date(u.created_at))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">No AI requests yet.</p>
            )}
          </Section>
        </aside>
      </div>
    </Page>
  );
}
