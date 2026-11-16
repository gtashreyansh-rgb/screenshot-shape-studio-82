import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PlannedSection } from "@/components/app/planned";

export const Route = createFileRoute("/_authenticated/competitors")({
  head: () => ({ meta: [{ title: "Competitor Research — CreatorOS AI" }] }),
  component: () => (
    <PlannedSection icon={Search} stage={2} title="Competitor Research" description="Track public channels in your niche and spot content opportunities." planned={["Follow public channels using the official YouTube Data API", "Recent uploads, publish cadence and public view counts", "AI summaries of topics and gaps — clearly labelled as AI analysis"]} requirement="Requires a YouTube Data API key or the Google OAuth setup described on the YouTube Channels page." />
  ),
});
