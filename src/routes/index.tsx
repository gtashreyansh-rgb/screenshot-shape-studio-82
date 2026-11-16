import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, FileText, Image, Tags, Youtube, Bot, Scissors } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { BrandWordmark } from "@/components/app/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CreatorOS AI — the operating system for YouTube creators" },
      {
        name: "description",
        content: "Write scripts, package videos with SEO metadata, and manage your YouTube workflow in one focused workspace.",
      },
      { property: "og:title", content: "CreatorOS AI — the operating system for YouTube creators" },
      {
        property: "og:description",
        content: "Write scripts, package videos with SEO metadata, and manage your YouTube workflow in one focused workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const MODULES = [
  { icon: FileText, name: "Script Studio", body: "Scene-by-scene scripts with narration and visual cues, in any language and tone.", live: true },
  { icon: Tags, name: "SEO Studio", body: "Title options, descriptions, tags, keywords and hashtags generated together.", live: true },
  { icon: Youtube, name: "Channels & Analytics", body: "Official YouTube connection with real metrics and sync history.", live: false },
  { icon: Image, name: "Thumbnails", body: "Concepts and image generation through the provider you choose.", live: false },
  { icon: Scissors, name: "Shorts Studio", body: "Turn your own long-form videos into vertical Shorts.", live: false },
  { icon: Bot, name: "AI Manager", body: "Plans tasks, runs real tools, and asks before anything public or costly.", live: false },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const cta = signedIn ? (
    <Button asChild size="lg" className="h-11 px-5">
      <Link to="/overview">Open workspace <ArrowRight /></Link>
    </Button>
  ) : (
    <Button asChild size="lg" className="h-11 px-5">
      <Link to="/auth">Get started free <ArrowRight /></Link>
    </Button>
  );

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <BrandWordmark />
        <Button asChild variant="ghost" size="sm">
          <Link to={signedIn ? "/overview" : "/auth"}>{signedIn ? "Open app" : "Sign in"}</Link>
        </Button>
      </header>

      <section className="relative">
        <div className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[520px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 sm:pt-28">
          <p className="text-eyebrow animate-fade-up">For YouTube creators &amp; small teams</p>
          <h1 className="mt-5 max-w-3xl animate-fade-up text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[56px]">
            One quiet place to make<br className="hidden sm:block" /> every video better.
          </h1>
          <p className="mt-6 max-w-xl animate-fade-up text-base text-muted-foreground sm:text-lg">
            CreatorOS brings scripting, packaging and channel management together — with AI that only claims
            what it actually did.
          </p>
          <div className="mt-9 flex animate-fade-up flex-wrap items-center gap-3">
            {cta}
            <span className="text-[13px] text-muted-foreground">Sign in with Google or email.</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3 [&>*]:bg-card">
          {MODULES.map((m) => (
            <div key={m.name} className="p-6">
              <div className="flex items-center justify-between">
                <m.icon className="size-[18px] text-foreground" />
                <span className={m.live ? "font-mono text-[10px] uppercase tracking-wider text-success" : "font-mono text-[10px] uppercase tracking-wider text-subtle"}>
                  {m.live ? "Available" : "In development"}
                </span>
              </div>
              <h3 className="mt-5 text-sm font-semibold">{m.name}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-[12px] text-muted-foreground">
          <BrandWordmark className="text-[13px]" />
          <span>Only process videos you own or are authorized to use.</span>
        </div>
      </footer>
    </div>
  );
}
