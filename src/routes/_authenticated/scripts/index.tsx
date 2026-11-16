import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { FileText, Loader2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { generateScript } from "@/lib/ai.functions";
import { PLATFORM_PROVIDER_ID } from "@/lib/ai/catalog";
import { scriptsQuery } from "@/lib/queries";
import { LANGUAGES, TONES } from "@/lib/constants";
import { useActiveWorkspace } from "@/lib/workspace";
import { EmptyState, ErrorNote, Page, PageHeader } from "@/components/app/page";
import { ProviderSelect } from "@/components/app/provider-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/scripts/")({
  head: () => ({ meta: [{ title: "Scripts — CreatorOS AI" }] }),
  component: ScriptsPage,
});

function ScriptsPage() {
  const { workspace, canEdit, user } = useActiveWorkspace();
  const scripts = useQuery(scriptsQuery(workspace.id));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const run = useServerFn(generateScript);

  const [providerId, setProviderId] = useState(PLATFORM_PROVIDER_ID);
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState(workspace.default_language || "English");
  const [tone, setTone] = useState("Conversational");
  const [audience, setAudience] = useState("");
  const [duration, setDuration] = useState(8);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [creatingBlank, setCreatingBlank] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await run({ data: { workspaceId: workspace.id, providerId, topic, language, tone, audience, durationMinutes: duration, notes } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["scripts", workspace.id] });
      queryClient.invalidateQueries({ queryKey: ["usage", workspace.id] });
      toast.success("Script generated and saved");
      navigate({ to: "/scripts/$scriptId", params: { scriptId: res.id } });
    } catch (err) {
      setError((err as Error).message || "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createBlank() {
    setCreatingBlank(true);
    const { data, error } = await supabase
      .from("scripts")
      .insert({ workspace_id: workspace.id, created_by: user.id, title: "Untitled script", topic: "Untitled", language, tone, scenes: [{ heading: "Scene 1", narration: "", visuals: "", durationSeconds: 60 }] })
      .select("id")
      .single();
    setCreatingBlank(false);
    if (error || !data) { toast.error("Could not create the script."); return; }
    await queryClient.invalidateQueries({ queryKey: ["scripts", workspace.id] });
    navigate({ to: "/scripts/$scriptId", params: { scriptId: data.id } });
  }

  return (
    <Page width="wide">
      <PageHeader
        title="Scripts"
        description="Generate structured, scene-by-scene scripts and refine them in the editor."
        actions={canEdit && <Button variant="outline" size="sm" onClick={createBlank} disabled={creatingBlank}>{creatingBlank ? <Loader2 className="animate-spin" /> : <Plus />} Blank script</Button>}
      />

      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        <form onSubmit={onGenerate} className="surface h-fit p-5">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="size-4 text-signal" />
            <h2 className="text-sm font-semibold">Generate a script</h2>
          </div>
          <fieldset disabled={!canEdit || busy} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="topic">Video topic</Label>
              <Textarea id="topic" required minLength={3} maxLength={500} rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Why budget phones got so good in 2026" />
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
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>{TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_96px] gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="audience">Audience</Label>
                <Input id="audience" maxLength={200} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. first-time buyers" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="duration">Minutes</Label>
                <Input id="duration" type="number" min={1} max={60} value={duration} onChange={(e) => setDuration(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="notes" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Key points, sponsor segment, things to avoid…" />
            </div>
            <div className="grid gap-1.5">
              <Label>Model</Label>
              <ProviderSelect workspaceId={workspace.id} value={providerId} onChange={setProviderId} />
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" disabled={busy || topic.trim().length < 3}>
              {busy ? <><Loader2 className="animate-spin" /> Writing script…</> : "Generate script"}
            </Button>
            {busy && <p className="text-center text-[11px] text-muted-foreground">This usually takes 20–60 seconds.</p>}
            {!canEdit && <p className="text-[12px] text-muted-foreground">Viewers can't create scripts in this workspace.</p>}
          </fieldset>
        </form>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Saved scripts</h2>
          {scripts.isLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : scripts.isError ? (
            <ErrorNote>{scripts.error.message}</ErrorNote>
          ) : (scripts.data ?? []).length === 0 ? (
            <EmptyState icon={FileText} title="No scripts yet" description="Describe your video on the left and generate your first script, or start from a blank page." />
          ) : (
            <ul className="surface divide-y">
              {(scripts.data ?? []).map((s) => (
                <li key={s.id}>
                  <Link to="/scripts/$scriptId" params={{ scriptId: s.id }} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{s.title}</p>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{s.topic}</p>
                    </div>
                    <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground md:inline">{s.duration_minutes} min · {s.language} · {s.tone}</span>
                    <span className="w-24 shrink-0 text-right text-[11px] text-subtle">{formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Page>
  );
}
