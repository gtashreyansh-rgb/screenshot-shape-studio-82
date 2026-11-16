import { createFileRoute } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { PlannedSection } from "@/components/app/planned";

export const Route = createFileRoute("/_authenticated/video")({
  head: () => ({ meta: [{ title: "Video Studio — CreatorOS AI" }] }),
  component: () => (
    <PlannedSection icon={Clapperboard} stage={5} title="Video Studio" description="Upload your own videos and manage production as persistent projects." planned={["Upload videos you own or are authorized to use", "Persistent video projects linking scripts, SEO and thumbnails", "Background processing jobs with real progress and error states", "Generated asset storage and a clear export workflow"]} requirement="Video processing (transcription, rendering) needs a dedicated media-processing service; it can't run inside the web app itself." />
  ),
});
