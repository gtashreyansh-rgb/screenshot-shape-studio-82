import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Page, PageHeader, Section } from "@/components/app/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/channels")({
  head: () => ({ meta: [{ title: "YouTube Channels — CreatorOS AI" }] }),
  component: ChannelsPage,
});

const SCOPES = [
  { scope: "https://www.googleapis.com/auth/youtube.readonly", why: "Channel details, video list and comments" },
  { scope: "https://www.googleapis.com/auth/yt-analytics.readonly", why: "Views, watch time, subscribers and audience reports" },
  { scope: "https://www.googleapis.com/auth/yt-analytics-monetary.readonly", why: "Revenue — only if you want it and your channel is monetized" },
];

function ChannelsPage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const redirectUri = origin ? `${origin}/api/public/youtube/callback` : "";

  return (
    <Page>
      <PageHeader title="YouTube Channels" description="Connect channels with Google's official sign-in so CreatorOS can read your real channel data." />

      <div className="surface mb-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-signal-soft text-signal"><Youtube className="size-5" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">No channels connected</p>
            <Badge variant="warning">Setup required</Badge>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Connecting YouTube needs your own Google Cloud OAuth credentials. Until they're added, no channel data is shown anywhere in the app.
          </p>
        </div>
        <Button disabled title="Available once Google OAuth credentials are configured">Connect channel</Button>
      </div>

      <Section title="What's needed to turn this on" description="One-time setup in Google Cloud Console (about 10 minutes).">
        <ol className="surface divide-y text-[13px]">
          <li className="flex gap-4 px-5 py-4"><span className="font-mono text-[11px] text-subtle">01</span><div>Create a project at <a className="underline underline-offset-2" href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">console.cloud.google.com</a> and enable <b>YouTube Data API v3</b> and <b>YouTube Analytics API</b>.</div></li>
          <li className="flex gap-4 px-5 py-4"><span className="font-mono text-[11px] text-subtle">02</span><div>Configure the OAuth consent screen. Add yourself as a test user while the app is unverified.</div></li>
          <li className="flex gap-4 px-5 py-4">
            <span className="font-mono text-[11px] text-subtle">03</span>
            <div className="min-w-0 flex-1">
              Create an OAuth client ID of type <b>Web application</b> with this authorized redirect URI (add your published domain too, once you publish):
              {redirectUri && (
                <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{redirectUri}</code>
                  <Button variant="ghost" size="icon-sm" className="size-7" aria-label="Copy redirect URI" onClick={() => navigator.clipboard.writeText(redirectUri).then(() => toast.success("Copied"))}><Copy /></Button>
                </div>
              )}
            </div>
          </li>
          <li className="flex gap-4 px-5 py-4"><span className="font-mono text-[11px] text-subtle">04</span><div>Share the client ID and client secret when we build the connection — they'll be stored as server-side secrets, never in the browser.</div></li>
        </ol>
      </Section>

      <Section title="Permissions CreatorOS will request" description="Read-only by default. Upload and scheduling permissions will only be requested when you enable publishing.">
        <ul className="surface divide-y">
          {SCOPES.map((s) => (
            <li key={s.scope} className="px-5 py-3">
              <p className="font-mono text-[12px]">{s.scope.replace("https://www.googleapis.com/auth/", "")}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{s.why}</p>
            </li>
          ))}
        </ul>
      </Section>

      <p className="text-[12px] text-muted-foreground">Meanwhile, <Link to="/scripts" className="text-foreground underline underline-offset-2">Script Studio</Link> and <Link to="/seo" className="text-foreground underline underline-offset-2">SEO Studio</Link> work without a connected channel.</p>
    </Page>
  );
}
