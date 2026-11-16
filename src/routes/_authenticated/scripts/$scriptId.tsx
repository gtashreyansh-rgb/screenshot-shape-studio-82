import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { ScriptScene } from "@/lib/ai/schemas";
import { scriptQuery } from "@/lib/queries";
import { useActiveWorkspace } from "@/lib/workspace";
import { EmptyState, ErrorNote, Page } from "@/components/app/page";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/scripts/$scriptId")({
  head: () => ({ meta: [{ title: "Script — CreatorOS AI" }] }),
  component: ScriptEditor,
});

type Draft = { title: string; hook: string; outro: string; scenes: ScriptScene[] };

function fmtDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ScriptEditor() {
  const { scriptId } = Route.useParams();
  const { canEdit } = useActiveWorkspace();
  const query = useQuery(scriptQuery(scriptId));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const original = useMemo<Draft | null>(() => {
    const d = query.data;
    if (!d) return null;
    return { title: d.title, hook: d.hook ?? "", outro: d.outro ?? "", scenes: (d.scenes as ScriptScene[]) ?? [] };
  }, [query.data]);

  useEffect(() => {
    if (original) setDraft(original);
  }, [original]);

  const dirty = draft && original && JSON.stringify(draft) !== JSON.stringify(original);
  const total = draft?.scenes.reduce((a, s) => a + (Number(s.durationSeconds) || 0), 0) ?? 0;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (query.isLoading || (query.data && !draft)) {
    return (
      <Page width="narrow">
        <Skeleton className="mb-4 h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </Page>
    );
  }
  if (query.isError) return <Page width="narrow"><ErrorNote>{query.error.message}</ErrorNote></Page>;
  if (!query.data || !draft) {
    return (
      <Page width="narrow">
        <EmptyState icon={ArrowLeft} title="Script not found" description="It may have been deleted, or it belongs to another workspace." action={<Button asChild size="sm" variant="outline"><Link to="/scripts">Back to scripts</Link></Button>} />
      </Page>
    );
  }
  const row = query.data;

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updateScene = (i: number, patch: Partial<ScriptScene>) =>
    update({ scenes: draft.scenes.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  const moveScene = (i: number, dir: -1 | 1) => {
    const next = [...draft.scenes];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    update({ scenes: next });
  };

  async function save() {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase
      .from("scripts")
      .update({ title: draft.title.trim() || "Untitled script", hook: draft.hook, outro: draft.outro, scenes: draft.scenes })
      .eq("id", scriptId);
    setSaving(false);
    if (error) { toast.error("Could not save changes."); return; }
    toast.success("Script saved");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["script", scriptId] }),
      queryClient.invalidateQueries({ queryKey: ["scripts"] }),
    ]);
  }

  async function remove() {
    setDeleting(true);
    const { error } = await supabase.from("scripts").delete().eq("id", scriptId);
    setDeleting(false);
    if (error) { toast.error("Could not delete the script."); return; }
    await queryClient.invalidateQueries({ queryKey: ["scripts"] });
    toast.success("Script deleted");
    navigate({ to: "/scripts" });
  }

  function copyAll() {
    const text = [
      draft!.title,
      "",
      "HOOK",
      draft!.hook,
      "",
      ...draft!.scenes.flatMap((s, i) => [`SCENE ${i + 1} — ${s.heading} (${fmtDuration(s.durationSeconds)})`, s.narration, s.visuals ? `[Visuals: ${s.visuals}]` : "", ""]),
      "OUTRO",
      draft!.outro,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => toast.success("Copied script to clipboard"), () => toast.error("Clipboard access was blocked"));
  }

  return (
    <Page width="narrow">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/scripts"><ArrowLeft /> Scripts</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyAll}><Copy /> Copy</Button>
          {canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Delete script"><Trash2 /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this script?</AlertDialogTitle>
                  <AlertDialogDescription>“{row.title}” will be permanently removed for everyone in this workspace.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canEdit && (
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              {saving && <Loader2 className="animate-spin" />} {dirty ? "Save changes" : "Saved"}
            </Button>
          )}
        </div>
      </div>

      <fieldset disabled={!canEdit}>
        <Input
          aria-label="Title"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          className="h-auto border-0 bg-transparent px-0 text-[22px] font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-[22px]"
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="muted">{row.language}</Badge>
          <Badge variant="muted">{row.tone}</Badge>
          <Badge variant="muted">Target {row.duration_minutes} min</Badge>
          <Badge variant="outline" className="font-mono">Est. {fmtDuration(total)}</Badge>
          {row.generated_with && <span className="ml-1 text-[11px] text-subtle">Generated with {row.generated_with} · {format(new Date(row.created_at), "d MMM yyyy")}</span>}
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground">{row.topic}</p>

        <div className="mt-8 grid gap-1.5">
          <Label className="text-eyebrow">Hook</Label>
          <Textarea rows={3} value={draft.hook} onChange={(e) => update({ hook: e.target.value })} className="bg-card text-[14px] leading-relaxed" />
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-eyebrow">Scenes · {draft.scenes.length}</span>
            {canEdit && (
              <Button type="button" variant="ghost" size="xs" onClick={() => update({ scenes: [...draft.scenes, { heading: `Scene ${draft.scenes.length + 1}`, narration: "", visuals: "", durationSeconds: 60 }] })}>
                <Plus /> Add scene
              </Button>
            )}
          </div>
          <ol className="space-y-3">
            {draft.scenes.map((scene, i) => (
              <li key={i} className="surface p-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                  <Input aria-label={`Scene ${i + 1} heading`} value={scene.heading} onChange={(e) => updateScene(i, { heading: e.target.value })} className="h-8 flex-1 border-0 bg-transparent px-1 text-[14px] font-medium shadow-none focus-visible:ring-1" />
                  <div className="flex items-center gap-1">
                    <Input aria-label="Seconds" type="number" min={0} value={scene.durationSeconds} onChange={(e) => updateScene(i, { durationSeconds: Math.max(0, Number(e.target.value) || 0) })} className="h-7 w-16 px-2 text-right font-mono text-[12px]" />
                    <span className="text-[11px] text-muted-foreground">s</span>
                  </div>
                  {canEdit && (
                    <div className="flex">
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7" aria-label="Move up" onClick={() => moveScene(i, -1)} disabled={i === 0}><ArrowUp /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7" aria-label="Move down" onClick={() => moveScene(i, 1)} disabled={i === draft.scenes.length - 1}><ArrowDown /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" className="size-7" aria-label="Remove scene" onClick={() => update({ scenes: draft.scenes.filter((_, idx) => idx !== i) })}><Trash2 /></Button>
                    </div>
                  )}
                </div>
                <Textarea aria-label="Narration" rows={4} value={scene.narration} onChange={(e) => updateScene(i, { narration: e.target.value })} placeholder="What you say on camera…" className="mt-3 border-0 bg-transparent px-1 text-[14px] leading-relaxed shadow-none focus-visible:ring-1" />
                <div className="mt-2 rounded-md bg-muted px-3 py-2">
                  <Label className="text-eyebrow">Visuals</Label>
                  <Textarea aria-label="Visuals" rows={2} value={scene.visuals} onChange={(e) => updateScene(i, { visuals: e.target.value })} placeholder="B-roll, graphics, on-screen text…" className="mt-1 min-h-0 border-0 bg-transparent px-0 text-[13px] text-muted-foreground shadow-none focus-visible:ring-0" />
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 grid gap-1.5">
          <Label className="text-eyebrow">Outro</Label>
          <Textarea rows={3} value={draft.outro} onChange={(e) => update({ outro: e.target.value })} className="bg-card text-[14px] leading-relaxed" />
        </div>
      </fieldset>
    </Page>
  );
}
