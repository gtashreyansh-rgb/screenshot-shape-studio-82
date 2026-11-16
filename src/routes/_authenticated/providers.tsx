import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { Cpu, KeyRound, Loader2, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { saveProvider, testProvider } from "@/lib/ai.functions";
import { CAPABILITIES, PLATFORM_PROVIDER_ID, PLATFORM_TEXT_MODEL, PROVIDERS, providerName, type ProviderKind } from "@/lib/ai/catalog";
import { providersQuery, usageQuery, type ProviderConfig } from "@/lib/queries";
import { useActiveWorkspace } from "@/lib/workspace";
import { EmptyState, ErrorNote, Page, PageHeader, Section } from "@/components/app/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/providers")({
  head: () => ({ meta: [{ title: "AI Providers — CreatorOS AI" }] }),
  component: ProvidersPage,
});

function StatusBadge({ status }: { status: string }) {
  if (status === "ok") return <Badge variant="success">Connected</Badge>;
  if (status === "error") return <Badge variant="warning">Test failed</Badge>;
  return <Badge variant="muted">Not tested</Badge>;
}

function ProviderDialog({ open, onOpenChange, existing }: { open: boolean; onOpenChange: (o: boolean) => void; existing: ProviderConfig | null }) {
  const { workspace } = useActiveWorkspace();
  const queryClient = useQueryClient();
  const save = useServerFn(saveProvider);
  const [provider, setProvider] = useState<ProviderKind>((existing?.provider as ProviderKind) ?? "openai");
  const [capability, setCapability] = useState<"text" | "image">((existing?.capability as "text" | "image") ?? "text");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [model, setModel] = useState(existing?.default_model ?? PROVIDERS.openai.suggestedModel);
  const [baseUrl, setBaseUrl] = useState(existing?.base_url ?? "");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = PROVIDERS[provider];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await save({
        data: {
          workspaceId: workspace.id,
          id: existing?.id ?? null,
          provider,
          capability,
          label: label || meta.name,
          baseUrl: meta.needsBaseUrl ? baseUrl : null,
          defaultModel: model,
          apiKey: apiKey || null,
        },
      });
      if (!res.ok) { setError(res.error); return; }
      await queryClient.invalidateQueries({ queryKey: ["providers", workspace.id] });
      toast.success(existing ? "Provider updated — run a test to verify it" : "Provider saved — run a test to verify it");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{existing ? "Edit provider" : "Add an AI provider"}</DialogTitle>
            <DialogDescription>Keys are encrypted on the server and never shown again — only the last four characters.</DialogDescription>
          </DialogHeader>
          <div className="my-5 grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={(v) => { const k = v as ProviderKind; setProvider(k); if (!existing) setModel(PROVIDERS[k].suggestedModel); }} disabled={!!existing}>
                  <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(PROVIDERS) as ProviderKind[]).map((k) => <SelectItem key={k} value={k}>{PROVIDERS[k].name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Used for</Label>
                <Select value={capability} onValueChange={(v) => setCapability(v as "text" | "image")}>
                  <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>{CAPABILITIES.map((c) => <SelectItem key={c.value} value={c.value} disabled={!c.available}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <p className="-mt-1 text-[12px] text-muted-foreground">{meta.blurb}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="p-label">Label</Label>
                <Input id="p-label" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={meta.name} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-model">Model ID</Label>
                <Input id="p-model" required maxLength={120} value={model} onChange={(e) => setModel(e.target.value)} className="font-mono text-[13px]" />
              </div>
            </div>
            {meta.needsBaseUrl && (
              <div className="grid gap-1.5">
                <Label htmlFor="p-base">Base URL</Label>
                <Input id="p-base" required value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://openrouter.ai/api/v1" className="font-mono text-[13px]" />
                <p className="text-[11px] text-muted-foreground">Must be public HTTPS. A server on your own computer needs a tunnel (e.g. Cloudflare Tunnel) first.</p>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="p-key">API key {(!meta.keyRequired || existing) && <span className="font-normal text-muted-foreground">({existing ? "leave blank to keep current" : "optional"})</span>}</Label>
              <Input id="p-key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={existing?.key_hint ?? "sk-…"} required={meta.keyRequired && !existing} className="font-mono text-[13px]" />
              {meta.keyUrl && <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground underline-offset-2 hover:underline">Get a {meta.name} key ↗</a>}
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} {existing ? "Save changes" : "Save provider"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProvidersPage() {
  const { workspace, isAdmin } = useActiveWorkspace();
  const providers = useQuery(providersQuery(workspace.id));
  const usage = useQuery(usageQuery(workspace.id));
  const queryClient = useQueryClient();
  const test = useServerFn(testProvider);
  const [testing, setTesting] = useState<string | null>(null);
  const [platformResult, setPlatformResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; existing: ProviderConfig | null }>({ open: false, existing: null });

  async function runTest(providerId: string) {
    setTesting(providerId);
    try {
      const res = await test({ data: { workspaceId: workspace.id, providerId } });
      if (providerId === PLATFORM_PROVIDER_ID) setPlatformResult(res);
      (res.ok ? toast.success : toast.error)(res.message);
      await queryClient.invalidateQueries({ queryKey: ["providers", workspace.id] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setTesting(null);
    }
  }

  async function remove(p: ProviderConfig) {
    const { error } = await supabase.from("ai_provider_configs").delete().eq("id", p.id);
    if (error) { toast.error("Could not remove the provider."); return; }
    toast.success(`${p.label} removed and its key deleted`);
    queryClient.invalidateQueries({ queryKey: ["providers", workspace.id] });
  }

  const summary = useMemo(() => {
    const map = new Map<string, { ok: number; err: number; tokens: number }>();
    for (const u of usage.data ?? []) {
      const s = map.get(u.provider_label) ?? { ok: 0, err: 0, tokens: 0 };
      if (u.status === "success") s.ok++;
      else s.err++;
      s.tokens += (u.input_tokens ?? 0) + (u.output_tokens ?? 0);
      map.set(u.provider_label, s);
    }
    return [...map.entries()];
  }, [usage.data]);
  const recentErrors = (usage.data ?? []).filter((u) => u.status === "error").slice(0, 5);

  return (
    <Page>
      <PageHeader
        title="AI Providers"
        description="Choose which AI powers each feature. Use the built-in AI, or bring your own keys from OpenAI, Anthropic, Google or any OpenAI-compatible service."
        actions={isAdmin && <Button size="sm" onClick={() => setDialog({ open: true, existing: null })}><Plus /> Add provider</Button>}
      />

      <Section title="Built-in">
        <div className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-signal-soft text-signal"><Sparkles className="size-4" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Lovable AI</p>
              <Badge variant="outline" className="font-mono">{PLATFORM_TEXT_MODEL}</Badge>
              {platformResult && <Badge variant={platformResult.ok ? "success" : "warning"}>{platformResult.ok ? "Connected" : "Unavailable"}</Badge>}
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              No key needed. Requests use your workspace's AI credits — there's a small free monthly allowance, not unlimited usage.
            </p>
            {platformResult && <p className="mt-1 text-[12px] text-muted-foreground">{platformResult.message}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={() => runTest(PLATFORM_PROVIDER_ID)} disabled={testing !== null}>
            {testing === PLATFORM_PROVIDER_ID && <Loader2 className="animate-spin" />} Test connection
          </Button>
        </div>
      </Section>

      <Section title="Your providers" description={isAdmin ? undefined : "Only workspace owners and admins can add or change providers."}>
        {providers.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : providers.isError ? (
          <ErrorNote>{providers.error.message}</ErrorNote>
        ) : (providers.data ?? []).length === 0 ? (
          <EmptyState icon={KeyRound} title="No custom providers" description="Add your own API key to use a specific model or your own billing. Free tiers have rate limits — they're never unlimited." action={isAdmin && <Button size="sm" variant="outline" onClick={() => setDialog({ open: true, existing: null })}><Plus /> Add provider</Button>} />
        ) : (
          <ul className="surface divide-y">
            {(providers.data ?? []).map((p) => (
              <li key={p.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                <Cpu className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium">{p.label}</span>
                    <span className="text-[12px] text-muted-foreground">{providerName(p.provider)} · {p.capability}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {p.default_model}{p.key_hint ? ` · key ${p.key_hint}` : " · no key"}{p.base_url ? ` · ${p.base_url}` : ""}
                    {p.last_tested_at && ` · tested ${formatDistanceToNow(new Date(p.last_tested_at), { addSuffix: true })}`}
                  </p>
                  {p.status === "error" && p.last_error && <p className="mt-1 text-[12px] text-destructive">{p.last_error}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => runTest(p.id)} disabled={testing !== null}>
                    {testing === p.id && <Loader2 className="animate-spin" />} Test
                  </Button>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="More"><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setDialog({ open: true, existing: p })}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => remove(p)}>Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-muted-foreground">
          Image providers are stored now and will power Thumbnail Studio. Video and voice providers are planned.
        </p>
      </Section>

      <Section title="Usage · last 30 days" description="Recorded for every generation, including failures.">
        {usage.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : summary.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No AI requests in the last 30 days.</p>
        ) : (
          <div className="surface overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b text-left"><th className="px-4 py-2 text-eyebrow font-normal">Provider</th><th className="px-4 py-2 text-right text-eyebrow font-normal">Succeeded</th><th className="px-4 py-2 text-right text-eyebrow font-normal">Failed</th><th className="px-4 py-2 text-right text-eyebrow font-normal">Tokens</th></tr>
              </thead>
              <tbody className="divide-y">
                {summary.map(([label, s]) => (
                  <tr key={label}><td className="px-4 py-2.5">{label}</td><td className="px-4 py-2.5 text-right tabular-nums">{s.ok}</td><td className="px-4 py-2.5 text-right tabular-nums">{s.err}</td><td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">{s.tokens ? s.tokens.toLocaleString() : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {recentErrors.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-eyebrow">Recent errors</p>
            <ul className="space-y-1.5">
              {recentErrors.map((u) => (
                <li key={u.id} className="text-[12px]"><span className="text-muted-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })} · {u.provider_label} · {u.feature}:</span> <span className="text-destructive">{u.error_message}</span></li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {dialog.open && <ProviderDialog key={dialog.existing?.id ?? "new"} open={dialog.open} existing={dialog.existing} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />}
    </Page>
  );
}
