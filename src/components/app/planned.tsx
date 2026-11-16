import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { Page, PageHeader } from "./page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Honest placeholder for sections that are designed but not built yet. Nothing here pretends to work. */
export function PlannedSection({
  icon: Icon,
  title,
  description,
  stage,
  planned,
  requirement,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  stage: number;
  planned: string[];
  requirement?: string;
}) {
  return (
    <Page width="narrow">
      <PageHeader title={title} description={description} eyebrow={<Badge variant="muted" className="font-mono uppercase tracking-wider">Not built yet · Stage {stage}</Badge>} />
      <div className="surface dot-grid overflow-hidden">
        <div className="flex items-center gap-3 border-b bg-card px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground"><Icon className="size-4" /></div>
          <p className="text-[13px] text-muted-foreground">This section isn't available yet. Here's what it will do when it ships:</p>
        </div>
        <ul className="space-y-2.5 bg-card/80 px-5 py-5">
          {planned.map((p) => (
            <li key={p} className="flex gap-3 text-[13px]"><span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" />{p}</li>
          ))}
        </ul>
        {requirement && <div className="border-t bg-warning-soft px-5 py-3 text-[12px] text-warning">{requirement}</div>}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline"><Link to="/scripts">Open Script Studio</Link></Button>
        <Button asChild size="sm" variant="ghost"><Link to="/seo">Open SEO Studio</Link></Button>
      </div>
    </Page>
  );
}
