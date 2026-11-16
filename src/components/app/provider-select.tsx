import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { PLATFORM_PROVIDER_ID, providerName } from "@/lib/ai/catalog";
import { providersQuery } from "@/lib/queries";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ProviderSelect({ workspaceId, value, onChange }: { workspaceId: string; value: string; onChange: (v: string) => void }) {
  const { data: providers = [] } = useQuery(providersQuery(workspaceId));
  const text = providers.filter((p) => p.capability === "text");
  return (
    <div className="grid gap-1.5">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-eyebrow">Built-in</SelectLabel>
            <SelectItem value={PLATFORM_PROVIDER_ID}>Lovable AI</SelectItem>
          </SelectGroup>
          {text.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-eyebrow">Your providers</SelectLabel>
              {text.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label} · {providerName(p.provider)} · {p.default_model}
                  {p.status === "error" ? " (last test failed)" : ""}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Manage models and keys in <Link to="/providers" className="text-foreground underline-offset-2 hover:underline">AI Providers</Link>.
      </p>
    </div>
  );
}
