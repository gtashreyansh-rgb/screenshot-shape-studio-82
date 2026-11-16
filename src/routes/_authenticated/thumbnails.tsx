import { createFileRoute } from "@tanstack/react-router";
import { Image } from "lucide-react";
import { PlannedSection } from "@/components/app/planned";

export const Route = createFileRoute("/_authenticated/thumbnails")({
  head: () => ({ meta: [{ title: "Thumbnails — CreatorOS AI" }] }),
  component: () => (
    <PlannedSection icon={Image} stage={3} title="Thumbnail Studio" description="Thumbnail concepts and image generation through the provider you choose." planned={["Concept ideas from a script or SEO package", "Image generation with the built-in AI or your own image provider", "Preview, compare and save thumbnails to the workspace"]} />
  ),
});
