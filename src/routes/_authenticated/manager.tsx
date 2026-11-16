import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { PlannedSection } from "@/components/app/planned";

export const Route = createFileRoute("/_authenticated/manager")({
  head: () => ({ meta: [{ title: "AI Manager — CreatorOS AI" }] }),
  component: () => (
    <PlannedSection icon={Bot} stage={4} title="AI Manager" description="A chat-driven assistant that plans and runs creator tasks using only tools that really exist in your workspace." planned={["Chat interface with persistent task history", "Step-by-step task plans with live progress, retry and cancel", "Runs real tools only: script, SEO and (later) YouTube actions", "Explicit approval before publishing, deleting, or expensive operations", "Full execution logs and audit history"]} />
  ),
});
