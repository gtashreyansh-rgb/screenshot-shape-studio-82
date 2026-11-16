import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandWordmark, GoogleLogo } from "@/components/app/brand";
import { ErrorNote } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — CreatorOS AI" },
      { name: "description", content: "Sign in to your CreatorOS AI workspace." },
      { property: "og:title", content: "Sign in — CreatorOS AI" },
      { property: "og:description", content: "Sign in to your CreatorOS AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const REDIRECT_KEY = "creatoros-post-auth";

function safePath(p: string | null | undefined) {
  return p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/auth") ? p : "/overview";
}

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in (or just returned from Google) → continue to the app.
  useEffect(() => {
    if (search.redirect) sessionStorage.setItem(REDIRECT_KEY, safePath(search.redirect));
    const go = () => {
      const target = safePath(sessionStorage.getItem(REDIRECT_KEY));
      sessionStorage.removeItem(REDIRECT_KEY);
      navigate({ to: target, replace: true });
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) go();
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, search.redirect]);

  async function google() {
    setError(null);
    setBusy("google");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) {
      setError(result.error.message || "Google sign-in failed. Please try again.");
      setBusy(null);
      return;
    }
    if (result.redirected) return;
    setBusy(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy("email");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice(`We sent a confirmation link to ${email}. Open it to finish creating your account.`);
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice(`If an account exists for ${email}, a reset link is on its way.`);
      }
    } catch (err) {
      const msg = (err as Error).message;
      setError(
        /invalid login credentials/i.test(msg)
          ? "That email and password don't match an account."
          : /email not confirmed/i.test(msg)
            ? "Confirm your email first — check your inbox for the link."
            : msg,
      );
    } finally {
      setBusy(null);
    }
  }

  const heading = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden border-r bg-sidebar lg:block">
        <div className="dot-grid absolute inset-0 opacity-70" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link to="/"><BrandWordmark /></Link>
          <div className="max-w-md">
            <p className="text-eyebrow">Creator operating system</p>
            <p className="mt-4 text-2xl font-semibold leading-snug tracking-tight text-foreground">
              Plan, write and package every video from one calm workspace.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-signal" />Scene-by-scene scripts in any language and tone</li>
              <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/30" />Titles, descriptions, tags and hashtags in one pass</li>
              <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/30" />Bring your own AI keys, or use the built-in AI</li>
            </ul>
          </div>
          <p className="font-mono text-[11px] text-subtle">Your data stays private to your workspace.</p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <Link to="/" className="mb-10 inline-block lg:hidden"><BrandWordmark /></Link>
          <h1 className="text-xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot" ? "Enter your email and we'll send a reset link." : "Use Google or your email to continue."}
          </p>

          {mode !== "forgot" && (
            <>
              <Button variant="google" className="mt-6 h-10 w-full" onClick={google} disabled={busy !== null}>
                {busy === "google" ? <Loader2 className="animate-spin" /> : <GoogleLogo />}
                Continue with Google
              </Button>
              <div className="my-6 flex items-center gap-3 text-eyebrow">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={submit} className={mode === "forgot" ? "mt-6 grid gap-4" : "grid gap-4"}>
            {mode === "signup" && (
              <div className="grid gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your channel or name" />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            {mode !== "forgot" && (
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setMode("forgot"); setError(null); }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              </div>
            )}
            {error && <ErrorNote>{error}</ErrorNote>}
            {notice && <div className="rounded-md border border-success/25 bg-success-soft px-3 py-2 text-[13px] text-success">{notice}</div>}
            <Button type="submit" className="h-10" disabled={busy !== null}>
              {busy === "email" && <Loader2 className="animate-spin" />}
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            {mode === "signin" ? (
              <>No account? <button className="font-medium text-foreground hover:underline" onClick={() => { setMode("signup"); setError(null); }}>Create one</button></>
            ) : (
              <>Have an account? <button className="font-medium text-foreground hover:underline" onClick={() => { setMode("signin"); setError(null); }}>Sign in</button></>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
