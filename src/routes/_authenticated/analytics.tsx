import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

import { EmptyState, Page, PageHeader } from "@/components/app/page";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — CreatorOS AI" }] }),
  component: () => (
    <Page>
      <PageHeader title="Analytics" description="Views, watch time, subscribers and audience — straight from YouTube, with source and last sync time." />
      <EmptyState
        icon={BarChart3}
        title="No channel connected"
        description="Analytics only shows real data from YouTube. Connect a channel to see your views, watch time and audience here — no sample numbers are ever displayed."
        action={<Button asChild size="sm" variant="outline"><Link to="/channels">Set up YouTube connection</Link></Button>}
      />
    </Page>
  ),
});
