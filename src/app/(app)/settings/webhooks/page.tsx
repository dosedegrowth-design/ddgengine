import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WebhooksManager } from "./webhooks-manager";
import { formatRelativeTime } from "@/lib/utils";

const POWER_PLANS = new Set(["agency", "native"]);

export default async function WebhooksPage() {
  const { org, supabase } = await getCurrentOrg();

  // Gate de plano: Webhooks só pra Agência/Native
  if (!POWER_PLANS.has(org.plan ?? "trial")) {
    redirect("/settings/billing");
  }

  const { data: subs } = await supabase
    .from("webhook_subscriptions")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Receba eventos do Conteudai no seu sistema. Útil pra agências integrarem com workflows próprios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhooksManager orgId={org.id} canCreate={org.plan === "agency" || org.plan === "native" || org.plan === "multi"} />

          {subs && subs.length > 0 && (
            <div className="mt-6 space-y-2">
              {subs.map((s: any) => (
                <div key={s.id} className="p-3 rounded-md border">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <code className="text-xs font-mono truncate flex-1">{s.url}</code>
                    <Badge variant={s.active ? "success" : "secondary"}>
                      {s.active ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    {(s.events as string[]).map((e) => (
                      <Badge key={e} variant="outline" className="text-xs">
                        {e}
                      </Badge>
                    ))}
                    {s.last_triggered_at && (
                      <span>Último envio: {formatRelativeTime(s.last_triggered_at)}</span>
                    )}
                    {s.failures_count > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {s.failures_count} falhas
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos disponíveis</CardTitle>
          <CardDescription>Selecione no momento de criar o webhook</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <EventRow event="post.published" desc="Quando um post é publicado no blog" />
            <EventRow event="post.failed" desc="Quando geração de post falha" />
            <EventRow event="post.scheduled" desc="Quando post é agendado pra publicar" />
            <EventRow event="visibility.run.completed" desc="Análise semanal de aparições em IA concluída" />
            <EventRow event="metrics.threshold" desc="Milestone atingido (visitas, posições)" />
          </div>
          <div className="mt-6 p-4 rounded-md bg-muted/40 border text-xs space-y-2">
            <div className="font-medium">Como verificar a assinatura</div>
            <p className="text-muted-foreground">
              Cada webhook é enviado com header <code className="font-mono">X-DDG-Signature: sha256=...</code>.
              Verifique no seu endpoint usando HMAC-SHA256 do body com o secret da subscription.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EventRow({ event, desc }: { event: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/30">
      <code className="font-mono text-xs px-2 py-0.5 rounded bg-muted">{event}</code>
      <span className="text-muted-foreground">{desc}</span>
    </div>
  );
}
