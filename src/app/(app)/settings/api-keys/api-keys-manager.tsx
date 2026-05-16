"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createKey } from "./actions";

export function ApiKeysManager({ orgId, canCreate }: { orgId: string; canCreate: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<("read" | "write" | "admin")[]>(["read"]);
  const [pending, start] = useTransition();
  const [revealed, setRevealed] = useState<string | null>(null);

  function create() {
    if (!name.trim()) return toast.error("Nome obrigatório");
    start(async () => {
      const r = await createKey({ orgId, name, scopes });
      if ("error" in r && r.error) toast.error(r.error);
      else if ("plainKey" in r && r.plainKey) {
        setRevealed(r.plainKey);
        toast.success("API key criada. Copie agora — não mostraremos de novo.");
        setName("");
        router.refresh();
      }
    });
  }

  function toggleScope(scope: "read" | "write" | "admin") {
    setScopes((s) => (s.includes(scope) ? s.filter((x) => x !== scope) : [...s, scope]));
  }

  if (!canCreate) {
    return (
      <div className="p-4 rounded-lg border-2 border-dashed text-center">
        <KeyRound className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          API keys disponíveis no plano Agência ou Native.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
        <div className="space-y-2">
          <Label htmlFor="key-name">Nome da chave</Label>
          <Input
            id="key-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Integração agência X"
            disabled={pending}
          />
        </div>
        <Button onClick={create} disabled={pending || !name.trim()}>
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Gerar chave
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Permissões</Label>
        <div className="flex gap-2">
          {(["read", "write", "admin"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleScope(s)}
              className={
                scopes.includes(s)
                  ? "border-2 border-primary bg-primary/5 rounded-md px-3 py-1.5 text-xs font-medium capitalize"
                  : "border rounded-md px-3 py-1.5 text-xs hover:bg-accent/40 capitalize"
              }
              disabled={pending}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {revealed && (
        <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">⚠️ Copie agora — não mostraremos de novo</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(revealed);
                toast.success("Copiado");
              }}
            >
              <Copy className="w-3 h-3" />
              Copiar
            </Button>
          </div>
          <code className="block font-mono text-xs bg-background rounded p-3 break-all">
            {revealed}
          </code>
        </div>
      )}
    </div>
  );
}
