import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { BrandWordmark } from "@/components/app/brand";
import { ErrorNote } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — CreatorOS AI" },
      { name: "description", content: "Choose a new password for your CreatorOS AI account." },
      { property: "og:title", content: "Set a new password — CreatorOS AI" },
      { property: "og:description", content: "Choose a new password for your CreatorOS AI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && isRecovery) setReady(true);
      else if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    navigate({ to: "/overview", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-10 inline-block"><BrandWordmark /></Link>
        <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
        {!ready ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Open this page from the reset link in your email. If the link expired, <Link to="/auth" className="text-foreground underline">request a new one</Link>.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Update password</Button>
          </form>
        )}
      </div>
    </div>
  );
}
