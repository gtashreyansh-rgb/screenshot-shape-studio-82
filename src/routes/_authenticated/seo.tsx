import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { Copy, Loader2, Sparkles, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { generateSeo } from "@/lib/ai.functions";
import { PLATFORM_PROVIDER_ID } from "@/lib/ai/catalog";
import { LANGUAGES } from "@/lib/constants";
import { seoQuery, type SeoRow } from "@/lib/queries";
import { useActiveWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorNote, Page, PageHeader } from "@/components/app/page";
import { ProviderSelect } from "@/components/app/provider-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/seo")({
  validateSearch: (s) => z.object({ id: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "SEO Studio — CreatorOS AI" }] }),
  component: SeoPage,
});

function copy(text: string, what: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`Copied ${what}`), () => toast.error("Clipboard access was blocked"));
}

function Block({ label, onCopy, children }: { label: string; onCopy: () => void; children: React.ReactNode }) {
  return (
    <div className="border-t px-5 py-4 first:border-t-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-eyebrow">{label}</span>
        <Button variant="ghost" size="xs" onClick={onCopy}><Copy /> Copy</Button>
      </div>
      {children}
    </div>
  );
}

function SeoResult({ pkg, onDelete, canEdit }: { pkg: SeoRow; onDelete: () => void; canEdit: boolean }) {
  const titles = pkg.titles as string[];
  const tags = pkg.tags as string[];
  const keywords = pkg.keywords as string[];
  const hashtags = pkg.hashtags as string[];
  const tips = pkg.upload_tips as string[];
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/40 px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">{pkg.topic}</p>
          <p className="text-[11px] text-muted-foreground">{pkg.language} · {pkg.generated_with} · {formatDistanceToNow(new Date(pkg.created_at), { addSuffix: true })}</p>
        </div>
        {canEdit && <Button variant="ghost" size="icon-sm" aria-label="Delete package" onClick={onDelete}><Trash2 /></Button>}
      </div>
      <Block label="Title options" onCopy={() => copy(titles.join("\n"), "titles")}>
        <ol className="space-y-1.5">
          {titles.map((t, i) => (
            <li key={i} className="group flex items-center gap-3 text-[14px]">
              <span className="w-4 font-mono text-[11px] text-subtle">{i + 1}</span>
              <span className="flex-1">{t}</span>
              <span className={cn("font-mono text-[10px]", t.length > 70 ? "text-warning" : "text-subtle")}>{t.length}</span>
              <button className="opacity-0 transition-opacity group-hover:opacity-100" onClick={() => copy(t, "title")} aria-label="Copy title"><Copy className="size-3.5 text-muted-foreground" /></button>
            </li>
          ))}
        </ol>
      </Block>
      <Block label="Description" onCopy={() => copy(pkg.description ?? "", "description")}>
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">{pkg.description}</p>
      </Block>
      <Block label={`Tags · ${tags.join(", ").length}/500 chars`} onCopy={() => copy(tags.join(", "), "tags")}>
        <div className="flex flex-wrap gap-1.5">{tags.map((t) => <span key={t} className="rounded-md border bg-card px-2 py-0.5 text-[12px]">{t}</span>)}</div>
      </Block>
      <Block label="Search keywords" onCopy={() => copy(keywords.join(", "), "keywords")}>
        <div className="flex flex-wrap gap-1.5">{keywords.map((t) => <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[12px]">{t}</span>)}</div>
      </Block>
      <Block label="Hashtags" onCopy={() => copy(hashtags.join(" "), "hashtags")}>
        <p className="font-mono text-[13px] text-signal">{hashtags.join("  ")}</p>
      </Block>
      {tips.length > 0 && (
        <Block label="Upload tips" onCopy={() => copy(tips.join("\n"), "tips")}>
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-muted-foreground">{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </Block>
      )}
    </div>
  );
}

function SeoPage() {
  const { workspace, canEdit } = useActiveWorkspace();
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/seo" });
  const packages = useQuery(seoQuery(workspace.id));
  const queryClient = useQueryClient();
  const run = useServerFn(generateSeo);

  const [providerId, setProviderId] = useState(PLATFORM_PROVIDER_ID);
  const [topic, setTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [language, setLanguage] = useState(workspace.default_language || "English");
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = packages.data?.find((p) => p.id === id) ?? packages.data?.[0];

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await run({ data: { workspaceId: workspace.id, providerId, topic, summary, language, audience } });
      if (!res.ok) { setError(res.error); return; }
      await queryClient.invalidateQueries({ queryKey: ["seo", workspace.id] });
      queryClient.invalidateQueries({ queryKey: ["usage", workspace.id] });
      navigate({ search: { id: res.id } });
      toast.success("Metadata generated and saved");
    } catch (err) {
      setError((err as Error).message || "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(pkgId: string) {
    const { error } = await supabase.from("seo_packages").delete().eq("id", pkgId);
    if (error) { toast.error("Could not delete."); return; }
    await queryClient.invalidateQueries({ queryKey: ["seo", workspace.id] });
    navigate({ search: {} });
    toast.success("Deleted");
  }

  return (
    <Page width="wide">
      <PageHeader title="SEO Studio" description="Generate upload-ready titles, descriptions, tags and hashtags. Review before publishing — you're responsible for accuracy." />
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="space-y-8">
          <form onSubmit={onGenerate} className="surface p-5">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="size-4 text-signal" />
              <h2 className="text-sm font-semibold">New metadata package</h2>
            </div>
            <fieldset disabled={!canEdit || busy} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="seo-topic">Video topic</Label>
                <Input id="seo-topic" required minLength={3} maxLength={300} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Pixel 10a long-term review" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="seo-summary">Summary or script excerpt <span className="font-normal text-muted-foreground">(recommended)</span></Label>
                <Textarea id="seo-summary" rows={5} maxLength={4000} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What the video actually covers — better input, more accurate metadata." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="seo-aud">Audience</Label>
                  <Input id="seo-aud" maxLength={200} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="optional" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Model</Label>
                <ProviderSelect workspaceId={workspace.id} value={providerId} onChange={setProviderId} />
              </div>
              {error && <ErrorNote>{error}</ErrorNote>}
              <Button type="submit" disabled={busy || topic.trim().length < 3}>
                {busy ? <><Loader2 className="animate-spin" /> Generating…</> : "Generate metadata"}
              </Button>
            </fieldset>
          </form>

          {packages.data && packages.data.length > 0 && (
            <div>
              <h2 className="mb-2 text-eyebrow">History</h2>
              <ul className="space-y-0.5">
                {packages.data.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => navigate({ search: { id: p.id } })}
                      className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-accent", selected?.id === p.id && "bg-accent font-medium")}
                    >
                      <span className="min-w-0 flex-1 truncate">{p.topic}</span>
                      <span className="shrink-0 text-[11px] text-subtle">{formatDistanceToNow(new Date(p.created_at))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          {packages.isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : packages.isError ? (
            <ErrorNote>{packages.error.message}</ErrorNote>
          ) : selected ? (
            <SeoResult pkg={selected} canEdit={canEdit} onDelete={() => remove(selected.id)} />
          ) : (
            <EmptyState icon={Tags} title="No metadata yet" description="Describe a video and generate a full metadata package. Every package is saved to this workspace." />
          )}
        </div>
      </div>
    </Page>
  );
}
