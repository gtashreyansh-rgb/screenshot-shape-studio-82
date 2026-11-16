import { createFileRoute } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import { PlannedSection } from "@/components/app/planned";

export const Route = createFileRoute("/_authenticated/shorts")({
  head: () => ({ meta: [{ title: "Shorts Studio — CreatorOS AI" }] }),
  component: () => (
    <PlannedSection icon={Scissors} stage={5} title="Shorts Studio" description="Turn your authorized long-form videos into vertical Shorts." planned={["Transcription and highlight detection", "Smart vertical reframing", "Captions and subtitles", "Render and export, ready for upload"]} requirement="Depends on Video Studio uploads and a media-processing service." />
  ),
});
