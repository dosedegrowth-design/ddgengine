"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWebhook } from "./actions";

const ALL_EVENTS = [
  "post.published",
  "post.failed",
  "post.scheduled",
  "visibility.run.completed",
  "metrics.threshold",
];

export function WebhooksManager({ orgId, canCreate }: { orgId: string; canCreate: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["post.published"]);
  const [pending, start] = useTransition();
  const [secret, setSecret] = useState<string | null>(null);

  function create() {
    if (!url.startsWith("http")) return toast.error("URL inválida (precisa começar com http/https)");
    if (events.length === 0) return toast.error("Selecione ao menos 1 evento");
    start(async () => {
      const r = await createWebhook({ orgId, url, events });
      if ("error" in r && r.error) toast.error(r.error);
      else if ("secret" in r && r.secret) {
        setSecret(r.secret);
        toast.success("Webhook criado. Copie o secret agora.");
        setUrl("");
        router.refresh();
      }
    });
  }

  function toggleEvent(e: string) {
    setEvents((curr) => (curr.includes(e) ? curr.filter((x) => x !== e) : [...curr, e]));
  }

  if (!canCreate) {
    return (
      <div className="p-4 rounded-lg border-2 border-dashed text-center">
        <Webhook className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Webhooks disponíveis nos planos Multi, Agência e Native.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="webhook-url">URL do endpoint</Label>
        <Input
          id="webhook-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://seu-sistema.com/webhooks/ddg"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label>Eventos pra receber</Label>
        <div className="flex flex-wrap gap-2">
          {ALL_EVENTS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => toggleEvent(e)}
              className={
                events.includes(e)
                  ? "border-2 border-primary bg-primary/5 rounded-md px-3 py-1.5 text-xs font-mono"
                  : "border rounded-md px-3 py-1.5 text-xs font-mono hover:bg-accent/40"
              }
              disabled={pending}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={create} disabled={pending || !url.trim()}>
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
        Criar webhook
      </Button>

      {secret && (
        <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 p-4 space-y-2">
          <div className="font-medium text-sm">⚠️ Copie o secret agora — não mostraremos de novo</div>
          <code className="block font-mono text-xs bg-background p-3 rounded break-all">{secret}</code>
          <p className="text-xs text-muted-foreground">
            Use esse secret pra validar a assinatura HMAC-SHA256 do header X-DDG-Signature.
          </p>
        </div>
      )}
    </div>
  );
}
