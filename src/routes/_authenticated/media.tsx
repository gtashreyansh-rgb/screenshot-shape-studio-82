import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen } from "lucide-react";
import { PlannedSection } from "@/components/app/planned";

export const Route = createFileRoute("/_authenticated/media")({
  head: () => ({ meta: [{ title: "Media Library — CreatorOS AI" }] }),
  component: () => (
    <PlannedSection icon={FolderOpen} stage={5} title="Media Library" description="Every uploaded and generated asset in one place." planned={["Uploaded videos, generated thumbnails and exports", "Private storage scoped to your workspace", "Search, filter and reuse assets across projects"]} />
  ),
});
