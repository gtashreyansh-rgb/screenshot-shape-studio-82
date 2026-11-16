import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { PlannedSection } from "@/components/app/planned";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Content Calendar — CreatorOS AI" }] }),
  component: () => (
    <PlannedSection icon={CalendarDays} stage={3} title="Content Calendar" description="Plan uploads across channels in your workspace timezone." planned={["Drag-and-drop schedule of planned videos", "Link scripts, SEO packages and thumbnails to each slot", "Publishing schedule synced with YouTube once channels are connected"]} />
  ),
});
